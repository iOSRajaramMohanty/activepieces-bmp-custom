import { t } from 'i18next';
import { Code, ChevronDown, ChevronRight, Building2 } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { organizationHooks } from '@/features/platform-admin/lib/organization-hooks';
import { OrganizationEnvironment, EnvironmentType } from '@activepieces/shared';
import { EnvironmentMetadataDialog } from './environment-metadata-dialog';

type OrganizationEnvironmentsSectionProps = {
  organizationId: string;
  organizationName: string;
};

export const OrganizationEnvironmentsSection = ({
  organizationId,
  organizationName,
}: OrganizationEnvironmentsSectionProps) => {
  const [open, setOpen] = useState(false);
  const { data: environments, isLoading, refetch, error } = organizationHooks.useOrganizationEnvironments(organizationId);
  
  // Debug logging
  console.log('[OrganizationEnvironmentsSection]', {
    organizationId,
    organizationName,
    environmentsCount: environments?.length || 0,
    isLoading,
    error,
  });

  const getEnvironmentBadgeVariant = (env: EnvironmentType) => {
    switch (env) {
      case EnvironmentType.DEVELOPMENT:
        return 'default';
      case EnvironmentType.STAGING:
        return 'outline';
      case EnvironmentType.PRODUCTION:
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getDefaultApiUrl = (env: EnvironmentType) => {
    switch (env) {
      case EnvironmentType.DEVELOPMENT:
        return 'https://bmpapidev1.cl.bmp.ada-asia.my';
      case EnvironmentType.STAGING:
        return 'https://bmpapistg.cl.bmp.ada-asia.my';
      case EnvironmentType.PRODUCTION:
        return 'https://bmpapiprod.cl.bmp.ada-asia.my';
      default:
        return '';
    }
  };

  if (isLoading) {
    return (
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Code className="w-4 h-4" />
            {t('Environment Metadata')} - {organizationName}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="text-sm text-muted-foreground">
            {t('Loading environments...')}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    console.error('[OrganizationEnvironmentsSection] Error loading environments:', error);
    const errorMessage = error instanceof Error 
      ? error.message 
      : (error as any)?.response?.data?.message 
        ? (error as any).response.data.message 
        : String(error);
    
    return (
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Code className="w-4 h-4" />
            {t('Environment Metadata')} - {organizationName}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-destructive">
            {t('Error loading environments')}: {errorMessage}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Always show the section, even if no environments exist
  // This allows users to see that environment metadata can be configured
  if (!environments || environments.length === 0) {
    return (
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Code className="w-4 h-4" />
            {t('Environment Metadata')} - {organizationName}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            {t('No environment assigned to you or no environments configured for this organization yet.')}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="mt-4">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                {open ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
                <Code className="w-4 h-4" />
                {t('My Environment Metadata')} - {organizationName}
              </CardTitle>
              <Badge variant="outline">
                {environments.length === 1 ? t('Your Environment') : `${environments.length} ${t('environments')}`}
              </Badge>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="space-y-4">
              {environments.map((env) => {
                const metadata = (env.metadata as Record<string, unknown>) || {};
                const apiUrl = metadata.ADA_BMP_API_URL as string;
                const timeout = metadata.ADA_BMP_TIMEOUT as number;
                const debug = metadata.ADA_BMP_DEBUG as boolean;
                const hasMetadata = apiUrl || timeout || debug !== undefined;

                return (
                  <div
                    key={env.id}
                    className="border rounded-lg p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant={getEnvironmentBadgeVariant(env.environment) as any}>
                          {env.environment}
                        </Badge>
                        {env.adminEmail && (
                          <span className="text-sm text-muted-foreground">
                            {t('Admin: {{email}}', { email: env.adminEmail })}
                          </span>
                        )}
                      </div>
                      <EnvironmentMetadataDialog
                        organizationId={organizationId}
                        environment={env}
                        onUpdate={() => refetch()}
                      />
                    </div>

                    {hasMetadata ? (
                      <div className="flex flex-col gap-2 pl-2 border-l-2">
                        {apiUrl && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-muted-foreground w-20">
                              API URL:
                            </span>
                            <Badge variant="outline" className="text-xs font-mono">
                              {apiUrl.length > 40 ? `${apiUrl.substring(0, 40)}...` : apiUrl}
                            </Badge>
                          </div>
                        )}
                        {timeout && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-muted-foreground w-20">
                              Timeout:
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {timeout}ms
                            </Badge>
                          </div>
                        )}
                        {debug !== undefined && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-muted-foreground w-20">
                              Debug:
                            </span>
                            <Badge variant={debug ? 'default' : 'outline'} className="text-xs">
                              {debug ? t('Enabled') : t('Disabled')}
                            </Badge>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground italic pl-2">
                        {t('No environment-specific metadata configured. Using organization-level defaults or system defaults.')}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};
