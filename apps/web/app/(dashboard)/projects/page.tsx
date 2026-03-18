import { headers } from 'next/headers'
import Link from 'next/link'
import db from '@/lib/db'
import { formatDate } from '@/lib/utils'

function statusLabel(s: string) {
  return s.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
}

function statusColor(status: string) {
  const map: Record<string, string> = {
    KICKOFF: 'bg-slate-100 text-slate-700',
    IN_DEVELOPMENT: 'bg-blue-100 text-blue-700',
    WAITING_FOR_INPUT: 'bg-yellow-100 text-yellow-700',
    FEEDBACK_RECEIVED: 'bg-purple-100 text-purple-700',
    LIVE: 'bg-green-100 text-green-700',
    COMPLETED: 'bg-green-100 text-green-700',
    ON_HOLD: 'bg-gray-100 text-gray-600',
    CANCELLED: 'bg-red-100 text-red-700',
    READY_FOR_DELIVERY: 'bg-emerald-100 text-emerald-700',
  }
  return map[status] ?? 'bg-gray-100 text-gray-600'
}

export default async function ProjectsPage() {
  const headersList = await headers()
  const userId = headersList.get('x-user-id') ?? ''
  const role = headersList.get('x-user-role') ?? 'DEVELOPER'
  const isDeveloper = role === 'DEVELOPER'

  const projects = await db.project.findMany({
    where: {
      deletedAt: null,
      ...(isDeveloper ? { assignedToId: userId } : {}),
    },
    orderBy: { updatedAt: 'desc' },
    include: {
      client: { select: { name: true, companyName: true } },
      _count: {
        select: {
          tickets: { where: { deletedAt: null, status: { notIn: ['DONE', 'CANCELLED'] } } },
        },
      },
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Projects</h2>
          <p className="text-sm text-gray-500 mt-1">{projects.length} projects</p>
        </div>
        {!isDeveloper && (
          <Link
            href="/projects/new"
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            + New Project
          </Link>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Project</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Client</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Package</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Open Tickets</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {projects.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-400">No projects yet</td>
                </tr>
              ) : (
                projects.map((project) => (
                  <tr key={project.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <Link href={`/projects/${project.id}`} className="font-medium text-blue-600 hover:underline">
                        {project.title}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-gray-600">{project.client.companyName ?? project.client.name}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        project.packageType === 'PREMIUM'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {project.packageType}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(project.status)}`}>
                        {statusLabel(project.status)}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-600">{project._count.tickets}</td>
                    <td className="px-5 py-3 text-gray-500">{formatDate(project.updatedAt)}</td>
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
