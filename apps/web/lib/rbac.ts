import type { Role } from '@prisma/client'

export type Permission =
  // Leads
  | 'leads:read'
  | 'leads:write'
  | 'leads:delete'
  | 'leads:convert'
  // Clients
  | 'clients:read'
  | 'clients:write'
  | 'clients:delete'
  // Projects
  | 'projects:read'
  | 'projects:write'
  | 'projects:delete'
  | 'projects:manage'
  // Tickets
  | 'tickets:read'
  | 'tickets:write'
  | 'tickets:delete'
  | 'tickets:assign'
  // Users
  | 'users:read'
  | 'users:write'
  | 'users:delete'
  // Settings
  | 'settings:read'
  | 'settings:write'
  // API Keys
  | 'api_keys:read'
  | 'api_keys:write'
  | 'api_keys:delete'
  // Notifications
  | 'notifications:read'
  // Reports
  | 'reports:read'

export const ROLE_PERMISSIONS: Record<Role, Permission[] | ['*']> = {
  SUPER_ADMIN: ['*'],
  ADMIN: [
    'leads:read',
    'leads:write',
    'leads:delete',
    'leads:convert',
    'clients:read',
    'clients:write',
    'clients:delete',
    'projects:read',
    'projects:write',
    'projects:delete',
    'projects:manage',
    'tickets:read',
    'tickets:write',
    'tickets:delete',
    'tickets:assign',
    'users:read',
    'users:write',
    'settings:read',
    'settings:write',
    'api_keys:read',
    'api_keys:write',
    'api_keys:delete',
    'notifications:read',
    'reports:read',
  ],
  PROJECT_MANAGER: [
    'leads:read',
    'clients:read',
    'clients:write',
    'projects:read',
    'projects:write',
    'projects:manage',
    'tickets:read',
    'tickets:write',
    'tickets:assign',
    'notifications:read',
    'reports:read',
  ],
  DEVELOPER: [
    'projects:read',
    'tickets:read',
    'tickets:write',
    'notifications:read',
  ],
  SALES: [
    'leads:read',
    'leads:write',
    'leads:convert',
    'clients:read',
    'clients:write',
    'projects:read',
    'tickets:read',
    'notifications:read',
  ],
}

export function hasPermission(role: Role, permission: Permission): boolean {
  const perms = ROLE_PERMISSIONS[role]
  if (!perms) return false
  if (perms.includes('*' as Permission)) return true
  return (perms as Permission[]).includes(permission)
}

export function hasAnyPermission(role: Role, permissions: Permission[]): boolean {
  return permissions.some((p) => hasPermission(role, p))
}

export function hasAllPermissions(role: Role, permissions: Permission[]): boolean {
  return permissions.every((p) => hasPermission(role, p))
}

export function getPermissionsForRole(role: Role): Permission[] {
  const perms = ROLE_PERMISSIONS[role]
  if (perms.includes('*' as Permission)) {
    // Return all permissions for SUPER_ADMIN
    return [
      'leads:read', 'leads:write', 'leads:delete', 'leads:convert',
      'clients:read', 'clients:write', 'clients:delete',
      'projects:read', 'projects:write', 'projects:delete', 'projects:manage',
      'tickets:read', 'tickets:write', 'tickets:delete', 'tickets:assign',
      'users:read', 'users:write', 'users:delete',
      'settings:read', 'settings:write',
      'api_keys:read', 'api_keys:write', 'api_keys:delete',
      'notifications:read',
      'reports:read',
    ]
  }
  return perms as Permission[]
}

// Check if a scope string (from API key) matches a permission
export function scopeMatchesPermission(scope: string, permission: Permission): boolean {
  if (scope === '*') return true
  return scope === permission
}

export function apiKeyScopesHavePermission(scopes: string[], permission: Permission): boolean {
  return scopes.some((s) => scopeMatchesPermission(s, permission))
}
