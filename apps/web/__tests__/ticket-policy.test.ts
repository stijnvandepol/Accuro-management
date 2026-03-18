import { describe, expect, it } from 'vitest'
import { buildTicketScopeWhere, canArchiveTicket, canMutateTicket } from '../lib/ticket-policy'
import type { AuthContext } from '../lib/api-helpers'

const admin: AuthContext = {
  userId: 'admin_1',
  email: 'admin@example.com',
  role: 'ADMIN',
  isApiKey: false,
}

const developer: AuthContext = {
  userId: 'dev_1',
  email: 'dev@example.com',
  role: 'DEVELOPER',
  isApiKey: false,
}

describe('buildTicketScopeWhere', () => {
  it('limits developers to assigned tickets and active records', () => {
    expect(buildTicketScopeWhere(developer)).toMatchObject({
      assignedToId: 'dev_1',
      deletedAt: null,
    })
  })

  it('lets admins include archived tickets', () => {
    expect(buildTicketScopeWhere(admin, { includeArchived: true, id: 't1' })).toMatchObject({
      id: 't1',
    })
    expect(buildTicketScopeWhere(admin, { includeArchived: true, id: 't1' })).not.toHaveProperty('deletedAt')
  })
})

describe('canMutateTicket', () => {
  it('allows admins to mutate any ticket', () => {
    expect(canMutateTicket(admin, { assignedToId: null })).toBe(true)
  })

  it('only allows developers to mutate assigned tickets', () => {
    expect(canMutateTicket(developer, { assignedToId: 'dev_1' })).toBe(true)
    expect(canMutateTicket(developer, { assignedToId: 'other' })).toBe(false)
  })
})

describe('canArchiveTicket', () => {
  it('only permits admin-like roles', () => {
    expect(canArchiveTicket('ADMIN')).toBe(true)
    expect(canArchiveTicket('PROJECT_MANAGER')).toBe(true)
    expect(canArchiveTicket('DEVELOPER')).toBe(false)
  })
})
