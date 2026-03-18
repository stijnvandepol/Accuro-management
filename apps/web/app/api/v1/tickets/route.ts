import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import {
  requireAuth,
  isAuthContext,
  requirePermission,
  parseBody,
  ok,
  created,
  badRequest,
  withErrorHandler,
  parsePagination,
  paginationMeta,
} from '@/lib/api-helpers'
import { createTicketSchema } from '@/lib/validations/ticket'
import { logActivity } from '@/lib/audit'
import { notifyAdmins, notifyTicketAssigned } from '@/lib/notifications'
import { buildTicketScopeWhere } from '@/lib/ticket-policy'
import { generateTicketNumber } from '@/lib/ticket-number'
import { createTimelineEntry } from '@/lib/timeline'
import { validateTicketRelationships } from '@/lib/ticket-service'

export const GET = withErrorHandler(async (req: NextRequest) => {
  const auth = await requireAuth(req)
  if (!isAuthContext(auth)) return auth

  const permErr = requirePermission(auth, 'tickets:read')
  if (permErr) return permErr

  const { searchParams } = req.nextUrl
  const { page, limit, skip } = parsePagination(searchParams)
  const projectId = searchParams.get('projectId')
  const clientId = searchParams.get('clientId')
  const assignedToId = searchParams.get('assignedToId')
  const search = searchParams.get('search')
  const includeArchived = searchParams.get('archived') === 'true'
  const overdue = searchParams.get('overdue') === 'true'
  const sort = searchParams.get('sort') ?? 'updatedAt_desc'

  // Validate enum query params upfront — pass bad values to Prisma returns a 400 not a 500.
  const TICKET_STATUSES = ['OPEN','IN_PROGRESS','WAITING_FOR_CLIENT','APPROVAL_PENDING',
    'WAITING_FOR_PAYMENT','FEEDBACK_REQUESTED','IN_REVIEW','DONE','CANCELLED','ON_HOLD'] as const
  const TICKET_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const
  const TICKET_TYPES = ['TASK', 'BUG', 'FEEDBACK', 'FEATURE', 'QUESTION', 'INTAKE'] as const
  type TicketStatus  = typeof TICKET_STATUSES[number]
  type TicketPriority = typeof TICKET_PRIORITIES[number]
  type TicketType    = typeof TICKET_TYPES[number]

  const rawStatus   = searchParams.get('status')
  const rawPriority = searchParams.get('priority')
  const rawType     = searchParams.get('type')

  if (rawStatus   && !(TICKET_STATUSES   as readonly string[]).includes(rawStatus))   return badRequest(`Invalid status: ${rawStatus}`)
  if (rawPriority && !(TICKET_PRIORITIES as readonly string[]).includes(rawPriority)) return badRequest(`Invalid priority: ${rawPriority}`)
  if (rawType     && !(TICKET_TYPES      as readonly string[]).includes(rawType))     return badRequest(`Invalid type: ${rawType}`)

  const status   = rawStatus   as TicketStatus   | null
  const priority = rawPriority as TicketPriority | null
  const type     = rawType     as TicketType     | null

  // Developers only see their assigned tickets
  const isDeveloper = auth.role === 'DEVELOPER'

  const sortMap: Record<string, { [key: string]: 'asc' | 'desc' }> = {
    createdAt_desc: { createdAt: 'desc' },
    createdAt_asc: { createdAt: 'asc' },
    updatedAt_desc: { updatedAt: 'desc' },
    dueDate_asc: { dueDate: 'asc' },
    priority_desc: { priority: 'desc' },
  }

  const where = {
    ...buildTicketScopeWhere(auth, { includeArchived }),
    ...(status   ? { status }   : {}),
    ...(priority ? { priority } : {}),
    ...(clientId ? { clientId } : {}),
    ...(projectId ? { projectId } : {}),
    ...(assignedToId && !isDeveloper ? { assignedToId } : {}),
    ...(type ? { type } : {}),
    ...(overdue ? { dueDate: { lt: new Date() } } : {}),
    ...(search
      ? {
          OR: [
            { ticketNumber: { contains: search, mode: 'insensitive' as const } },
            { title: { contains: search, mode: 'insensitive' as const } },
            { description: { contains: search, mode: 'insensitive' as const } },
            { client: { name: { contains: search, mode: 'insensitive' as const } } },
          ],
        }
      : {}),
  }

  const [tickets, total] = await Promise.all([
    db.ticket.findMany({
      where,
      skip,
      take: limit,
      orderBy: [sortMap[sort] ?? sortMap.updatedAt_desc],
      include: {
        client: { select: { id: true, name: true } },
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
  if (body instanceof NextResponse) return body
  const data = body

  const relations = await validateTicketRelationships(data)
  if (!relations.ok) return badRequest(relations.message)

  const ticket = await db.ticket.create({
    data: {
      ticketNumber: generateTicketNumber(),
      title: data.title,
      description: data.description,
      clientId: relations.data.clientId,
      clientContactId: relations.data.clientContactId,
      projectId: relations.data.projectId,
      priority: data.priority,
      type: data.type,
      category: data.category,
      source: data.source,
      assignedToId: relations.data.assignedToId,
      labels: data.labels,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      estimatedHours: data.estimatedHours,
      approvalStatus: data.approvalStatus,
      paymentStatus: data.paymentStatus,
      createdById: auth.userId,
    },
    include: {
      client: { select: { id: true, name: true } },
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
    createTimelineEntry({
      ticketId: ticket.id,
      type: 'SYSTEM_EVENT',
      authorId: auth.userId,
      metadata: { action: 'ticket_created', ticketNumber: ticket.ticketNumber },
    }),
    notifyAdmins(
      {
        type: 'NEW_TICKET',
        title: `New ticket: ${ticket.ticketNumber} ${ticket.title}`,
        entityType: 'ticket',
        entityId: ticket.id,
      },
      auth.userId
    ),
  ]

  if (relations.data.assignedToId && relations.data.assignedToId !== auth.userId) {
    tasks.push(notifyTicketAssigned(ticket.id, ticket.title, relations.data.assignedToId))
  }

  await Promise.all(tasks)
  return created(ticket)
})
