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
import { createProjectSchema } from '@/lib/validations/project'
import { logActivity } from '@/lib/audit'
import { notifyAdmins } from '@/lib/notifications'

export const GET = withErrorHandler(async (req: NextRequest) => {
  const auth = await requireAuth(req)
  if (!isAuthContext(auth)) return auth

  const permErr = requirePermission(auth, 'projects:read')
  if (permErr) return permErr

  const { searchParams } = req.nextUrl
  const { page, limit, skip } = parsePagination(searchParams)
  const status = searchParams.get('status')
  const clientId = searchParams.get('clientId')
  const search = searchParams.get('search')
  const assignedToId = searchParams.get('assignedToId')

  // Developers only see their assigned projects
  const isDeveloper = auth.role === 'DEVELOPER'

  const where = {
    deletedAt: null,
    ...(isDeveloper ? { assignedToId: auth.userId } : {}),
    ...(status ? { status: status as any } : {}),
    ...(clientId ? { clientId } : {}),
    ...(assignedToId && !isDeveloper ? { assignedToId } : {}),
    ...(search
      ? {
          OR: [
            { title: { contains: search, mode: 'insensitive' as const } },
            { description: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  }

  const [projects, total] = await Promise.all([
    db.project.findMany({
      where,
      skip,
      take: limit,
      orderBy: { updatedAt: 'desc' },
      include: {
        client: { select: { id: true, name: true, companyName: true } },
        createdBy: { select: { id: true, name: true } },
        _count: { select: { tickets: true, feedbackRounds: true } },
      },
    }),
    db.project.count({ where }),
  ])

  return ok(projects, paginationMeta(total, page, limit))
})

export const POST = withErrorHandler(async (req: NextRequest) => {
  const auth = await requireAuth(req)
  if (!isAuthContext(auth)) return auth

  const permErr = requirePermission(auth, 'projects:write')
  if (permErr) return permErr

  const body = await parseBody(req, createProjectSchema)
  if ('status' in body && typeof (body as any).status === 'number') return body as any
  const data = body as Awaited<ReturnType<typeof createProjectSchema.parseAsync>>

  const project = await db.project.create({
    data: {
      title: data.title,
      description: data.description,
      clientId: data.clientId,
      packageType: data.packageType,
      createdById: auth.userId,
      assignedToId: data.assignedToId,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      targetDeadline: data.targetDeadline ? new Date(data.targetDeadline) : undefined,
      deliverables: data.deliverables,
      notes: data.notes,
    },
    include: {
      client: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
    },
  })

  await Promise.all([
    logActivity({
      entityType: 'project',
      entityId: project.id,
      userId: auth.userId,
      action: 'created',
      metadata: { title: project.title, packageType: project.packageType },
      req,
    }),
    notifyAdmins(
      {
        type: 'STATUS_CHANGED',
        title: `New project created: ${project.title}`,
        entityType: 'project',
        entityId: project.id,
      },
      auth.userId
    ),
  ])

  return created(project)
})
