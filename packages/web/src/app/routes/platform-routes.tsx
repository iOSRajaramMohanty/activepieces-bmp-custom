import React, { Suspense } from 'react';
import { Navigate } from 'react-router-dom';

import { PageTitle } from '@/app/components/page-title';
import { PlatformDefaultRoute } from '@/app/guards/platform-default-route';
import { LoadingScreen } from '@/components/custom/loading-screen';
import { Error, Success } from '@/features/billing';

import { PlatformLayout } from '../components/platform-layout';
import { SuperAdminLayout } from '../components/super-admin-layout';

import { filterBmpRoutes } from './bmp-routes';

const SettingsBilling = React.lazy(() => import('./platform/billing'));
const EventDestinationsPage = React.lazy(
  () => import('./platform/infra/event-destinations'),
);
const SettingsHealthPage = React.lazy(() => import('./platform/infra/health'));
const TriggerHealthPage = React.lazy(() => import('./platform/infra/triggers'));
const SettingsWorkersPage = React.lazy(
  () => import('./platform/infra/workers'),
);
const ProjectsPage = React.lazy(() => import('./platform/projects'));
const ApiKeysPage = React.lazy(() =>
  import('./platform/security/api-keys').then((m) => ({
    default: m.ApiKeysPage,
  })),
);
const AuditLogsPage = React.lazy(
  () => import('./platform/security/audit-logs'),
);
const ProjectRolePage = React.lazy(() =>
  import('./platform/security/project-role').then((m) => ({
    default: m.ProjectRolePage,
  })),
);
const SecretManagersPage = React.lazy(
  () => import('./platform/security/secret-managers'),
);
const SigningKeysPage = React.lazy(() =>
  import('./platform/security/signing-keys').then((m) => ({
    default: m.SigningKeysPage,
  })),
);
const SSOPage = React.lazy(() =>
  import('./platform/security/sso').then((m) => ({ default: m.SSOPage })),
);
const AIProvidersPage = React.lazy(() => import('./platform/setup/ai'));
const BrandingPage = React.lazy(() =>
  import('./platform/setup/branding').then((m) => ({
    default: m.BrandingPage,
  })),
);
const GlobalConnectionsTable = React.lazy(() =>
  import('./platform/setup/connections').then((m) => ({
    default: m.GlobalConnectionsTable,
  })),
);
const PlatformPiecesPage = React.lazy(() =>
  import('./platform/setup/pieces').then((m) => ({
    default: m.PlatformPiecesPage,
  })),
);
const PlatformTemplatesPage = React.lazy(() =>
  import('./platform/setup/templates').then((m) => ({
    default: m.PlatformTemplatesPage,
  })),
);
const UsersPage = React.lazy(() => import('./platform/users'));
const OrganizationsPage = React.lazy(() => import('./platform/organizations'));
const SuperAdminDashboard = React.lazy(() =>
  import('./platform/super-admin').then((m) => ({
    default: m.SuperAdminDashboard,
  })),
);
const CloudOAuthAppsPage = React.lazy(
  () => import('./platform/super-admin/cloud-oauth-apps'),
);
const OwnerDashboard = React.lazy(() =>
  import('./platform/owner-dashboard').then((m) => ({
    default: m.OwnerDashboard,
  })),
);

function SuspenseWrapper({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<LoadingScreen />}>{children}</Suspense>;
}

// Note: BMP routes (/super-admin, /owner-dashboard, /platform/organizations)
// are filtered by filterBmpRoutes based on VITE_BMP_ENABLED
const allPlatformRoutes = [
  {
    path: '/platform',
    element: (
      <PlatformLayout>
        <PageTitle title="Platform">
          <PlatformDefaultRoute />
        </PageTitle>
      </PlatformLayout>
    ),
  },
  {
    path: '/super-admin',
    element: (
      <SuperAdminLayout>
        <PageTitle title="Super Admin Dashboard">
          <SuspenseWrapper>
            <SuperAdminDashboard />
          </SuspenseWrapper>
        </PageTitle>
      </SuperAdminLayout>
    ),
  },
  {
    path: '/platform/cloud-oauth-apps',
    element: (
      <SuperAdminLayout>
        <PageTitle title="Cloud OAuth Apps">
          <SuspenseWrapper>
            <CloudOAuthAppsPage />
          </SuspenseWrapper>
        </PageTitle>
      </SuperAdminLayout>
    ),
  },
  {
    path: '/owner-dashboard',
    element: (
      <SuperAdminLayout>
        <PageTitle title="Owner Dashboard">
          <SuspenseWrapper>
            <OwnerDashboard />
          </SuspenseWrapper>
        </PageTitle>
      </SuperAdminLayout>
    ),
  },
  {
    path: '/platform/projects',
    element: (
      <PlatformLayout>
        <PageTitle title="Projects">
          <SuspenseWrapper>
            <ProjectsPage />
          </SuspenseWrapper>
        </PageTitle>
      </PlatformLayout>
    ),
  },
  {
    path: '/platform/users',
    element: (
      <PlatformLayout>
        <PageTitle title="Users">
          <SuspenseWrapper>
            <UsersPage />
          </SuspenseWrapper>
        </PageTitle>
      </PlatformLayout>
    ),
  },
  {
    path: '/platform/setup',
    element: (
      <PlatformLayout>
        <PageTitle title="Platform Setup">
          <Navigate to="/platform/setup/ai" replace />
        </PageTitle>
      </PlatformLayout>
    ),
  },
  {
    path: '/platform/setup/ai',
    element: (
      <PlatformLayout>
        <PageTitle title="AI">
          <SuspenseWrapper>
            <AIProvidersPage />
          </SuspenseWrapper>
        </PageTitle>
      </PlatformLayout>
    ),
  },
  {
    path: '/platform/setup/pieces',
    element: (
      <PlatformLayout>
        <PageTitle title="Pieces">
          <SuspenseWrapper>
            <PlatformPiecesPage />
          </SuspenseWrapper>
        </PageTitle>
      </PlatformLayout>
    ),
  },
  {
    path: '/platform/setup/connections',
    element: (
      <PlatformLayout>
        <PageTitle title="Connections">
          <SuspenseWrapper>
            <GlobalConnectionsTable />
          </SuspenseWrapper>
        </PageTitle>
      </PlatformLayout>
    ),
  },
  {
    path: '/platform/setup/templates',
    element: (
      <PlatformLayout>
        <PageTitle title="Templates">
          <SuspenseWrapper>
            <PlatformTemplatesPage />
          </SuspenseWrapper>
        </PageTitle>
      </PlatformLayout>
    ),
  },
  {
    path: '/platform/setup/branding',
    element: (
      <PlatformLayout>
        <PageTitle title="Branding">
          <SuspenseWrapper>
            <BrandingPage />
          </SuspenseWrapper>
        </PageTitle>
      </PlatformLayout>
    ),
  },
  {
    path: '/platform/setup/billing',
    element: (
      <PlatformLayout>
        <PageTitle title="Billing">
          <SuspenseWrapper>
            <SettingsBilling />
          </SuspenseWrapper>
        </PageTitle>
      </PlatformLayout>
    ),
  },
  {
    path: '/platform/organizations',
    element: (
      <PlatformLayout>
        <PageTitle title="Organizations">
          <SuspenseWrapper>
            <OrganizationsPage />
          </SuspenseWrapper>
        </PageTitle>
      </PlatformLayout>
    ),
  },
  {
    path: '/platform/setup/billing/success',
    element: (
      <PlatformLayout>
        <PageTitle title="Billing">
          <Success />
        </PageTitle>
      </PlatformLayout>
    ),
  },
  {
    path: '/platform/setup/billing/error',
    element: (
      <PlatformLayout>
        <PageTitle title="Billing">
          <Error />
        </PageTitle>
      </PlatformLayout>
    ),
  },
  {
    path: '/platform/security',
    element: (
      <PlatformLayout>
        <PageTitle title="Platform Security">
          <Navigate to="/platform/security/audit-logs" replace />
        </PageTitle>
      </PlatformLayout>
    ),
  },
  {
    path: '/platform/security/api-keys',
    element: (
      <PlatformLayout>
        <PageTitle title="API Keys">
          <SuspenseWrapper>
            <ApiKeysPage />
          </SuspenseWrapper>
        </PageTitle>
      </PlatformLayout>
    ),
  },
  {
    path: '/platform/security/secret-managers',
    element: (
      <PlatformLayout>
        <PageTitle title="Secret managers">
          <SuspenseWrapper>
            <SecretManagersPage />
          </SuspenseWrapper>
        </PageTitle>
      </PlatformLayout>
    ),
  },
  {
    path: '/platform/security/audit-logs',
    element: (
      <PlatformLayout>
        <PageTitle title="Audit Logs">
          <SuspenseWrapper>
            <AuditLogsPage />
          </SuspenseWrapper>
        </PageTitle>
      </PlatformLayout>
    ),
  },
  {
    path: '/platform/security/signing-keys',
    element: (
      <PlatformLayout>
        <PageTitle title="Embedding">
          <SuspenseWrapper>
            <SigningKeysPage />
          </SuspenseWrapper>
        </PageTitle>
      </PlatformLayout>
    ),
  },
  {
    path: '/platform/security/sso',
    element: (
      <PlatformLayout>
        <PageTitle title="SSO">
          <SuspenseWrapper>
            <SSOPage />
          </SuspenseWrapper>
        </PageTitle>
      </PlatformLayout>
    ),
  },
  {
    path: '/platform/security/project-roles',
    element: (
      <PlatformLayout>
        <PageTitle title="Project Roles">
          <SuspenseWrapper>
            <ProjectRolePage />
          </SuspenseWrapper>
        </PageTitle>
      </PlatformLayout>
    ),
  },
  {
    path: '/platform/infrastructure',
    element: (
      <PlatformLayout>
        <PageTitle title="Platform Infrastructure">
          <Navigate to="/platform/infrastructure/workers" replace />
        </PageTitle>
      </PlatformLayout>
    ),
  },
  {
    path: '/platform/infrastructure/workers',
    element: (
      <PlatformLayout>
        <PageTitle title="Workers">
          <SuspenseWrapper>
            <SettingsWorkersPage />
          </SuspenseWrapper>
        </PageTitle>
      </PlatformLayout>
    ),
  },
  {
    path: '/platform/infrastructure/health',
    element: (
      <PlatformLayout>
        <PageTitle title="System Health">
          <SuspenseWrapper>
            <SettingsHealthPage />
          </SuspenseWrapper>
        </PageTitle>
      </PlatformLayout>
    ),
  },
  {
    path: '/platform/infrastructure/triggers',
    element: (
      <PlatformLayout>
        <PageTitle title="Trigger Health">
          <SuspenseWrapper>
            <TriggerHealthPage />
          </SuspenseWrapper>
        </PageTitle>
      </PlatformLayout>
    ),
  },
  {
    path: '/platform/infrastructure/event-destinations',
    element: (
      <PlatformLayout>
        <PageTitle title="Event Streaming">
          <SuspenseWrapper>
            <EventDestinationsPage />
          </SuspenseWrapper>
        </PageTitle>
      </PlatformLayout>
    ),
  },
];

// Export filtered routes based on BMP enabled status
export const platformRoutes = filterBmpRoutes(allPlatformRoutes);
