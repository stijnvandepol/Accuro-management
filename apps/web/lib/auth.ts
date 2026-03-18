import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'
import crypto from 'crypto'
import db from './db'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'fallback-dev-secret-min-32-chars-long'
)
const REFRESH_SECRET = new TextEncoder().encode(
  process.env.REFRESH_TOKEN_SECRET ?? 'fallback-refresh-secret-32-chars-xx'
)

export interface JWTPayload {
  sub: string      // userId
  email: string
  role: string
  iat?: number
  exp?: number
}

export interface RefreshPayload {
  sub: string
  family: string
  tokenId: string
}

// ─── Token generation ─────────────────────────────────────────────────────────

export async function signAccessToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): Promise<string> {
  return new SignJWT({ email: payload.email, role: payload.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(JWT_SECRET)
}

export async function signRefreshToken(
  userId: string,
  family: string,
  tokenId: string
): Promise<string> {
  return new SignJWT({ family, tokenId })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(REFRESH_SECRET)
}

// ─── Token verification ───────────────────────────────────────────────────────

export async function verifyAccessToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return {
      sub: payload.sub as string,
      email: payload.email as string,
      role: payload.role as string,
    }
  } catch {
    return null
  }
}

export async function verifyRefreshToken(token: string): Promise<RefreshPayload | null> {
  try {
    const { payload } = await jwtVerify(token, REFRESH_SECRET)
    return {
      sub: payload.sub as string,
      family: payload.family as string,
      tokenId: payload.tokenId as string,
    }
  } catch {
    return null
  }
}

// ─── Cookie helpers ───────────────────────────────────────────────────────────

export async function setAuthCookies(
  accessToken: string,
  refreshToken: string
): Promise<void> {
  const cookieStore = await cookies()
  const isProduction = process.env.NODE_ENV === 'production'

  cookieStore.set('access_token', accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: 15 * 60, // 15 minutes
    path: '/',
  })

  cookieStore.set('refresh_token', refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60, // 7 days
    path: '/api/v1/auth/refresh',
  })
}

export async function clearAuthCookies(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete('access_token')
  cookieStore.delete('refresh_token')
}

// ─── Get current user ─────────────────────────────────────────────────────────

export async function getCurrentUser(req?: NextRequest): Promise<JWTPayload | null> {
  let token: string | undefined

  if (req) {
    token = req.cookies.get('access_token')?.value
  } else {
    const cookieStore = await cookies()
    token = cookieStore.get('access_token')?.value
  }

  if (!token) return null
  return verifyAccessToken(token)
}

// ─── Refresh token rotation ───────────────────────────────────────────────────

export async function rotateRefreshToken(refreshToken: string): Promise<{
  accessToken: string
  refreshToken: string
  user: { id: string; email: string; role: string }
} | null> {
  const payload = await verifyRefreshToken(refreshToken)
  if (!payload) return null

  // Look up the stored token
  const stored = await db.refreshToken.findUnique({
    where: { token: refreshToken },
    include: { user: true },
  })

  if (!stored || stored.expiresAt < new Date()) {
    // Expired or not found — invalidate entire family (token reuse attack)
    if (stored) {
      await db.refreshToken.deleteMany({ where: { family: stored.family } })
    }
    return null
  }

  if (stored.usedAt) {
    // Token reuse detected — invalidate entire family
    await db.refreshToken.deleteMany({ where: { family: stored.family } })
    return null
  }

  // Mark old token as used
  await db.refreshToken.update({
    where: { id: stored.id },
    data: { usedAt: new Date() },
  })

  // Issue new tokens
  const user = stored.user
  const newFamily = stored.family
  const newTokenId = crypto.randomBytes(16).toString('hex')
  const newRefreshRaw = crypto.randomBytes(32).toString('hex')

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  await db.refreshToken.create({
    data: {
      token: newRefreshRaw,
      userId: user.id,
      family: newFamily,
      expiresAt,
    },
  })

  const accessToken = await signAccessToken({
    sub: user.id,
    email: user.email,
    role: user.role,
  })

  const newRefreshToken = await signRefreshToken(user.id, newFamily, newTokenId)

  // Update stored token with signed JWT (we need the JWT for cookie)
  // Actually store the raw random token for lookup, sign separately
  // We store raw token as the lookup key
  await db.refreshToken.updateMany({
    where: { token: newRefreshRaw },
    data: { token: newRefreshToken },
  })

  return {
    accessToken,
    refreshToken: newRefreshToken,
    user: { id: user.id, email: user.email, role: user.role },
  }
}

// ─── Create session (login) ───────────────────────────────────────────────────

export async function createSession(userId: string): Promise<{
  accessToken: string
  refreshToken: string
}> {
  const family = crypto.randomBytes(16).toString('hex')
  const tokenId = crypto.randomBytes(16).toString('hex')
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, role: true },
  })

  if (!user) throw new Error('User not found')

  const accessToken = await signAccessToken({
    sub: user.id,
    email: user.email,
    role: user.role,
  })

  const refreshToken = await signRefreshToken(user.id, family, tokenId)

  await db.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      family,
      expiresAt,
    },
  })

  return { accessToken, refreshToken }
}

// ─── Revoke session ───────────────────────────────────────────────────────────

export async function revokeSession(refreshToken: string): Promise<void> {
  await db.refreshToken.deleteMany({ where: { token: refreshToken } })
}

// ─── API Key auth ─────────────────────────────────────────────────────────────

export async function verifyApiKey(apiKey: string): Promise<{
  userId: string
  scopes: string[]
} | null> {
  if (!apiKey.startsWith('wv_')) return null

  const hash = crypto.createHash('sha256').update(apiKey).digest('hex')

  const key = await db.apiKey.findUnique({
    where: { keyHash: hash },
    select: {
      id: true,
      isActive: true,
      expiresAt: true,
      scopes: true,
      createdById: true,
    },
  })

  if (!key || !key.isActive) return null
  if (key.expiresAt && key.expiresAt < new Date()) return null

  // Update last used
  await db.apiKey.update({
    where: { id: key.id },
    data: { lastUsedAt: new Date() },
  })

  return { userId: key.createdById, scopes: key.scopes }
}
