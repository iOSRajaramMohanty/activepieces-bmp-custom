/**
 * Super Admin Module - BMP Extension
 * 
 * This module provides super admin functionality for cross-platform management.
 * Super Admins can manage multiple platforms/tenants.
 * 
 * Files location: packages/server/api/src/app/super-admin/
 * - super-admin.controller.ts - REST API endpoints for super admin operations
 * - super-admin.module.ts - Fastify module registration
 * 
 * These files are protected from upstream merges via .gitattributes (merge=ours)
 */

export const SUPER_ADMIN_MODULE_PATHS = {
    controller: 'packages/server/api/src/app/super-admin/super-admin.controller.ts',
    module: 'packages/server/api/src/app/super-admin/super-admin.module.ts',
} as const

// Feature flag for Super Admin functionality
export const BMP_SUPER_ADMIN_ENABLED = true
