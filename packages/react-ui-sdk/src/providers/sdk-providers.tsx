/**
 * SDK Providers
 * 
 * Provides all necessary React providers for SDK components.
 * This wraps CE-safe providers from web.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { Suspense } from 'react';
import { RouterProvider, createMemoryRouter, RouteObject } from 'react-router-dom';
import { ReactUISDKConfig } from '../types';
import { initializeRuntimeEEChecks } from '../utils/runtime-ee-check';

// Initialize i18n for translations - must be imported before any components that use translations
import '../../web/src/i18n';

// Loading fallback component
const LoadingFallback = () => (
  <div style={{ 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    height: '100%',
    minHeight: '200px',
    padding: '20px',
    fontFamily: 'system-ui, sans-serif'
  }}>
    <div style={{ textAlign: 'center' }}>
      <div style={{ 
        width: '40px', 
        height: '40px', 
        border: '3px solid #f3f3f3',
        borderTop: '3px solid #6e41e2',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
        margin: '0 auto 16px'
      }} />
      <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      <p style={{ margin: 0, color: '#666' }}>Loading Activepieces...</p>
    </div>
  </div>
);

// Import CE-safe providers from web
// Using relative imports - TypeScript path mappings don't resolve at build time with tsc
// @ts-expect-error - TypeScript can't resolve these imports at compile time, but they work at runtime/build time
import { ThemeProvider } from '../../web/src/components/providers/theme-provider.tsx';
// @ts-expect-error - TypeScript can't resolve these imports at compile time, but they work at runtime/build time
import { TooltipProvider } from '../../web/src/components/ui/tooltip.tsx';
// @ts-expect-error - TypeScript can't resolve these imports at compile time, but they work at runtime/build time
import { EmbeddingProvider } from '../../web/src/components/providers/embed-provider.tsx';
// @ts-expect-error - TypeScript can't resolve these imports at compile time, but they work at runtime/build time
import { SocketProvider } from '../../web/src/components/providers/socket-provider.tsx';
// @ts-expect-error - TypeScript can't resolve these imports at compile time, but they work at runtime/build time
import { Toaster } from '../../web/src/components/ui/sonner.tsx';

// Initialize runtime EE checks
if (typeof window !== 'undefined') {
  initializeRuntimeEEChecks();
}

// Create a QueryClient instance for SDK
const createSDKQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        refetchOnWindowFocus: false,
      },
    },
  });
};

interface SDKProvidersProps {
  children?: React.ReactNode;
  config: ReactUISDKConfig;
  routes?: RouteObject[];
  initialRoute?: string;
}

/**
 * SDK Providers Component
 * 
 * Wraps SDK components with all necessary providers:
 * - QueryClientProvider for data fetching
 * - RouterProvider with MemoryRouter for routing
 * - ThemeProvider for theming
 * - TooltipProvider for tooltips
 * - EmbeddingProvider for embedding state
 * - SocketProvider for WebSocket connections
 */
export const SDKProviders: React.FC<SDKProvidersProps> = ({
  children,
  config,
  routes = [],
  initialRoute,
}) => {
  const queryClient = React.useMemo(() => createSDKQueryClient(), []);
  
  // Create memory router for SDK (no browser history needed)
  // If routes are provided, use RouterProvider, otherwise render children directly
  const router = React.useMemo(() => {
    if (routes.length > 0) {
      const startRoute = initialRoute || routes[0]?.path || '/';
      return createMemoryRouter(routes, { 
        initialEntries: [startRoute] 
      });
    }
    return null;
  }, [routes, initialRoute]);

  // Configure API base URL and authentication
  React.useEffect(() => {
    // Set API URL in window for web components to use
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).__AP_SDK_CONFIG__ = {
        apiUrl: config.apiUrl,
        token: config.token,
        projectId: config.projectId,
      };

      // Set authentication token in localStorage for web components
      // Activepieces uses localStorage by default (see ap-browser-storage.ts)
      if (config.token) {
        try {
          // Use localStorage as that's what ApStorage defaults to
          window.localStorage.setItem('token', config.token);
          if (config.projectId) {
            window.localStorage.setItem('projectId', config.projectId);
          }
          // Dispatch storage event to notify React components
          window.dispatchEvent(new Event('storage'));
        } catch (e) {
          console.warn('Failed to set authentication in storage:', e);
        }
      }
    }
  }, [config]);

  const content = routes.length > 0 && router ? (
    <RouterProvider router={router} />
  ) : (
    children
  );

  return (
    <QueryClientProvider client={queryClient}>
      <EmbeddingProvider>
        <SocketProvider>
          <Suspense fallback={<LoadingFallback />}>
            <ThemeProvider storageKey="ap-react-ui-sdk-theme">
              <TooltipProvider>
                {content}
                <Toaster position="bottom-right" />
              </TooltipProvider>
            </ThemeProvider>
          </Suspense>
        </SocketProvider>
      </EmbeddingProvider>
    </QueryClientProvider>
  );
};
