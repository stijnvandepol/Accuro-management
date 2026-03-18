import { NextRequest } from 'next/server'
import db from '@/lib/db'
import {
  isAuthContext,
  notFound,
  ok,
  requireAuth,
  requirePermission,
  withErrorHandler,
} from '@/lib/api-helpers'
import { buildTicketScopeWhere } from '@/lib/ticket-policy'
import { logActivity } from '@/lib/audit'
import { logWikiUnlinked } from '@/lib/timeline'

type Params = { params: Promise<{ id: string; wikiLinkId: string }> }

export const DELETE = withErrorHandler(async (req: NextRequest, { params }: Params) => {
  const { id: ticketId, wikiLinkId } = await params
  const auth = await requireAuth(req)
  if (!isAuthContext(auth)) return auth

  const permErr = requirePermission(auth, 'wiki:write')
  if (permErr) return permErr

  const ticket = await db.ticket.findFirst({ where: buildTicketScopeWhere(auth, { id: ticketId }) })
  if (!ticket) return notFound('Ticket')

  const link = await db.ticketWikiLink.findFirst({
    where: { id: wikiLinkId, ticketId },
    include: { wikiPage: true },
  })
  if (!link) return notFound('Wiki link')

  await db.ticketWikiLink.delete({ where: { id: wikiLinkId } })
  await Promise.all([
    logActivity({
      entityType: 'ticket',
      entityId: ticketId,
      userId: auth.userId,
      action: 'wiki_unlinked',
      metadata: { wikiPageId: link.wikiPageId, title: link.wikiPage.title },
      req,
    }),
    logWikiUnlinked({
      ticketId,
      authorId: auth.userId,
      wikiPageId: link.wikiPageId,
      wikiPageTitle: link.wikiPage.title,
      wikiPageSlug: link.wikiPage.slug,
    }),
  ])

  return ok({ success: true })
})
