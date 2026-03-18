import { type NextRequest } from 'next/server'
import { z } from 'zod'
import db from '@/lib/db'
import {
  ok, created, notFound,
  requireAuth, isAuthContext, requirePermission, parseBody, withErrorHandler,
} from '@/lib/api-helpers'
import { logWikiLinked } from '@/lib/timeline'

const CreateWikiLinkSchema = z.object({
  wikiPageId: z.string().min(1),
})

export const GET = withErrorHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const auth = await requireAuth(req)
  if (!isAuthContext(auth)) return auth

  const permErr = requirePermission(auth, 'references:read')
  if (permErr) return permErr

  const { id: ticketId } = await params
  const links = await db.ticketWikiLink.findMany({
    where: { ticketId },
    include: {
      wikiPage: { select: { id: true, title: true, slug: true, category: true, updatedAt: true } },
    },
  })

  return ok(links)
})

export const POST = withErrorHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const auth = await requireAuth(req)
  if (!isAuthContext(auth)) return auth

  const permErr = requirePermission(auth, 'references:write')
  if (permErr) return permErr

  const { id: ticketId } = await params
  const body = await parseBody(req, CreateWikiLinkSchema)
  if (body instanceof Response) return body

  const ticket = await db.ticket.findUnique({ where: { id: ticketId, deletedAt: null } })
  if (!ticket) return notFound('Ticket')

  const wikiPage = await db.wikiPage.findUnique({ where: { id: body.wikiPageId, deletedAt: null } })
  if (!wikiPage) return notFound('Wiki page')

  // Upsert: ignore if already linked
  const existing = await db.ticketWikiLink.findUnique({
    where: { ticketId_wikiPageId: { ticketId, wikiPageId: body.wikiPageId } },
  })
  if (existing) return ok(existing)

  const link = await db.ticketWikiLink.create({
    data: { ticketId, wikiPageId: body.wikiPageId, createdById: auth.userId },
    include: {
      wikiPage: { select: { id: true, title: true, slug: true } },
    },
  })

  // Automatically log to timeline
  await logWikiLinked({
    ticketId,
    authorId: auth.userId,
    wikiPageId: wikiPage.id,
    wikiPageTitle: wikiPage.title,
    wikiPageSlug: wikiPage.slug,
  })

  return created(link)
})
