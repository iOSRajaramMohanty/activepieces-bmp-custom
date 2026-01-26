import { typeboxResolver } from '@hookform/resolvers/typebox';
import { Static, Type } from '@sinclair/typebox';
import { t } from 'i18next';
import { Settings, Info, Code } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { organizationHooks } from '@/features/platform-admin/lib/organization-hooks';
import { userHooks } from '@/hooks/user-hooks';
import { OrganizationEnvironment, PlatformRole, EnvironmentType } from '@activepieces/shared';

const EnvironmentMetadataFormValues = Type.Object({
  adaBmpApiUrl: Type.String({
    minLength: 1,
    description: 'ADA BMP API URL',
  }),
  adaBmpTimeout: Type.Number({
    minimum: 1000,
    maximum: 300000,
    description: 'Request timeout in milliseconds',
  }),
  adaBmpDebug: Type.Boolean({
    description: 'Enable debug logging',
  }),
});

type EnvironmentMetadataFormValues = Static<typeof EnvironmentMetadataFormValues>;

type EnvironmentMetadataDialogProps = {
  organizationId: string;
  environment: OrganizationEnvironment;
  onUpdate?: () => void;
};

const getDefaultApiUrl = (environment: EnvironmentType): string => {
  switch (environment) {
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

export const EnvironmentMetadataDialog = ({
  organizationId,
  environment,
  onUpdate,
}: EnvironmentMetadataDialogProps) => {
  const [open, setOpen] = useState(false);
  const { mutate: updateEnvironmentMetadata, isPending } = organizationHooks.useUpdateEnvironmentMetadata();
  const { data: currentUser } = userHooks.useCurrentUser();

  // Extract metadata values with defaults
  const metadata = (environment.metadata as Record<string, unknown>) || {};
  const defaultApiUrl = (metadata.ADA_BMP_API_URL as string) || getDefaultApiUrl(environment.environment);
  const defaultTimeout = (metadata.ADA_BMP_TIMEOUT as number) || 30000;
  const defaultDebug = (metadata.ADA_BMP_DEBUG as boolean) || false;

  // Check if user has access
  const hasAccess = currentUser && (
    currentUser.platformRole === PlatformRole.OWNER ||
    currentUser.platformRole === PlatformRole.SUPER_ADMIN ||
    currentUser.organizationId === organizationId ||
    currentUser.id === environment.adminUserId
  );

  const form = useForm<EnvironmentMetadataFormValues>({
    defaultValues: {
      adaBmpApiUrl: defaultApiUrl,
      adaBmpTimeout: defaultTimeout,
      adaBmpDebug: defaultDebug,
    },
    resolver: typeboxResolver(EnvironmentMetadataFormValues),
  });

  // Reset form when dialog opens or environment changes
  useEffect(() => {
    if (open) {
      form.reset({
        adaBmpApiUrl: defaultApiUrl,
        adaBmpTimeout: defaultTimeout,
        adaBmpDebug: defaultDebug,
      });
    }
  }, [open, environment, defaultApiUrl, defaultTimeout, defaultDebug, form]);

  const handleSubmit = (data: EnvironmentMetadataFormValues) => {
    // Merge with existing metadata to preserve other fields
    const existingMetadata = metadata || {};
    const updatedMetadata = {
      ...existingMetadata,
      ADA_BMP_API_URL: data.adaBmpApiUrl,
      ADA_BMP_TIMEOUT: data.adaBmpTimeout,
      ADA_BMP_DEBUG: data.adaBmpDebug,
    };

    updateEnvironmentMetadata(
      {
        organizationId,
        environmentId: environment.id,
        metadata: updatedMetadata,
      },
      {
        onSuccess: () => {
          setOpen(false);
          onUpdate?.();
        },
      }
    );
  };

  const environmentBadgeColor = {
    [EnvironmentType.DEVELOPMENT]: 'default',
    [EnvironmentType.STAGING]: 'outline',
    [EnvironmentType.PRODUCTION]: 'destructive',
  }[environment.environment] || 'outline';

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        if (!open) {
          form.reset();
        }
        setOpen(open);
      }}
    >
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="ghost"
          className="gap-2"
          disabled={!hasAccess}
        >
          <Settings className="w-4 h-4" />
          {t('Configure')}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Code className="w-5 h-5" />
            {t('Environment Metadata Configuration')}
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2 mb-4">
          <Badge variant={environmentBadgeColor as any}>
            {environment.environment}
          </Badge>
          {environment.adminEmail && (
            <span className="text-sm text-muted-foreground">
              {t('Admin: {{email}}', { email: environment.adminEmail })}
            </span>
          )}
        </div>

        {!hasAccess ? (
          <Alert className="mb-4" variant="destructive">
            <Info className="w-4 h-4" />
            <AlertDescription>
              {t('You do not have access to configure metadata for this environment.')}
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="mb-4">
            <Info className="w-4 h-4" />
            <AlertDescription>
              {t('Configure environment-specific metadata for {{environment}} environment.', {
                environment: environment.environment,
              })}
              <br />
              <span className="text-xs text-muted-foreground mt-1 block">
                {t('These settings apply only to this environment and override organization-level metadata.')}
              </span>
            </AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form
            className="space-y-6"
            onSubmit={form.handleSubmit(handleSubmit)}
          >
            <FormField
              control={form.control}
              name="adaBmpApiUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('ADA BMP API URL')}</FormLabel>
                  <FormDescription>
                    {t('The base URL for the ADA BMP API endpoint for {{environment}} environment', {
                      environment: environment.environment,
                    })}
                  </FormDescription>
                  <Input
                    {...field}
                    placeholder={getDefaultApiUrl(environment.environment)}
                    className="rounded-sm"
                    disabled={!hasAccess}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="adaBmpTimeout"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('Request Timeout (ms)')}</FormLabel>
                  <FormDescription>
                    {t('Timeout for API requests in milliseconds (1000-300000)')}
                  </FormDescription>
                  <Input
                    {...field}
                    type="number"
                    min={1000}
                    max={300000}
                    step={1000}
                    onChange={(e) => field.onChange(parseInt(e.target.value, 10))}
                    className="rounded-sm"
                    disabled={!hasAccess}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="adaBmpDebug"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">
                      {t('Enable Debug Logging')}
                    </FormLabel>
                    <FormDescription>
                      {t('Enable detailed debug logging for ADA BMP operations')}
                    </FormDescription>
                  </div>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={!hasAccess}
                  />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isPending}
              >
                {t('Cancel')}
              </Button>
              <Button
                type="submit"
                loading={isPending}
                disabled={!form.formState.isValid || !hasAccess}
              >
                {t('Save Changes')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
