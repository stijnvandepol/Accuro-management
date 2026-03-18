import { type NextRequest } from 'next/server'
import { z } from 'zod'
import db from '@/lib/db'
import {
  ok, created, notFound,
  requireAuth, isAuthContext, requirePermission, parseBody, withErrorHandler,
} from '@/lib/api-helpers'

const CreateCommSchema = z.object({
  direction: z.enum(['INCOMING', 'OUTGOING']),
  channel: z.enum(['EMAIL', 'MEETING', 'CALL', 'MESSAGE', 'OTHER']),
  subject: z.string().max(500).optional(),
  body: z.string().min(1).max(50000),
  externalSender: z.string().max(500).optional(),
  externalMessageId: z.string().max(500).optional(),
})

export const GET = withErrorHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const auth = await requireAuth(req)
  if (!isAuthContext(auth)) return auth

  const permErr = requirePermission(auth, 'communications:read')
  if (permErr) return permErr

  const { id: ticketId } = await params
  const { searchParams } = req.nextUrl
  const cursor = searchParams.get('cursor')
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100)

  const ticket = await db.ticket.findUnique({ where: { id: ticketId, deletedAt: null } })
  if (!ticket) return notFound('Ticket')

  const entries = await db.communicationEntry.findMany({
    where: {
      ticketId,
      ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
    include: {
      author: { select: { id: true, name: true, email: true } },
      attachments: true,
    },
  })

  const hasMore = entries.length > limit
  const items = hasMore ? entries.slice(0, limit) : entries

  return ok({
    data: items,
    pagination: { hasMore, nextCursor: hasMore ? items.at(-1)!.createdAt.toISOString() : null },
  })
})

export const POST = withErrorHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const auth = await requireAuth(req)
  if (!isAuthContext(auth)) return auth

  const permErr = requirePermission(auth, 'communications:write')
  if (permErr) return permErr

  const { id: ticketId } = await params
  const body = await parseBody(req, CreateCommSchema)
  if (body instanceof Response) return body

  const ticket = await db.ticket.findUnique({ where: { id: ticketId, deletedAt: null } })
  if (!ticket) return notFound('Ticket')

  // Idempotency: prevent duplicate by externalMessageId
  if (body.externalMessageId) {
    const existing = await db.communicationEntry.findUnique({
      where: { externalMessageId: body.externalMessageId },
    })
    if (existing) return ok(existing)
  }

  const entry = await db.communicationEntry.create({
    data: {
      ticketId,
      direction: body.direction,
      channel: body.channel,
      subject: body.subject,
      body: body.body,
      externalSender: body.externalSender,
      authorId: auth.userId,
      externalMessageId: body.externalMessageId,
    },
    include: {
      author: { select: { id: true, name: true, email: true } },
    },
  })

  return created(entry)
})
