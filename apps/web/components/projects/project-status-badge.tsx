import type { ProjectStatus } from '@prisma/client'

const statusColors: Record<ProjectStatus, string> = {
  KICKOFF: 'bg-slate-100 text-slate-700',
  IN_DEVELOPMENT: 'bg-blue-100 text-blue-700',
  WAITING_FOR_INPUT: 'bg-yellow-100 text-yellow-700',
  FEEDBACK_RECEIVED: 'bg-purple-100 text-purple-700',
  FEEDBACK_ROUND_1: 'bg-violet-100 text-violet-700',
  FEEDBACK_ROUND_2: 'bg-violet-100 text-violet-700',
  FEEDBACK_ROUND_3: 'bg-violet-100 text-violet-700',
  FEEDBACK_ROUND_4: 'bg-violet-100 text-violet-700',
  REVISION_IN_PROGRESS: 'bg-indigo-100 text-indigo-700',
  READY_FOR_DELIVERY: 'bg-teal-100 text-teal-700',
  GO_LIVE_SCHEDULED: 'bg-cyan-100 text-cyan-700',
  LIVE: 'bg-green-100 text-green-700',
  HANDED_OVER: 'bg-emerald-100 text-emerald-700',
  COMPLETED: 'bg-green-100 text-green-700',
  ON_HOLD: 'bg-gray-100 text-gray-600',
  CANCELLED: 'bg-red-100 text-red-700',
}

function statusLabel(s: string) {
  return s.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
}

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        statusColors[status] ?? 'bg-gray-100 text-gray-600'
      }`}
    >
      {statusLabel(status)}
    </span>
  )
}
