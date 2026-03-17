/**
 * Super Admin Module Facade
 * 
 * Provides a facade for accessing super admin functionality from the BMP extension.
 * The actual implementation remains in packages/server/api/src/app/super-admin/
 * 
 * Super Admin Features:
 * - View all platforms/tenants
 * - View all users across platforms
 * - View all projects across platforms
 * - Create new tenants
 * - Delete tenants
 * - Switch into tenant accounts (impersonation)
 * - Promote users to super admin
 * - View account switching activity logs
 */

// Use a generic logger type to avoid fastify dependency
type Logger = {
    info: (obj: unknown, msg?: string) => void
    error: (obj: unknown, msg?: string) => void
    warn: (obj: unknown, msg?: string) => void
    debug: (obj: unknown, msg?: string) => void
}

/**
 * Platform/tenant information returned by super admin APIs
 */
export interface TenantInfo {
    id: string
    name: string
    ownerId: string
    ownerEmail?: string
    created: Date
    userCount: number
    projectCount: number
}

/**
 * User information for super admin dashboard
 */
export interface SuperAdminUserInfo {
    id: string
    email: string
    firstName?: string
    lastName?: string
    platformRole: string
    status: string
    platformId?: string
    platformName?: string
    organizationId?: string
    organizationName?: string
    environment?: string
    created: Date
    lastActiveDate?: Date
}

/**
 * System statistics for super admin dashboard
 */
export interface SystemStats {
    totalPlatforms: number
    totalUsers: number
    totalProjects: number
    totalFlows: number
    totalSuperAdmins: number
    totalOwners: number
    totalAdmins: number
    totalOperators: number
    totalMembers: number
}

/**
 * Account switching activity record
 */
export interface AccountSwitchingActivity {
    id: string
    originalUserId: string
    switchedToUserId: string
    switchType: 'SUPER_ADMIN_TO_OWNER' | 'OWNER_TO_ADMIN'
    originalUserEmail?: string
    switchedToUserEmail?: string
    originalPlatformId?: string
    switchedToPlatformId?: string
    created: Date
}

/**
 * Super admin service interface
 */
export interface SuperAdminServiceInterface {
    getPlatforms(log: Logger): Promise<TenantInfo[]>
    getUsers(log: Logger): Promise<SuperAdminUserInfo[]>
    getStats(log: Logger): Promise<SystemStats>
    getSuperAdmins(log: Logger): Promise<SuperAdminUserInfo[]>
    createTenant(params: CreateTenantParams, log: Logger): Promise<TenantInfo>
    deleteTenant(platformId: string, log: Logger): Promise<void>
    switchToTenant(platformId: string, superAdminId: string, log: Logger): Promise<unknown>
    promoteToSuperAdmin(userId: string, log: Logger): Promise<void>
    demoteSuperAdmin(userId: string, newRole: string, log: Logger): Promise<void>
}

/**
 * Parameters for creating a new tenant
 */
export interface CreateTenantParams {
    name: string
    ownerEmail: string
    ownerPassword: string
    ownerFirstName: string
    ownerLastName: string
}

/**
 * Check if current user is a super admin
 */
export function isSuperAdmin(platformRole: string): boolean {
    return platformRole === 'SUPER_ADMIN'
}

/**
 * Check if BMP super admin feature is enabled
 */
export function isSuperAdminEnabled(): boolean {
    return process.env.AP_BMP_ENABLED === 'true' && 
           process.env.AP_BMP_SUPER_ADMIN !== 'false'
}
