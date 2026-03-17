/**
 * SDK Providers
 * 
 * Provides all necessary React providers for SDK components.
 * This wraps CE-safe providers from web.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { Suspense } from 'react';
import { RouterProvider, createMemoryRouter, RouteObject, useLocation, Outlet } from 'react-router-dom';
import { ReactUISDKConfig } from '../types';
import { initializeRuntimeEEChecks } from '../utils/runtime-ee-check';

// Initialize i18n for translations - must be imported before any components that use translations
import '../../../web/src/i18n';

// Route display component - shows current route in console
const RouteDisplay = () => {
  const location = useLocation();
  
  React.useEffect(() => {
    console.log('[Activepieces SDK] Current route:', location.pathname);
  }, [location.pathname]);
  
  // @ts-expect-error - React 18/19 type incompatibility
  return <Outlet />; // Render child routes
};

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

// Auth error component - shown when token is invalid/expired
const AuthErrorFallback = ({ message }: { message: string }) => (
  <div style={{ 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    height: '100%',
    minHeight: '200px',
    padding: '20px',
    fontFamily: 'system-ui, sans-serif'
  }}>
    <div style={{ 
      textAlign: 'center',
      maxWidth: '400px',
      padding: '24px',
      backgroundColor: '#fef2f2',
      borderRadius: '8px',
      border: '1px solid #fecaca'
    }}>
      <div style={{ 
        width: '48px', 
        height: '48px', 
        borderRadius: '50%',
        backgroundColor: '#fee2e2',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 16px',
        color: '#dc2626',
        fontSize: '24px'
      }}>
        !
      </div>
      <h3 style={{ margin: '0 0 8px', color: '#991b1b', fontSize: '16px', fontWeight: 600 }}>
        Authentication Error
      </h3>
      <p style={{ margin: '0 0 16px', color: '#b91c1c', fontSize: '14px' }}>
        {message}
      </p>
      <p style={{ margin: 0, color: '#7f1d1d', fontSize: '12px' }}>
        Please reload the page with a valid token.
      </p>
    </div>
  </div>
);

// Global auth error state for SDK
let sdkAuthError: string | null = null;
const authErrorListeners = new Set<() => void>();

function setSDKAuthError(error: string | null) {
  sdkAuthError = error;
  authErrorListeners.forEach(listener => listener());
}

function useSDKAuthError() {
  const [error, setError] = React.useState(sdkAuthError);
  React.useEffect(() => {
    const listener = () => setError(sdkAuthError);
    authErrorListeners.add(listener);
    return () => { authErrorListeners.delete(listener); };
  }, []);
  return error;
}

// Import CE-safe providers from web
// Using relative imports - TypeScript path mappings don't resolve at build time with tsc
// @ts-expect-error - TypeScript can't resolve these imports at compile time, but they work at runtime/build time
import { ThemeProvider } from '../../../web/src/components/providers/theme-provider.tsx';
// @ts-expect-error - TypeScript can't resolve these imports at compile time, but they work at runtime/build time
import { TooltipProvider } from '../../../web/src/components/ui/tooltip.tsx';
// @ts-expect-error - TypeScript can't resolve these imports at compile time, but they work at runtime/build time
import { EmbeddingProvider } from '../../../web/src/components/providers/embed-provider.tsx';
// @ts-expect-error - TypeScript can't resolve these imports at compile time, but they work at runtime/build time
import { SocketProvider } from '../../../web/src/components/providers/socket-provider.tsx';
// @ts-expect-error - TypeScript can't resolve these imports at compile time, but they work at runtime/build time
import { Toaster } from '../../../web/src/components/ui/sonner.tsx';

// Initialize runtime EE checks
if (typeof window !== 'undefined') {
  initializeRuntimeEEChecks();
}

// Check if error is a 401 auth error
function isAuthError(error: unknown): boolean {
  if (error && typeof error === 'object') {
    // Axios error
    if ('response' in error) {
      const response = (error as { response?: { status?: number } }).response;
      if (response?.status === 401) return true;
    }
    // Check for error code from Activepieces backend
    if ('code' in error) {
      const code = (error as { code?: string }).code;
      if (code === 'INVALID_BEARER_TOKEN' || code === 'SESSION_EXPIRED') return true;
    }
  }
  return false;
}

// Create a QueryClient instance for SDK with auth error handling
const createSDKQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: (failureCount, error) => {
          // Never retry auth errors
          if (isAuthError(error)) {
            setSDKAuthError('Your authentication token is invalid or has expired.');
            return false;
          }
          // Don't retry other errors either (SDK should show error state)
          return false;
        },
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: false,
        onError: (error) => {
          if (isAuthError(error)) {
            setSDKAuthError('Your authentication token is invalid or has expired.');
          }
        },
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
  // Set API config and token synchronously so they are available before any child
  // (e.g. flags API) runs. useEffect runs after first paint, so the first /v1/flags
  // request would otherwise go without Authorization and get 401.
  if (typeof window !== 'undefined') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__AP_SDK_CONFIG__ = {
      apiUrl: config.apiUrl,
      token: config.token,
      projectId: config.projectId,
    };
    if (config.token) {
      try {
        window.localStorage.setItem('token', config.token);
        if (config.projectId) {
          window.localStorage.setItem('projectId', config.projectId);
        }
      } catch (e) {
        console.warn('Failed to set authentication in storage:', e);
      }
    }
  }

  const queryClient = React.useMemo(() => createSDKQueryClient(), []);
  
  // Create memory router for SDK (no browser history needed)
  // If routes are provided, use RouterProvider, otherwise render children directly
  const router = React.useMemo(() => {
    if (routes.length > 0) {
      const startRoute = initialRoute || routes[0]?.path || '/';
      console.log('[Activepieces SDK] Initializing with route:', startRoute);
      console.log('[Activepieces SDK] Available routes:', routes.map(r => r.path));
      
      // Wrap all routes with RouteDisplay for logging
      const wrappedRoutes: RouteObject[] = [{
        path: '/',
        element: <RouteDisplay />,
        children: routes
      }];
      
      return createMemoryRouter(wrappedRoutes, { 
        initialEntries: [startRoute] 
      });
    }
    return null;
  }, [routes, initialRoute]);

  const content = routes.length > 0 && router ? (
    // @ts-expect-error - React 18/19 type incompatibility with react-router-dom
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
                <SDKAuthErrorBoundary>
                  <div
                    className="ap-sdk-root"
                    style={{
                      width: '100%',
                      height: '100%',
                      minHeight: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        flex: 1,
                        minHeight: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        width: '100%',
                        overflow: 'hidden',
                      }}
                    >
                      {content}
                    </div>
                  </div>
                </SDKAuthErrorBoundary>
                <Toaster position="bottom-right" />
              </TooltipProvider>
            </ThemeProvider>
          </Suspense>
        </SocketProvider>
      </EmbeddingProvider>
    </QueryClientProvider>
  );
};

// Auth error boundary component - shows error UI when auth fails
const SDKAuthErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const authError = useSDKAuthError();
  
  if (authError) {
    return <AuthErrorFallback message={authError} />;
  }
  
  return <>{children}</>;
};
