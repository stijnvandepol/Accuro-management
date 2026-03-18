'use client'

import { useState, useEffect } from 'react'
import { formatDistanceToNow } from 'date-fns'

type TimelineEntry = {
  id: string
  type: 'NOTE' | 'SYSTEM_EVENT' | 'STATUS_CHANGE' | 'ASSIGNMENT' | 'REFERENCE_ADDED' | 'WIKI_LINKED'
  content: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
  author: { id: string; name: string; email: string } | null
}

const TYPE_ICONS: Record<string, string> = {
  NOTE: '📝',
  SYSTEM_EVENT: '⚙️',
  STATUS_CHANGE: '🔄',
  ASSIGNMENT: '👤',
  REFERENCE_ADDED: '🔗',
  WIKI_LINKED: '📚',
}

const TYPE_LABELS: Record<string, string> = {
  NOTE: 'Note',
  SYSTEM_EVENT: 'System event',
  STATUS_CHANGE: 'Status changed',
  ASSIGNMENT: 'Assignment changed',
  REFERENCE_ADDED: 'Reference added',
  WIKI_LINKED: 'Wiki page linked',
}

function SystemEntryContent({ entry }: { entry: TimelineEntry }) {
  const meta = entry.metadata ?? {}

  if (entry.type === 'STATUS_CHANGE') {
    return (
      <p className="text-sm text-gray-600">
        Status changed from{' '}
        <span className="font-medium text-gray-800">{String(meta.oldStatus ?? '—')}</span>
        {' '}to{' '}
        <span className="font-medium text-blue-700">{String(meta.newStatus ?? '—')}</span>
      </p>
    )
  }

  if (entry.type === 'ASSIGNMENT') {
    return (
      <p className="text-sm text-gray-600">
        Assigned to <span className="font-medium text-gray-800">{String(meta.newAssigneeId ?? 'nobody')}</span>
      </p>
    )
  }

  if (entry.type === 'REFERENCE_ADDED') {
    return (
      <p className="text-sm text-gray-600">
        Reference added:{' '}
        <a href={String(meta.url ?? '#')} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium">
          {String(meta.title ?? 'Link')}
        </a>
      </p>
    )
  }

  if (entry.type === 'WIKI_LINKED') {
    return (
      <p className="text-sm text-gray-600">
        Wiki page linked:{' '}
        <a href={`/wiki/${String(meta.slug ?? '')}`} className="text-blue-600 hover:underline font-medium">
          {String(meta.title ?? 'Wiki page')}
        </a>
      </p>
    )
  }

  return <p className="text-sm text-gray-600">{entry.content ?? 'System event'}</p>
}

export function TimelineTab({ ticketId, currentUserId, currentUserRole }: {
  ticketId: string
  currentUserId: string
  currentUserRole: string
}) {
  const [entries, setEntries] = useState<TimelineEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [noteText, setNoteText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')

  const isAdmin = currentUserRole === 'SUPER_ADMIN' || currentUserRole === 'ADMIN'

  async function load() {
    setLoading(true)
    const res = await fetch(`/api/v1/tickets/${ticketId}/timeline?limit=100`)
    if (res.ok) {
      const json = await res.json()
      setEntries(json.data ?? [])
    }
    setLoading(false)
  }

  useEffect(() => { void load() }, [ticketId])

  async function submitNote() {
    if (!noteText.trim()) return
    setSubmitting(true)
    const res = await fetch(`/api/v1/tickets/${ticketId}/timeline`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: noteText }),
    })
    if (res.ok) {
      setNoteText('')
      await load()
    }
    setSubmitting(false)
  }

  async function saveEdit(id: string) {
    const res = await fetch(`/api/v1/timeline/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: editContent }),
    })
    if (res.ok) {
      setEditingId(null)
      await load()
    }
  }

  async function deleteNote(id: string) {
    if (!confirm('Delete this note?')) return
    await fetch(`/api/v1/timeline/${id}`, { method: 'DELETE' })
    await load()
  }

  return (
    <div className="space-y-6">
      {/* Add note */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Add internal note</label>
        <textarea
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px] resize-y"
          placeholder="Write an internal note... (markdown supported)"
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
        />
        <div className="flex justify-end mt-2">
          <button
            onClick={submitNote}
            disabled={submitting || !noteText.trim()}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? 'Saving...' : 'Add note'}
          </button>
        </div>
      </div>

      {/* Timeline entries */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <p className="text-center text-sm text-gray-400 py-8">No timeline entries yet.</p>
      ) : (
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-5 top-0 bottom-0 w-px bg-gray-200" />
          <div className="space-y-4">
            {entries.map((entry) => {
              const isNote = entry.type === 'NOTE'
              const canEdit = isNote && (entry.author?.id === currentUserId || isAdmin)

              return (
                <div key={entry.id} className="relative flex gap-4 pl-12">
                  {/* Icon bubble */}
                  <div className="absolute left-2 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-white border-2 border-gray-200 text-sm">
                    {TYPE_ICONS[entry.type] ?? '•'}
                  </div>

                  <div className={`flex-1 rounded-xl border p-4 ${isNote ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-100'}`}>
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-gray-700">{TYPE_LABELS[entry.type]}</span>
                        {entry.author && (
                          <span className="text-xs text-gray-500">by {entry.author.name}</span>
                        )}
                        <span className="text-xs text-gray-400">
                          {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                      {canEdit && editingId !== entry.id && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => { setEditingId(entry.id); setEditContent(entry.content ?? '') }}
                            className="text-xs text-gray-400 hover:text-gray-700"
                          >Edit</button>
                          <button onClick={() => deleteNote(entry.id)} className="text-xs text-red-400 hover:text-red-600">Delete</button>
                        </div>
                      )}
                    </div>

                    {editingId === entry.id ? (
                      <div>
                        <textarea
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                        />
                        <div className="flex gap-2 mt-2">
                          <button onClick={() => saveEdit(entry.id)} className="text-sm text-blue-600 font-medium hover:underline">Save</button>
                          <button onClick={() => setEditingId(null)} className="text-sm text-gray-500 hover:underline">Cancel</button>
                        </div>
                      </div>
                    ) : isNote ? (
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{entry.content}</p>
                    ) : (
                      <SystemEntryContent entry={entry} />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
