import db from './db'
import type { TimelineEntryType, Prisma } from '@prisma/client'

type CreateSystemEntryParams = {
  ticketId: string
  type: Exclude<TimelineEntryType, 'NOTE'>
  authorId?: string
  metadata?: Record<string, unknown>
}

export async function createTimelineEntry(params: CreateSystemEntryParams) {
  return db.ticketTimelineEntry.create({
    data: {
      ticketId: params.ticketId,
      type: params.type,
      authorId: params.authorId ?? null,
      content: null,
      metadata: params.metadata as Prisma.InputJsonValue ?? Prisma.JsonNull,
    },
  })
}

export async function logStatusChange(params: {
  ticketId: string
  authorId: string
  oldStatus: string
  newStatus: string
}) {
  return createTimelineEntry({
    ticketId: params.ticketId,
    type: 'STATUS_CHANGE',
    authorId: params.authorId,
    metadata: { oldStatus: params.oldStatus, newStatus: params.newStatus },
  })
}

export async function logAssignment(params: {
  ticketId: string
  authorId: string
  oldAssigneeId: string | null
  newAssigneeId: string | null
}) {
  return createTimelineEntry({
    ticketId: params.ticketId,
    type: 'ASSIGNMENT',
    authorId: params.authorId,
    metadata: {
      oldAssigneeId: params.oldAssigneeId,
      newAssigneeId: params.newAssigneeId,
    },
  })
}

export async function logReferenceAdded(params: {
  ticketId: string
  authorId: string
  referenceId: string
  title: string
  url: string
}) {
  return createTimelineEntry({
    ticketId: params.ticketId,
    type: 'REFERENCE_ADDED',
    authorId: params.authorId,
    metadata: {
      referenceId: params.referenceId,
      title: params.title,
      url: params.url,
    },
  })
}

export async function logWikiLinked(params: {
  ticketId: string
  authorId: string
  wikiPageId: string
  wikiPageTitle: string
  wikiPageSlug: string
}) {
  return createTimelineEntry({
    ticketId: params.ticketId,
    type: 'WIKI_LINKED',
    authorId: params.authorId,
    metadata: {
      wikiPageId: params.wikiPageId,
      title: params.wikiPageTitle,
      slug: params.wikiPageSlug,
    },
  })
}
