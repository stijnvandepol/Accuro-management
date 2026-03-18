'use client'

import { useMemo, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'

type Option = { id: string; name?: string; clientId?: string | null; title?: string | null }

type TicketFormData = {
  id?: string
  version?: number
  title: string
  description: string
  clientId: string
  clientContactId: string
  projectId: string
  assignedToId: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  type: 'TASK' | 'BUG' | 'FEEDBACK' | 'FEATURE' | 'QUESTION' | 'INTAKE'
  category: string
  labels: string[]
  dueDate: string
  approvalStatus: 'NOT_REQUIRED' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED'
  paymentStatus: 'NOT_APPLICABLE' | 'UNPAID' | 'INVOICE_SENT' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'REFUNDED'
  status?: string
}

export function TicketForm({
  mode,
  initialData,
  clients,
  contacts,
  projects,
  users,
  allowedStatuses = [],
}: {
  mode: 'create' | 'edit'
  initialData?: TicketFormData
  clients: Option[]
  contacts: Option[]
  projects: Option[]
  users: Option[]
  allowedStatuses?: string[]
}) {
  const router = useRouter()
  const [form, setForm] = useState<TicketFormData>(initialData ?? {
    title: '',
    description: '',
    clientId: '',
    clientContactId: '',
    projectId: '',
    assignedToId: '',
    priority: 'MEDIUM',
    type: 'TASK',
    category: '',
    labels: [],
    dueDate: '',
    approvalStatus: 'NOT_REQUIRED',
    paymentStatus: 'NOT_APPLICABLE',
  })
  const [labelsInput, setLabelsInput] = useState((initialData?.labels ?? []).join(', '))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const filteredContacts = useMemo(
    () => contacts.filter((contact) => !form.clientId || contact.clientId === form.clientId),
    [contacts, form.clientId]
  )
  const filteredProjects = useMemo(
    () => projects.filter((project) => !form.clientId || project.clientId === form.clientId),
    [projects, form.clientId]
  )

  function update<K extends keyof TicketFormData>(key: K, value: TicketFormData[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)

    const payload = {
      ...form,
      clientId: form.clientId || undefined,
      clientContactId: form.clientContactId || undefined,
      projectId: form.projectId || undefined,
      assignedToId: form.assignedToId || undefined,
      category: form.category || undefined,
      dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : undefined,
      labels: labelsInput.split(',').map((part) => part.trim()).filter(Boolean),
      version: form.version,
    }

    const endpoint = mode === 'create' ? '/api/v1/tickets' : `/api/v1/tickets/${form.id}`
    const method = mode === 'create' ? 'POST' : 'PATCH'
    const res = await fetch(endpoint, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const json = await res.json().catch(() => null)
    if (!res.ok) {
      setError(json?.error ?? 'Failed to save ticket')
      setSubmitting(false)
      return
    }

    const ticketId = json?.data?.id ?? form.id
    router.push(`/tickets/${ticketId}`)
    router.refresh()
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <label className="mb-1 block text-sm font-medium text-gray-700">Title *</label>
          <input className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" value={form.title} onChange={(e) => update('title', e.target.value)} required />
        </div>
        <div className="md:col-span-2">
          <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
          <textarea className="min-h-[160px] w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" value={form.description} onChange={(e) => update('description', e.target.value)} />
        </div>
        <Select label="Client" value={form.clientId} onChange={(value) => update('clientId', value)} options={clients} />
        <Select label="Client contact" value={form.clientContactId} onChange={(value) => update('clientContactId', value)} options={filteredContacts} />
        <Select label="Project" value={form.projectId} onChange={(value) => update('projectId', value)} options={filteredProjects.map((project) => ({ ...project, name: project.title ?? project.name }))} />
        <Select label="Assignee" value={form.assignedToId} onChange={(value) => update('assignedToId', value)} options={users} />
        <Select
          label="Priority"
          value={form.priority}
          onChange={(value) => update('priority', value as TicketFormData['priority'])}
          options={['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map((value) => ({ id: value, name: value }))}
        />
        <Select
          label="Type"
          value={form.type}
          onChange={(value) => update('type', value as TicketFormData['type'])}
          options={['TASK', 'BUG', 'FEEDBACK', 'FEATURE', 'QUESTION', 'INTAKE'].map((value) => ({ id: value, name: value }))}
        />
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Category</label>
          <input className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" value={form.category} onChange={(e) => update('category', e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Due date</label>
          <input type="date" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" value={form.dueDate} onChange={(e) => update('dueDate', e.target.value)} />
        </div>
        <Select
          label="Approval"
          value={form.approvalStatus}
          onChange={(value) => update('approvalStatus', value as TicketFormData['approvalStatus'])}
          options={['NOT_REQUIRED', 'PENDING', 'APPROVED', 'REJECTED', 'CHANGES_REQUESTED'].map((value) => ({ id: value, name: value }))}
        />
        <Select
          label="Payment"
          value={form.paymentStatus}
          onChange={(value) => update('paymentStatus', value as TicketFormData['paymentStatus'])}
          options={['NOT_APPLICABLE', 'UNPAID', 'INVOICE_SENT', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'REFUNDED'].map((value) => ({ id: value, name: value }))}
        />
        {mode === 'edit' && (
          <Select
            label="Status"
            value={form.status ?? ''}
            onChange={(value) => update('status', value)}
            options={allowedStatuses.map((value) => ({ id: value, name: value }))}
          />
        )}
        <div className="md:col-span-2">
          <label className="mb-1 block text-sm font-medium text-gray-700">Labels</label>
          <input
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            placeholder="frontend, urgent, seo"
            value={labelsInput}
            onChange={(e) => setLabelsInput(e.target.value)}
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        <button type="button" onClick={() => router.back()} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700">
          Cancel
        </button>
        <button type="submit" disabled={submitting || !form.title.trim()} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
          {submitting ? 'Saving...' : mode === 'create' ? 'Create ticket' : 'Save changes'}
        </button>
      </div>
    </form>
  )
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: Option[]
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
      <select className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Select...</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
                    {option.name ?? option.title ?? option.id}
          </option>
        ))}
      </select>
    </div>
  )
}
