import Link from 'next/link'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import db from '@/lib/db'
import { TicketForm } from '@/components/tickets/ticket-form'
import { allowedTransitionsFrom } from '@/lib/transitions'
import { buildTicketScopeWhere } from '@/lib/ticket-policy'
import type { AuthContext } from '@/lib/api-helpers'

export default async function EditTicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const headersList = await headers()
  const auth: AuthContext = {
    userId: headersList.get('x-user-id') ?? '',
    email: headersList.get('x-user-email') ?? '',
    role: (headersList.get('x-user-role') as AuthContext['role']) ?? 'DEVELOPER',
    isApiKey: false,
  }

  const [ticket, clients, contacts, projects, users] = await Promise.all([
    db.ticket.findFirst({
      where: buildTicketScopeWhere(auth, { id }),
      include: { client: true, clientContact: true },
    }),
    db.client.findMany({ where: { deletedAt: null, isActive: true }, orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    db.clientContact.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true, clientId: true } }),
    db.project.findMany({ where: { deletedAt: null, isActive: true }, orderBy: { title: 'asc' }, select: { id: true, title: true, clientId: true } }),
    db.user.findMany({ where: { isActive: true }, orderBy: { name: 'asc' }, select: { id: true, name: true } }),
  ])

  if (!ticket) notFound()

  const allowedStatuses = [ticket.status, ...allowedTransitionsFrom(ticket.status)]

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/tickets" className="hover:text-gray-800">Tickets</Link>
        <span>/</span>
        <Link href={`/tickets/${ticket.id}`} className="hover:text-gray-800">{ticket.ticketNumber}</Link>
        <span>/</span>
        <span>Edit</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Edit ticket</h1>
        <p className="mt-1 text-sm text-gray-500">{ticket.ticketNumber} {ticket.title}</p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <TicketForm
          mode="edit"
          clients={clients}
          contacts={contacts}
          projects={projects}
          users={users}
          allowedStatuses={allowedStatuses}
          initialData={{
            id: ticket.id,
            version: ticket.version,
            title: ticket.title,
            description: ticket.description ?? '',
            clientId: ticket.clientId ?? '',
            clientContactId: ticket.clientContactId ?? '',
            projectId: ticket.projectId ?? '',
            assignedToId: ticket.assignedToId ?? '',
            priority: ticket.priority,
            type: ticket.type,
            category: ticket.category ?? '',
            labels: ticket.labels,
            dueDate: ticket.dueDate ? ticket.dueDate.toISOString().slice(0, 10) : '',
            approvalStatus: ticket.approvalStatus,
            paymentStatus: ticket.paymentStatus,
            status: ticket.status,
          }}
        />
      </div>
    </div>
  )
}
