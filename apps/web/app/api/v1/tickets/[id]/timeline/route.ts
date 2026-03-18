import { type NextRequest } from 'next/server'
import { z } from 'zod'
import db from '@/lib/db'
import {
  ok, created, notFound,
  requireAuth, isAuthContext, requirePermission, parseBody, withErrorHandler,
} from '@/lib/api-helpers'

const CreateNoteSchema = z.object({
  content: z.string().min(1).max(10000),
})

export const GET = withErrorHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const auth = await requireAuth(req)
  if (!isAuthContext(auth)) return auth

  const permErr = requirePermission(auth, 'timeline:read')
  if (permErr) return permErr

  const { id: ticketId } = await params
  const { searchParams } = req.nextUrl
  const cursor = searchParams.get('cursor')
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100)
  const type = searchParams.get('type')

  const ticket = await db.ticket.findUnique({ where: { id: ticketId, deletedAt: null } })
  if (!ticket) return notFound('Ticket')

  const entries = await db.ticketTimelineEntry.findMany({
    where: {
      ticketId,
      deletedAt: null,
      ...(type ? { type: type as any } : {}),
      ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
    include: {
      author: { select: { id: true, name: true, email: true, role: true } },
    },
  })

  const hasMore = entries.length > limit
  const items = hasMore ? entries.slice(0, limit) : entries

  return ok({
    data: items,
    pagination: {
      hasMore,
      nextCursor: hasMore ? items.at(-1)!.createdAt.toISOString() : null,
    },
  })
})

export const POST = withErrorHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const auth = await requireAuth(req)
  if (!isAuthContext(auth)) return auth

  const permErr = requirePermission(auth, 'timeline:write')
  if (permErr) return permErr

  const { id: ticketId } = await params
  const body = await parseBody(req, CreateNoteSchema)
  if (body instanceof Response) return body

  const ticket = await db.ticket.findUnique({ where: { id: ticketId, deletedAt: null } })
  if (!ticket) return notFound('Ticket')

  const entry = await db.ticketTimelineEntry.create({
    data: {
      ticketId,
      type: 'NOTE',
      authorId: auth.userId,
      content: body.content,
    },
    include: {
      author: { select: { id: true, name: true, email: true, role: true } },
    },
  })

  return created(entry)
})
