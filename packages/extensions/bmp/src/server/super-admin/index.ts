/**
 * Super Admin Module - BMP Extension
 * 
 * This module provides super admin functionality for cross-platform management.
 * Super Admins can manage multiple platforms/tenants.
 * 
 * Features:
 * - View all platforms/tenants with statistics
 * - View all users across platforms
 * - View all projects across platforms
 * - Create new tenants with owner accounts
 * - Delete tenants and associated data
 * - Switch into tenant accounts (impersonation)
 * - Promote/demote super admins
 * - View account switching activity logs
 * 
 * Files location: packages/server/api/src/app/super-admin/
 * - super-admin.controller.ts - REST API endpoints for super admin operations
 * - super-admin.module.ts - Fastify module registration
 * 
 * These files are protected from upstream merges via .gitattributes (merge=ours)
 */

// Export facade interfaces and helpers
export * from './facade'

export const SUPER_ADMIN_MODULE_PATHS = {
    controller: 'packages/server/api/src/app/super-admin/super-admin.controller.ts',
    module: 'packages/server/api/src/app/super-admin/super-admin.module.ts',
} as const

// Feature flag for Super Admin functionality
export const BMP_SUPER_ADMIN_ENABLED = true
