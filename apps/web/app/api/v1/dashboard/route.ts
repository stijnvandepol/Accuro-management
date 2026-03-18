import { NextRequest } from 'next/server'
import db from '@/lib/db'
import {
  requireAuth,
  isAuthContext,
  ok,
  withErrorHandler,
} from '@/lib/api-helpers'

export const GET = withErrorHandler(async (req: NextRequest) => {
  const auth = await requireAuth(req)
  if (!isAuthContext(auth)) return auth

  const isDeveloper = auth.role === 'DEVELOPER'
  const projectFilter = isDeveloper ? { assignedToId: auth.userId } : {}

  const [
    openLeads,
    activeProjects,
    openTickets,
    waitingForClient,
    urgentTickets,
    recentActivity,
    projectsByStatus,
    ticketsByPriority,
    recentLeads,
    overdueTickets,
  ] = await Promise.all([
    // Open leads count (non-developers)
    isDeveloper
      ? Promise.resolve(0)
      : db.lead.count({
          where: {
            deletedAt: null,
            status: {
              notIn: ['CONVERTED_TO_PROJECT', 'REJECTED'],
            },
          },
        }),

    // Active projects
    db.project.count({
      where: {
        deletedAt: null,
        ...projectFilter,
        status: {
          notIn: ['COMPLETED', 'CANCELLED', 'HANDED_OVER'],
        },
      },
    }),

    // Open tickets
    db.ticket.count({
      where: {
        deletedAt: null,
        ...(isDeveloper ? { assignedToId: auth.userId } : {}),
        status: { notIn: ['DONE', 'CANCELLED'] },
      },
    }),

    // Waiting for client
    db.ticket.count({
      where: {
        deletedAt: null,
        ...(isDeveloper ? { assignedToId: auth.userId } : {}),
        status: 'WAITING_FOR_CLIENT',
      },
    }),

    // Urgent tickets
    db.ticket.count({
      where: {
        deletedAt: null,
        ...(isDeveloper ? { assignedToId: auth.userId } : {}),
        priority: 'URGENT',
        status: { notIn: ['DONE', 'CANCELLED'] },
      },
    }),

    // Recent activity
    db.activityLog.findMany({
      where: isDeveloper ? { userId: auth.userId } : {},
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        user: { select: { id: true, name: true } },
      },
    }),

    // Projects by status breakdown
    db.project.groupBy({
      by: ['status'],
      where: { deletedAt: null, ...projectFilter },
      _count: true,
    }),

    // Tickets by priority
    db.ticket.groupBy({
      by: ['priority'],
      where: {
        deletedAt: null,
        ...(isDeveloper ? { assignedToId: auth.userId } : {}),
        status: { notIn: ['DONE', 'CANCELLED'] },
      },
      _count: true,
    }),

    // Recent leads (non-developers)
    isDeveloper
      ? Promise.resolve([])
      : db.lead.findMany({
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            id: true,
            title: true,
            status: true,
            companyName: true,
            estimatedValue: true,
            createdAt: true,
          },
        }),

    // Overdue tickets (due date in past, not done)
    db.ticket.count({
      where: {
        deletedAt: null,
        ...(isDeveloper ? { assignedToId: auth.userId } : {}),
        status: { notIn: ['DONE', 'CANCELLED'] },
        dueDate: { lt: new Date() },
      },
    }),
  ])

  // Get active projects with details
  const activeProjectsList = await db.project.findMany({
    where: {
      deletedAt: null,
      ...projectFilter,
      status: { notIn: ['COMPLETED', 'CANCELLED', 'HANDED_OVER'] },
    },
    take: 8,
    orderBy: { updatedAt: 'desc' },
    include: {
      client: { select: { id: true, name: true } },
      _count: {
        select: {
          tickets: {
            where: { deletedAt: null, status: { notIn: ['DONE', 'CANCELLED'] } },
          },
        },
      },
    },
  })

  return ok({
    stats: {
      openLeads,
      activeProjects,
      openTickets,
      waitingForClient,
      urgentTickets,
      overdueTickets,
    },
    recentActivity,
    projectsByStatus: Object.fromEntries(
      projectsByStatus.map((p) => [p.status, p._count])
    ),
    ticketsByPriority: Object.fromEntries(
      ticketsByPriority.map((t) => [t.priority, t._count])
    ),
    recentLeads,
    activeProjects: activeProjectsList,
  })
})
