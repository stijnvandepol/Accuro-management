import db from './db'
import type { AuthContext } from './api-helpers'
import { buildTicketScopeWhere } from './ticket-policy'

export async function findScopedTicket(
  auth: AuthContext,
  ticketId: string,
  includeArchived = false
) {
  return db.ticket.findFirst({
    where: buildTicketScopeWhere(auth, { id: ticketId, includeArchived }),
  })
}

export async function validateTicketRelationships(input: {
  clientId?: string | null
  clientContactId?: string | null
  projectId?: string | null
  assignedToId?: string | null
}) {
  const [client, contact, project, assignee] = await Promise.all([
    input.clientId
      ? db.client.findFirst({ where: { id: input.clientId, deletedAt: null, isActive: true } })
      : Promise.resolve(null),
    input.clientContactId
      ? db.clientContact.findUnique({ where: { id: input.clientContactId } })
      : Promise.resolve(null),
    input.projectId
      ? db.project.findFirst({ where: { id: input.projectId, deletedAt: null, isActive: true } })
      : Promise.resolve(null),
    input.assignedToId
      ? db.user.findFirst({ where: { id: input.assignedToId, isActive: true } })
      : Promise.resolve(null),
  ])

  if (input.clientId && !client) return { ok: false as const, message: 'Client not found or inactive' }
  if (input.clientContactId && !contact) return { ok: false as const, message: 'Client contact not found' }
  if (input.projectId && !project) return { ok: false as const, message: 'Project not found or inactive' }
  if (input.assignedToId && !assignee) return { ok: false as const, message: 'Assignee not found or inactive' }

  const effectiveClientId = input.clientId ?? project?.clientId ?? null
  if (contact && effectiveClientId && contact.clientId !== effectiveClientId) {
    return { ok: false as const, message: 'Client contact does not belong to the selected client' }
  }

  if (project && effectiveClientId && project.clientId !== effectiveClientId) {
    return { ok: false as const, message: 'Project does not belong to the selected client' }
  }

  return {
    ok: true as const,
    data: {
      clientId: effectiveClientId,
      clientContactId: input.clientContactId ?? null,
      projectId: input.projectId ?? null,
      assignedToId: input.assignedToId ?? null,
    },
  }
}
