import { NextRequest } from 'next/server'
import db from '@/lib/db'
import {
  requireAuth,
  isAuthContext,
  requirePermission,
  parseBody,
  ok,
  created,
  withErrorHandler,
  parsePagination,
  paginationMeta,
} from '@/lib/api-helpers'
import { createTicketSchema } from '@/lib/validations/ticket'
import { logActivity } from '@/lib/audit'
import { notifyAdmins, notifyTicketAssigned } from '@/lib/notifications'

export const GET = withErrorHandler(async (req: NextRequest) => {
  const auth = await requireAuth(req)
  if (!isAuthContext(auth)) return auth

  const permErr = requirePermission(auth, 'tickets:read')
  if (permErr) return permErr

  const { searchParams } = req.nextUrl
  const { page, limit, skip } = parsePagination(searchParams)
  const status = searchParams.get('status')
  const priority = searchParams.get('priority')
  const projectId = searchParams.get('projectId')
  const assignedToId = searchParams.get('assignedToId')
  const type = searchParams.get('type')
  const search = searchParams.get('search')

  // Developers only see their assigned tickets
  const isDeveloper = auth.role === 'DEVELOPER'

  const where = {
    deletedAt: null,
    ...(isDeveloper ? { assignedToId: auth.userId } : {}),
    ...(status ? { status: status as any } : {}),
    ...(priority ? { priority: priority as any } : {}),
    ...(projectId ? { projectId } : {}),
    ...(assignedToId && !isDeveloper ? { assignedToId } : {}),
    ...(type ? { type: type as any } : {}),
    ...(search
      ? {
          OR: [
            { title: { contains: search, mode: 'insensitive' as const } },
            { description: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  }

  const [tickets, total] = await Promise.all([
    db.ticket.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      include: {
        project: { select: { id: true, title: true, client: { select: { name: true } } } },
        assignedTo: { select: { id: true, name: true } },
        _count: { select: { comments: true } },
      },
    }),
    db.ticket.count({ where }),
  ])

  return ok(tickets, paginationMeta(total, page, limit))
})

export const POST = withErrorHandler(async (req: NextRequest) => {
  const auth = await requireAuth(req)
  if (!isAuthContext(auth)) return auth

  const permErr = requirePermission(auth, 'tickets:write')
  if (permErr) return permErr

  const body = await parseBody(req, createTicketSchema)
  if ('status' in body && typeof (body as any).status === 'number') return body as any
  const data = body as Awaited<ReturnType<typeof createTicketSchema.parseAsync>>

  const ticket = await db.ticket.create({
    data: {
      title: data.title,
      description: data.description,
      projectId: data.projectId,
      priority: data.priority,
      type: data.type,
      assignedToId: data.assignedToId,
      labels: data.labels,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      estimatedHours: data.estimatedHours,
      createdById: auth.userId,
    },
    include: {
      project: { select: { id: true, title: true } },
      assignedTo: { select: { id: true, name: true } },
    },
  })

  const tasks: Promise<unknown>[] = [
    logActivity({
      entityType: 'ticket',
      entityId: ticket.id,
      userId: auth.userId,
      action: 'created',
      metadata: { title: ticket.title, priority: ticket.priority, type: ticket.type },
      req,
    }),
    notifyAdmins(
      {
        type: 'NEW_TICKET',
        title: `New ticket: ${ticket.title}`,
        entityType: 'ticket',
        entityId: ticket.id,
      },
      auth.userId
    ),
  ]

  if (data.assignedToId && data.assignedToId !== auth.userId) {
    tasks.push(notifyTicketAssigned(ticket.id, ticket.title, data.assignedToId))
  }

  await Promise.all(tasks)
  return created(ticket)
})
