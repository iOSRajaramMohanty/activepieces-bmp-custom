/**
 * BMP Web API - Extension
 * 
 * API client and React hooks for BMP functionality.
 * 
 * Files location:
 * - packages/web/src/features/platform-admin/api/organization-api.ts - Organization API client
 * - packages/web/src/features/platform-admin/api/organization-hooks.ts - React Query hooks for organizations
 * - packages/web/src/lib/super-admin-api.ts - Super Admin API client
 * - packages/web/src/hooks/super-admin-hooks.ts - React hooks for Super Admin operations
 * 
 * These files are protected from upstream merges via .gitattributes (merge=ours)
 */

export const BMP_WEB_API_PATHS = {
    organizationApi: 'packages/web/src/features/platform-admin/api/organization-api.ts',
    organizationHooks: 'packages/web/src/features/platform-admin/api/organization-hooks.ts',
    superAdminApi: 'packages/web/src/lib/super-admin-api.ts',
    superAdminHooks: 'packages/web/src/hooks/super-admin-hooks.ts',
} as const

// Feature flag for BMP Web API
export const BMP_WEB_API_ENABLED = true
