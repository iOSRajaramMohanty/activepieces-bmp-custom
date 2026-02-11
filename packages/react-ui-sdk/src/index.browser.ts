/**
 * @activepieces/react-ui-sdk - Browser Bundle
 * 
 * This is the browser-specific entry point that only exports React components.
 * Angular components are excluded because they require actual Angular modules
 * which can't be loaded in a script tag context.
 * 
 * For Angular integration, use the npm package version which works with
 * Angular's module system.
 * 
 * @license MIT
 */

// React component wrappers (no Angular dependencies)
export * from './react/flow-builder';
export * from './react/dashboard';
export * from './react/connections';
export * from './react/runs';
export * from './react/templates';

// Types
export * from './types';

// Utilities
export * from './utils/react-mount';
export * from './utils/api-config';

// Providers
export * from './providers/sdk-providers';

// Note: Angular exports (ReactUIWrapperComponent, ReactUIWrapperModule, ReactUIService)
// are NOT included in the browser bundle. Use the npm package for Angular integration.
