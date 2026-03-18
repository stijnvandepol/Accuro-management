import { headers } from 'next/headers'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import db from '@/lib/db'
import { formatDate, formatDateTime } from '@/lib/utils'
import { TicketActions } from '@/components/tickets/ticket-actions'
import { TicketDetailTabs } from '@/components/tickets/ticket-detail-tabs'
import { buildTicketScopeWhere } from '@/lib/ticket-policy'
import type { AuthContext } from '@/lib/api-helpers'

function statusLabel(value: string) {
  return value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase())
}

export default async function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const headersList = await headers()
  const currentUserId = headersList.get('x-user-id') ?? ''
  const currentUserRole = headersList.get('x-user-role') ?? 'DEVELOPER'
  const auth: AuthContext = {
    userId: currentUserId,
    email: headersList.get('x-user-email') ?? '',
    role: currentUserRole as AuthContext['role'],
    isApiKey: false,
  }

  const ticket = await db.ticket.findFirst({
    where: buildTicketScopeWhere(auth, { id, includeArchived: true }),
    include: {
      client: { select: { id: true, name: true } },
      clientContact: { select: { id: true, name: true, email: true } },
      project: { select: { id: true, title: true } },
      assignedTo: { select: { id: true, name: true, email: true } },
      _count: {
        select: {
          timelineEntries: { where: { deletedAt: null } },
          communications: true,
          references: true,
          wikiLinks: true,
        },
      },
    },
  })

  if (!ticket) notFound()

  const isArchived = ticket.deletedAt !== null
  const canArchive = ['SUPER_ADMIN', 'ADMIN', 'PROJECT_MANAGER'].includes(currentUserRole)
  const canRestore = canArchive

  const overview = (
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <div className="space-y-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="mb-3 text-base font-semibold text-gray-900">Description</h2>
          {ticket.description ? (
            <p className="whitespace-pre-wrap text-sm text-gray-700">{ticket.description}</p>
          ) : (
            <p className="text-sm text-gray-400">No description provided.</p>
          )}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="mb-3 text-base font-semibold text-gray-900">Linked context</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <SummaryCard label="Timeline" value={String(ticket._count.timelineEntries)} />
            <SummaryCard label="Communications" value={String(ticket._count.communications)} />
            <SummaryCard label="References" value={String(ticket._count.references)} />
            <SummaryCard label="Wiki links" value={String(ticket._count.wikiLinks)} />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="mb-3 text-base font-semibold text-gray-900">Details</h2>
          <dl className="space-y-3 text-sm">
            <DetailRow label="Ticket number" value={ticket.ticketNumber} />
            <DetailRow label="Status" value={statusLabel(ticket.status)} />
            <DetailRow label="Priority" value={ticket.priority} />
            <DetailRow label="Type" value={ticket.type} />
            <DetailRow label="Category" value={ticket.category ?? '—'} />
            <DetailRow label="Client" value={ticket.client?.name ?? '—'} />
            <DetailRow label="Contact" value={ticket.clientContact?.name ?? '—'} />
            <DetailRow label="Project" value={ticket.project?.title ?? '—'} />
            <DetailRow label="Assignee" value={ticket.assignedTo?.name ?? 'Unassigned'} />
            <DetailRow label="Approval" value={ticket.approvalStatus} />
            <DetailRow label="Payment" value={ticket.paymentStatus} />
            <DetailRow label="Due date" value={ticket.dueDate ? formatDate(ticket.dueDate) : '—'} />
            <DetailRow label="Created" value={formatDateTime(ticket.createdAt)} />
            <DetailRow label="Updated" value={formatDateTime(ticket.updatedAt)} />
          </dl>
        </div>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/tickets" className="hover:text-gray-800">Tickets</Link>
        <span>/</span>
        <span>{ticket.ticketNumber}</span>
      </div>

      {isArchived && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          This ticket is archived and hidden from active views until it is restored.
        </div>
      )}

      <div className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">{ticket.ticketNumber}</span>
            <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">{statusLabel(ticket.status)}</span>
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">{ticket.priority}</span>
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">{ticket.type}</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{ticket.title}</h1>
          <p className="text-sm text-gray-500">
            {ticket.client?.name ?? 'No client'}{ticket.project ? ` • ${ticket.project.title}` : ''}{ticket.assignedTo ? ` • Assigned to ${ticket.assignedTo.name}` : ''}
          </p>
        </div>

        <TicketActions ticketId={ticket.id} canArchive={canArchive} canRestore={canRestore} isArchived={isArchived} />
      </div>

      <TicketDetailTabs
        ticketId={ticket.id}
        currentUserId={currentUserId}
        currentUserRole={currentUserRole}
        overview={overview}
      />
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-gray-500">{label}</dt>
      <dd className="mt-0.5 font-medium text-gray-900">{value}</dd>
    </div>
  )
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-gray-900">{value}</p>
    </div>
  )
}
