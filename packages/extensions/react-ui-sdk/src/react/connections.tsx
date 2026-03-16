/**
 * Connections React Component
 * 
 * Wrapper for the Connections management React component from web.
 */

import React, { useEffect } from 'react';
import { ConnectionsProps } from '../types';
import { configureAPI } from '../utils/api-config';
import { SDKProviders } from '../providers/sdk-providers';

// Import CE-safe component from web
// Using relative imports - TypeScript path mappings don't resolve at build time with tsc
// @ts-expect-error - TypeScript can't resolve these imports at compile time, but they work at runtime/build time
import { AppConnectionsPage } from '../../../web/src/app/routes/connections/index.tsx';

/**
 * Connections Component Wrapper
 * 
 * Wraps AppConnectionsPage with SDK providers and configuration.
 */
export const Connections: React.FC<ConnectionsProps> = (props) => {
  const { apiUrl, token, projectId } = props;
  // Note: onConnectionChanged callback will be implemented in future versions

  // Configure API on mount
  useEffect(() => {
    configureAPI({ apiUrl, token, projectId });
  }, [apiUrl, token, projectId]);

  // Set up routes for memory router
  const routes = [
    {
      path: '/connections',
      element: <AppConnectionsPage />,
    },
  ];

  return (
    <SDKProviders
      config={{ apiUrl, token, projectId }}
      routes={routes}
    />
  );
};

export default Connections;
