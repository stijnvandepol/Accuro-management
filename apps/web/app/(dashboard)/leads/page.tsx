import { headers } from 'next/headers'
import Link from 'next/link'
import db from '@/lib/db'
import { formatDate, formatCurrency } from '@/lib/utils'

function statusLabel(s: string) {
  return s.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
}

function statusColor(status: string) {
  const map: Record<string, string> = {
    NEW_REQUEST: 'bg-blue-100 text-blue-700',
    INTAKE_IN_PROGRESS: 'bg-yellow-100 text-yellow-700',
    DEMO_SCHEDULED: 'bg-purple-100 text-purple-700',
    APPROVAL_RECEIVED: 'bg-green-100 text-green-700',
    REJECTED: 'bg-red-100 text-red-700',
    CONVERTED_TO_PROJECT: 'bg-indigo-100 text-indigo-700',
    PAID: 'bg-emerald-100 text-emerald-700',
  }
  return map[status] ?? 'bg-gray-100 text-gray-600'
}

export default async function LeadsPage() {
  const headersList = await headers()
  const userRole = headersList.get('x-user-role') ?? 'DEVELOPER'

  if (userRole === 'DEVELOPER') {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">You don&apos;t have access to leads.</p>
      </div>
    )
  }

  const leads = await db.lead.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: {
      client: { select: { name: true, companyName: true } },
      createdBy: { select: { name: true } },
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Leads</h2>
          <p className="text-sm text-gray-500 mt-1">{leads.length} leads</p>
        </div>
        <Link
          href="/leads/new"
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          + New Lead
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Lead</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Company</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Value</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Created by</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {leads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-400">
                    No leads yet
                  </td>
                </tr>
              ) : (
                leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <Link href={`/leads/${lead.id}`} className="font-medium text-blue-600 hover:underline">
                        {lead.title}
                      </Link>
                      {lead.contactName && (
                        <p className="text-xs text-gray-400">{lead.contactName}</p>
                      )}
                    </td>
                    <td className="px-5 py-3 text-gray-600">
                      {lead.client?.companyName ?? lead.companyName ?? '—'}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(lead.status)}`}>
                        {statusLabel(lead.status)}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-600">
                      {lead.estimatedValue ? formatCurrency(Number(lead.estimatedValue)) : '—'}
                    </td>
                    <td className="px-5 py-3 text-gray-500">{lead.createdBy.name}</td>
                    <td className="px-5 py-3 text-gray-500">{formatDate(lead.createdAt)}</td>
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
