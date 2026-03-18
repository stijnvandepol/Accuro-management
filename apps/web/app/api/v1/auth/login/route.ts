import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import db from '@/lib/db'
import { createSession, setAuthCookies } from '@/lib/auth'
import {
  ok,
  badRequest,
  unauthorized,
  tooManyRequests,
  serverError,
  withErrorHandler,
} from '@/lib/api-helpers'
import { authRateLimit } from '@/lib/rate-limit'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const POST = withErrorHandler(async (req: NextRequest) => {
  // Rate limiting
  const rl = await authRateLimit(req)
  if (!rl.allowed) return tooManyRequests(rl.reset)

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return badRequest('Invalid JSON')
  }

  const result = loginSchema.safeParse(body)
  if (!result.success) {
    return badRequest('Invalid credentials')
  }

  const { email, password } = result.data

  const user = await db.user.findUnique({
    where: { email: email.toLowerCase() },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      passwordHash: true,
    },
  })

  if (!user || !user.isActive) {
    // Constant time response to prevent user enumeration
    await bcrypt.compare(password, '$2a$10$invalidhashfortimingattackprevention')
    return unauthorized('Invalid email or password')
  }

  const passwordValid = await bcrypt.compare(password, user.passwordHash)
  if (!passwordValid) {
    return unauthorized('Invalid email or password')
  }

  const { accessToken, refreshToken } = await createSession(user.id)
  await setAuthCookies(accessToken, refreshToken)

  return ok({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  })
})
