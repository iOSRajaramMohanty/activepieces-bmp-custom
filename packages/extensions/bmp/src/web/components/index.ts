/**
 * BMP Web Components - Extension
 * 
 * Component file locations for BMP-specific UI elements.
 * 
 * Files location: packages/web/src/app/
 * - components/super-admin-layout.tsx - Layout wrapper for Super Admin pages
 * - components/switch-back-button.tsx - Button to switch back to previous account context
 * - components/sidebar/super-admin/index.tsx - Super Admin sidebar navigation
 * - connections/ada-bmp-environment-select.tsx - Environment dropdown selector
 * - guards/platform-default-route.tsx - Route guard for default platform redirect
 * 
 * These files are protected from upstream merges via .gitattributes (merge=ours)
 */

export const BMP_COMPONENTS = {
    SuperAdminLayout: 'packages/web/src/app/components/super-admin-layout.tsx',
    SwitchBackButton: 'packages/web/src/app/components/switch-back-button.tsx',
    AdaBmpEnvironmentSelect: 'packages/web/src/app/connections/ada-bmp-environment-select.tsx',
    SuperAdminSidebar: 'packages/web/src/app/components/sidebar/super-admin/index.tsx',
    PlatformDefaultRoute: 'packages/web/src/app/guards/platform-default-route.tsx',
} as const

// Feature flag for BMP UI components
export const BMP_WEB_COMPONENTS_ENABLED = true
