/**
 * BMP Web API - Extension
 * 
 * API client and React hooks for BMP functionality.
 * 
 * APIs:
 * - Organization API: CRUD operations for organizations and environments
 * - Super Admin API: Tenant management, user impersonation, statistics
 * 
 * Endpoints:
 * - GET /api/v1/organizations - List organizations
 * - POST /api/v1/organizations - Create organization
 * - GET /api/v1/organizations/:id - Get organization
 * - GET /api/v1/organizations/:id/environments - List environments
 * - PATCH /api/v1/organizations/:id/environments/:envId/metadata - Update metadata
 * - GET /api/v1/organizations/current-user/allowed-environments - Get allowed envs
 * - GET /api/v1/super-admin/platforms - List all platforms
 * - GET /api/v1/super-admin/users - List all users
 * - GET /api/v1/super-admin/stats - Get system statistics
 * - POST /api/v1/super-admin/tenants - Create tenant
 * - POST /api/v1/super-admin/tenants/:id/switch - Switch to tenant
 * 
 * Files location:
 * - packages/web/src/features/platform-admin/api/organization-api.ts
 * - packages/web/src/features/platform-admin/api/organization-hooks.ts
 * - packages/web/src/lib/super-admin-api.ts
 * - packages/web/src/hooks/super-admin-hooks.ts
 * 
 * These files are protected from upstream merges via .gitattributes (merge=ours)
 */

/**
 * BMP API file paths
 */
export const BMP_WEB_API_PATHS = {
    organizationApi: 'packages/web/src/features/platform-admin/api/organization-api.ts',
    organizationHooks: 'packages/web/src/features/platform-admin/api/organization-hooks.ts',
    superAdminApi: 'packages/web/src/lib/super-admin-api.ts',
    superAdminHooks: 'packages/web/src/hooks/super-admin-hooks.ts',
} as const

/**
 * API endpoint paths
 */
export const BMP_API_ENDPOINTS = {
    organizations: {
        list: '/api/v1/organizations',
        create: '/api/v1/organizations',
        get: (id: string) => `/api/v1/organizations/${id}`,
        update: (id: string) => `/api/v1/organizations/${id}`,
        delete: (id: string) => `/api/v1/organizations/${id}`,
        environments: (id: string) => `/api/v1/organizations/${id}/environments`,
        initializeEnvironments: (id: string) => `/api/v1/organizations/${id}/environments/initialize`,
        updateMetadata: (orgId: string, envId: string) => 
            `/api/v1/organizations/${orgId}/environments/${envId}/metadata`,
        allowedEnvironments: '/api/v1/organizations/current-user/allowed-environments',
        checkAdmin: '/api/v1/organizations/check-admin',
        assignUser: '/api/v1/organizations/assign-user',
    },
    superAdmin: {
        platforms: '/api/v1/super-admin/platforms',
        users: '/api/v1/super-admin/users',
        projects: '/api/v1/super-admin/projects',
        stats: '/api/v1/super-admin/stats',
        superAdmins: '/api/v1/super-admin/super-admins',
        tenants: '/api/v1/super-admin/tenants',
        createTenant: '/api/v1/super-admin/tenants',
        switchToTenant: (platformId: string) => `/api/v1/super-admin/tenants/${platformId}/switch`,
        deleteTenant: (platformId: string) => `/api/v1/super-admin/tenants/${platformId}`,
        accountSwitchingActivities: '/api/v1/super-admin/account-switching-activities',
    },
} as const

// Feature flag for BMP Web API
export const BMP_WEB_API_ENABLED = true
