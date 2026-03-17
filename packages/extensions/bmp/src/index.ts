/**
 * @activepieces/ext-bmp
 * 
 * BMP Extension for Activepieces
 * 
 * Provides multi-tenant organization management, environment-specific configurations,
 * extended user roles (SUPER_ADMIN, OWNER), and account switching functionality.
 * 
 * This extension package organizes BMP-specific code that is protected from 
 * upstream merges via .gitattributes. The actual implementation files remain
 * in their original locations within packages/server and packages/web for 
 * compatibility with the Activepieces architecture.
 * 
 * Key features:
 * - Organization & Environment management (multi-tenant support)
 * - Super Admin / Owner role hierarchy
 * - Account switching for context navigation
 * - BMP-specific UI components and routes
 * - Hook-based integration with core Activepieces
 * 
 * @license MIT
 */

// Hooks infrastructure (core integration)
export * from './hooks'

// Server module metadata (with explicit naming to avoid conflicts)
export {
    // BMP Module configuration
    BMP_SERVER_MODULES,
    BMP_MODULE_ROUTES,
    isBmpEnabled,
    getBmpServerFeatureFlags,
    // Organization
    ORGANIZATION_MODULE_PATHS,
    BMP_ORGANIZATION_ENABLED,
    // Super Admin
    SUPER_ADMIN_MODULE_PATHS,
    BMP_SUPER_ADMIN_ENABLED,
    isSuperAdminEnabled,
    // Account Switching
    ACCOUNT_SWITCHING_MODULE_PATHS,
    BMP_ACCOUNT_SWITCHING_ENABLED,
    isAccountSwitchingEnabled,
    isValidSwitchType,
    getReverseSwitchType,
} from './server'

export type { BmpModuleRoute } from './server'

// Re-export server types with namespace
export type {
    OrganizationServiceInterface,
    OrganizationEnvironmentServiceInterface,
    CreateOrganizationParams,
    ListOrganizationsParams,
    CreateOrganizationEnvironmentParams,
} from './server/organization/facade'

export type {
    TenantInfo,
    SuperAdminUserInfo,
    SystemStats,
    CreateTenantParams,
} from './server/super-admin/facade'

export type {
    AccountSwitchingActivity,
    LogActivityParams,
    AccountSwitchingServiceInterface,
} from './server/account-switching/facade'

// Web module metadata
export {
    BMP_WEB_ROUTES,
    BMP_WEB_ROUTE_FILES,
    isBmpRoute,
    getBmpRouteConfig,
    BMP_WEB_ROUTES_ENABLED,
    BMP_COMPONENTS,
    BMP_COMPONENT_DESCRIPTIONS,
    BMP_ENVIRONMENT_OPTIONS,
    isValidBmpEnvironment,
    BMP_WEB_COMPONENTS_ENABLED,
    BMP_WEB_API_PATHS,
    BMP_API_ENDPOINTS,
    BMP_WEB_API_ENABLED,
    BMP_WEB_HOOKS_PATHS,
    BMP_HOOKS,
    BMP_WEB_HOOKS_ENABLED,
    BMP_PLATFORM_ROLES,
    isOwner,
    getDefaultRouteForRole,
    shouldShowBmpSidebarItems,
    getBmpSidebarItems,
    BMP_MIXED_WEB_FILES,
    BMP_WEB_FACADE_ENABLED,
    ACCOUNT_SWITCH_TYPES,
} from './web'

// Re-export web types
export type { BmpWebRoute } from './web/routes'
export type { BmpPlatformRole } from './web/facade'

// Shared types (actual implementation)
export * from './shared'

// Master feature flag for BMP functionality
export const BMP_EXTENSION_VERSION = '1.0.0'
export const BMP_EXTENSION_ENABLED = true
