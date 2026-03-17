/**
 * BMP Web Hooks - Extension
 * 
 * React hooks for BMP functionality.
 * 
 * Available hooks:
 * - useSuperAdminPlatforms: Fetch all platforms/tenants
 * - useSuperAdminUsers: Fetch all users across platforms
 * - useSuperAdminStats: Fetch system statistics
 * - useSuperAdminTenants: Fetch tenant list with details
 * - useCreateTenant: Mutation hook to create new tenant
 * - useSwitchToTenant: Mutation hook to switch into tenant context
 * - useOrganizations: Fetch organizations for current platform
 * - useOrganizationEnvironments: Fetch environments for an organization
 * - useUpdateEnvironmentMetadata: Update BMP metadata for an environment
 * 
 * Files location: packages/web/src/hooks/
 * - super-admin-hooks.ts - Hooks for Super Admin operations
 * 
 * These files are protected from upstream merges via .gitattributes (merge=ours)
 */

/**
 * BMP hook file paths
 */
export const BMP_WEB_HOOKS_PATHS = {
    superAdminHooks: 'packages/web/src/hooks/super-admin-hooks.ts',
    organizationHooks: 'packages/web/src/features/platform-admin/api/organization-hooks.ts',
} as const

/**
 * Available BMP hooks
 */
export const BMP_HOOKS = {
    // Super Admin hooks
    useSuperAdminPlatforms: 'useSuperAdminPlatforms',
    useSuperAdminUsers: 'useSuperAdminUsers',
    useSuperAdminStats: 'useSuperAdminStats',
    useSuperAdminTenants: 'useSuperAdminTenants',
    useCreateTenant: 'useCreateTenant',
    useSwitchToTenant: 'useSwitchToTenant',
    // Organization hooks
    useOrganizations: 'useOrganizations',
    useOrganizationEnvironments: 'useOrganizationEnvironments',
    useUpdateEnvironmentMetadata: 'useUpdateEnvironmentMetadata',
    useAllowedEnvironments: 'useAllowedEnvironments',
} as const

// Feature flag for BMP web hooks
export const BMP_WEB_HOOKS_ENABLED = true
