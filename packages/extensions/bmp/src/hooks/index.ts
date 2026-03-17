/**
 * BMP Hooks Module
 * 
 * Central module for BMP hook infrastructure.
 * Exports types, registry functions, and hook implementations.
 */

// Type definitions
export * from './types'

// Registry functions
export {
    initializeBmpFeatureFlags,
    getBmpFeatureFlags,
    isBmpEnabled,
    registerBmpHooks,
    getBmpHooks,
    clearBmpHooks,
    callBmpHook,
    hasBmpHook,
} from './registry'

// Hook implementations - Connection
export {
    connectionHooks,
    isBmpPiece,
    canDeleteConnection,
    extractEnvironmentFromAuth,
    hasApiUrlConfigured,
    getApiUrlFromMetadata,
    getMissingApiUrlError,
} from './connection-hooks'

// Hook implementations - Auth
export { authHooks, isPrivilegedRole } from './auth-hooks'

// Hook implementations - Engine
export { engineHooks, skipWebhookSecretValidation } from './engine-hooks'

// Hook implementations - Piece
export {
    pieceHooks,
    BMP_METADATA_KEYS,
    requiresEnvironmentMetadata,
    prepareEnvVarsFromMetadata,
    validateBmpMetadata,
    DEFAULT_BMP_METADATA,
} from './piece-hooks'

// Re-export for convenience
import type { BmpHooksRegistry } from './types'
import { connectionHooks } from './connection-hooks'
import { authHooks } from './auth-hooks'
import { engineHooks } from './engine-hooks'
import { pieceHooks } from './piece-hooks'

/**
 * Default BMP hooks registry with all implemented hooks
 */
export const defaultBmpHooks: BmpHooksRegistry = {
    connection: connectionHooks,
    auth: authHooks,
    user: {},
    project: {},
    piece: pieceHooks,
    engine: engineHooks,
    organization: {},
}
