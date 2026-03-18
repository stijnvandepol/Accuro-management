import { NextRequest } from 'next/server'
import db from '@/lib/db'
import {
  requireAuth,
  isAuthContext,
  ok,
  notFound,
  forbidden,
  withErrorHandler,
} from '@/lib/api-helpers'

type Params = { params: Promise<{ id: string }> }

export const POST = withErrorHandler(async (req: NextRequest, { params }: Params) => {
  const { id } = await params
  const auth = await requireAuth(req)
  if (!isAuthContext(auth)) return auth

  const notification = await db.notification.findUnique({ where: { id } })
  if (!notification) return notFound('Notification not found')

  // IDOR prevention — users can only mark their own notifications
  if (notification.userId !== auth.userId) return forbidden()

  const updated = await db.notification.update({
    where: { id },
    data: { isRead: true, readAt: new Date() },
  })

  return ok(updated)
})
