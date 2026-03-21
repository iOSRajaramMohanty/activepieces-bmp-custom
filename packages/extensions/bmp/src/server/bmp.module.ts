/**
 * BMP Module Configuration
 * 
 * This module defines the BMP-specific routes and provides configuration
 * for conditional module loading. The actual controllers remain in the core
 * server package due to their deep dependencies on core infrastructure.
 * 
 * Architecture Decision:
 * - Controllers stay in `packages/server/api/src/app/` (organization/, super-admin/, account-switching/)
 * - This extension provides: hooks, types, facades, and registration configuration
 * - Conditional loading happens in `app.ts` based on AP_BMP_ENABLED
 * 
 * The reason for this approach:
 * 1. TypeORM entities require being in the same package as the database connection
 * 2. Controllers depend on core security, logging, and database infrastructure
 * 3. Moving them would create circular dependencies or require duplicating infrastructure
 */

/**
 * BMP Module Paths - Reference to core module locations
 * Used by app.ts to conditionally register these modules
 */
export const BMP_SERVER_MODULES = {
    organization: {
        path: '../organization/organization.module',
        routePrefix: '/v1/organizations',
        description: 'Organization and environment management',
    },
    superAdmin: {
        path: '../super-admin/super-admin.module',
        routePrefix: '/v1/super-admin',
        description: 'Super admin tenant management',
    },
    cloudOAuth: {
        path: './controllers/cloud-oauth.controller',
        routePrefix: '/v1/cloud-oauth',
        description: 'Cloud OAuth apps (internal endpoints)',
    },
} as const

/**
 * Check if BMP is enabled based on environment
 * This should be called from app.ts to determine whether to register BMP modules
 */
export function isBmpEnabled(): boolean {
    return process.env.AP_BMP_ENABLED === 'true'
}

/**
 * Get BMP feature flags from environment
 */
export function getBmpServerFeatureFlags() {
    return {
        bmpEnabled: process.env.AP_BMP_ENABLED === 'true',
        organizationsEnabled: process.env.AP_BMP_ORGANIZATIONS !== 'false',
        superAdminEnabled: process.env.AP_BMP_SUPER_ADMIN !== 'false',
        accountSwitchingEnabled: process.env.AP_BMP_ACCOUNT_SWITCHING !== 'false',
    }
}

/**
 * Export route paths for documentation and reference
 */
export const BMP_MODULE_ROUTES = {
    organizations: '/v1/organizations',
    organizationEnvironments: '/v1/organizations/:id/environments',
    superAdmin: '/v1/super-admin',
    superAdminPlatforms: '/v1/super-admin/platforms',
    superAdminTenants: '/v1/super-admin/tenants',
    superAdminUsers: '/v1/super-admin/users',
    accountSwitching: '/v1/super-admin/account-switching-activities',
    cloudOAuth: '/v1/cloud-oauth',
} as const

export type BmpModuleRoute = typeof BMP_MODULE_ROUTES[keyof typeof BMP_MODULE_ROUTES]
