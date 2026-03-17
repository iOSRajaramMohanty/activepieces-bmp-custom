/**
 * BMP Extension - Server Module
 * 
 * Exports server-side functionality including:
 * - Module configuration for conditional loading
 * - Organization management interfaces
 * - Super admin operations interfaces
 * - Account switching interfaces
 * - Feature flags and utilities
 */

// BMP Module configuration (for conditional loading in app.ts)
export {
    BMP_SERVER_MODULES,
    BMP_MODULE_ROUTES,
    isBmpEnabled,
    getBmpServerFeatureFlags,
} from './bmp.module'
export type { BmpModuleRoute } from './bmp.module'

// Organization module
export {
    ORGANIZATION_MODULE_PATHS,
    BMP_ORGANIZATION_ENABLED,
    getOrganizationService,
    getOrganizationEnvironmentService,
} from './organization'

export type {
    OrganizationServiceInterface,
    OrganizationEnvironmentServiceInterface,
    CreateOrganizationParams,
    ListOrganizationsParams,
    CreateOrganizationEnvironmentParams,
} from './organization'

// Super admin module
export {
    SUPER_ADMIN_MODULE_PATHS,
    BMP_SUPER_ADMIN_ENABLED,
    isSuperAdmin as isSuperAdminRole,
    isSuperAdminEnabled,
} from './super-admin'

export type {
    TenantInfo,
    SuperAdminUserInfo,
    SystemStats,
    AccountSwitchingActivity as SuperAdminAccountSwitchingActivity,
    CreateTenantParams,
    SuperAdminServiceInterface,
} from './super-admin'

// Account switching
export {
    ACCOUNT_SWITCHING_MODULE_PATHS,
    BMP_ACCOUNT_SWITCHING_ENABLED,
    isAccountSwitchingEnabled,
    isValidSwitchType,
    getReverseSwitchType,
} from './account-switching'

export type {
    AccountSwitchType as ServerAccountSwitchType,
    AccountSwitchingActivity,
    LogActivityParams,
    AccountSwitchingServiceInterface,
} from './account-switching'

// Server-side BMP hooks (for app.ts registration)
export { bmpAuthHooks, bmpConnectionHooks } from './hooks'
export type { AuthHooksInterface, ConnectionHooksInterface } from './hooks'
