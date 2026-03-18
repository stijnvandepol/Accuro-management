import { NextRequest } from 'next/server'
import { rotateRefreshToken, setAuthCookies } from '@/lib/auth'
import { ok, unauthorized, withErrorHandler } from '@/lib/api-helpers'

export const POST = withErrorHandler(async (req: NextRequest) => {
  const refreshToken = req.cookies.get('refresh_token')?.value
  if (!refreshToken) return unauthorized('No refresh token')

  const result = await rotateRefreshToken(refreshToken)
  if (!result) return unauthorized('Invalid or expired refresh token')

  await setAuthCookies(result.accessToken, result.refreshToken)

  return ok({
    user: result.user,
  })
})
