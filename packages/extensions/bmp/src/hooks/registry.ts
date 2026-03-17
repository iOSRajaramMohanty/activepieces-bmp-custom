/**
 * BMP Hooks Registry
 * 
 * Central registry for BMP hooks. Core Activepieces code can check if hooks
 * are registered and call them when BMP functionality is enabled.
 */

import type { BmpHooksRegistry, BmpFeatureFlags } from './types'

/**
 * Global BMP hooks registry instance
 */
let bmpHooksRegistry: BmpHooksRegistry | null = null

/**
 * Global BMP feature flags
 */
let bmpFeatureFlags: BmpFeatureFlags = {
    enabled: false,
    organizationsEnabled: false,
    superAdminEnabled: false,
    accountSwitchingEnabled: false,
    environmentMetadataEnabled: false,
}

/**
 * Initialize BMP feature flags from environment
 */
export function initializeBmpFeatureFlags(): BmpFeatureFlags {
    const enabled = process.env.AP_BMP_ENABLED === 'true'
    
    bmpFeatureFlags = {
        enabled,
        organizationsEnabled: enabled && process.env.AP_BMP_ORGANIZATIONS !== 'false',
        superAdminEnabled: enabled && process.env.AP_BMP_SUPER_ADMIN !== 'false',
        accountSwitchingEnabled: enabled && process.env.AP_BMP_ACCOUNT_SWITCHING !== 'false',
        environmentMetadataEnabled: enabled && process.env.AP_BMP_ENVIRONMENT_METADATA !== 'false',
    }
    
    return bmpFeatureFlags
}

/**
 * Get current BMP feature flags
 */
export function getBmpFeatureFlags(): BmpFeatureFlags {
    return { ...bmpFeatureFlags }
}

/**
 * Check if BMP is enabled
 */
export function isBmpEnabled(): boolean {
    return bmpFeatureFlags.enabled
}

/**
 * Register BMP hooks with the global registry
 */
export function registerBmpHooks(hooks: BmpHooksRegistry): void {
    bmpHooksRegistry = hooks
}

/**
 * Get the registered BMP hooks
 */
export function getBmpHooks(): BmpHooksRegistry | null {
    return bmpHooksRegistry
}

/**
 * Clear BMP hooks (useful for testing)
 */
export function clearBmpHooks(): void {
    bmpHooksRegistry = null
}

/**
 * Helper to safely call a BMP hook
 * Returns undefined if hook is not registered
 */
export function callBmpHook<
    Category extends keyof BmpHooksRegistry,
    Hook extends keyof BmpHooksRegistry[Category]
>(
    category: Category,
    hook: Hook,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...args: any[]
): unknown {
    if (!bmpHooksRegistry || !bmpFeatureFlags.enabled) {
        return undefined
    }
    
    const categoryHooks = bmpHooksRegistry[category]
    if (!categoryHooks) {
        return undefined
    }
    
    const hookFn = categoryHooks[hook]
    if (typeof hookFn !== 'function') {
        return undefined
    }
    
    return (hookFn as (...args: unknown[]) => unknown)(...args)
}

/**
 * Check if a specific BMP hook is registered
 */
export function hasBmpHook<
    Category extends keyof BmpHooksRegistry,
    Hook extends keyof BmpHooksRegistry[Category]
>(category: Category, hook: Hook): boolean {
    if (!bmpHooksRegistry || !bmpFeatureFlags.enabled) {
        return false
    }
    
    const categoryHooks = bmpHooksRegistry[category]
    if (!categoryHooks) {
        return false
    }
    
    return typeof categoryHooks[hook] === 'function'
}
