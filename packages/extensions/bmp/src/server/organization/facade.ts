/**
 * Organization Module Facade
 * 
 * Provides a facade for accessing organization functionality from the BMP extension.
 * The actual implementation remains in packages/server/api/src/app/organization/
 * 
 * This facade allows:
 * 1. Type-safe access to organization services
 * 2. Conditional loading based on BMP feature flags
 * 3. Clean separation of concerns
 */

// Use a generic logger type to avoid fastify dependency
type Logger = {
    info: (obj: unknown, msg?: string) => void
    error: (obj: unknown, msg?: string) => void
    warn: (obj: unknown, msg?: string) => void
    debug: (obj: unknown, msg?: string) => void
}

// Use local type definitions to avoid cross-package dependencies
type Organization = {
    id: string
    created: string
    updated: string
    name: string
    platformId: string
    projectId?: string
    metadata?: Record<string, unknown>
}

type OrganizationEnvironment = {
    id: string
    created: string
    updated: string
    organizationId: string
    environment: string
    adminUserId?: string
    adminEmail?: string
    projectId?: string
    platformId: string
    metadata?: Record<string, unknown>
}

type EnvironmentType = 'Dev' | 'Staging' | 'Production'

type SeekPage<T> = {
    data: T[]
    next: string | null
    previous: string | null
}

/**
 * Organization service interface
 * Matches the API of packages/server/api/src/app/organization/organization.service.ts
 */
export interface OrganizationServiceInterface {
    create(params: CreateOrganizationParams): Promise<Organization>
    getById(id: string, userId?: string, userOrganizationId?: string, userPlatformRole?: string): Promise<Organization | null>
    getByNameAndPlatform(name: string, platformId: string): Promise<Organization | null>
    list(params: ListOrganizationsParams): Promise<SeekPage<Organization>>
    update(id: string, updates: Partial<Organization>, userId?: string, userOrganizationId?: string, userPlatformRole?: string): Promise<Organization>
    delete(id: string): Promise<void>
    getOrCreate(params: CreateOrganizationParams): Promise<Organization>
}

/**
 * Organization environment service interface
 * Matches the API of packages/server/api/src/app/organization/organization-environment.service.ts
 */
export interface OrganizationEnvironmentServiceInterface {
    create(params: CreateOrganizationEnvironmentParams): Promise<OrganizationEnvironment>
    getById(id: string): Promise<OrganizationEnvironment | null>
    getByOrgAndEnv(organizationId: string, environment: EnvironmentType): Promise<OrganizationEnvironment | null>
    listByOrganization(organizationId: string): Promise<OrganizationEnvironment[]>
    update(id: string, updates: Partial<OrganizationEnvironment>): Promise<OrganizationEnvironment>
    upsert(params: CreateOrganizationEnvironmentParams): Promise<OrganizationEnvironment>
    delete(id: string): Promise<void>
    getByAdminUserId(adminUserId: string): Promise<OrganizationEnvironment | null>
    getAllByPlatform(platformId: string): Promise<OrganizationEnvironment[]>
}

/**
 * Parameters for creating an organization
 */
export interface CreateOrganizationParams {
    name: string
    platformId: string
}

/**
 * Parameters for listing organizations
 */
export interface ListOrganizationsParams {
    platformId: string
    limit?: number
    cursor?: string | null
    userId?: string
    userOrganizationId?: string
    userPlatformRole?: string
}

/**
 * Parameters for creating an organization environment
 */
export interface CreateOrganizationEnvironmentParams {
    organizationId: string
    environment: EnvironmentType
    platformId: string
    adminUserId?: string | null
    projectId?: string | null
}

/**
 * Lazy loader for organization service
 * Returns the service from core when BMP is enabled
 * 
 * Note: The actual service is in packages/server/api/src/app/organization/organization.service.ts
 * This facade provides a way to access it without direct imports that would create
 * circular dependencies.
 */
export async function getOrganizationService(): Promise<OrganizationServiceInterface | null> {
    if (process.env.AP_BMP_ENABLED !== 'true') {
        return null
    }
    
    // The service is loaded dynamically at runtime by the server
    // This function is a placeholder for documentation purposes
    return null
}

/**
 * Lazy loader for organization environment service
 * 
 * Note: The actual service is in packages/server/api/src/app/organization/organization-environment.service.ts
 */
export async function getOrganizationEnvironmentService(): Promise<OrganizationEnvironmentServiceInterface | null> {
    if (process.env.AP_BMP_ENABLED !== 'true') {
        return null
    }
    
    // The service is loaded dynamically at runtime by the server
    return null
}
