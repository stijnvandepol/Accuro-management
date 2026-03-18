import { NextRequest } from 'next/server'
import db from '@/lib/db'
import { requireAuth, isAuthContext, ok, withErrorHandler } from '@/lib/api-helpers'

export const GET = withErrorHandler(async (req: NextRequest) => {
  const auth = await requireAuth(req)
  if (!isAuthContext(auth)) return auth

  const user = await db.user.findUnique({
    where: { id: auth.userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  })

  return ok(user)
})
