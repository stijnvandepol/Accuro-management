import type { Prisma, Role, Ticket, TicketStatus } from '@prisma/client'
import type { AuthContext } from './api-helpers'

export interface TicketAccessOptions {
  includeArchived?: boolean
  id?: string
}

export function canRoleBypassTicketScope(role: Role): boolean {
  return role === 'SUPER_ADMIN' || role === 'ADMIN' || role === 'PROJECT_MANAGER'
}

export function buildTicketScopeWhere(
  auth: AuthContext,
  options: TicketAccessOptions = {}
): Prisma.TicketWhereInput {
  const includeArchived = options.includeArchived === true

  return {
    ...(options.id ? { id: options.id } : {}),
    ...(includeArchived ? {} : { deletedAt: null }),
    ...(!canRoleBypassTicketScope(auth.role) && auth.role === 'DEVELOPER'
      ? { assignedToId: auth.userId }
      : {}),
  }
}

export function canMutateTicket(auth: AuthContext, ticket: Pick<Ticket, 'assignedToId'>): boolean {
  if (canRoleBypassTicketScope(auth.role)) return true
  if (auth.role === 'DEVELOPER') return ticket.assignedToId === auth.userId
  return false
}

export function canArchiveTicket(role: Role): boolean {
  return role === 'SUPER_ADMIN' || role === 'ADMIN' || role === 'PROJECT_MANAGER'
}

export function canRestoreTicket(role: Role): boolean {
  return canArchiveTicket(role)
}

export function isArchivedTicket(ticket: Pick<Ticket, 'deletedAt' | 'archivedAt'>): boolean {
  return ticket.deletedAt !== null || ticket.archivedAt !== null
}

export function canTransitionToDone(status: TicketStatus): boolean {
  return status !== 'OPEN'
}
