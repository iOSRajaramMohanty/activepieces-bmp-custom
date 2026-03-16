/**
 * Templates React Component
 * 
 * Wrapper for the Templates React component from web.
 */

import React, { useEffect } from 'react';
import { TemplatesProps } from '../types';
import { configureAPI } from '../utils/api-config';
import { SDKProviders } from '../providers/sdk-providers';

// Import CE-safe component from web
// Using relative imports - TypeScript path mappings don't resolve at build time with tsc
// @ts-expect-error - TypeScript can't resolve these imports at compile time, but they work at runtime/build time
import { TemplatesPage } from '../../../web/src/app/routes/templates/index.tsx';

/**
 * Templates Component Wrapper
 * 
 * Wraps TemplatesPage with SDK providers and configuration.
 */
export const Templates: React.FC<TemplatesProps> = (props) => {
  const { apiUrl, token, projectId } = props;
  // Note: onTemplateSelected callback will be implemented in future versions

  // Configure API on mount
  useEffect(() => {
    configureAPI({ apiUrl, token, projectId });
  }, [apiUrl, token, projectId]);

  // Set up routes for memory router
  const routes = [
    {
      path: '/templates',
      element: <TemplatesPage />,
    },
  ];

  return (
    <SDKProviders
      config={{ apiUrl, token, projectId }}
      routes={routes}
    />
  );
};

export default Templates;
