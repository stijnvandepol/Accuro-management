'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export function TicketActions({
  ticketId,
  canArchive,
  canRestore,
  isArchived,
}: {
  ticketId: string
  canArchive: boolean
  canRestore: boolean
  isArchived: boolean
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function archive() {
    if (!confirm('Archive this ticket? It will disappear from active views until restored.')) return
    setBusy(true)
    await fetch(`/api/v1/tickets/${ticketId}`, { method: 'DELETE' })
    router.push('/tickets?archived=true')
    router.refresh()
  }

  async function restore() {
    setBusy(true)
    await fetch(`/api/v1/tickets/${ticketId}/restore`, { method: 'POST' })
    router.refresh()
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {!isArchived && (
        <Link href={`/tickets/${ticketId}/edit`} className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
          Edit ticket
        </Link>
      )}
      {!isArchived && canArchive && (
        <button disabled={busy} onClick={archive} className="rounded-lg border border-red-300 px-3 py-2 text-sm text-red-700 disabled:opacity-50">
          Archive
        </button>
      )}
      {isArchived && canRestore && (
        <button disabled={busy} onClick={restore} className="rounded-lg bg-green-600 px-3 py-2 text-sm text-white disabled:opacity-50">
          Restore
        </button>
      )}
    </div>
  )
}
