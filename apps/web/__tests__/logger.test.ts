import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'

// Must run before logger module load to avoid process.stdout.write in test output
;(process.env as Record<string, string | undefined>).NODE_ENV = 'test'

let logger: typeof import('../lib/logger').logger

beforeAll(async () => {
  const mod = await import('../lib/logger')
  logger = mod.logger
})

describe('logger', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'info').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('exposes debug, info, warn, error methods', () => {
    expect(typeof logger.debug).toBe('function')
    expect(typeof logger.info).toBe('function')
    expect(typeof logger.warn).toBe('function')
    expect(typeof logger.error).toBe('function')
  })

  it('redacts password fields', () => {
    const writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    const origEnv = process.env.NODE_ENV
    ;(process.env as Record<string, string | undefined>).NODE_ENV = 'production'

    logger.info('test', { password: 'super_secret', userId: 'u1' })

    const calls = writeSpy.mock.calls
    const written = calls.map((c) => c[0]).join('')
    expect(written).toContain('[REDACTED]')
    expect(written).not.toContain('super_secret')
    expect(written).toContain('u1')

    ;(process.env as Record<string, string | undefined>).NODE_ENV = origEnv
    writeSpy.mockRestore()
  })

  it('redacts token fields', () => {
    const writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    const origEnv = process.env.NODE_ENV
    ;(process.env as Record<string, string | undefined>).NODE_ENV = 'production'

    logger.info('test', { accessToken: 'jwt.token.here', userId: 'u2' })

    const written = writeSpy.mock.calls.map((c) => c[0]).join('')
    expect(written).not.toContain('jwt.token.here')

    ;(process.env as Record<string, string | undefined>).NODE_ENV = origEnv
    writeSpy.mockRestore()
  })

  it('redacts cookie and signature fields', () => {
    const writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    const origEnv = process.env.NODE_ENV
    ;(process.env as Record<string, string | undefined>).NODE_ENV = 'production'

    logger.info('test', { cookie: 'access_token=secret', signature: 'hmac-value' })

    const written = writeSpy.mock.calls.map((c) => c[0]).join('')
    expect(written).not.toContain('access_token=secret')
    expect(written).not.toContain('hmac-value')

    ;(process.env as Record<string, string | undefined>).NODE_ENV = origEnv
    writeSpy.mockRestore()
  })

  it('does not redact non-sensitive fields', () => {
    const writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    const origEnv = process.env.NODE_ENV
    ;(process.env as Record<string, string | undefined>).NODE_ENV = 'production'

    logger.info('test', { entityId: 'ticket_123', action: 'created' })

    const written = writeSpy.mock.calls.map((c) => c[0]).join('')
    expect(written).toContain('ticket_123')
    expect(written).toContain('created')

    ;(process.env as Record<string, string | undefined>).NODE_ENV = origEnv
    writeSpy.mockRestore()
  })
})
