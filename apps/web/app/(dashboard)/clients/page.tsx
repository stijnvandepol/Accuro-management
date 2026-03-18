import Link from 'next/link'
import db from '@/lib/db'
import { formatDate } from '@/lib/utils'

export default async function ClientsPage() {
  const clients = await db.client.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { projects: true, leads: true } },
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Clients</h2>
          <p className="text-sm text-gray-500 mt-1">{clients.length} clients</p>
        </div>
        <Link
          href="/clients/new"
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          + New Client
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Client</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Company</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Projects</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Leads</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Added</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {clients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-400">No clients yet</td>
                </tr>
              ) : (
                clients.map((client) => (
                  <tr key={client.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <Link href={`/clients/${client.id}`} className="font-medium text-blue-600 hover:underline">
                        {client.name}
                      </Link>
                      {!client.isActive && (
                        <span className="ml-2 text-xs text-gray-400">(inactive)</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-gray-600">{client.companyName ?? '—'}</td>
                    <td className="px-5 py-3 text-gray-600">{client.email ?? '—'}</td>
                    <td className="px-5 py-3 text-gray-600">{client._count.projects}</td>
                    <td className="px-5 py-3 text-gray-600">{client._count.leads}</td>
                    <td className="px-5 py-3 text-gray-500">{formatDate(client.createdAt)}</td>
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
