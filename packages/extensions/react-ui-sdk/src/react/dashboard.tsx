/**
 * Dashboard React Component
 * 
 * Wrapper for the full Dashboard React component from web.
 * Includes navigation tabs (Automations/Flows, Tables, Runs, Connections, etc.)
 */

import React, { useEffect } from 'react';
import { DashboardProps } from '../types';
import { configureAPI } from '../utils/api-config';
import { SDKProviders } from '../providers/sdk-providers';

// Import CE-safe components from web
// Using relative imports - TypeScript path mappings don't resolve at build time with tsc
// @ts-expect-error - TypeScript can't resolve these imports at compile time, but they work at runtime/build time
import { AutomationsPage } from '../../../web/src/app/routes/automations/index.tsx';
// @ts-expect-error - TypeScript can't resolve these imports at compile time, but they work at runtime/build time
import { AppConnectionsPage } from '../../../web/src/app/routes/connections/index.tsx';
// @ts-expect-error - TypeScript can't resolve these imports at compile time, but they work at runtime/build time
import { RunsPage } from '../../../web/src/app/routes/runs/index.tsx';
// @ts-expect-error - TypeScript can't resolve these imports at compile time, but they work at runtime/build time
import { ApTableEditorPage } from '../../../web/src/app/routes/tables/id/index.tsx';
// @ts-expect-error - TypeScript can't resolve these imports at compile time, but they work at runtime/build time
import { ApTableStateProvider } from '../../../web/src/features/tables/components/ap-table-state-provider.tsx';
// @ts-expect-error - TypeScript can't resolve these imports at compile time, but they work at runtime/build time
import { FlowBuilderPage } from '../../../web/src/app/routes/flows/id/index.tsx';
// @ts-expect-error - TypeScript can't resolve these imports at compile time, but they work at runtime/build time
import { FlowRunPage } from '../../../web/src/app/routes/runs/id/index.tsx';
// @ts-expect-error - TypeScript can't resolve these imports at compile time, but they work at runtime/build time
import { BuilderLayout } from '../../../web/src/app/components/builder-layout/index.tsx';
// @ts-expect-error - TypeScript can't resolve these imports at compile time, but they work at runtime/build time
import { ProjectDashboardLayout } from '../../../web/src/app/components/project-layout/index.tsx';

// Alias for backwards compatibility - AutomationsPage is the new FlowsPage
const FlowsPage = AutomationsPage;

/**
 * Dashboard Component Wrapper
 * 
 * Wraps the full dashboard layout with SDK providers and configuration.
 * Includes navigation tabs for Flows, Tables, Runs, Connections, etc.
 */
export const Dashboard: React.FC<DashboardProps> = (props) => {
  const { apiUrl, token, projectId } = props;
  // Note: onFlowSelected callback will be implemented in future versions

  // Configure API on mount
  useEffect(() => {
    configureAPI({ apiUrl, token, projectId });
  }, [apiUrl, token, projectId]);

  // Routes use project prefix pattern: /projects/{projectId}/flows
  // This matches how authenticationSession.appendProjectRoutePrefix() generates URLs
  const projectPrefix = projectId ? `/projects/${projectId}` : '';

  // Set up routes for memory router - full dashboard with navigation
  // Include both prefixed and non-prefixed routes for flexibility
  // Note: In web package, AutomationsPage handles both flows and tables
  const routes = [
    // Project-prefixed routes (used by navigation tabs)
    {
      path: `${projectPrefix}/automations`,
      element: (
        <ProjectDashboardLayout>
          <AutomationsPage />
        </ProjectDashboardLayout>
      ),
    },
    {
      path: `${projectPrefix}/flows`,
      element: (
        <ProjectDashboardLayout>
          <FlowsPage />
        </ProjectDashboardLayout>
      ),
    },
    {
      path: `${projectPrefix}/flows/:flowId`,
      element: (
        <BuilderLayout>
          <FlowBuilderPage />
        </BuilderLayout>
      ),
    },
    {
      path: `/flows/:flowId`,
      element: (
        <BuilderLayout>
          <FlowBuilderPage />
        </BuilderLayout>
      ),
    },
    {
      path: `${projectPrefix}/connections`,
      element: (
        <ProjectDashboardLayout>
          <AppConnectionsPage />
        </ProjectDashboardLayout>
      ),
    },
    {
      path: `${projectPrefix}/runs/:runId`,
      element: (
        <BuilderLayout>
          <FlowRunPage />
        </BuilderLayout>
      ),
    },
    {
      path: `${projectPrefix}/runs`,
      element: (
        <ProjectDashboardLayout>
          <RunsPage />
        </ProjectDashboardLayout>
      ),
    },
    {
      path: `${projectPrefix}/tables/:tableId`,
      element: (
        <ApTableStateProvider>
          <ApTableEditorPage />
        </ApTableStateProvider>
      ),
    },
    {
      path: `/tables/:tableId`,
      element: (
        <ApTableStateProvider>
          <ApTableEditorPage />
        </ApTableStateProvider>
      ),
    },
    // Non-prefixed routes (fallback)
    {
      path: '/automations',
      element: (
        <ProjectDashboardLayout>
          <AutomationsPage />
        </ProjectDashboardLayout>
      ),
    },
    {
      path: '/flows',
      element: (
        <ProjectDashboardLayout>
          <FlowsPage />
        </ProjectDashboardLayout>
      ),
    },
    {
      path: '/connections',
      element: (
        <ProjectDashboardLayout>
          <AppConnectionsPage />
        </ProjectDashboardLayout>
      ),
    },
    {
      path: '/runs/:runId',
      element: (
        <BuilderLayout>
          <FlowRunPage />
        </BuilderLayout>
      ),
    },
    {
      path: '/runs',
      element: (
        <ProjectDashboardLayout>
          <RunsPage />
        </ProjectDashboardLayout>
      ),
    },
    // Default route - redirect to automations (flows/tables)
    {
      path: '/',
      element: (
        <ProjectDashboardLayout>
          <AutomationsPage />
        </ProjectDashboardLayout>
      ),
    },
    // Catch-all route for any unmatched paths
    {
      path: '*',
      element: (
        <ProjectDashboardLayout>
          <AutomationsPage />
        </ProjectDashboardLayout>
      ),
    },
  ];

  // Start at the project-prefixed automations route if projectId is available
  const initialRoute = projectId ? `${projectPrefix}/automations` : '/automations';

  return (
    <SDKProviders
      config={{ apiUrl, token, projectId }}
      routes={routes}
      initialRoute={initialRoute}
    />
  );
};

export default Dashboard;
