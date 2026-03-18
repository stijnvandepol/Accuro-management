import { headers } from 'next/headers'
import Link from 'next/link'
import db from '@/lib/db'
import { formatDate } from '@/lib/utils'

function statusLabel(s: string) {
  return s.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
}

function priorityColor(p: string) {
  const map: Record<string, string> = {
    URGENT: 'text-red-700 bg-red-100',
    HIGH: 'text-orange-700 bg-orange-100',
    MEDIUM: 'text-blue-700 bg-blue-100',
    LOW: 'text-gray-600 bg-gray-100',
  }
  return map[p] ?? 'text-gray-600 bg-gray-100'
}

function typeColor(t: string) {
  const map: Record<string, string> = {
    BUG: 'text-red-600',
    FEEDBACK: 'text-purple-600',
    FEATURE: 'text-blue-600',
    TASK: 'text-gray-600',
    QUESTION: 'text-yellow-600',
    INTAKE: 'text-indigo-600',
  }
  return map[t] ?? 'text-gray-600'
}

export default async function TicketsPage() {
  const headersList = await headers()
  const userId = headersList.get('x-user-id') ?? ''
  const role = headersList.get('x-user-role') ?? 'DEVELOPER'
  const isDeveloper = role === 'DEVELOPER'

  const tickets = await db.ticket.findMany({
    where: {
      deletedAt: null,
      ...(isDeveloper ? { assignedToId: userId } : {}),
    },
    orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    take: 50,
    include: {
      project: { select: { id: true, title: true, client: { select: { name: true } } } },
      assignedTo: { select: { name: true } },
      _count: { select: { comments: true } },
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Tickets</h2>
          <p className="text-sm text-gray-500 mt-1">{tickets.length} tickets</p>
        </div>
        <Link
          href="/tickets/new"
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          + New Ticket
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Ticket</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Project</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Priority</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Assigned</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {tickets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-400">No tickets yet</td>
                </tr>
              ) : (
                tickets.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <Link href={`/tickets/${ticket.id}`} className="font-medium text-blue-600 hover:underline">
                        {ticket.title}
                      </Link>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-xs font-medium ${typeColor(ticket.type)}`}>
                          {ticket.type}
                        </span>
                        {ticket.isExtraWork && (
                          <span className="text-xs text-orange-600">Extra Work</span>
                        )}
                        {ticket._count.comments > 0 && (
                          <span className="text-xs text-gray-400">{ticket._count.comments} comments</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-gray-600">
                      {ticket.project ? (
                        <Link href={`/projects/${ticket.project.id}`} className="hover:underline">
                          {ticket.project.client.name}
                        </Link>
                      ) : '—'}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${priorityColor(ticket.priority)}`}>
                        {ticket.priority}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-xs text-gray-600">{statusLabel(ticket.status)}</span>
                    </td>
                    <td className="px-5 py-3 text-gray-500">{ticket.assignedTo?.name ?? '—'}</td>
                    <td className="px-5 py-3 text-gray-500">{formatDate(ticket.updatedAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
