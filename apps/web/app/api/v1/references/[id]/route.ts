import { type NextRequest } from 'next/server'
import { z } from 'zod'
import db from '@/lib/db'
import {
  ok, notFound, forbidden,
  requireAuth, isAuthContext, requirePermission, parseBody, withErrorHandler,
} from '@/lib/api-helpers'
import { logActivity } from '@/lib/audit'
import { logReferenceRemoved } from '@/lib/timeline'

const BLOCKED_PROTOCOLS = /^(javascript:|data:|vbscript:)/i

const UpdateReferenceSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  url: z.string().url().max(2000).refine(
    (url) => !BLOCKED_PROTOCOLS.test(url),
    { message: 'URL protocol not allowed' },
  ).optional(),
  type: z.enum(['GITHUB', 'FIGMA', 'DOCS', 'DEPLOYMENT', 'MONITORING', 'DRIVE', 'NOTION', 'OTHER']).optional(),
  description: z.string().max(1000).optional(),
})

export const PATCH = withErrorHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const auth = await requireAuth(req)
  if (!isAuthContext(auth)) return auth

  const permErr = requirePermission(auth, 'references:write')
  if (permErr) return permErr

  const { id } = await params
  const ref = await db.ticketReference.findUnique({ where: { id } })
  if (!ref) return notFound('Reference')

  const isAdmin = auth.role === 'SUPER_ADMIN' || auth.role === 'ADMIN'
  if (ref.createdById !== auth.userId && !isAdmin) return forbidden('Not your reference')

  const body = await parseBody(req, UpdateReferenceSchema)
  if (body instanceof Response) return body

  const updated = await db.ticketReference.update({
    where: { id },
    data: body,
    include: { createdBy: { select: { id: true, name: true } } },
  })

  await logActivity({
    entityType: 'ticket',
    entityId: updated.ticketId,
    userId: auth.userId,
    action: 'reference_updated',
    metadata: { referenceId: updated.id },
    req,
  })

  return ok(updated)
})

export const DELETE = withErrorHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const auth = await requireAuth(req)
  if (!isAuthContext(auth)) return auth

  const permErr = requirePermission(auth, 'references:delete')
  if (permErr) return permErr

  const { id } = await params
  const ref = await db.ticketReference.findUnique({ where: { id } })
  if (!ref) return notFound('Reference')

  const isAdmin = auth.role === 'SUPER_ADMIN' || auth.role === 'ADMIN'
  if (ref.createdById !== auth.userId && !isAdmin) return forbidden('Not your reference')

  await db.ticketReference.delete({ where: { id } })
  await Promise.all([
    logActivity({
      entityType: 'ticket',
      entityId: ref.ticketId,
      userId: auth.userId,
      action: 'reference_deleted',
      metadata: { referenceId: ref.id, title: ref.title },
      req,
    }),
    logReferenceRemoved({
      ticketId: ref.ticketId,
      authorId: auth.userId,
      referenceId: ref.id,
      title: ref.title,
      url: ref.url,
    }),
  ])

  return ok({ success: true })
})
