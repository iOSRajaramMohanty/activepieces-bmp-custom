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
 * Checks SDK runtime config first (for embedded SDK usage), then Vite env (for web app)
 */
export const isBmpEnabled = (): boolean => {
  // SDK mode: check runtime config first (set by SDKProviders)
  if (typeof window !== 'undefined') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sdkConfig = (window as any).__AP_SDK_CONFIG__;
    console.log('[isBmpEnabled] Checking SDK config:', {
      hasConfig: !!sdkConfig,
      bmpEnabled: sdkConfig?.bmpEnabled,
      fullConfig: sdkConfig,
    });
    if (sdkConfig?.bmpEnabled !== undefined) {
      console.log(
        '[isBmpEnabled] Using SDK config, returning:',
        sdkConfig.bmpEnabled === true,
      );
      return sdkConfig.bmpEnabled === true;
    }
  }
  // Standard web app: check Vite env at build time
  const viteValue = import.meta.env.VITE_BMP_ENABLED === 'true';
  console.log('[isBmpEnabled] Using Vite env, returning:', viteValue);
  return viteValue;
};

/**
 * BMP route paths that should be conditionally included
 */
export const BMP_ROUTE_PATHS = {
  superAdmin: '/super-admin',
  ownerDashboard: '/owner-dashboard',
  organizations: '/platform/organizations',
  cloudOAuthApps: '/platform/cloud-oauth-apps',
} as const;

/**
 * Check if a route path is a BMP-specific route
 */
export const isBmpRoute = (path: string): boolean => {
  return Object.values(BMP_ROUTE_PATHS).some((bmpPath) => path === bmpPath);
};

/**
 * Filter routes based on BMP enabled status
 * When BMP is disabled, BMP-specific routes are removed
 *
 * @param routes - Array of route objects with path property
 * @returns Filtered routes based on BMP enabled status
 */
export const filterBmpRoutes = <T extends { path: string }>(
  routes: T[],
): T[] => {
  if (isBmpEnabled()) {
    return routes;
  }

  return routes.filter((route) => !isBmpRoute(route.path));
};

/**
 * BMP role-based route mapping
 * Maps platform roles to their default BMP routes
 *
 * @param platformRole - The user's platform role (may be undefined while loading)
 * @returns The BMP-specific default route, or null if not applicable
 */
export const getBmpDefaultRoute = (
  platformRole: string | undefined,
): string | null => {
  // Early return if BMP is disabled or platformRole is not provided
  if (!isBmpEnabled() || !platformRole) {
    return null;
  }

  switch (platformRole) {
    case 'SUPER_ADMIN':
      return BMP_ROUTE_PATHS.superAdmin;
    case 'OWNER':
      return BMP_ROUTE_PATHS.ownerDashboard;
    default:
      return null;
  }
};
