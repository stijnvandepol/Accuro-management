import type { LeadStatus } from '@prisma/client'

const statusColors: Record<LeadStatus, string> = {
  NEW_REQUEST: 'bg-blue-100 text-blue-700',
  INTAKE_IN_PROGRESS: 'bg-yellow-100 text-yellow-700',
  INTAKE_COMPLETE: 'bg-cyan-100 text-cyan-700',
  DEMO_SCHEDULED: 'bg-purple-100 text-purple-700',
  DEMO_IN_PROGRESS: 'bg-violet-100 text-violet-700',
  DEMO_50_READY: 'bg-indigo-100 text-indigo-700',
  WAITING_FOR_RESPONSE: 'bg-orange-100 text-orange-700',
  APPROVAL_RECEIVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  WAITING_FOR_PAYMENT: 'bg-amber-100 text-amber-700',
  PAID: 'bg-emerald-100 text-emerald-700',
  CONVERTED_TO_PROJECT: 'bg-teal-100 text-teal-700',
}

function statusLabel(s: string) {
  return s.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
}

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
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
