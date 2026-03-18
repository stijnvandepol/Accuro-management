import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { buildAuthRateLimitKey, shouldBypassAuthRateLimit } from '../lib/rate-limit'

function makeRequest(headers: Record<string, string> = {}) {
  return {
    headers: {
      get(name: string) {
        return headers[name.toLowerCase()] ?? headers[name] ?? null
      },
    },
  } as unknown as import('next/server').NextRequest
}

describe('buildAuthRateLimitKey', () => {
  it('uses ip and normalized email when email is present', () => {
    const req = makeRequest({ 'x-forwarded-for': '203.0.113.10' })
    expect(buildAuthRateLimitKey(req, '  USER@Example.com ')).toBe('auth:203.0.113.10:user@example.com')
  })

  it('falls back to ip-only when email is absent', () => {
    const req = makeRequest({ 'x-real-ip': '198.51.100.2' })
    expect(buildAuthRateLimitKey(req)).toBe('auth:198.51.100.2')
  })
})

describe('shouldBypassAuthRateLimit', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('bypasses auth rate limiting outside production', () => {
    vi.stubEnv('NODE_ENV', 'development')
    const req = makeRequest({ 'x-forwarded-for': '203.0.113.10' })
    expect(shouldBypassAuthRateLimit(req)).toBe(true)
  })

  it('bypasses auth rate limiting for localhost/private ips in production', () => {
    vi.stubEnv('NODE_ENV', 'production')
    expect(shouldBypassAuthRateLimit(makeRequest({ 'x-forwarded-for': '127.0.0.1' }))).toBe(true)
    expect(shouldBypassAuthRateLimit(makeRequest({ 'x-forwarded-for': '192.168.1.50' }))).toBe(true)
  })

  it('does not bypass auth rate limiting for public ips in production', () => {
    vi.stubEnv('NODE_ENV', 'production')
    const req = makeRequest({ 'x-forwarded-for': '203.0.113.10' })
    expect(shouldBypassAuthRateLimit(req)).toBe(false)
  })
})
