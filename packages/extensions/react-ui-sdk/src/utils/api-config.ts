/**
 * API Configuration Utility
 * 
 * Utilities for configuring the API client used by react-ui components.
 * This ensures the SDK components use the correct API URL and authentication.
 */

import { ReactUISDKConfig } from '../types';

/**
 * Configures the API client for react-ui components
 */
export function configureAPI(config: ReactUISDKConfig): void {
  // Set API URL in environment
  if (typeof window !== 'undefined') {
    // Preserve existing config properties (like bmpEnabled set by Angular host)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existingConfig = (window as any).__AP_SDK_CONFIG__ || {};
    
    // Store config in window for react-ui to access
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__AP_SDK_CONFIG__ = {
      ...existingConfig,
      apiUrl: config.apiUrl,
      token: config.token,
      projectId: config.projectId,
      flowId: config.flowId,
      bmpEnabled: config.bmpEnabled ?? existingConfig.bmpEnabled ?? false,
    };

    // Set API URL in import.meta.env for Vite-based react-ui
    if (typeof (window as any).__AP_API_URL__ === 'undefined') {
      Object.defineProperty(window, '__AP_API_URL__', {
        value: config.apiUrl,
        writable: false,
        configurable: true,
      });
    }
  }
}

/**
 * Gets the configured API URL
 */
export function getAPIUrl(): string | undefined {
  if (typeof window !== 'undefined') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (window as any).__AP_SDK_CONFIG__?.apiUrl;
  }
  return undefined;
}

/**
 * Gets the configured authentication token
 */
export function getAuthToken(): string | undefined {
  if (typeof window !== 'undefined') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (window as any).__AP_SDK_CONFIG__?.token;
  }
  return undefined;
}
