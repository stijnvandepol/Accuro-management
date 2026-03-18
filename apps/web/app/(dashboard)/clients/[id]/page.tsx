import { notFound } from 'next/navigation'
import Link from 'next/link'
import db from '@/lib/db'
import { formatDate } from '@/lib/utils'

function statusLabel(s: string) {
  return s.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
}

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const client = await db.client.findFirst({
    where: { id, deletedAt: null },
    include: {
      contacts: { orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }] },
      projects: {
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { id: true, title: true, status: true, packageType: true, createdAt: true },
      },
      leads: {
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, title: true, status: true, createdAt: true },
      },
    },
  })

  if (!client) notFound()

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/clients" className="hover:text-gray-700">Clients</Link>
        <span>/</span>
        <span>{client.name}</span>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{client.name}</h2>
          {client.companyName && <p className="text-gray-500">{client.companyName}</p>}
        </div>
        {!client.isActive && (
          <span className="px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-600">Inactive</span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4">
          {/* Client info */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Contact Information</h3>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-gray-500">Email</dt>
                <dd className="font-medium">{client.email ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Phone</dt>
                <dd className="font-medium">{client.phone ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Website</dt>
                <dd className="font-medium">
                  {client.website ? (
                    <a href={client.website} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                      {client.website}
                    </a>
                  ) : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Added</dt>
                <dd className="font-medium">{formatDate(client.createdAt)}</dd>
              </div>
            </dl>
            {client.notes && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-sm text-gray-500 mb-1">Notes</p>
                <p className="text-sm text-gray-900 whitespace-pre-line">{client.notes}</p>
              </div>
            )}
          </div>

          {/* Contacts */}
          {client.contacts.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Contacts</h3>
              <div className="space-y-3">
                {client.contacts.map((contact) => (
                  <div key={contact.id} className="flex items-start justify-between">
                    <div className="text-sm">
                      <p className="font-medium text-gray-900">
                        {contact.name}
                        {contact.isPrimary && (
                          <span className="ml-2 text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">Primary</span>
                        )}
                      </p>
                      {contact.role && <p className="text-gray-500">{contact.role}</p>}
                      {contact.email && <p className="text-gray-500">{contact.email}</p>}
                      {contact.phone && <p className="text-gray-500">{contact.phone}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Projects */}
          {client.projects.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Projects</h3>
              <div className="space-y-2">
                {client.projects.map((p) => (
                  <div key={p.id} className="flex items-center justify-between text-sm">
                    <Link href={`/projects/${p.id}`} className="text-blue-600 hover:underline font-medium">
                      {p.title}
                    </Link>
                    <div className="flex items-center gap-2 text-gray-500">
                      <span className="text-xs">{p.packageType}</span>
                      <span>{statusLabel(p.status)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Stats sidebar */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Summary</h3>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Total projects</dt>
                <dd className="font-medium">{client.projects.length}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Total leads</dt>
                <dd className="font-medium">{client.leads.length}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Contacts</dt>
                <dd className="font-medium">{client.contacts.length}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  )
}
