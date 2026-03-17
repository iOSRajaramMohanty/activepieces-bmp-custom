/**
 * BMP Hook Type Definitions
 * 
 * Defines interfaces for all BMP hooks that can be registered with core Activepieces.
 * These hooks allow BMP functionality to be injected into core without tight coupling.
 */

// Use a generic logger type to avoid fastify dependency
type Logger = {
    info: (obj: unknown, msg?: string) => void
    error: (obj: unknown, msg?: string) => void
    warn: (obj: unknown, msg?: string) => void
    debug: (obj: unknown, msg?: string) => void
}

/**
 * Connection validation hooks for BMP pieces
 */
export interface BmpConnectionHooks {
    /**
     * Check if a piece is a BMP piece
     */
    isBmpPiece: (pieceName: string) => boolean

    /**
     * Validate BMP connection and retrieve environment metadata
     */
    validateConnection: (params: {
        pieceName: string
        projectId: string
        platformId: string
        auth: { props?: { environment?: string }; environment?: string }
        log: Logger
    }) => Promise<{
        isValid: boolean
        environmentMetadata: Record<string, unknown>
        error?: string
    }>

    /**
     * Check if a connection can be deleted (guard for auto-created BMP connections)
     */
    canDeleteConnection: (params: {
        connectionName: string
        pieceName: string
    }) => { allowed: boolean; reason?: string }
}

/**
 * Authentication hooks for BMP-specific logic
 */
export interface BmpAuthHooks {
    /**
     * Handle SDK client ID and organization creation
     */
    handleSDKClientIdAndOrganization: (params: {
        userId: string
        platformId: string
        clientId?: string
        organizationName?: string
        log: Logger
    }) => Promise<{
        organizationId?: string
        clientId?: string
    }>

    /**
     * Enrich authentication token with organization info
     */
    enrichAuthToken: (params: {
        userId: string
        organizationId?: string
    }) => Promise<{
        userOrganizationId?: string
    }>

    /**
     * Check if user has privileged role (SUPER_ADMIN or OWNER)
     */
    isPrivilegedRole: (platformRole: string) => boolean
}

/**
 * User service hooks for BMP
 */
export interface BmpUserHooks {
    /**
     * Enrich user metadata with organization info
     */
    enrichUserMetadata: (params: {
        userId: string
        organizationId?: string
        log: Logger
    }) => Promise<{
        organizationName?: string
        environment?: string
    }>

    /**
     * Filter users based on organization visibility
     */
    filterUsersByOrganization: (params: {
        users: unknown[]
        currentUserRole: string
        currentUserOrgId?: string
    }) => unknown[]
}

/**
 * Project service hooks for BMP
 */
export interface BmpProjectHooks {
    /**
     * Check project visibility based on role
     */
    canAccessProject: (params: {
        projectId: string
        userId: string
        platformRole: string
        userOrgId?: string
    }) => Promise<boolean>

    /**
     * Filter projects based on organization
     */
    filterProjectsByOrganization: (params: {
        projects: unknown[]
        currentUserRole: string
        currentUserOrgId?: string
    }) => unknown[]
}

/**
 * Piece metadata hooks for BMP
 */
export interface BmpPieceHooks {
    /**
     * Inject organization environment metadata for piece execution
     */
    injectEnvironmentMetadata: (params: {
        projectId: string
        pieceName: string
        environment?: string
        log: Logger
    }) => Promise<Record<string, unknown>>

    /**
     * Check if piece has API URL configured
     */
    hasApiUrlConfigured: (params: {
        organizationId: string
        environment: string
    }) => Promise<boolean>
}

/**
 * Engine/trigger hooks for BMP
 */
export interface BmpEngineHooks {
    /**
     * Check if webhook secret validation should be skipped
     */
    skipWebhookSecretValidation: (pieceName: string) => boolean

    /**
     * Inject environment variables for sandbox execution
     */
    getSandboxEnvVars: (params: {
        projectId: string
        pieceName: string
        environment?: string
    }) => Promise<Record<string, string>>
}

/**
 * Organization service hooks
 */
export interface BmpOrganizationHooks {
    /**
     * Get organization by ID
     */
    getOrganization: (organizationId: string) => Promise<unknown | null>

    /**
     * Get organization environment
     */
    getOrganizationEnvironment: (params: {
        organizationId: string
        environment: string
    }) => Promise<unknown | null>

    /**
     * List organization environments
     */
    listOrganizationEnvironments: (organizationId: string) => Promise<unknown[]>
}

/**
 * Combined BMP hooks registry
 */
export interface BmpHooksRegistry {
    connection: Partial<BmpConnectionHooks>
    auth: Partial<BmpAuthHooks>
    user: Partial<BmpUserHooks>
    project: Partial<BmpProjectHooks>
    piece: Partial<BmpPieceHooks>
    engine: Partial<BmpEngineHooks>
    organization: Partial<BmpOrganizationHooks>
}

/**
 * Feature flags for BMP functionality
 */
export interface BmpFeatureFlags {
    enabled: boolean
    organizationsEnabled: boolean
    superAdminEnabled: boolean
    accountSwitchingEnabled: boolean
    environmentMetadataEnabled: boolean
}
