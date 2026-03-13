import { ColumnDef } from '@tanstack/react-table';
import { t } from 'i18next';
import { Building2, Info, Link2, Copy, Check } from 'lucide-react';
import { useMemo, useState } from 'react';

import { DashboardPageHeader } from '@/app/components/dashboard-page-header';
import {
  DataTable,
  RowDataWithActions,
} from '@/components/custom/data-table';
import { DataTableColumnHeader } from '@/components/custom/data-table/data-table-column-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { organizationHooks } from '@/features/platform-admin/api/organization-hooks';
import { platformHooks } from '@/hooks/platform-hooks';
import { userHooks } from '@/hooks/user-hooks';
import { Organization, PlatformRole } from '@activepieces/shared';
import { OrganizationEnvironmentsSection } from './organization-environments-section';

export default function OrganizationsPage() {
  const { platform } = platformHooks.useCurrentPlatform();
  const { data: organizationsData, isLoading, refetch } = organizationHooks.useOrganizations(platform.id);
  const { data: currentUser } = userHooks.useCurrentUser();
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

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
        size: 450,
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title={t('API Configuration')}
            icon={Link2}
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
            <TooltipProvider>
              <div className="flex items-center gap-2 group">
                {apiUrl ? (
                  <>
                    <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg border border-primary/20 hover:border-primary/40 transition-all duration-200 flex-1 min-w-0">
                      <Link2 className="w-4 h-4 text-primary flex-shrink-0" />
                      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                        <span className="text-xs text-muted-foreground font-medium">API Endpoint</span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-sm font-mono font-semibold text-foreground truncate cursor-help">
                              {apiUrl}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-md">
                            <p className="font-mono text-xs break-all">{apiUrl}</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-9 w-9 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => copyToClipboard(apiUrl)}
                        >
                          {copiedUrl === apiUrl ? (
                            <Check className="w-4 h-4 text-green-500" />
                          ) : (
                            <Copy className="w-4 h-4 text-muted-foreground" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{copiedUrl === apiUrl ? t('Copied!') : t('Copy URL')}</p>
                      </TooltipContent>
                    </Tooltip>
                  </>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 rounded-lg border border-border/50">
                    <Info className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground italic">
                      {t('No API URL configured')}
                    </span>
                  </div>
                )}
              </div>
            </TooltipProvider>
          );
        },
      },
    ],
    [currentUser, copiedUrl]
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
                {t('View organization-level metadata and configure environment-specific metadata. Organization-level metadata is read-only (from system configuration), while environment-specific metadata can be configured to override defaults.')}
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
                  {t('Read-only default metadata from system configuration. This is the fallback API URL when no environment-specific metadata is configured.')}
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
