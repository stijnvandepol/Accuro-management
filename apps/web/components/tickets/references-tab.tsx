'use client'

import { useState, useEffect } from 'react'

type Reference = {
  id: string
  title: string
  url: string
  type: string
  description: string | null
  createdBy: { id: string; name: string }
}

type WikiLink = {
  id: string
  wikiPage: { id: string; title: string; slug: string; category: string | null }
}

type WikiPageOption = {
  id: string
  title: string
  slug: string
  category: string | null
}

const TYPE_ICONS: Record<string, string> = {
  GITHUB: '🐙',
  FIGMA: '🎨',
  DOCS: '📄',
  DEPLOYMENT: '🚀',
  MONITORING: '📊',
  DRIVE: '💾',
  NOTION: '📓',
  OTHER: '🔗',
}

export function ReferencesTab({ ticketId, currentUserId, currentUserRole }: {
  ticketId: string
  currentUserId: string
  currentUserRole: string
}) {
  const [refs, setRefs] = useState<Reference[]>([])
  const [wikiLinks, setWikiLinks] = useState<WikiLink[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showWikiForm, setShowWikiForm] = useState(false)
  const [form, setForm] = useState({ title: '', url: '', type: 'OTHER', description: '' })
  const [wikiPageId, setWikiPageId] = useState('')
  const [wikiSearch, setWikiSearch] = useState('')
  const [wikiOptions, setWikiOptions] = useState<WikiPageOption[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isAdmin = currentUserRole === 'SUPER_ADMIN' || currentUserRole === 'ADMIN'

  async function load() {
    setLoading(true)
    setError(null)
    const [refsRes, wikiRes] = await Promise.all([
      fetch(`/api/v1/tickets/${ticketId}/references`),
      fetch(`/api/v1/tickets/${ticketId}/wiki-links`),
    ])
    if (refsRes.ok) setRefs((await refsRes.json()).data ?? [])
    if (wikiRes.ok) setWikiLinks((await wikiRes.json()).data ?? [])
    if (!refsRes.ok || !wikiRes.ok) setError('Failed to load references')
    setLoading(false)
  }

  useEffect(() => { void load() }, [ticketId])

  useEffect(() => {
    async function searchWiki() {
      if (!showWikiForm) return
      const res = await fetch(`/api/v1/wiki/pages?q=${encodeURIComponent(wikiSearch)}&limit=10`)
      if (res.ok) {
        const json = await res.json()
        setWikiOptions(json.data?.data ?? [])
      }
    }

    void searchWiki()
  }, [showWikiForm, wikiSearch])

  async function addRef() {
    if (!form.title || !form.url) return
    setSubmitting(true)
    setError(null)
    const res = await fetch(`/api/v1/tickets/${ticketId}/references`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      setShowForm(false)
      setForm({ title: '', url: '', type: 'OTHER', description: '' })
      await load()
    } else {
      const json = await res.json().catch(() => null)
      setError(json?.error ?? 'Failed to add reference')
    }
    setSubmitting(false)
  }

  async function deleteRef(id: string) {
    if (!confirm('Remove this reference?')) return
    await fetch(`/api/v1/references/${id}`, { method: 'DELETE' })
    await load()
  }

  async function addWikiLink() {
    if (!wikiPageId) return
    setSubmitting(true)
    setError(null)
    const res = await fetch(`/api/v1/tickets/${ticketId}/wiki-links`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wikiPageId }),
    })
    if (res.ok) {
      setShowWikiForm(false)
      setWikiPageId('')
      await load()
    } else {
      const json = await res.json().catch(() => null)
      setError(json?.error ?? 'Failed to link wiki page')
    }
    setSubmitting(false)
  }

  async function unlinkWikiLink(id: string) {
    if (!confirm('Unlink this wiki page?')) return
    await fetch(`/api/v1/tickets/${ticketId}/wiki-links/${id}`, { method: 'DELETE' })
    await load()
  }

  return (
    <div className="space-y-6">
      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {/* External references */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-semibold text-gray-700">External references</h3>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700"
          >
            + Add reference
          </button>
        </div>

        {showForm && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-3 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Title *</label>
                <input
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="e.g. GitHub repo"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                >
                  {Object.entries(TYPE_ICONS).map(([v]) => (
                    <option key={v} value={v}>{TYPE_ICONS[v]} {v}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">URL *</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="https://..."
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="Optional description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowForm(false)} className="px-3 py-1.5 text-sm text-gray-600">Cancel</button>
              <button
                onClick={addRef}
                disabled={submitting || !form.title || !form.url}
                className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg disabled:opacity-50"
              >
                {submitting ? 'Saving...' : 'Add'}
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="h-16 bg-gray-100 rounded-xl animate-pulse" />
        ) : refs.length === 0 ? (
          <p className="text-sm text-gray-400">No references yet.</p>
        ) : (
          <div className="space-y-2">
            {refs.map((ref) => (
              <div key={ref.id} className="flex items-start justify-between gap-3 bg-white rounded-xl border border-gray-200 p-3">
                <div className="flex items-start gap-3 min-w-0">
                  <span className="text-xl flex-shrink-0">{TYPE_ICONS[ref.type] ?? '🔗'}</span>
                  <div className="min-w-0">
                    <a
                      href={ref.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-blue-600 hover:underline truncate block"
                    >
                      {ref.title}
                    </a>
                    {ref.description && (
                      <p className="text-xs text-gray-500 mt-0.5">{ref.description}</p>
                    )}
                    <p className="text-xs text-gray-400 truncate mt-0.5">{ref.url}</p>
                  </div>
                </div>
                {(ref.createdBy.id === currentUserId || isAdmin) && (
                  <button
                    onClick={() => deleteRef(ref.id)}
                    className="text-xs text-red-400 hover:text-red-600 flex-shrink-0"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Linked wiki pages */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-semibold text-gray-700">Linked wiki pages</h3>
          <button
            onClick={() => setShowWikiForm(!showWikiForm)}
            className="px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-200"
          >
            + Link wiki page
          </button>
        </div>

        {showWikiForm && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-3 space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Search wiki pages</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="Search by title or category..."
                value={wikiSearch}
                onChange={(e) => setWikiSearch(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Wiki page</label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={wikiPageId}
                onChange={(e) => setWikiPageId(e.target.value)}
              >
                <option value="">Select a page...</option>
                {wikiOptions.map((page) => (
                  <option key={page.id} value={page.id}>
                    {page.title}{page.category ? ` (${page.category})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowWikiForm(false)} className="px-3 py-1.5 text-sm text-gray-600">Cancel</button>
              <button
                onClick={addWikiLink}
                disabled={submitting || !wikiPageId}
                className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg disabled:opacity-50"
              >
                {submitting ? 'Linking...' : 'Link'}
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="h-16 animate-pulse rounded-xl bg-gray-100" />
        ) : wikiLinks.length === 0 ? (
          <p className="text-sm text-gray-400">No wiki pages linked.</p>
        ) : (
          <div className="space-y-2">
            {wikiLinks.map((link) => (
              <div
                key={link.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-3"
              >
                <a href={`/wiki/${link.wikiPage.slug}`} className="flex items-center gap-3 hover:text-blue-600">
                  <span className="text-lg">📚</span>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{link.wikiPage.title}</p>
                    {link.wikiPage.category && (
                      <p className="text-xs text-gray-400">{link.wikiPage.category}</p>
                    )}
                  </div>
                </a>
                <button onClick={() => unlinkWikiLink(link.id)} className="text-xs text-red-500 hover:text-red-700">
                  Unlink
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
