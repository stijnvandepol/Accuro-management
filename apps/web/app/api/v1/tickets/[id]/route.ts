import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import {
  requireAuth,
  isAuthContext,
  requirePermission,
  parseBody,
  ok,
  notFound,
  badRequest,
  forbidden,
  withErrorHandler,
} from '@/lib/api-helpers'
import { updateTicketSchema } from '@/lib/validations/ticket'
import { logActivity, recordStatusChange } from '@/lib/audit'
import { notifyTicketAssigned, notifyStatusChanged } from '@/lib/notifications'
import { isValidTicketTransition } from '@/lib/transitions'
import { buildTicketScopeWhere, canArchiveTicket, canMutateTicket } from '@/lib/ticket-policy'
import { logAssignment, logStatusChange } from '@/lib/timeline'
import { validateTicketRelationships } from '@/lib/ticket-service'

type Params = { params: Promise<{ id: string }> }

export const GET = withErrorHandler(async (req: NextRequest, { params }: Params) => {
  const { id } = await params
  const auth = await requireAuth(req)
  if (!isAuthContext(auth)) return auth

  const permErr = requirePermission(auth, 'tickets:read')
  if (permErr) return permErr

  const includeArchived = req.nextUrl.searchParams.get('includeArchived') === 'true'

  const ticket = await db.ticket.findFirst({
    where: buildTicketScopeWhere(auth, { id, includeArchived }),
    include: {
      client: { select: { id: true, name: true } },
      clientContact: { select: { id: true, name: true, email: true } },
      project: {
        select: {
          id: true,
          title: true,
          packageType: true,
          client: { select: { id: true, name: true } },
        },
      },
      assignedTo: { select: { id: true, name: true, email: true } },
      comments: {
        where: { deletedAt: null },
        orderBy: { createdAt: 'asc' },
        include: {
          author: { select: { id: true, name: true } },
          attachments: true,
        },
      },
      attachments: true,
    },
  })

  if (!ticket) return notFound('Ticket not found')
  return ok(ticket)
})

export const PATCH = withErrorHandler(async (req: NextRequest, { params }: Params) => {
  const { id } = await params
  const auth = await requireAuth(req)
  if (!isAuthContext(auth)) return auth

  const permErr = requirePermission(auth, 'tickets:write')
  if (permErr) return permErr

  const ticket = await db.ticket.findFirst({ where: buildTicketScopeWhere(auth, { id }) })
  if (!ticket) return notFound('Ticket not found')
  if (!canMutateTicket(auth, ticket)) return forbidden('Ticket is outside your write scope')

  const body = await parseBody(req, updateTicketSchema)
  if (body instanceof NextResponse) return body
  const data = body

  if (data.version !== undefined && data.version !== ticket.version) {
    return badRequest('Ticket has been updated by someone else. Refresh and try again.')
  }

  // Check assign permission
  if (data.assignedToId !== undefined) {
    const assignErr = requirePermission(auth, 'tickets:assign')
    if (assignErr) return assignErr
  }

  // Guard status transitions — reject invalid moves before touching the DB
  if (data.status && data.status !== ticket.status) {
    if (!isValidTicketTransition(ticket.status, data.status)) {
      return badRequest(
        `Invalid status transition: ${ticket.status} → ${data.status}`
      )
    }
  }

  const nextClientId = data.clientId === undefined ? ticket.clientId : data.clientId
  const nextClientContactId = data.clientContactId === undefined ? ticket.clientContactId : data.clientContactId
  const nextProjectId = data.projectId === undefined ? ticket.projectId : data.projectId
  const nextAssigneeId = data.assignedToId === undefined ? ticket.assignedToId : data.assignedToId

  const relations = await validateTicketRelationships({
    clientId: nextClientId,
    clientContactId: nextClientContactId,
    projectId: nextProjectId,
    assignedToId: nextAssigneeId,
  })
  if (!relations.ok) return badRequest(relations.message)

  const oldStatus = ticket.status
  const oldAssignee = ticket.assignedToId
  const { statusReason, ...updateData } = data

  const updated = await db.ticket.update({
    where: { id },
    data: {
      ...(updateData.title !== undefined && { title: updateData.title }),
      ...(updateData.description !== undefined && { description: updateData.description }),
      ...(updateData.clientId !== undefined && { clientId: relations.data.clientId }),
      ...(updateData.clientContactId !== undefined && { clientContactId: relations.data.clientContactId }),
      ...(updateData.projectId !== undefined && { projectId: relations.data.projectId }),
      ...(updateData.status !== undefined && { status: updateData.status }),
      ...(updateData.priority !== undefined && { priority: updateData.priority }),
      ...(updateData.type !== undefined && { type: updateData.type }),
      ...(updateData.category !== undefined && { category: updateData.category }),
      ...(updateData.source !== undefined && { source: updateData.source }),
      ...(updateData.assignedToId !== undefined && { assignedToId: relations.data.assignedToId }),
      ...(updateData.labels !== undefined && { labels: updateData.labels }),
      ...(updateData.dueDate !== undefined && {
        dueDate: updateData.dueDate ? new Date(updateData.dueDate) : null,
      }),
      ...(updateData.estimatedHours !== undefined && { estimatedHours: updateData.estimatedHours }),
      ...(updateData.isExtraWork !== undefined && { isExtraWork: updateData.isExtraWork }),
      ...(updateData.approvalStatus !== undefined && { approvalStatus: updateData.approvalStatus }),
      ...(updateData.paymentStatus !== undefined && { paymentStatus: updateData.paymentStatus }),
      version: { increment: 1 },
    },
  })

  const tasks: Promise<unknown>[] = [
    logActivity({
      entityType: 'ticket',
      entityId: id,
      userId: auth.userId,
      action: 'updated',
      metadata: { changes: updateData },
      req,
    }),
  ]

  if (data.status && data.status !== oldStatus) {
    tasks.push(
      recordStatusChange({
        entityType: 'ticket',
        entityId: id,
        fromStatus: oldStatus,
        toStatus: data.status,
        changedById: auth.userId,
        reason: statusReason,
      }),
      logStatusChange({
        ticketId: id,
        authorId: auth.userId,
        oldStatus,
        newStatus: data.status,
      }),
      notifyStatusChanged('ticket', id, updated.title, data.status, auth.userId)
    )
  }

  if (
    data.assignedToId !== undefined &&
    data.assignedToId !== oldAssignee &&
    relations.data.assignedToId
  ) {
    tasks.push(
      logAssignment({
        ticketId: id,
        authorId: auth.userId,
        oldAssigneeId: oldAssignee,
        newAssigneeId: relations.data.assignedToId,
      }),
      notifyTicketAssigned(id, updated.title, relations.data.assignedToId)
    )
  } else if (data.assignedToId !== undefined && data.assignedToId !== oldAssignee) {
    tasks.push(
      logAssignment({
        ticketId: id,
        authorId: auth.userId,
        oldAssigneeId: oldAssignee,
        newAssigneeId: relations.data.assignedToId,
      })
    )
  }

  await Promise.all(tasks)
  return ok(updated)
})

export const DELETE = withErrorHandler(async (req: NextRequest, { params }: Params) => {
  const { id } = await params
  const auth = await requireAuth(req)
  if (!isAuthContext(auth)) return auth

  const permErr = requirePermission(auth, 'tickets:archive')
  if (permErr) return permErr
  if (!canArchiveTicket(auth.role)) return badRequest('Only admins and project managers can archive tickets')

  const ticket = await db.ticket.findFirst({ where: buildTicketScopeWhere(auth, { id }) })
  if (!ticket) return notFound('Ticket not found')

  await db.$transaction([
    db.ticket.update({
      where: { id },
      data: {
        archivedAt: new Date(),
        archivedById: auth.userId,
        deletedAt: new Date(),
        version: { increment: 1 },
      },
    }),
    db.activityLog.create({
      data: {
        entityType: 'ticket',
        entityId: id,
        userId: auth.userId,
        action: 'archived',
        metadata: { previousStatus: ticket.status },
      },
    }),
    db.ticketTimelineEntry.create({
      data: {
        ticketId: id,
        type: 'SYSTEM_EVENT',
        authorId: auth.userId,
        metadata: { action: 'ticket_archived', previousStatus: ticket.status },
      },
    }),
  ])

  return ok({ message: 'Ticket archived' })
})
