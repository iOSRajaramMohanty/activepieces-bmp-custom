/**
 * BMP Web Components - Extension
 * 
 * Component file locations for BMP-specific UI elements.
 * 
 * Components:
 * - SuperAdminLayout: Layout wrapper for Super Admin pages (includes header, sidebar)
 * - SwitchBackButton: Button to return to previous account context after switching
 * - AdaBmpEnvironmentSelect: Dropdown for selecting Dev/Staging/Production environment
 * - SuperAdminSidebar: Navigation sidebar for Super Admin dashboard
 * - PlatformDefaultRoute: Route guard that redirects based on user role
 * 
 * Files location: packages/web/src/app/
 * - components/super-admin-layout.tsx
 * - components/switch-back-button.tsx
 * - components/sidebar/super-admin/index.tsx
 * - connections/ada-bmp-environment-select.tsx
 * - guards/platform-default-route.tsx
 * 
 * These files are protected from upstream merges via .gitattributes (merge=ours)
 */

/**
 * BMP component file paths
 */
export const BMP_COMPONENTS = {
    SuperAdminLayout: 'packages/web/src/app/components/super-admin-layout.tsx',
    SwitchBackButton: 'packages/web/src/app/components/switch-back-button.tsx',
    AdaBmpEnvironmentSelect: 'packages/web/src/app/connections/ada-bmp-environment-select.tsx',
    SuperAdminSidebar: 'packages/web/src/app/components/sidebar/super-admin/index.tsx',
    PlatformDefaultRoute: 'packages/web/src/app/guards/platform-default-route.tsx',
} as const

/**
 * Component descriptions for documentation
 */
export const BMP_COMPONENT_DESCRIPTIONS = {
    SuperAdminLayout: 'Layout wrapper for Super Admin pages with header and navigation',
    SwitchBackButton: 'Button component to return to previous account context after impersonation',
    AdaBmpEnvironmentSelect: 'Dropdown selector for choosing Dev/Staging/Production environment',
    SuperAdminSidebar: 'Navigation sidebar for Super Admin dashboard',
    PlatformDefaultRoute: 'Route guard that redirects users based on their platform role',
} as const

/**
 * Environment select options for AdaBmpEnvironmentSelect
 */
export const BMP_ENVIRONMENT_OPTIONS = [
    { label: 'Dev', value: 'Dev' },
    { label: 'Staging', value: 'Staging' },
    { label: 'Production', value: 'Production' },
] as const

/**
 * Check if environment is valid
 */
export function isValidBmpEnvironment(env: string): boolean {
    return BMP_ENVIRONMENT_OPTIONS.some(opt => opt.value === env)
}

// Feature flag for BMP UI components
export const BMP_WEB_COMPONENTS_ENABLED = true
