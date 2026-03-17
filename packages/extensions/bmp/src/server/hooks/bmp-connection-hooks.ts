/**
 * BMP Connection Hooks Implementation
 * 
 * These hooks override the default connection behavior to support:
 * - BMP piece detection
 * - Protection of auto-created BMP connections
 * - Environment metadata injection
 * 
 * Usage in app.ts:
 * ```typescript
 * if (bmpEnabled) {
 *   connectionHooks.set(bmpConnectionHooks)
 * }
 * ```
 */

type Logger = {
    info: (msg: string | object, ...args: unknown[]) => void
    warn: (msg: string | object, ...args: unknown[]) => void
    error: (msg: string | object, ...args: unknown[]) => void
}

/**
 * Interface matching core ConnectionHooks
 */
export interface ConnectionHooksInterface {
    isBmpPiece(pieceName: string): boolean
    canDeleteConnection(connection: { externalId?: string | null }): boolean
    getEnvironmentMetadata(params: {
        pieceName: string
        environment?: string
        organizationId?: string
        platformId: string
    }): Promise<Record<string, unknown> | undefined>
}

const BMP_PIECE_NAME = '@activepieces/piece-ada-bmp'
const BMP_AUTO_CONNECTION_PREFIX = 'bmp-auto-'

/**
 * BMP Connection Hooks Creator
 * 
 * Returns connection hooks with BMP-specific behavior:
 * - Identifies ada-bmp as a BMP piece
 * - Prevents deletion of auto-created BMP connections
 * - Provides environment metadata from organization settings
 */
export const bmpConnectionHooks = (log: Logger): ConnectionHooksInterface => ({
    isBmpPiece: (pieceName: string): boolean => {
        return pieceName === BMP_PIECE_NAME
    },

    canDeleteConnection: (connection: { externalId?: string | null }): boolean => {
        if (connection.externalId?.startsWith(BMP_AUTO_CONNECTION_PREFIX)) {
            log.info({ externalId: connection.externalId }, '[BMP] Blocking deletion of auto-created BMP connection')
            return false
        }
        return true
    },

    getEnvironmentMetadata: async (params): Promise<Record<string, unknown> | undefined> => {
        const { pieceName, environment, organizationId } = params
        
        // Only provide metadata for BMP pieces
        if (pieceName !== BMP_PIECE_NAME) {
            return undefined
        }

        if (!environment || !organizationId) {
            log.warn({ pieceName, environment, organizationId }, '[BMP] Missing environment or organizationId for BMP piece')
            return undefined
        }

        // Note: The actual environment metadata fetching is implemented in the core server
        // package (app-connection-service.ts) because it requires direct database access.
        // This hook returns undefined, and the core implementation handles the actual lookup.
        // This architecture avoids circular dependencies between extension and core.
        log.info({ organizationId, environment }, '[BMP] Environment metadata lookup delegated to core')
        return undefined
    },
})
