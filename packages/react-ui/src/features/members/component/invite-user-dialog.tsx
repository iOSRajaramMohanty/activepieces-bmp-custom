import { typeboxResolver } from '@hookform/resolvers/typebox';
import { Static, Type } from '@sinclair/typebox';
import { useMutation, useQuery } from '@tanstack/react-query';
import { t } from 'i18next';
import { CopyIcon, AlertCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { useEmbedding } from '@/components/embed-provider';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FormField, FormItem, Form, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { PlatformRoleSelect } from '@/features/members/component/platform-role-select';
import { userInvitationApi } from '@/features/members/lib/user-invitation';
import { projectRoleApi } from '@/features/platform-admin/lib/project-role-api';
import { organizationHooks } from '@/features/platform-admin/lib/organization-hooks';
import { useAuthorization } from '@/hooks/authorization-hooks';
import { platformHooks } from '@/hooks/platform-hooks';
import { projectCollectionUtils } from '@/hooks/project-collection';
import { userHooks } from '@/hooks/user-hooks';
import { authenticationSession } from '@/lib/authentication-session';
import { HttpError } from '@/lib/api';
import { formatUtils } from '@/lib/utils';
import {
  InvitationType,
  isNil,
  Permission,
  PlatformRole,
  UserInvitationWithLink,
  EnvironmentType,
} from '@activepieces/shared';

import { userInvitationsHooks } from '../lib/user-invitations-hooks';

const FormSchema = Type.Object({
  email: Type.String({
    errorMessage: t('Please enter a valid email address'),
    pattern: formatUtils.emailRegex.source,
  }),
  type: Type.Enum(InvitationType, {
    errorMessage: t('Please select invitation type'),
    required: true,
  }),
  platformRole: Type.Enum(PlatformRole, {
    errorMessage: t('Please select platform role'),
    required: true,
  }),
  projectRole: Type.Optional(
    Type.String({
      required: true,
    }),
  ),
  organizationName: Type.Optional(Type.String()),
  environment: Type.Optional(Type.Enum(EnvironmentType)),
});

type FormSchema = Static<typeof FormSchema>;

export const InviteUserDialog = ({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: (_open: boolean) => void;
}) => {
  const { embedState } = useEmbedding();
  const [invitationLink, setInvitationLink] = useState('');
  const [adminAvailability, setAdminAvailability] = useState<{
    available: boolean;
    adminEmail?: string;
  }>({ available: true });
  const [selectedOrg, setSelectedOrg] = useState<string>('');
  const [takenEnvironments, setTakenEnvironments] = useState<{
    [key in EnvironmentType]?: string; // Maps environment to admin email
  }>({});
  
  const { platform } = platformHooks.useCurrentPlatform();
  const { refetch } = userInvitationsHooks.useInvitations();
  const { data: currentUser } = userHooks.useCurrentUser();
  const isOwner = currentUser?.platformRole === PlatformRole.OWNER;
  const projectId = authenticationSession.getProjectId();
  
  // Fetch organizations for the platform
  const { data: orgsData } = organizationHooks.useOrganizations(platform?.id || '');
  const organizations = orgsData?.data || [];
  
  // Get or create organization mutation
  const { mutateAsync: getOrCreateOrg } = organizationHooks.useGetOrCreateOrganization();
  
  // Check admin availability mutation
  const { mutateAsync: checkAvailability } = organizationHooks.useCheckAdminAvailability();
  
  // Only get project if not owner and projectId exists (owners don't have projects)
  let project = null;
  try {
    if (!isOwner && projectId) {
      const projectQuery = projectCollectionUtils.useCurrentProject();
      project = projectQuery?.project || null;
    }
  } catch (error) {
    // If useCurrentProject fails (e.g., no project), set to null
    project = null;
  }
  const { checkAccess } = useAuthorization();
  const userHasPermissionToInviteUser = checkAccess(
    Permission.WRITE_INVITATION,
  );

  const { mutate, isPending } = useMutation<
    UserInvitationWithLink,
    HttpError,
    FormSchema
  >({
    mutationFn: (data) => {
      switch (data.type) {
        case InvitationType.PLATFORM:
          return userInvitationApi.invite({
            email: data.email.trim().toLowerCase(),
            type: data.type,
            platformRole: data.platformRole,
            organizationName: data.organizationName,
            environment: data.environment,
          });
        case InvitationType.PROJECT:
          if (!project?.id) {
            throw new Error('Project is required for project invitations');
          }
          return userInvitationApi.invite({
            email: data.email.trim().toLowerCase(),
            type: data.type,
            projectRole: data.projectRole!,
            projectId: project.id,
          });
      }
    },
    onSuccess: (res) => {
      if (res.link) {
        setInvitationLink(res.link);
      } else {
        setOpen(false);
        toast.success(t('Invitation sent successfully'), {
          duration: 3000,
        });
      }
      refetch();
      //TODO: navigate to platform admin users
    },
  });

  const { data: rolesData } = useQuery({
    queryKey: ['project-roles'],
    queryFn: () => projectRoleApi.list(),
    enabled:
      !isNil(platform.plan.projectRolesEnabled) &&
      platform.plan.projectRolesEnabled,
  });

  const roles = rolesData?.data ?? [];

  const isAdmin = currentUser?.platformRole === PlatformRole.ADMIN;

  const form = useForm<FormSchema>({
    resolver: typeboxResolver(FormSchema),
    defaultValues: {
      email: '',
      // Owners can only invite to platform, not to projects
      type: isOwner
        ? InvitationType.PLATFORM
        : platform.plan.projectRolesEnabled
          ? InvitationType.PROJECT
          : InvitationType.PLATFORM,
      // Default to OPERATOR for admins, ADMIN for owners
      platformRole: isAdmin ? PlatformRole.OPERATOR : PlatformRole.ADMIN,
      projectRole: roles?.[0]?.name,
      organizationName: '',
      environment: EnvironmentType.DEVELOPMENT,
    },
  });

  // Watch for changes to platform role, organization, and environment
  const watchedPlatformRole = form.watch('platformRole');
  const watchedOrganization = form.watch('organizationName');
  const watchedEnvironment = form.watch('environment');

  // Get organization ID from name (after watchedOrganization is defined)
  const selectedOrgData = organizations.find(org => org.name === watchedOrganization);
  
  // Fetch environments for the selected organization (includes adminEmail)
  const { data: orgEnvironments } = organizationHooks.useOrganizationEnvironments(selectedOrgData?.id) as {
    data?: Array<Record<string, any>>;
  };

  // Check admin availability when organization or environment changes (for ADMIN role)
  useEffect(() => {
    if (
      isOwner &&
      watchedPlatformRole === PlatformRole.ADMIN &&
      watchedOrganization &&
      watchedEnvironment &&
      platform?.id
    ) {
      // First, get or create the organization
      getOrCreateOrg({
        name: watchedOrganization.toUpperCase(),
        platformId: platform.id,
      })
        .then((org) => {
          setSelectedOrg(org.id);
          // Then check availability
          return checkAvailability({
            organizationId: org.id,
            environment: watchedEnvironment,
          });
        })
        .then((result) => {
          setAdminAvailability({
            available: result.available,
            adminEmail: result.adminEmail,
          });
        })
        .catch(() => {
          setAdminAvailability({ available: true });
        });
    } else {
      setAdminAvailability({ available: true });
    }
  }, [
    watchedPlatformRole,
    watchedOrganization,
    watchedEnvironment,
    platform?.id,
    isOwner,
    getOrCreateOrg,
    checkAvailability,
  ]);

  const onSubmit = async (data: FormSchema) => {
    if (data.type === InvitationType.PROJECT && !data.projectRole) {
      form.setError('projectRole', {
        type: 'required',
        message: t('Please select a project role'),
      });
      return;
    }

    // Validate organization and environment for ADMIN invitations
    if (isOwner && data.platformRole === PlatformRole.ADMIN) {
      if (!data.organizationName) {
        form.setError('organizationName', {
          type: 'required',
          message: t('Please enter organization name'),
        });
        return;
      }

      if (!data.environment) {
        form.setError('environment', {
          type: 'required',
          message: t('Please select environment'),
        });
        return;
      }

      // Check if slot is available
      if (!adminAvailability.available) {
        form.setError('root.serverError', {
          type: 'validation',
          message: t(
            'Admin slot already taken for {{org}} {{env}} by {{email}}',
            {
              org: data.organizationName,
              env: data.environment,
              email: adminAvailability.adminEmail,
            }
          ),
        });
        return;
      }
    }

    mutate(data);
  };

  const copyInvitationLink = () => {
    navigator.clipboard.writeText(invitationLink);
    toast.success(t('Invitation link copied successfully'), {
      duration: 3000,
    });
  };

  if (embedState.isEmbedded || !userHasPermissionToInviteUser) {
    return null;
  }

  return (
    <>
      {
        <Dialog
          open={open}
          modal
          onOpenChange={(open) => {
            setOpen(open);
            if (open) {
              form.reset();
              setInvitationLink('');
            }
          }}
        >
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>
                {invitationLink ? t('Invitation Link') : t('Invite User')}
              </DialogTitle>
              <DialogDescription>
                {invitationLink
                  ? t(
                      'Please copy the link below and share it with the user you want to invite, the invitation expires in 24 hours.',
                    )
                  : t(
                      'Type the email address of the user you want to invite, the invitation expires in 24 hours.',
                    )}
              </DialogDescription>
            </DialogHeader>

            {!invitationLink ? (
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="flex flex-col gap-4"
                >
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem className="grid gap-2">
                        <Label htmlFor="email">{t('Email')}</Label>
                        <Input
                          {...field}
                          type="text"
                          placeholder="jon@doe.com"
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem className="grid gap-2">
                        <Label>{t('Invite To')}</Label>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={t('Invite To')} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              <SelectLabel>{t('Invite To')}</SelectLabel>
                              {(currentUser?.platformRole ===
                                PlatformRole.ADMIN ||
                                currentUser?.platformRole ===
                                  PlatformRole.OWNER) && (
                                <SelectItem value={InvitationType.PLATFORM}>
                                  {t('Entire Platform')}
                                </SelectItem>
                              )}
                              {platform.plan.projectRolesEnabled &&
                                currentUser?.platformRole !==
                                  PlatformRole.OWNER &&
                                project && (
                                  <SelectItem value={InvitationType.PROJECT}>
                                    {project.displayName} (Current)
                                  </SelectItem>
                                )}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  ></FormField>

                  {form.getValues().type === InvitationType.PLATFORM && (
                    <>
                      <PlatformRoleSelect form={form} />
                      
                      {/* Show organization and environment selectors only for ADMIN role and OWNER users */}
                      {isOwner && form.getValues().platformRole === PlatformRole.ADMIN && (
                        <>
                          <FormField
                            control={form.control}
                            name="organizationName"
                            render={({ field }) => (
                              <FormItem className="grid gap-2">
                                <Label htmlFor="organizationName">
                                  {t('Organization')} *
                                </Label>
                                <Input
                                  {...field}
                                  type="text"
                                  placeholder={t('Type organization name (e.g., ABC)')}
                                  list="organizations-list"
                                  onChange={(e) => {
                                    // Convert to uppercase and validate
                                    const upperValue = e.target.value.toUpperCase();
                                    // Only allow uppercase letters
                                    if (/^[A-Z]*$/.test(upperValue)) {
                                      field.onChange(upperValue);
                                    }
                                  }}
                                  value={field.value || ''}
                                />
                                <datalist id="organizations-list">
                                  {organizations.map((org) => (
                                    <option key={org.id} value={org.name} />
                                  ))}
                                </datalist>
                                <p className="text-xs text-muted-foreground">
                                  {t('Select existing or type new (uppercase letters only)')}
                                </p>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="environment"
                            render={({ field }) => (
                              <FormItem className="grid gap-2">
                                <Label>{t('Environment')} *</Label>
                                <RadioGroup
                                  onValueChange={field.onChange}
                                  value={field.value}
                                  className="flex gap-4"
                                >
                                  {/* Development Environment */}
                                  {(() => {
                                    const envData = (orgEnvironments as any) || [];
                                    const isDevTaken = envData?.some(
                                      (env: any) => env.environment === EnvironmentType.DEVELOPMENT
                                    );
                                    const devAdmin = envData?.find(
                                      (env: any) => env.environment === EnvironmentType.DEVELOPMENT
                                    );
                                    
                                    const envOption = (
                                      <div className="flex items-center space-x-2">
                                        <RadioGroupItem
                                          value={EnvironmentType.DEVELOPMENT}
                                          id="env-dev"
                                          disabled={isDevTaken}
                                        />
                                        <Label 
                                          htmlFor="env-dev" 
                                          className={`font-normal ${isDevTaken ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                        >
                                          {t('Development')}
                                        </Label>
                                      </div>
                                    );
                                    
                                    return isDevTaken ? (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          {envOption}
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          {t('Already assigned to {{email}}', { email: devAdmin?.adminEmail || 'an admin' })}
                                        </TooltipContent>
                                      </Tooltip>
                                    ) : envOption;
                                  })()}

                                  {/* Staging Environment */}
                                  {(() => {
                                    const envData = (orgEnvironments as any) || [];
                                    const isStagingTaken = envData?.some(
                                      (env: any) => env.environment === EnvironmentType.STAGING
                                    );
                                    const stagingAdmin = envData?.find(
                                      (env: any) => env.environment === EnvironmentType.STAGING
                                    );
                                    
                                    const envOption = (
                                      <div className="flex items-center space-x-2">
                                        <RadioGroupItem
                                          value={EnvironmentType.STAGING}
                                          id="env-staging"
                                          disabled={isStagingTaken}
                                        />
                                        <Label 
                                          htmlFor="env-staging" 
                                          className={`font-normal ${isStagingTaken ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                        >
                                          {t('Staging')}
                                        </Label>
                                      </div>
                                    );
                                    
                                    return isStagingTaken ? (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          {envOption}
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          {t('Already assigned to {{email}}', { email: stagingAdmin?.adminEmail || 'an admin' })}
                                        </TooltipContent>
                                      </Tooltip>
                                    ) : envOption;
                                  })()}

                                  {/* Production Environment */}
                                  {(() => {
                                    const envData = (orgEnvironments as any) || [];
                                    const isProductionTaken = envData?.some(
                                      (env: any) => env.environment === EnvironmentType.PRODUCTION
                                    );
                                    const productionAdmin = envData?.find(
                                      (env: any) => env.environment === EnvironmentType.PRODUCTION
                                    );
                                    
                                    const envOption = (
                                      <div className="flex items-center space-x-2">
                                        <RadioGroupItem
                                          value={EnvironmentType.PRODUCTION}
                                          id="env-production"
                                          disabled={isProductionTaken}
                                        />
                                        <Label 
                                          htmlFor="env-production" 
                                          className={`font-normal ${isProductionTaken ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                        >
                                          {t('Production')}
                                        </Label>
                                      </div>
                                    );
                                    
                                    return isProductionTaken ? (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          {envOption}
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          {t('Already assigned to {{email}}', { email: productionAdmin?.adminEmail || 'an admin' })}
                                        </TooltipContent>
                                      </Tooltip>
                                    ) : envOption;
                                  })()}
                                </RadioGroup>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          {/* Admin availability status */}
                          {watchedOrganization && watchedEnvironment && (
                            <Alert variant={adminAvailability.available ? 'default' : 'destructive'}>
                              <AlertCircle className="h-4 w-4" />
                              <AlertDescription>
                                {adminAvailability.available ? (
                                  <span className="text-green-600 dark:text-green-400">
                                    ✓ {t('Admin slot available for {{org}} {{env}}', {
                                      org: watchedOrganization,
                                      env: watchedEnvironment,
                                    })}
                                  </span>
                                ) : (
                                  <span>
                                    {t('Admin already assigned to {{org}} {{env}}: {{email}}', {
                                      org: watchedOrganization,
                                      env: watchedEnvironment,
                                      email: adminAvailability.adminEmail,
                                    })}
                                  </span>
                                )}
                              </AlertDescription>
                            </Alert>
                          )}
                        </>
                      )}
                    </>
                  )}
                  {form.getValues().type === InvitationType.PROJECT && (
                    <FormField
                      control={form.control}
                      name="projectRole"
                      render={({ field }) => (
                        <FormItem className="grid gap-2">
                          <Label>{t('Select Project Role')}</Label>
                          <Select
                            onValueChange={(value) => {
                              const selectedRole = roles.find(
                                (role) => role.name === value,
                              );
                              field.onChange(selectedRole?.name);
                            }}
                            defaultValue={field.value}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={t('Select Role')} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectGroup>
                                <SelectLabel>{t('Roles')}</SelectLabel>
                                {roles.map((role) => (
                                  <SelectItem key={role.name} value={role.name}>
                                    {role.name}
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {form?.formState?.errors?.root?.serverError && (
                    <FormMessage>
                      {form.formState.errors.root.serverError.message}
                    </FormMessage>
                  )}
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button type="button" variant={'outline'}>
                        {t('Cancel')}
                      </Button>
                    </DialogClose>
                    <Button 
                      type="submit" 
                      loading={isPending}
                      disabled={
                        isPending ||
                        (isOwner &&
                          form.getValues().platformRole === PlatformRole.ADMIN &&
                          (!adminAvailability.available || 
                           // Also disable if selected environment is already taken
                           (watchedEnvironment && orgEnvironments && (orgEnvironments as any)?.some(
                             (env: any) => env.environment === watchedEnvironment
                           ))))
                      }
                    >
                      {t('Invite')}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            ) : (
              <>
                <Label htmlFor="invitationLink" className="mb-2">
                  {t('Invitation Link')}
                </Label>
                <div className="flex">
                  <Input
                    name="invitationLink"
                    type="text"
                    readOnly={true}
                    defaultValue={invitationLink}
                    placeholder={t('Invitation Link')}
                    onFocus={(event) => {
                      event.target.select();
                      copyInvitationLink();
                    }}
                    className=" rounded-l-md rounded-r-none focus-visible:ring-0! focus-visible:ring-offset-0!"
                  />

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant={'outline'}
                        className=" rounded-l-none rounded-r-md"
                        onClick={copyInvitationLink}
                      >
                        <CopyIcon height={15} width={15}></CopyIcon>
                      </Button>
                    </TooltipTrigger>

                    <TooltipContent side="bottom">{t('Copy')}</TooltipContent>
                  </Tooltip>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      }
    </>
  );
};
