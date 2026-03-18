import { type NextRequest } from 'next/server'
import { z } from 'zod'
import db from '@/lib/db'
import {
  ok, created, requireAuth, isAuthContext, requirePermission, parseBody, withErrorHandler,
} from '@/lib/api-helpers'

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 100)
}

const CreatePageSchema = z.object({
  title: z.string().min(1).max(300),
  content: z.string().min(1).max(100000),
  category: z.string().max(100).optional(),
  slug: z.string().max(100).optional(),
})

export const GET = withErrorHandler(async (req: NextRequest) => {
  const auth = await requireAuth(req)
  if (!isAuthContext(auth)) return auth

  const permErr = requirePermission(auth, 'wiki:read')
  if (permErr) return permErr

  const { searchParams } = req.nextUrl
  const q = searchParams.get('q')
  const category = searchParams.get('category')
  const cursor = searchParams.get('cursor')
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100)

  const pages = await db.wikiPage.findMany({
    where: {
      deletedAt: null,
      ...(category ? { category } : {}),
      ...(q ? {
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { content: { contains: q, mode: 'insensitive' } },
          { category: { contains: q, mode: 'insensitive' } },
        ],
      } : {}),
      ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
    },
    orderBy: { updatedAt: 'desc' },
    take: limit + 1,
    select: {
      id: true, title: true, slug: true, category: true,
      version: true, createdAt: true, updatedAt: true,
      createdBy: { select: { id: true, name: true } },
    },
  })

  const hasMore = pages.length > limit
  const items = hasMore ? pages.slice(0, limit) : pages

  return ok({ data: items, pagination: { hasMore, nextCursor: hasMore ? items.at(-1)!.createdAt.toISOString() : null } })
})

export const POST = withErrorHandler(async (req: NextRequest) => {
  const auth = await requireAuth(req)
  if (!isAuthContext(auth)) return auth

  const permErr = requirePermission(auth, 'wiki:write')
  if (permErr) return permErr

  const body = await parseBody(req, CreatePageSchema)
  if (body instanceof Response) return body

  const slug = body.slug ?? slugify(body.title)

  // Ensure unique slug
  const existing = await db.wikiPage.findUnique({ where: { slug } })
  const finalSlug = existing ? `${slug}-${Date.now()}` : slug

  const page = await db.wikiPage.create({
    data: {
      title: body.title,
      slug: finalSlug,
      content: body.content,
      category: body.category,
      version: 1,
      createdById: auth.userId,
    },
    include: { createdBy: { select: { id: true, name: true } } },
  })

  // Store initial version
  await db.wikiPageVersion.create({
    data: {
      pageId: page.id,
      content: body.content,
      version: 1,
      editedById: auth.userId,
    },
  })

  return created(page)
})
