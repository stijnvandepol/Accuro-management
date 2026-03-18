'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Bell } from 'lucide-react'

export function NotificationBell() {
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    async function fetchUnread() {
      try {
        const res = await fetch('/api/v1/notifications?unreadOnly=true&limit=1')
        if (res.ok) {
          const data = await res.json()
          setUnread(data.meta?.unreadCount ?? 0)
        }
      } catch {
        // silently fail
      }
    }

    fetchUnread()
    // Poll every 30 seconds
    const interval = setInterval(fetchUnread, 30_000)
    return () => clearInterval(interval)
  }, [])

  return (
    <Link
      href="/notifications"
      className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
    >
      <Bell className="w-5 h-5" />
      {unread > 0 && (
        <span className="absolute top-1 right-1 inline-flex items-center justify-center w-4 h-4 text-xs font-bold bg-red-500 text-white rounded-full">
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </Link>
  )
}
