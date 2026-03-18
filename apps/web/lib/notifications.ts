import db from './db'
import type { NotificationType, Role } from '@prisma/client'

export interface CreateNotificationParams {
  userId: string
  type: NotificationType
  title: string
  body?: string
  entityType?: string
  entityId?: string
}

export async function createNotification(params: CreateNotificationParams) {
  return db.notification.create({
    data: {
      userId: params.userId,
      type: params.type,
      title: params.title,
      body: params.body,
      entityType: params.entityType,
      entityId: params.entityId,
    },
  })
}

// Notify all users with the given roles
export async function notifyByRoles(
  roles: Role[],
  params: Omit<CreateNotificationParams, 'userId'>,
  excludeUserId?: string
) {
  const users = await db.user.findMany({
    where: {
      role: { in: roles },
      isActive: true,
      ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
    },
    select: { id: true },
  })

  const notifications = users.map((u) => ({
    userId: u.id,
    type: params.type,
    title: params.title,
    body: params.body ?? null,
    entityType: params.entityType ?? null,
    entityId: params.entityId ?? null,
  }))

  if (notifications.length > 0) {
    await db.notification.createMany({ data: notifications })
  }

  return notifications.length
}

// Notify all admins and project managers
export async function notifyAdmins(
  params: Omit<CreateNotificationParams, 'userId'>,
  excludeUserId?: string
) {
  return notifyByRoles(['SUPER_ADMIN', 'ADMIN', 'PROJECT_MANAGER'], params, excludeUserId)
}

// Notify all users with specific permission-relevant roles
export async function notifyAll(
  params: Omit<CreateNotificationParams, 'userId'>,
  excludeUserId?: string
) {
  return notifyByRoles(
    ['SUPER_ADMIN', 'ADMIN', 'PROJECT_MANAGER', 'DEVELOPER', 'SALES'],
    params,
    excludeUserId
  )
}

// ─── Domain-specific helpers ──────────────────────────────────────────────────

export async function notifyNewLead(leadId: string, leadTitle: string, createdById: string) {
  return notifyAdmins(
    {
      type: 'NEW_LEAD',
      title: `New lead: ${leadTitle}`,
      entityType: 'lead',
      entityId: leadId,
    },
    createdById
  )
}

export async function notifyTicketAssigned(
  ticketId: string,
  ticketTitle: string,
  assignedToId: string
) {
  return createNotification({
    userId: assignedToId,
    type: 'TICKET_ASSIGNED',
    title: `Ticket assigned to you: ${ticketTitle}`,
    entityType: 'ticket',
    entityId: ticketId,
  })
}

export async function notifyStatusChanged(
  entityType: 'lead' | 'project' | 'ticket',
  entityId: string,
  entityTitle: string,
  newStatus: string,
  changedById: string
) {
  return notifyAdmins(
    {
      type: 'STATUS_CHANGED',
      title: `${entityType} status changed to ${newStatus}: ${entityTitle}`,
      entityType,
      entityId,
    },
    changedById
  )
}

export async function notifyFeedbackRoundExceeded(
  projectId: string,
  projectTitle: string,
  roundNumber: number
) {
  return notifyAdmins({
    type: 'FEEDBACK_ROUND_EXCEEDED',
    title: `Extra feedback round #${roundNumber} on: ${projectTitle}`,
    body: 'Package limit exceeded. This round is billable extra work.',
    entityType: 'project',
    entityId: projectId,
  })
}

export async function notifyCommentAdded(
  ticketId: string,
  ticketTitle: string,
  commentAuthorId: string,
  assignedToId?: string | null
) {
  const targets = new Set<string>()

  // Notify assigned user if different from commenter
  if (assignedToId && assignedToId !== commentAuthorId) {
    targets.add(assignedToId)
  }

  // Also notify admins
  const admins = await db.user.findMany({
    where: {
      role: { in: ['SUPER_ADMIN', 'ADMIN'] },
      isActive: true,
      id: { not: commentAuthorId },
    },
    select: { id: true },
  })

  admins.forEach((a) => targets.add(a.id))

  const notifications = Array.from(targets).map((userId) => ({
    userId,
    type: 'COMMENT_ADDED' as NotificationType,
    title: `New comment on: ${ticketTitle}`,
    entityType: 'ticket',
    entityId: ticketId,
    body: null,
    readAt: null,
  }))

  if (notifications.length > 0) {
    await db.notification.createMany({ data: notifications })
  }
}
