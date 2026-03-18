'use client'

import { useState, useEffect } from 'react'
import { formatDistanceToNow } from 'date-fns'

type CommEntry = {
  id: string
  direction: 'INCOMING' | 'OUTGOING'
  channel: 'EMAIL' | 'MEETING' | 'CALL' | 'MESSAGE' | 'OTHER'
  subject: string | null
  body: string
  externalSender: string | null
  createdAt: string
  author: { id: string; name: string } | null
}

const CHANNEL_ICONS: Record<string, string> = {
  EMAIL: '📧',
  MEETING: '📅',
  CALL: '📞',
  MESSAGE: '💬',
  OTHER: '📋',
}

const CHANNEL_LABELS: Record<string, string> = {
  EMAIL: 'Email',
  MEETING: 'Meeting',
  CALL: 'Call',
  MESSAGE: 'Message',
  OTHER: 'Other',
}

export function CommunicationsTab({ ticketId }: { ticketId: string }) {
  const [entries, setEntries] = useState<CommEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    direction: 'INCOMING' as 'INCOMING' | 'OUTGOING',
    channel: 'EMAIL' as string,
    subject: '',
    body: '',
    externalSender: '',
  })
  const [submitting, setSubmitting] = useState(false)

  async function load() {
    setLoading(true)
    const res = await fetch(`/api/v1/tickets/${ticketId}/communications?limit=50`)
    if (res.ok) {
      const json = await res.json()
      setEntries(json.data ?? [])
    }
    setLoading(false)
  }

  useEffect(() => { void load() }, [ticketId])

  async function submit() {
    if (!form.body.trim()) return
    setSubmitting(true)
    const res = await fetch(`/api/v1/tickets/${ticketId}/communications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      setShowForm(false)
      setForm({ direction: 'INCOMING', channel: 'EMAIL', subject: '', body: '', externalSender: '' })
      await load()
    }
    setSubmitting(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-semibold text-gray-700">Communication log</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700"
        >
          + Add entry
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Direction</label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={form.direction}
                onChange={(e) => setForm({ ...form, direction: e.target.value as 'INCOMING' | 'OUTGOING' })}
              >
                <option value="INCOMING">Incoming</option>
                <option value="OUTGOING">Outgoing</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Channel</label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={form.channel}
                onChange={(e) => setForm({ ...form, channel: e.target.value })}
              >
                {Object.entries(CHANNEL_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Subject</label>
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              placeholder="Optional subject"
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Body *</label>
            <textarea
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm min-h-[120px]"
              placeholder="Summary of the communication..."
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900">Cancel</button>
            <button
              onClick={submit}
              disabled={submitting || !form.body.trim()}
              className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : entries.length === 0 ? (
        <p className="text-center text-sm text-gray-400 py-8">No communication entries yet.</p>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <div key={entry.id} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-lg">{CHANNEL_ICONS[entry.channel]}</span>
                  <span className="text-xs font-semibold text-gray-700">{CHANNEL_LABELS[entry.channel]}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    entry.direction === 'INCOMING'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {entry.direction === 'INCOMING' ? '↙ Incoming' : '↗ Outgoing'}
                  </span>
                </div>
                <span className="text-xs text-gray-400">
                  {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
                </span>
              </div>
              {entry.subject && (
                <p className="text-sm font-medium text-gray-800 mb-1">{entry.subject}</p>
              )}
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{entry.body}</p>
              <div className="mt-2 flex gap-3 text-xs text-gray-400">
                {entry.externalSender && <span>From: {entry.externalSender}</span>}
                {entry.author && <span>By: {entry.author.name}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
