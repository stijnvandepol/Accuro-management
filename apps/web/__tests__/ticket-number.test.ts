import { describe, expect, it } from 'vitest'
import { generateTicketNumber } from '../lib/ticket-number'

describe('generateTicketNumber', () => {
  it('uses the expected prefix and year', () => {
    const value = generateTicketNumber(new Date('2026-03-18T12:00:00.000Z'))
    expect(value).toMatch(/^TCK-2026-[A-F0-9]{6}$/)
  })

  it('generates unique values across calls', () => {
    const a = generateTicketNumber()
    const b = generateTicketNumber()
    expect(a).not.toBe(b)
  })
})
