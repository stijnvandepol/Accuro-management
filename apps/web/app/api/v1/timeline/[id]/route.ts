import { type NextRequest } from 'next/server'
import { z } from 'zod'
import db from '@/lib/db'
import {
  ok, notFound, forbidden,
  requireAuth, isAuthContext, requirePermission, parseBody, withErrorHandler,
} from '@/lib/api-helpers'

const UpdateNoteSchema = z.object({
  content: z.string().min(1).max(10000),
})

export const PATCH = withErrorHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const auth = await requireAuth(req)
  if (!isAuthContext(auth)) return auth

  const permErr = requirePermission(auth, 'timeline:write')
  if (permErr) return permErr

  const { id } = await params
  const entry = await db.ticketTimelineEntry.findUnique({ where: { id, deletedAt: null } })
  if (!entry) return notFound('Timeline entry')

  // Only NOTE entries can be edited
  if (entry.type !== 'NOTE') return forbidden('Only NOTE entries can be edited')

  // Only author or admin can edit
  const isAdmin = auth.role === 'SUPER_ADMIN' || auth.role === 'ADMIN'
  if (entry.authorId !== auth.userId && !isAdmin) return forbidden('Not your note')

  const body = await parseBody(req, UpdateNoteSchema)
  if (body instanceof Response) return body

  const updated = await db.ticketTimelineEntry.update({
    where: { id },
    data: { content: body.content },
    include: {
      author: { select: { id: true, name: true, email: true, role: true } },
    },
  })

  return ok(updated)
})

export const DELETE = withErrorHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const auth = await requireAuth(req)
  if (!isAuthContext(auth)) return auth

  const permErr = requirePermission(auth, 'timeline:delete')
  if (permErr) return permErr

  const { id } = await params
  const entry = await db.ticketTimelineEntry.findUnique({ where: { id, deletedAt: null } })
  if (!entry) return notFound('Timeline entry')

  if (entry.type !== 'NOTE') return forbidden('Only NOTE entries can be deleted')

  const isAdmin = auth.role === 'SUPER_ADMIN' || auth.role === 'ADMIN'
  if (entry.authorId !== auth.userId && !isAdmin) return forbidden('Not your note')

  await db.ticketTimelineEntry.update({
    where: { id },
    data: { deletedAt: new Date() },
  })

  return ok({ success: true })
})
