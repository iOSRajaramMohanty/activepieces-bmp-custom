/**
 * @activepieces/react-ui-sdk
 * 
 * React UI SDK for Angular - Community Edition (MIT Licensed)
 * 
 * This SDK provides Angular components that wrap React UI components
 * from Activepieces, allowing seamless integration into Angular applications.
 * 
 * IMPORTANT: This SDK only includes Community Edition (CE) features.
 * Enterprise Edition (EE) features are explicitly excluded.
 * 
 * @license MIT
 */

// Angular exports
export { ReactUIWrapperComponent } from './angular/react-ui-wrapper.component';
export { ReactUIWrapperModule } from './angular/react-ui-wrapper.module';
export { ReactUIService } from './angular/react-ui.service';

// React component wrappers
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
