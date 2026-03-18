'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Notification {
  id: string
  type: string
  title: string
  body: string | null
  entityType: string | null
  entityId: string | null
  isRead: boolean
  createdAt: string
}

function typeLabel(t: string) {
  return t.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
}

function typeColor(t: string) {
  const map: Record<string, string> = {
    NEW_LEAD: 'bg-blue-100 text-blue-700',
    NEW_TICKET: 'bg-purple-100 text-purple-700',
    TICKET_ASSIGNED: 'bg-indigo-100 text-indigo-700',
    STATUS_CHANGED: 'bg-yellow-100 text-yellow-700',
    FEEDBACK_RECEIVED: 'bg-green-100 text-green-700',
    FEEDBACK_ROUND_EXCEEDED: 'bg-orange-100 text-orange-700',
    PAYMENT_STATUS_CHANGED: 'bg-emerald-100 text-emerald-700',
    DEADLINE_APPROACHING: 'bg-red-100 text-red-700',
  }
  return map[t] ?? 'bg-gray-100 text-gray-600'
}

function entityUrl(entityType: string | null, entityId: string | null) {
  if (!entityType || !entityId) return null
  const map: Record<string, string> = {
    lead: `/leads/${entityId}`,
    project: `/projects/${entityId}`,
    ticket: `/tickets/${entityId}`,
  }
  return map[entityType] ?? null
}

function formatRelativeTime(date: string) {
  const now = new Date()
  const d = new Date(date)
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)
  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  return `${diffDays}d ago`
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [markingAll, setMarkingAll] = useState(false)

  useEffect(() => {
    fetchNotifications()
  }, [])

  async function fetchNotifications() {
    try {
      const res = await fetch('/api/v1/notifications?limit=50')
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.data ?? [])
      }
    } finally {
      setLoading(false)
    }
  }

  async function markRead(id: string) {
    await fetch(`/api/v1/notifications/${id}/read`, { method: 'POST' })
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    )
  }

  async function markAllRead() {
    setMarkingAll(true)
    try {
      await fetch('/api/v1/notifications/read-all', { method: 'POST' })
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
    } finally {
      setMarkingAll(false)
    }
  }

  const unreadCount = notifications.filter((n) => !n.isRead).length

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Notifications</h2>
          {unreadCount > 0 && (
            <p className="text-sm text-gray-500 mt-1">{unreadCount} unread</p>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            disabled={markingAll}
            className="text-sm text-blue-600 hover:underline disabled:opacity-50"
          >
            {markingAll ? 'Marking...' : 'Mark all as read'}
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="text-center py-8 text-gray-400">Loading...</div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-8 text-gray-400">No notifications</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {notifications.map((notification) => {
              const url = entityUrl(notification.entityType, notification.entityId)
              const content = (
                <div
                  className={`px-5 py-4 ${!notification.isRead ? 'bg-blue-50/40' : ''}`}
                  onClick={() => !notification.isRead && markRead(notification.id)}
                >
                  <div className="flex items-start gap-3">
                    {!notification.isRead && (
                      <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                    )}
                    <div className={`flex-1 min-w-0 ${notification.isRead ? 'ml-5' : ''}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded ${typeColor(notification.type)}`}>
                          {typeLabel(notification.type)}
                        </span>
                        <span className="text-xs text-gray-400">
                          {formatRelativeTime(notification.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                      {notification.body && (
                        <p className="text-sm text-gray-500 mt-0.5">{notification.body}</p>
                      )}
                    </div>
                  </div>
                </div>
              )

              return url ? (
                <Link key={notification.id} href={url} className="block hover:bg-gray-50 transition-colors cursor-pointer">
                  {content}
                </Link>
              ) : (
                <div key={notification.id} className="cursor-pointer hover:bg-gray-50 transition-colors">
                  {content}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
