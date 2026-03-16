/**
 * BMP Web Routes - Extension
 * 
 * Route definitions and file locations for BMP-specific web pages.
 * 
 * Files location: packages/web/src/app/routes/platform/
 * - organizations/ - Organization management pages
 *   - index.tsx (OrganizationsPage)
 *   - environment-metadata-dialog.tsx
 *   - organization-environments-section.tsx
 * - super-admin/ - Super Admin dashboard
 *   - index.tsx (SuperAdminDashboard)
 *   - create-tenant-dialog.tsx
 * - owner-dashboard/ - Owner dashboard
 *   - index.tsx (OwnerDashboard)
 * 
 * These files are protected from upstream merges via .gitattributes (merge=ours)
 */

export const BMP_WEB_ROUTES = {
    organizations: '/platform/organizations',
    superAdmin: '/super-admin',
    ownerDashboard: '/owner-dashboard',
} as const

export type BmpWebRoute = typeof BMP_WEB_ROUTES[keyof typeof BMP_WEB_ROUTES]

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
