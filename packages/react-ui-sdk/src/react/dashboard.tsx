/**
 * Dashboard React Component
 * 
 * Wrapper for the full Dashboard React component from react-ui.
 * Includes navigation tabs (Flows, Tables, Runs, Connections, etc.)
 */

import React, { useEffect } from 'react';
import { DashboardProps } from '../types';
import { configureAPI } from '../utils/api-config';
import { SDKProviders } from '../providers/sdk-providers';

// Import CE-safe components from react-ui
// Using relative imports - TypeScript path mappings don't resolve at build time with tsc
// @ts-expect-error - TypeScript can't resolve these imports at compile time, but they work at runtime/build time
import { FlowsPage } from '../../react-ui/src/app/routes/flows/index.tsx';
// @ts-expect-error - TypeScript can't resolve these imports at compile time, but they work at runtime/build time
import { AppConnectionsPage } from '../../react-ui/src/app/routes/connections/index.tsx';
// @ts-expect-error - TypeScript can't resolve these imports at compile time, but they work at runtime/build time
import { RunsPage } from '../../react-ui/src/app/routes/runs/index.tsx';
// @ts-expect-error - TypeScript can't resolve these imports at compile time, but they work at runtime/build time
import { TodosPage } from '../../react-ui/src/app/routes/todos/index.tsx';
// @ts-expect-error - TypeScript can't resolve these imports at compile time, but they work at runtime/build time
import { ApTablesPage } from '../../react-ui/src/app/routes/tables/index.tsx';
// @ts-expect-error - TypeScript can't resolve these imports at compile time, but they work at runtime/build time
import { ApTableEditorPage } from '../../react-ui/src/app/routes/tables/id/index.tsx';
// @ts-expect-error - TypeScript can't resolve these imports at compile time, but they work at runtime/build time
import { ApTableStateProvider } from '../../react-ui/src/features/tables/components/ap-table-state-provider.tsx';
// @ts-expect-error - TypeScript can't resolve these imports at compile time, but they work at runtime/build time
import { FlowBuilderPage } from '../../react-ui/src/app/routes/flows/id/index.tsx';
// @ts-expect-error - TypeScript can't resolve these imports at compile time, but they work at runtime/build time
import { BuilderLayout } from '../../react-ui/src/app/components/builder-layout/index.tsx';
// @ts-expect-error - TypeScript can't resolve these imports at compile time, but they work at runtime/build time
import { ProjectDashboardLayout } from '../../react-ui/src/app/components/project-layout/index.tsx';

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
  const routes = [
    // Project-prefixed routes (used by navigation tabs)
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
      path: `${projectPrefix}/runs`,
      element: (
        <ProjectDashboardLayout>
          <RunsPage />
        </ProjectDashboardLayout>
      ),
    },
    {
      path: `${projectPrefix}/tables`,
      element: (
        <ProjectDashboardLayout>
          <ApTablesPage />
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
    {
      path: `${projectPrefix}/todos`,
      element: (
        <ProjectDashboardLayout>
          <TodosPage />
        </ProjectDashboardLayout>
      ),
    },
    // Non-prefixed routes (fallback)
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
      path: '/runs',
      element: (
        <ProjectDashboardLayout>
          <RunsPage />
        </ProjectDashboardLayout>
      ),
    },
    {
      path: '/todos',
      element: (
        <ProjectDashboardLayout>
          <TodosPage />
        </ProjectDashboardLayout>
      ),
    },
    {
      path: '/tables',
      element: (
        <ProjectDashboardLayout>
          <ApTablesPage />
        </ProjectDashboardLayout>
      ),
    },
    // Default route - redirect to flows
    {
      path: '/',
      element: (
        <ProjectDashboardLayout>
          <FlowsPage />
        </ProjectDashboardLayout>
      ),
    },
    // Catch-all route for any unmatched paths
    {
      path: '*',
      element: (
        <ProjectDashboardLayout>
          <FlowsPage />
        </ProjectDashboardLayout>
      ),
    },
  ];

  // Start at the project-prefixed flows route if projectId is available
  const initialRoute = projectId ? `${projectPrefix}/flows` : '/flows';

  return (
    <SDKProviders
      config={{ apiUrl, token, projectId }}
      routes={routes}
      initialRoute={initialRoute}
    />
  );
};

export default Dashboard;
