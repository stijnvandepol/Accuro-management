'use client'

import { useState } from 'react'
import { TimelineTab } from './timeline-tab'
import { CommunicationsTab } from './communications-tab'
import { ReferencesTab } from './references-tab'

type TabKey = 'overview' | 'timeline' | 'communications' | 'references'

export function TicketDetailTabs({
  ticketId,
  currentUserId,
  currentUserRole,
  overview,
}: {
  ticketId: string
  currentUserId: string
  currentUserRole: string
  overview: React.ReactNode
}) {
  const [tab, setTab] = useState<TabKey>('overview')

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-3">
        {[
          ['overview', 'Overview'],
          ['timeline', 'Timeline'],
          ['communications', 'Communications'],
          ['references', 'References'],
        ].map(([value, label]) => (
          <button
            key={value}
            onClick={() => setTab(value as TabKey)}
            className={`rounded-full px-3 py-1.5 text-sm ${
              tab === value ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'overview' && overview}
      {tab === 'timeline' && (
        <TimelineTab ticketId={ticketId} currentUserId={currentUserId} currentUserRole={currentUserRole} />
      )}
      {tab === 'communications' && <CommunicationsTab ticketId={ticketId} />}
      {tab === 'references' && (
        <ReferencesTab ticketId={ticketId} currentUserId={currentUserId} currentUserRole={currentUserRole} />
      )}
    </div>
  )
}
