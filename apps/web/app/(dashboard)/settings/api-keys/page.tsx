'use client'

import { useState, useEffect } from 'react'
import { formatDate } from '@/lib/utils'

interface ApiKey {
  id: string
  name: string
  keyPrefix: string
  scopes: string[]
  lastUsedAt: string | null
  expiresAt: string | null
  isActive: boolean
  createdAt: string
}

export default function ApiKeysPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [newKeyScopes, setNewKeyScopes] = useState('leads:read,projects:read,tickets:read')
  const [createdKey, setCreatedKey] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    fetchApiKeys()
  }, [])

  async function fetchApiKeys() {
    try {
      const res = await fetch('/api/v1/api-keys')
      if (res.ok) {
        const data = await res.json()
        setApiKeys(data.data ?? [])
      }
    } finally {
      setLoading(false)
    }
  }

  async function createApiKey(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    setCreatedKey(null)
    try {
      const scopes = newKeyScopes.split(',').map((s) => s.trim()).filter(Boolean)
      const res = await fetch('/api/v1/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName, scopes }),
      })
      const data = await res.json()
      if (res.ok) {
        setCreatedKey(data.data.key)
        setNewKeyName('')
        setShowForm(false)
        fetchApiKeys()
      }
    } finally {
      setCreating(false)
    }
  }

  async function revokeKey(id: string) {
    if (!confirm('Revoke this API key? This cannot be undone.')) return
    await fetch(`/api/v1/api-keys/${id}`, { method: 'DELETE' })
    setApiKeys((prev) => prev.filter((k) => k.id !== id))
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">API Keys</h2>
          <p className="text-sm text-gray-500 mt-1">For n8n and external integrations</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          + New API Key
        </button>
      </div>

      {/* Created key display */}
      {createdKey && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5">
          <h3 className="font-semibold text-green-900 mb-2">API Key Created</h3>
          <p className="text-sm text-green-700 mb-3">
            Save this key now — it will not be shown again.
          </p>
          <code className="block bg-white border border-green-200 rounded-lg px-4 py-3 text-sm font-mono text-green-900 break-all">
            {createdKey}
          </code>
          <button
            onClick={() => {
              navigator.clipboard.writeText(createdKey)
            }}
            className="mt-2 text-sm text-green-700 hover:underline"
          >
            Copy to clipboard
          </button>
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Create API Key</h3>
          <form onSubmit={createApiKey} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                required
                placeholder="e.g. n8n integration"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Scopes (comma-separated)
              </label>
              <input
                type="text"
                value={newKeyScopes}
                onChange={(e) => setNewKeyScopes(e.target.value)}
                placeholder="leads:read,projects:read"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-400 mt-1">
                Available: leads:read, leads:write, projects:read, projects:write, tickets:read, tickets:write, clients:read
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={creating}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {creating ? 'Creating...' : 'Create Key'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Keys list */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="text-center py-8 text-gray-400">Loading...</div>
        ) : apiKeys.length === 0 ? (
          <div className="text-center py-8 text-gray-400">No API keys yet</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Prefix</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Scopes</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Last Used</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Created</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {apiKeys.map((key) => (
                <tr key={key.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-900">{key.name}</td>
                  <td className="px-5 py-3 font-mono text-gray-600 text-xs">{key.keyPrefix}...</td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap gap-1">
                      {key.scopes.slice(0, 3).map((scope) => (
                        <span key={scope} className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                          {scope}
                        </span>
                      ))}
                      {key.scopes.length > 3 && (
                        <span className="text-xs text-gray-400">+{key.scopes.length - 3}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-gray-500">
                    {key.lastUsedAt ? formatDate(key.lastUsedAt) : 'Never'}
                  </td>
                  <td className="px-5 py-3 text-gray-500">{formatDate(key.createdAt)}</td>
                  <td className="px-5 py-3">
                    <button
                      onClick={() => revokeKey(key.id)}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Revoke
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
