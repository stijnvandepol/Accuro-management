import { NextRequest } from 'next/server'
import db from '@/lib/db'
import {
  requireAuth,
  isAuthContext,
  requirePermission,
  ok,
  notFound,
  forbidden,
  withErrorHandler,
} from '@/lib/api-helpers'
import { logActivity } from '@/lib/audit'

type Params = { params: Promise<{ id: string }> }

export const DELETE = withErrorHandler(async (req: NextRequest, { params }: Params) => {
  const { id } = await params
  const auth = await requireAuth(req)
  if (!isAuthContext(auth)) return auth

  const permErr = requirePermission(auth, 'api_keys:delete')
  if (permErr) return permErr

  const apiKey = await db.apiKey.findUnique({ where: { id } })
  if (!apiKey) return notFound('API key not found')

  // Users can only delete their own keys (IDOR prevention), unless SUPER_ADMIN/ADMIN
  if (
    apiKey.createdById !== auth.userId &&
    auth.role !== 'SUPER_ADMIN' &&
    auth.role !== 'ADMIN'
  ) {
    return forbidden('You can only delete your own API keys')
  }

  // Soft revoke
  await db.apiKey.update({ where: { id }, data: { isActive: false } })

  await logActivity({
    entityType: 'api_key',
    entityId: id,
    userId: auth.userId,
    action: 'revoked',
    metadata: { name: apiKey.name },
    req,
  })

  return ok({ message: 'API key revoked' })
})
