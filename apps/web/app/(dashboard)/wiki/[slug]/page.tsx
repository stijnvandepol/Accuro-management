'use client'

import { use, useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type WikiPageData = {
  id: string
  title: string
  slug: string
  content: string
  category: string | null
  version: number
  createdBy: { name: string }
  updatedAt: string
  versions: Array<{ id: string; version: number; editedBy: { name: string }; createdAt: string }>
}

export default function WikiPageDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const router = useRouter()
  const [page, setPage] = useState<WikiPageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editContent, setEditContent] = useState('')
  const [editTitle, setEditTitle] = useState('')
  const [saving, setSaving] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  useEffect(() => {
    fetch(`/api/v1/wiki/pages/${slug}`)
      .then((r) => r.json())
      .then((json) => {
        setPage(json.data ?? json)
        setLoading(false)
      })
  }, [slug])

  async function save() {
    if (!page) return
    setSaving(true)
    const res = await fetch(`/api/v1/wiki/pages/${page.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: editTitle, content: editContent }),
    })
    if (res.ok) {
      const json = await res.json()
      setPage((prev) => prev ? { ...prev, ...json.data, content: editContent, title: editTitle } : prev)
      setEditing(false)
    }
    setSaving(false)
  }

  async function deletePage() {
    if (!page || !confirm('Delete this wiki page?')) return
    await fetch(`/api/v1/wiki/pages/${page.id}`, { method: 'DELETE' })
    router.push('/wiki')
  }

  if (loading) return <div className="max-w-3xl mx-auto animate-pulse space-y-4 py-6"><div className="h-8 bg-gray-200 rounded w-1/2" /><div className="h-64 bg-gray-100 rounded-xl" /></div>
  if (!page) return <div className="text-center py-16 text-gray-500">Page not found.</div>

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link href="/wiki" className="text-sm text-gray-500 hover:text-gray-900">← Wiki</Link>
          {page.category && (
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{page.category}</span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="px-3 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            History (v{page.version})
          </button>
          <button
            onClick={() => { setEditing(true); setEditContent(page.content); setEditTitle(page.title) }}
            className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Edit
          </button>
          <button onClick={deletePage} className="px-3 py-1.5 text-xs text-red-600 border border-red-200 rounded-lg hover:bg-red-50">
            Delete
          </button>
        </div>
      </div>

      {showHistory && page.versions.length > 0 && (
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Version history</h3>
          <div className="space-y-2">
            {page.versions.map((v) => (
              <div key={v.id} className="flex justify-between text-xs text-gray-600">
                <span>v{v.version} — {v.editedBy.name}</span>
                <span>{new Date(v.createdAt).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {editing ? (
        <div className="space-y-3">
          <input
            className="w-full text-2xl font-bold border-b border-gray-300 pb-2 focus:outline-none focus:border-blue-500"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
          />
          <textarea
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[400px] resize-y"
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
          />
          <div className="flex gap-2 justify-end">
            <button onClick={() => setEditing(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Cancel</button>
            <button
              onClick={save}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">{page.title}</h1>
          <div className="prose prose-sm max-w-none">
            <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans leading-relaxed">{page.content}</pre>
          </div>
          <p className="mt-6 text-xs text-gray-400 border-t border-gray-100 pt-4">
            Last updated {new Date(page.updatedAt).toLocaleString()} · by {page.createdBy.name}
          </p>
        </div>
      )}
    </div>
  )
}
