import { format } from 'date-fns'
import { nl } from 'date-fns/locale'

export function useFormatting() {
  function formatDate(dateStr: string | Date | null): string {
    if (!dateStr) return '—'
    const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr
    return format(d, 'd MMM yyyy', { locale: nl })
  }

  function formatDateTime(dateStr: string | Date | null): string {
    if (!dateStr) return '—'
    const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr
    return format(d, 'd MMM yyyy HH:mm', { locale: nl })
  }

  function formatCurrency(value: number | string | null): string {
    if (value === null || value === undefined) return '€ 0,00'
    const num = typeof value === 'string' ? parseFloat(value) : value
    return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(num)
  }

  function statusColor(status: string): string {
    const colors: Record<string, string> = {
      // Project statuses
      LEAD: 'bg-zinc-800 text-zinc-400 border border-zinc-700',
      INTAKE: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
      IN_PROGRESS: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
      WAITING_FOR_CLIENT: 'bg-orange-500/10 text-orange-400 border border-orange-500/20',
      REVIEW: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
      COMPLETED: 'bg-green-500/10 text-green-400 border border-green-500/20',
      MAINTENANCE: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20',
      PAUSED: 'bg-red-500/10 text-red-400 border border-red-500/20',
      // Change request statuses
      NEW: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
      REVIEWED: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
      PLANNED: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20',
      WAITING_FOR_FEEDBACK: 'bg-orange-500/10 text-orange-400 border border-orange-500/20',
      DONE: 'bg-green-500/10 text-green-400 border border-green-500/20',
      // Invoice statuses
      DRAFT: 'bg-zinc-800 text-zinc-400 border border-zinc-700',
      SENT: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
      PAID: 'bg-green-500/10 text-green-400 border border-green-500/20',
      OVERDUE: 'bg-red-500/10 text-red-400 border border-red-500/20',
      READY: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
      // Priorities
      LOW: 'bg-zinc-800 text-zinc-500 border border-zinc-700',
      MEDIUM: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
      HIGH: 'bg-orange-500/10 text-orange-400 border border-orange-500/20',
      URGENT: 'bg-red-500/10 text-red-400 border border-red-500/20',
      // Impact
      SMALL: 'bg-green-500/10 text-green-400 border border-green-500/20',
      LARGE: 'bg-red-500/10 text-red-400 border border-red-500/20',
      // Communication types
      EMAIL: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
      CALL: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
      MEETING: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
      WHATSAPP: 'bg-green-500/10 text-green-400 border border-green-500/20',
      DM: 'bg-pink-500/10 text-pink-400 border border-pink-500/20',
      INTERNAL: 'bg-zinc-800 text-zinc-400 border border-zinc-700',
      OTHER: 'bg-zinc-800 text-zinc-400 border border-zinc-700',
    }
    return colors[status] || 'bg-zinc-800 text-zinc-400 border border-zinc-700'
  }

  function statusDot(status: string): string {
    const colors: Record<string, string> = {
      LEAD: 'bg-zinc-500', INTAKE: 'bg-blue-400', IN_PROGRESS: 'bg-amber-400',
      WAITING_FOR_CLIENT: 'bg-orange-400', REVIEW: 'bg-purple-400', COMPLETED: 'bg-green-400',
      MAINTENANCE: 'bg-cyan-400', PAUSED: 'bg-red-400',
      NEW: 'bg-blue-400', DONE: 'bg-green-400',
      DRAFT: 'bg-zinc-500', SENT: 'bg-blue-400', PAID: 'bg-green-400', OVERDUE: 'bg-red-400',
      LOW: 'bg-zinc-500', MEDIUM: 'bg-amber-400', HIGH: 'bg-orange-400', URGENT: 'bg-red-400',
    }
    return colors[status] || 'bg-zinc-500'
  }

  function downloadBlob(blob: Blob, filename: string) {
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return { formatDate, formatDateTime, formatCurrency, statusColor, statusDot, downloadBlob }
}
