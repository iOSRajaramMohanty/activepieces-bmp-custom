/**
 * Flow Builder React Component
 * 
 * Wrapper for the Flow Builder React component from web.
 * This component wraps FlowBuilderPage with proper providers and configuration.
 */

import React, { useEffect } from 'react';
import { FlowBuilderProps } from '../types';
import { configureAPI } from '../utils/api-config';
import { SDKProviders } from '../providers/sdk-providers';

// Import CE-safe component from web
// Note: This import is verified to ensure no EE dependencies
// Using relative imports - TypeScript path mappings don't resolve at build time with tsc
// @ts-expect-error - TypeScript can't resolve these imports at compile time, but they work at runtime/build time
import { FlowBuilderPage } from '../../web/src/app/routes/flows/id/index.tsx';

/**
 * Flow Builder Component Wrapper
 * 
 * Wraps FlowBuilderPage with SDK providers and configuration.
 */
export const FlowBuilder: React.FC<FlowBuilderProps> = (props) => {
  const { apiUrl, token, projectId, flowId } = props;
  // Note: onFlowSaved and onError callbacks will be implemented in future versions

  // Configure API on mount
  useEffect(() => {
    configureAPI({ apiUrl, token, projectId, flowId });
  }, [apiUrl, token, projectId, flowId]);

  // Set up routes for memory router
  const routes = [
    {
      path: `/flows/${flowId}`,
      element: <FlowBuilderPage />,
    },
  ];

  return (
    <SDKProviders
      config={{ apiUrl, token, projectId, flowId }}
      routes={routes}
    />
  );
};

export default FlowBuilder;
