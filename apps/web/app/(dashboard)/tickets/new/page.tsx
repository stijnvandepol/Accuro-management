import Link from 'next/link'
import db from '@/lib/db'
import { TicketForm } from '@/components/tickets/ticket-form'

export default async function NewTicketPage() {
  const [clients, contacts, projects, users] = await Promise.all([
    db.client.findMany({ where: { deletedAt: null, isActive: true }, orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    db.clientContact.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true, clientId: true } }),
    db.project.findMany({ where: { deletedAt: null, isActive: true }, orderBy: { title: 'asc' }, select: { id: true, title: true, clientId: true } }),
    db.user.findMany({ where: { isActive: true }, orderBy: { name: 'asc' }, select: { id: true, name: true } }),
  ])

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/tickets" className="hover:text-gray-800">Tickets</Link>
        <span>/</span>
        <span>New</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Create ticket</h1>
        <p className="mt-1 text-sm text-gray-500">Create a production-ready ticket with client, project and ownership context.</p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <TicketForm mode="create" clients={clients} contacts={contacts} projects={projects} users={users} />
      </div>
    </div>
  )
}
