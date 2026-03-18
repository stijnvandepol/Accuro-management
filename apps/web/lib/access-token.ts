import { jwtVerify } from 'jose'

export interface VerifiedAccessToken {
  sub: string
  email: string
  role: string
}

function getJwtSecret(): Uint8Array {
  const value = process.env.JWT_SECRET
  if (!value || value.length < 32) {
    throw new Error('JWT_SECRET is not configured correctly')
  }
  return new TextEncoder().encode(value)
}

export async function verifyAccessTokenOnly(token: string): Promise<VerifiedAccessToken | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret())
    return {
      sub: payload.sub as string,
      email: payload.email as string,
      role: payload.role as string,
    }
  } catch {
    return null
  }
}
