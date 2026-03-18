import { NextRequest } from 'next/server'
import db from '@/lib/db'
import {
  badRequest,
  isAuthContext,
  notFound,
  ok,
  requireAuth,
  requirePermission,
  withErrorHandler,
} from '@/lib/api-helpers'
import { canRestoreTicket } from '@/lib/ticket-policy'

type Params = { params: Promise<{ id: string }> }

export const POST = withErrorHandler(async (req: NextRequest, { params }: Params) => {
  const { id } = await params
  const auth = await requireAuth(req)
  if (!isAuthContext(auth)) return auth

  const permErr = requirePermission(auth, 'tickets:restore')
  if (permErr) return permErr
  if (!canRestoreTicket(auth.role)) return badRequest('Only admins and project managers can restore tickets')

  const ticket = await db.ticket.findFirst({ where: { id, deletedAt: { not: null } } })
  if (!ticket) return notFound('Archived ticket not found')

  const restored = await db.ticket.update({
    where: { id },
    data: {
      deletedAt: null,
      archivedAt: null,
      archivedById: null,
      version: { increment: 1 },
    },
  })

  await Promise.all([
    db.activityLog.create({
      data: {
        entityType: 'ticket',
        entityId: id,
        userId: auth.userId,
        action: 'restored',
        metadata: { status: restored.status },
      },
    }),
    db.ticketTimelineEntry.create({
      data: {
        ticketId: id,
        type: 'SYSTEM_EVENT',
        authorId: auth.userId,
        metadata: { action: 'ticket_restored', status: restored.status },
      },
    }),
  ])

  return ok(restored)
})
