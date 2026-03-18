import { type NextRequest } from 'next/server'
import { z } from 'zod'
import db from '@/lib/db'
import {
  ok, created, notFound,
  requireAuth, isAuthContext, requirePermission, parseBody, withErrorHandler,
} from '@/lib/api-helpers'
import { logReferenceAdded } from '@/lib/timeline'

const BLOCKED_PROTOCOLS = /^(javascript:|data:|vbscript:)/i

const CreateReferenceSchema = z.object({
  title: z.string().min(1).max(200),
  url: z.string().url().max(2000).refine(
    (url) => !BLOCKED_PROTOCOLS.test(url),
    { message: 'URL protocol not allowed' },
  ),
  type: z.enum(['GITHUB', 'FIGMA', 'DOCS', 'DEPLOYMENT', 'MONITORING', 'DRIVE', 'NOTION', 'OTHER']).optional(),
  description: z.string().max(1000).optional(),
})

export const GET = withErrorHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const auth = await requireAuth(req)
  if (!isAuthContext(auth)) return auth

  const permErr = requirePermission(auth, 'references:read')
  if (permErr) return permErr

  const { id: ticketId } = await params
  const ticket = await db.ticket.findUnique({ where: { id: ticketId, deletedAt: null } })
  if (!ticket) return notFound('Ticket')

  const references = await db.ticketReference.findMany({
    where: { ticketId },
    orderBy: { createdAt: 'asc' },
    include: { createdBy: { select: { id: true, name: true } } },
  })

  return ok(references)
})

export const POST = withErrorHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const auth = await requireAuth(req)
  if (!isAuthContext(auth)) return auth

  const permErr = requirePermission(auth, 'references:write')
  if (permErr) return permErr

  const { id: ticketId } = await params
  const body = await parseBody(req, CreateReferenceSchema)
  if (body instanceof Response) return body

  const ticket = await db.ticket.findUnique({ where: { id: ticketId, deletedAt: null } })
  if (!ticket) return notFound('Ticket')

  const reference = await db.ticketReference.create({
    data: {
      ticketId,
      title: body.title,
      url: body.url,
      type: body.type ?? 'OTHER',
      description: body.description,
      createdById: auth.userId,
    },
    include: { createdBy: { select: { id: true, name: true } } },
  })

  // Automatically log to timeline
  await logReferenceAdded({
    ticketId,
    authorId: auth.userId,
    referenceId: reference.id,
    title: reference.title,
    url: reference.url,
  })

  return created(reference)
})
