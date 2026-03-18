import { NextRequest } from 'next/server'
import { clearAuthCookies, revokeSession } from '@/lib/auth'
import { ok, withErrorHandler } from '@/lib/api-helpers'

export const POST = withErrorHandler(async (req: NextRequest) => {
  const refreshToken = req.cookies.get('refresh_token')?.value
  if (refreshToken) {
    await revokeSession(refreshToken)
  }
  await clearAuthCookies()
  return ok({ message: 'Logged out successfully' })
})
