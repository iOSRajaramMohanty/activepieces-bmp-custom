/**
 * BMP Routes Configuration
 * 
 * Provides utilities for conditionally including BMP-specific routes
 * based on the VITE_BMP_ENABLED environment variable.
 * 
 * This file acts as a bridge between the core web application and the
 * BMP extension, allowing routes to be conditionally loaded without
 * modifying the core route definitions.
 */

/**
 * Check if BMP features are enabled
 * This reads from Vite's environment variables at build time
 */
export const isBmpEnabled = (): boolean => {
    return import.meta.env.VITE_BMP_ENABLED === 'true'
}

/**
 * BMP route paths that should be conditionally included
 */
export const BMP_ROUTE_PATHS = {
    superAdmin: '/super-admin',
    ownerDashboard: '/owner-dashboard',
    organizations: '/platform/organizations',
} as const

/**
 * Check if a route path is a BMP-specific route
 */
export const isBmpRoute = (path: string): boolean => {
    return Object.values(BMP_ROUTE_PATHS).some(bmpPath => path === bmpPath)
}

/**
 * Filter routes based on BMP enabled status
 * When BMP is disabled, BMP-specific routes are removed
 * 
 * @param routes - Array of route objects with path property
 * @returns Filtered routes based on BMP enabled status
 */
export const filterBmpRoutes = <T extends { path: string }>(routes: T[]): T[] => {
    if (isBmpEnabled()) {
        return routes
    }
    
    return routes.filter(route => !isBmpRoute(route.path))
}

/**
 * BMP role-based route mapping
 * Maps platform roles to their default BMP routes
 * 
 * @param platformRole - The user's platform role (may be undefined while loading)
 * @returns The BMP-specific default route, or null if not applicable
 */
export const getBmpDefaultRoute = (platformRole: string | undefined): string | null => {
    // Early return if BMP is disabled or platformRole is not provided
    if (!isBmpEnabled() || !platformRole) {
        return null
    }
    
    switch (platformRole) {
        case 'SUPER_ADMIN':
            return BMP_ROUTE_PATHS.superAdmin
        case 'OWNER':
            return BMP_ROUTE_PATHS.ownerDashboard
        default:
            return null
    }
}
