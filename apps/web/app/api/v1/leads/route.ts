import { NextRequest } from 'next/server'
import db from '@/lib/db'
import {
  requireAuth,
  isAuthContext,
  requirePermission,
  parseBody,
  ok,
  created,
  withErrorHandler,
  parsePagination,
  paginationMeta,
} from '@/lib/api-helpers'
import { createLeadSchema } from '@/lib/validations/lead'
import { logActivity } from '@/lib/audit'
import { notifyNewLead } from '@/lib/notifications'

export const GET = withErrorHandler(async (req: NextRequest) => {
  const auth = await requireAuth(req)
  if (!isAuthContext(auth)) return auth

  const permErr = requirePermission(auth, 'leads:read')
  if (permErr) return permErr

  const { searchParams } = req.nextUrl
  const { page, limit, skip } = parsePagination(searchParams)

  const status = searchParams.get('status')
  const search = searchParams.get('search')
  const assignedToId = searchParams.get('assignedToId')

  const where = {
    deletedAt: null,
    ...(status ? { status: status as any } : {}),
    ...(assignedToId ? { assignedToId } : {}),
    ...(search
      ? {
          OR: [
            { title: { contains: search, mode: 'insensitive' as const } },
            { contactName: { contains: search, mode: 'insensitive' as const } },
            { contactEmail: { contains: search, mode: 'insensitive' as const } },
            { companyName: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  }

  const [leads, total] = await Promise.all([
    db.lead.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        client: { select: { id: true, name: true, companyName: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    }),
    db.lead.count({ where }),
  ])

  return ok(leads, paginationMeta(total, page, limit))
})

export const POST = withErrorHandler(async (req: NextRequest) => {
  const auth = await requireAuth(req)
  if (!isAuthContext(auth)) return auth

  const permErr = requirePermission(auth, 'leads:write')
  if (permErr) return permErr

  const body = await parseBody(req, createLeadSchema)
  if (!isAuthContext(auth) && 'status' in body) return body as any
  if ('status' in body && typeof (body as any).status === 'number') return body as any

  const data = body as Awaited<ReturnType<typeof createLeadSchema.parseAsync>>

  const lead = await db.lead.create({
    data: {
      title: data.title,
      clientId: data.clientId,
      contactName: data.contactName,
      contactEmail: data.contactEmail,
      contactPhone: data.contactPhone,
      companyName: data.companyName,
      description: data.description,
      source: data.source,
      estimatedValue: data.estimatedValue,
      notes: data.notes,
      assignedToId: data.assignedToId,
      status: data.status ?? 'NEW_REQUEST',
      createdById: auth.userId,
    },
    include: {
      client: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
    },
  })

  await Promise.all([
    logActivity({
      entityType: 'lead',
      entityId: lead.id,
      userId: auth.userId,
      action: 'created',
      metadata: { title: lead.title, status: lead.status },
      req,
    }),
    notifyNewLead(lead.id, lead.title, auth.userId),
  ])

  return created(lead)
})
