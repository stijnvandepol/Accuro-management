'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

type WikiPage = {
  id: string
  title: string
  slug: string
  category: string | null
  version: number
  updatedAt: string
  createdBy: { name: string }
}

export default function WikiPage() {
  const [pages, setPages] = useState<WikiPage[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [category, setCategory] = useState('')

  async function load() {
    setLoading(true)
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (category) params.set('category', category)
    const res = await fetch(`/api/v1/wiki/pages?${params}`)
    if (res.ok) {
      const json = await res.json()
      setPages(json.data ?? [])
    }
    setLoading(false)
  }

  useEffect(() => { void load() }, [q, category])

  const categories = [...new Set(pages.map((p) => p.category).filter(Boolean))]

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Wiki</h1>
          <p className="text-sm text-gray-500 mt-1">Internal knowledge base</p>
        </div>
        <Link
          href="/wiki/new"
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
        >
          + New page
        </Link>
      </div>

      <div className="flex gap-3">
        <input
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Search wiki..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">All categories</option>
          {categories.map((c) => <option key={c} value={c!}>{c}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : pages.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400 text-sm">No wiki pages found.</p>
          <Link href="/wiki/new" className="mt-2 inline-block text-blue-600 text-sm hover:underline">
            Create the first page
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {pages.map((page) => (
            <Link
              key={page.id}
              href={`/wiki/${page.slug}`}
              className="flex items-start justify-between gap-4 bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-300 transition"
            >
              <div>
                <p className="font-medium text-gray-900">{page.title}</p>
                <div className="flex gap-3 mt-1">
                  {page.category && (
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{page.category}</span>
                  )}
                  <span className="text-xs text-gray-400">v{page.version} · by {page.createdBy.name}</span>
                </div>
              </div>
              <span className="text-xs text-gray-400 flex-shrink-0">
                {new Date(page.updatedAt).toLocaleDateString()}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
