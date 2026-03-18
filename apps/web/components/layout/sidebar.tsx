'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  Ticket,
  Bell,
  Settings,
  UserRound,
  Key,
  TrendingUp,
  LogOut,
} from 'lucide-react'

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  adminOnly?: boolean
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard },
  { label: 'Leads', href: '/leads', icon: TrendingUp },
  { label: 'Clients', href: '/clients', icon: UserRound },
  { label: 'Projects', href: '/projects', icon: FolderKanban },
  { label: 'Tickets', href: '/tickets', icon: Ticket },
  { label: 'Notifications', href: '/notifications', icon: Bell },
]

const settingsItems: NavItem[] = [
  { label: 'Settings', href: '/settings', icon: Settings, adminOnly: true },
  { label: 'Users', href: '/settings/users', icon: Users, adminOnly: true },
  { label: 'API Keys', href: '/settings/api-keys', icon: Key },
]

interface SidebarProps {
  userRole?: string
  unreadNotifications?: number
}

export function Sidebar({ userRole, unreadNotifications = 0 }: SidebarProps) {
  const pathname = usePathname()

  const isAdmin = userRole === 'SUPER_ADMIN' || userRole === 'ADMIN'

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  async function handleLogout() {
    await fetch('/api/v1/auth/logout', { method: 'POST' })
    window.location.href = '/login'
  }

  return (
    <aside className="flex flex-col w-64 min-h-screen bg-slate-900 text-slate-300">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-800">
        <div className="flex items-center justify-center w-8 h-8 bg-blue-600 rounded-lg">
          <span className="text-white text-sm font-bold">W</span>
        </div>
        <div>
          <p className="text-white font-semibold text-sm">WebVakwerk</p>
          <p className="text-slate-500 text-xs">Operations</p>
        </div>
      </div>

      {/* Main nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span>{item.label}</span>
              {item.label === 'Notifications' && unreadNotifications > 0 && (
                <span className="ml-auto inline-flex items-center justify-center w-5 h-5 text-xs font-bold bg-red-500 text-white rounded-full">
                  {unreadNotifications > 99 ? '99+' : unreadNotifications}
                </span>
              )}
            </Link>
          )
        })}

        {/* Settings section */}
        <div className="pt-4 mt-4 border-t border-slate-800">
          <p className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Settings
          </p>
          {settingsItems.map((item) => {
            if (item.adminOnly && !isAdmin) return null
            const Icon = item.icon
            const active = isActive(item.href)

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  active
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                )}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Logout */}
      <div className="px-3 pb-4 border-t border-slate-800 pt-3">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors w-full"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  )
}
