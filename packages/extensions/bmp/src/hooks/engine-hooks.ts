/**
 * BMP Engine Hooks Implementation
 * 
 * Implements engine/trigger-related hooks for BMP functionality.
 */

import type { BmpEngineHooks } from './types'

const BMP_PIECE_NAME = '@activepieces/piece-ada-bmp'

/**
 * Check if webhook secret validation should be skipped
 * BMP piece uses its own authentication mechanism
 */
export const skipWebhookSecretValidation: BmpEngineHooks['skipWebhookSecretValidation'] = (
    pieceName: string
): boolean => {
    return pieceName === BMP_PIECE_NAME
}

/**
 * Engine hooks object for registration
 */
export const engineHooks: Partial<BmpEngineHooks> = {
    skipWebhookSecretValidation,
}
