import { headers } from 'next/headers'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import db from '@/lib/db'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const headersList = await headers()
  const userId = headersList.get('x-user-id')
  const userEmail = headersList.get('x-user-email')
  const userRole = headersList.get('x-user-role')

  // Get unread notification count
  let unreadCount = 0
  if (userId) {
    unreadCount = await db.notification.count({
      where: { userId, isRead: false },
    })
  }

  // Get user name
  let userName = userEmail?.split('@')[0] ?? 'User'
  if (userId) {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { name: true },
    })
    if (user) userName = user.name
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar
        userRole={userRole ?? undefined}
        unreadNotifications={unreadCount}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          title="WebVakwerk"
          userName={userName}
          userRole={userRole ?? undefined}
          unreadNotifications={unreadCount}
        />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}
