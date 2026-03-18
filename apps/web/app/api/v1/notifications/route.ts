import { NextRequest } from 'next/server'
import db from '@/lib/db'
import {
  requireAuth,
  isAuthContext,
  requirePermission,
  ok,
  withErrorHandler,
  parsePagination,
  paginationMeta,
} from '@/lib/api-helpers'

export const GET = withErrorHandler(async (req: NextRequest) => {
  const auth = await requireAuth(req)
  if (!isAuthContext(auth)) return auth

  const permErr = requirePermission(auth, 'notifications:read')
  if (permErr) return permErr

  const { searchParams } = req.nextUrl
  const { page, limit, skip } = parsePagination(searchParams)
  const unreadOnly = searchParams.get('unreadOnly') === 'true'

  const where = {
    userId: auth.userId,
    ...(unreadOnly ? { isRead: false } : {}),
  }

  const [notifications, total, unreadCount] = await Promise.all([
    db.notification.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    db.notification.count({ where }),
    db.notification.count({ where: { userId: auth.userId, isRead: false } }),
  ])

  return ok(notifications, { ...paginationMeta(total, page, limit), unreadCount })
})

// POST /api/v1/notifications/read-all
export const POST = withErrorHandler(async (req: NextRequest) => {
  const auth = await requireAuth(req)
  if (!isAuthContext(auth)) return auth

  const permErr = requirePermission(auth, 'notifications:read')
  if (permErr) return permErr

  const url = req.nextUrl.pathname
  if (!url.endsWith('/read-all')) {
    return ok({ message: 'Unknown action' })
  }

  const result = await db.notification.updateMany({
    where: { userId: auth.userId, isRead: false },
    data: { isRead: true, readAt: new Date() },
  })

  return ok({ marked: result.count })
})
