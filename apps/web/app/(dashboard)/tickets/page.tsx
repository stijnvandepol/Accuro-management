import { headers } from 'next/headers'
import Link from 'next/link'
import db from '@/lib/db'
import { formatDate } from '@/lib/utils'
import { buildTicketScopeWhere } from '@/lib/ticket-policy'
import type { AuthContext } from '@/lib/api-helpers'

function statusLabel(value: string) {
  return value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase())
}

export default async function TicketsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const headersList = await headers()
  const auth: AuthContext = {
    userId: headersList.get('x-user-id') ?? '',
    email: headersList.get('x-user-email') ?? '',
    role: (headersList.get('x-user-role') as AuthContext['role']) ?? 'DEVELOPER',
    isApiKey: false,
  }

  const page = Math.max(1, Number(params.page ?? '1'))
  const limit = 25
  const skip = (page - 1) * limit
  const search = typeof params.search === 'string' ? params.search : ''
  const status = typeof params.status === 'string' ? params.status : ''
  const priority = typeof params.priority === 'string' ? params.priority : ''
  const archived = params.archived === 'true'
  const overdue = params.view === 'overdue'

  const where = {
    ...buildTicketScopeWhere(auth, { includeArchived: archived }),
    ...(status ? { status: status as never } : {}),
    ...(priority ? { priority: priority as never } : {}),
    ...(overdue ? { dueDate: { lt: new Date() } } : {}),
    ...(search
      ? {
          OR: [
            { ticketNumber: { contains: search, mode: 'insensitive' as const } },
            { title: { contains: search, mode: 'insensitive' as const } },
            { client: { name: { contains: search, mode: 'insensitive' as const } } },
          ],
        }
      : {}),
  }

  const [tickets, total] = await Promise.all([
    db.ticket.findMany({
      where,
      include: {
        client: { select: { name: true } },
        project: { select: { id: true, title: true } },
        assignedTo: { select: { name: true } },
      },
      orderBy: [{ updatedAt: 'desc' }],
      skip,
      take: limit,
    }),
    db.ticket.count({ where }),
  ])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tickets</h1>
          <p className="mt-1 text-sm text-gray-500">Search, filter and work through active and archived tickets.</p>
        </div>
        <Link href="/tickets/new" className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          New ticket
        </Link>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4">
        <form className="grid gap-3 md:grid-cols-4">
          <input name="search" defaultValue={search} placeholder="Search ticket, title, client" className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          <select name="status" defaultValue={status} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
            <option value="">All statuses</option>
            {['OPEN', 'IN_PROGRESS', 'WAITING_FOR_CLIENT', 'APPROVAL_PENDING', 'WAITING_FOR_PAYMENT', 'FEEDBACK_REQUESTED', 'IN_REVIEW', 'DONE', 'CANCELLED', 'ON_HOLD'].map((value) => (
              <option key={value} value={value}>{statusLabel(value)}</option>
            ))}
          </select>
          <select name="priority" defaultValue={priority} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
            <option value="">All priorities</option>
            {['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
          <div className="flex gap-2">
            <select name="archived" defaultValue={archived ? 'true' : 'false'} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
              <option value="false">Active tickets</option>
              <option value="true">Archived tickets</option>
            </select>
            <button className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white">Apply</button>
          </div>
        </form>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          ['all', '/tickets'],
          ['my', '/tickets'],
          ['waiting', '/tickets?status=WAITING_FOR_CLIENT'],
          ['blocked', '/tickets?status=ON_HOLD'],
          ['overdue', '/tickets?view=overdue'],
          ['done', '/tickets?status=DONE'],
          ['archived', '/tickets?archived=true'],
        ].map(([label, href]) => (
          <Link key={label} href={href} className="rounded-full bg-gray-100 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-200">
            {label}
          </Link>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Ticket</th>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Project</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Assignee</th>
                <th className="px-4 py-3">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tickets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-400">
                    {search || status || priority ? 'No tickets match the current filters.' : 'No tickets found yet.'}
                  </td>
                </tr>
              ) : (
                tickets.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link href={`/tickets/${ticket.id}${ticket.deletedAt ? '?archived=true' : ''}`} className="font-medium text-blue-600 hover:underline">
                        {ticket.ticketNumber}
                      </Link>
                      <p className="mt-1 text-sm text-gray-700">{ticket.title}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{ticket.client?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{ticket.project?.title ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{statusLabel(ticket.status)}</td>
                    <td className="px-4 py-3 text-gray-600">{ticket.priority}</td>
                    <td className="px-4 py-3 text-gray-600">{ticket.assignedTo?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(ticket.updatedAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>{total} tickets</span>
        <div className="flex gap-2">
          {page > 1 && (
            <Link href={`/tickets?page=${page - 1}`} className="rounded-lg border border-gray-300 px-3 py-1.5 hover:bg-gray-50">
              Previous
            </Link>
          )}
          {page * limit < total && (
            <Link href={`/tickets?page=${page + 1}`} className="rounded-lg border border-gray-300 px-3 py-1.5 hover:bg-gray-50">
              Next
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
