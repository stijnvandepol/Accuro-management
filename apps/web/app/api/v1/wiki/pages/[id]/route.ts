import { type NextRequest } from 'next/server'
import { z } from 'zod'
import db from '@/lib/db'
import {
  ok, notFound, requireAuth, isAuthContext, requirePermission, parseBody, withErrorHandler,
} from '@/lib/api-helpers'

const UpdatePageSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  content: z.string().min(1).max(100000).optional(),
  category: z.string().max(100).optional(),
})

export const GET = withErrorHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const auth = await requireAuth(req)
  if (!isAuthContext(auth)) return auth

  const permErr = requirePermission(auth, 'wiki:read')
  if (permErr) return permErr

  const { id } = await params
  const page = await db.wikiPage.findFirst({
    where: { OR: [{ id }, { slug: id }], deletedAt: null },
    include: {
      createdBy: { select: { id: true, name: true } },
      versions: {
        orderBy: { version: 'desc' },
        take: 10,
        include: { editedBy: { select: { id: true, name: true } } },
      },
      ticketLinks: {
        include: { ticket: { select: { id: true, title: true, status: true } } },
      },
    },
  })

  if (!page) return notFound('Wiki page')
  return ok(page)
})

export const PATCH = withErrorHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const auth = await requireAuth(req)
  if (!isAuthContext(auth)) return auth

  const permErr = requirePermission(auth, 'wiki:write')
  if (permErr) return permErr

  const { id } = await params
  const page = await db.wikiPage.findUnique({ where: { id, deletedAt: null } })
  if (!page) return notFound('Wiki page')

  const body = await parseBody(req, UpdatePageSchema)
  if (body instanceof Response) return body

  const newVersion = page.version + 1

  const updated = await db.wikiPage.update({
    where: { id },
    data: { ...body, version: newVersion },
    include: { createdBy: { select: { id: true, name: true } } },
  })

  // Store version snapshot if content changed
  if (body.content) {
    await db.wikiPageVersion.create({
      data: {
        pageId: id,
        content: body.content,
        version: newVersion,
        editedById: auth.userId,
      },
    })
  }

  return ok(updated)
})

export const DELETE = withErrorHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const auth = await requireAuth(req)
  if (!isAuthContext(auth)) return auth

  const permErr = requirePermission(auth, 'wiki:delete')
  if (permErr) return permErr

  const { id } = await params
  const page = await db.wikiPage.findUnique({ where: { id, deletedAt: null } })
  if (!page) return notFound('Wiki page')

  await db.wikiPage.update({ where: { id }, data: { deletedAt: new Date() } })
  return ok({ success: true })
})
