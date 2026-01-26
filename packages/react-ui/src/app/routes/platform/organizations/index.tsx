import { ColumnDef } from '@tanstack/react-table';
import { t } from 'i18next';
import { Building2, Settings, Users, Code, Info } from 'lucide-react';
import { useMemo } from 'react';

import { DashboardPageHeader } from '@/app/components/dashboard-page-header';
import { Button } from '@/components/ui/button';
import {
  DataTable,
  RowDataWithActions,
} from '@/components/ui/data-table';
import { DataTableColumnHeader } from '@/components/ui/data-table/data-table-column-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { organizationHooks } from '@/features/platform-admin/lib/organization-hooks';
import { platformHooks } from '@/hooks/platform-hooks';
import { userHooks } from '@/hooks/user-hooks';
import { Organization, PlatformRole } from '@activepieces/shared';
import { OrganizationMetadataDialog } from './organization-metadata-dialog';
import { OrganizationEnvironmentsSection } from './organization-environments-section';

export default function OrganizationsPage() {
  const { platform } = platformHooks.useCurrentPlatform();
  const { data: organizationsData, isLoading, refetch } = organizationHooks.useOrganizations(platform.id);
  const { data: currentUser } = userHooks.useCurrentUser();

  const columns: ColumnDef<RowDataWithActions<Organization>, unknown>[] = useMemo(
    () => [
      {
        accessorKey: 'name',
        size: 200,
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title={t('Organization')}
            icon={Building2}
          />
        ),
        cell: ({ row }) => {
          const org = row.original;
          return (
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">{org.name}</span>
            </div>
          );
        },
      },
      {
        accessorKey: 'metadata',
        size: 300,
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title={t('Metadata')}
            icon={Code}
          />
        ),
        cell: ({ row }) => {
          const org = row.original;
          
          // Check if user has access to this organization's metadata
          const hasAccess = currentUser && (
            currentUser.platformRole === PlatformRole.OWNER ||
            currentUser.platformRole === PlatformRole.SUPER_ADMIN ||
            currentUser.organizationId === org.id
          );

          if (!hasAccess) {
            return (
              <span className="text-muted-foreground text-sm italic">
                {t('Access restricted')}
              </span>
            );
          }

          const metadata = (org.metadata as Record<string, unknown>) || {};
          const apiUrl = metadata.ADA_BMP_API_URL as string;
          const timeout = metadata.ADA_BMP_TIMEOUT as number;
          const debug = metadata.ADA_BMP_DEBUG as boolean;

          if (!apiUrl && !timeout && debug === undefined) {
            return (
              <span className="text-muted-foreground text-sm">
                {t('No metadata configured')}
              </span>
            );
          }

          return (
            <div className="flex flex-col gap-1">
              {apiUrl && (
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    API: {apiUrl.length > 30 ? `${apiUrl.substring(0, 30)}...` : apiUrl}
                  </Badge>
                </div>
              )}
              {timeout && (
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    Timeout: {timeout}ms
                  </Badge>
                </div>
              )}
              {debug !== undefined && (
                <div className="flex items-center gap-2">
                  <Badge variant={debug ? 'default' : 'outline'} className="text-xs">
                    Debug: {debug ? t('Enabled') : t('Disabled')}
                  </Badge>
                </div>
              )}
            </div>
          );
        },
      },
      {
        id: 'actions',
        size: 150,
        header: () => <div className="text-center">{t('Actions')}</div>,
        cell: ({ row }) => {
          const org = row.original;
          return (
            <div className="flex justify-center">
              <OrganizationMetadataDialog
                organization={org}
                onUpdate={() => refetch()}
              />
            </div>
          );
        },
      },
    ],
    [refetch, t, currentUser]
  );

  return (
    <div className="flex flex-col gap-4 w-full">
      <DashboardPageHeader
        title={t('Organizations')}
        description={t('Manage organizations and their environment-specific metadata')}
      />

      {isLoading ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-muted-foreground">
              {t('Loading organizations...')}
            </div>
          </CardContent>
        </Card>
      ) : !organizationsData || organizationsData.data.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{t('No Organizations')}</CardTitle>
            <CardDescription>
              {t('No organizations have been created yet.')}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                {t('Organizations')}
              </CardTitle>
              <CardDescription>
                {t('Configure metadata at both organization and environment levels. Organization-level metadata applies to all environments, while environment-specific metadata overrides organization settings.')}
                <br />
                <span className="text-xs text-muted-foreground mt-1 block">
                  {t('Note: You can only view and configure metadata for your own organization. Organization owners and super admins can access all organizations.')}
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                page={organizationsData}
                columns={columns}
                isLoading={isLoading}
                emptyStateTextTitle={t('No organizations found')}
                emptyStateTextDescription={t('No organizations have been created yet.')}
                emptyStateIcon={<Building2 className="w-8 h-8 text-muted-foreground" />}
                selectColumn={false}
              />
            </CardContent>
          </Card>

          {/* Show environment metadata sections for each organization - Outside the DataTable card */}
          {organizationsData?.data.map((org) => {
            const hasAccess = currentUser && (
              currentUser.platformRole === PlatformRole.OWNER ||
              currentUser.platformRole === PlatformRole.SUPER_ADMIN ||
              currentUser.organizationId === org.id
            );
            
            if (!hasAccess) return null;
            
            return (
              <div key={org.id}>
                <OrganizationEnvironmentsSection
                  organizationId={org.id}
                  organizationName={org.name}
                />
              </div>
            );
          })}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="w-5 h-5" />
                {t('About Organization Metadata')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                {t('Organization metadata allows you to configure environment-specific settings that apply to all projects within an organization.')}
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>
                  <strong>{t('ADA BMP API URL:')}</strong>{' '}
                  {t('The base URL for the ADA BMP API endpoint')}
                </li>
                <li>
                  <strong>{t('Request Timeout:')}</strong>{' '}
                  {t('Timeout for API requests in milliseconds')}
                </li>
                <li>
                  <strong>{t('Debug Logging:')}</strong>{' '}
                  {t('Enable detailed debug logging for troubleshooting')}
                </li>
              </ul>
              <p className="pt-2">
                <strong>{t('Two-Level Configuration:')}</strong>
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>
                  <strong>{t('Organization-Level:')}</strong>{' '}
                  {t('Default metadata that applies to all environments. Configure via the "Configure Metadata" button above.')}
                </li>
                <li>
                  <strong>{t('Environment-Level:')}</strong>{' '}
                  {t('Environment-specific metadata that overrides organization defaults. Configure via the expandable sections below each organization.')}
                </li>
              </ul>
              <p className="pt-2">
                {t('Environment-specific metadata takes precedence over organization-level metadata. Use different API URLs and settings per environment (Dev, Staging, Production) for complete isolation.')}
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
