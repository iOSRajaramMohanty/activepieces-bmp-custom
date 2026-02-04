import { typeboxResolver } from '@hookform/resolvers/typebox';
import { Static, Type } from '@sinclair/typebox';
import { t } from 'i18next';
import { Settings, Info } from 'lucide-react';
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
import { organizationHooks } from '@/features/platform-admin/lib/organization-hooks';
import { userHooks } from '@/hooks/user-hooks';
import { Organization, PlatformRole } from '@activepieces/shared';

const OrganizationMetadataFormValues = Type.Object({
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

type OrganizationMetadataFormValues = Static<typeof OrganizationMetadataFormValues>;

type OrganizationMetadataDialogProps = {
  organization: Organization;
  onUpdate?: () => void;
};

export const OrganizationMetadataDialog = ({
  organization,
  onUpdate,
}: OrganizationMetadataDialogProps) => {
  const [open, setOpen] = useState(false);
  const { mutate: updateOrganization, isPending } = organizationHooks.useUpdateOrganization();
  const { data: currentUser } = userHooks.useCurrentUser();

  // Check if user has access to this organization
  const hasAccess = currentUser && (
    currentUser.platformRole === PlatformRole.OWNER ||
    currentUser.platformRole === PlatformRole.SUPER_ADMIN ||
    currentUser.organizationId === organization.id
  );

  // Extract metadata values with defaults
  const metadata = (organization.metadata as Record<string, unknown>) || {};
  const defaultApiUrl = metadata.ADA_BMP_API_URL as string || '';
  const defaultTimeout = (metadata.ADA_BMP_TIMEOUT as number) || 30000;
  const defaultDebug = (metadata.ADA_BMP_DEBUG as boolean) || false;

  const form = useForm<OrganizationMetadataFormValues>({
    defaultValues: {
      adaBmpApiUrl: defaultApiUrl,
      adaBmpTimeout: defaultTimeout,
      adaBmpDebug: defaultDebug,
    },
    resolver: typeboxResolver(OrganizationMetadataFormValues),
  });

  // Reset form when dialog opens or organization changes
  useEffect(() => {
    if (open) {
      form.reset({
        adaBmpApiUrl: defaultApiUrl,
        adaBmpTimeout: defaultTimeout,
        adaBmpDebug: defaultDebug,
      });
    }
  }, [open, organization, defaultApiUrl, defaultTimeout, defaultDebug, form]);

  const handleSubmit = (data: OrganizationMetadataFormValues) => {
    // Merge with existing metadata to preserve other fields
    const existingMetadata = metadata || {};
    const updatedMetadata = {
      ...existingMetadata,
      ADA_BMP_API_URL: data.adaBmpApiUrl,
      ADA_BMP_TIMEOUT: data.adaBmpTimeout,
      ADA_BMP_DEBUG: data.adaBmpDebug,
    };

    updateOrganization(
      {
        id: organization.id,
        updates: {
          metadata: updatedMetadata,
        },
      },
      {
        onSuccess: () => {
          setOpen(false);
          onUpdate?.();
        },
      }
    );
  };

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
          variant="outline"
          className="gap-2"
          disabled={!hasAccess}
        >
          <Settings className="w-4 h-4" />
          {t('Configure Metadata')}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            {t('Organization Metadata Configuration')}
          </DialogTitle>
        </DialogHeader>

        {!hasAccess ? (
          <Alert className="mb-4" variant="destructive">
            <Info className="w-4 h-4" />
            <AlertDescription>
              {t('You do not have access to configure metadata for this organization.')}
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="mb-4">
            <Info className="w-4 h-4" />
            <AlertDescription>
              {t('Configure environment-specific metadata for organization: {{name}}', {
                name: organization.name,
              })}
              <br />
              <span className="text-xs text-muted-foreground mt-1 block">
                {t('These settings apply to all environments (Dev, Staging, Production) within this organization.')}
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
                    {t('The base URL for the ADA BMP API endpoint')}
                  </FormDescription>
                  <Input
                    {...field}
                    placeholder="https://"
                    className="rounded-sm"
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
