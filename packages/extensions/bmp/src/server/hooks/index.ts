/**
 * BMP Server Hooks
 * 
 * Provides hook implementations that override core behavior when BMP is enabled.
 * These hooks are set via the hooks factory pattern in app.ts.
 */

export { bmpAuthHooks } from './bmp-auth-hooks'
export type { AuthHooksInterface } from './bmp-auth-hooks'

export { bmpConnectionHooks } from './bmp-connection-hooks'
export type { ConnectionHooksInterface } from './bmp-connection-hooks'
