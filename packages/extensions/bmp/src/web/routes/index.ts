/**
 * BMP Web Routes - Extension
 * 
 * Route definitions and file locations for BMP-specific web pages.
 * 
 * Routes:
 * - /platform/organizations - Organization management (list, create, configure)
 * - /super-admin - Super Admin dashboard (manage all tenants)
 * - /owner-dashboard - Owner dashboard (manage platform users/projects)
 * 
 * Files location: packages/web/src/app/routes/platform/
 * - organizations/ - Organization management pages
 *   - index.tsx (OrganizationsPage)
 *   - environment-metadata-dialog.tsx (Configure ADA BMP metadata)
 *   - organization-environments-section.tsx (Dev/Staging/Prod environments)
 * - super-admin/ - Super Admin dashboard
 *   - index.tsx (SuperAdminDashboard)
 *   - create-tenant-dialog.tsx (Create new tenant)
 * - owner-dashboard/ - Owner dashboard
 *   - index.tsx (OwnerDashboard)
 * 
 * These files are protected from upstream merges via .gitattributes (merge=ours)
 */

/**
 * BMP web route paths
 */
export const BMP_WEB_ROUTES = {
    organizations: '/platform/organizations',
    superAdmin: '/super-admin',
    ownerDashboard: '/owner-dashboard',
} as const

export type BmpWebRoute = typeof BMP_WEB_ROUTES[keyof typeof BMP_WEB_ROUTES]

/**
 * BMP web route file locations
 */
export const BMP_WEB_ROUTE_FILES = {
    organizations: {
        index: 'packages/web/src/app/routes/platform/organizations/index.tsx',
        environmentMetadataDialog: 'packages/web/src/app/routes/platform/organizations/environment-metadata-dialog.tsx',
        environmentsSection: 'packages/web/src/app/routes/platform/organizations/organization-environments-section.tsx',
    },
    superAdmin: {
        index: 'packages/web/src/app/routes/platform/super-admin/index.tsx',
        createTenantDialog: 'packages/web/src/app/routes/platform/super-admin/create-tenant-dialog.tsx',
    },
    ownerDashboard: {
        index: 'packages/web/src/app/routes/platform/owner-dashboard/index.tsx',
    },
} as const

/**
 * Check if a route is a BMP-specific route
 */
export function isBmpRoute(path: string): boolean {
    return Object.values(BMP_WEB_ROUTES).some(route => path.startsWith(route))
}

/**
 * Get BMP route configuration for React Router
 */
export function getBmpRouteConfig() {
    return {
        organizations: {
            path: BMP_WEB_ROUTES.organizations,
            element: null, // Lazy loaded from web package
        },
        superAdmin: {
            path: BMP_WEB_ROUTES.superAdmin,
            element: null,
        },
        ownerDashboard: {
            path: BMP_WEB_ROUTES.ownerDashboard,
            element: null,
        },
    }
}

// Feature flag
export const BMP_WEB_ROUTES_ENABLED = true
