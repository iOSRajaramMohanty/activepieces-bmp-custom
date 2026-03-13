/**
 * Runs React Component
 * 
 * Wrapper for the Flow Runs React component from web.
 */

import React, { useEffect } from 'react';
import { RunsProps } from '../types';
import { configureAPI } from '../utils/api-config';
import { SDKProviders } from '../providers/sdk-providers';

// Import CE-safe component from web
// Using relative imports - TypeScript path mappings don't resolve at build time with tsc
// @ts-expect-error - TypeScript can't resolve these imports at compile time, but they work at runtime/build time
import { RunsPage } from '../../web/src/app/routes/runs/index.tsx';
// @ts-expect-error - TypeScript can't resolve these imports at compile time, but they work at runtime/build time
import { FlowRunPage } from '../../web/src/app/routes/runs/id/index.tsx';

/**
 * Runs Component Wrapper
 * 
 * Wraps RunsPage with SDK providers and configuration.
 */
export const Runs: React.FC<RunsProps> = (props) => {
  const { apiUrl, token, projectId, flowId } = props;
  // Note: onRunSelected callback will be implemented in future versions

  // Configure API on mount
  useEffect(() => {
    configureAPI({ apiUrl, token, projectId, flowId });
  }, [apiUrl, token, projectId, flowId]);

  // Set up routes for memory router
  const routes = [
    {
      path: '/runs',
      element: <RunsPage />,
    },
    ...(flowId
      ? [
          {
            path: `/runs/:runId`,
            element: <FlowRunPage />,
          },
        ]
      : []),
  ];

  return (
    <SDKProviders
      config={{ apiUrl, token, projectId, flowId }}
      routes={routes}
    />
  );
};

export default Runs;
