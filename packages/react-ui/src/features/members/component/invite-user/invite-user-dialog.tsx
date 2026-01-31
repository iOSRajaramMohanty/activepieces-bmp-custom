import { typeboxResolver } from '@hookform/resolvers/typebox';
import { Static, Type } from '@sinclair/typebox';
import { useMutation, useQuery } from '@tanstack/react-query';
import { t } from 'i18next';
import { CopyIcon, AlertCircle } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useLocation } from 'react-router-dom';
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
import { TagInput } from '@/components/ui/tag-input';
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
  ProjectType,
  UserInvitationWithLink,
  EnvironmentType,
} from '@activepieces/shared';

import { userInvitationsHooks } from '../../lib/user-invitations-hooks';

import { UserSuggestionsPopover } from './user-suggestions-popover';

const FormSchema = Type.Object({
  emails: Type.Array(Type.String(), {
    errorMessage: t('Please enter at least one email address'),
    minItems: 1,
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
  onInviteSuccess,
}: {
  open: boolean;
  setOpen: (_open: boolean) => void;
  onInviteSuccess?: () => void;
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
  
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [tagInputKey, setTagInputKey] = useState(0);
  const inputRef = useRef<HTMLDivElement>(null);
  const { platform } = platformHooks.useCurrentPlatform();
  const { refetch } = userInvitationsHooks.useInvitations();
  const { data: currentUser } = userHooks.useCurrentUser();
  const isOwner = currentUser?.platformRole === PlatformRole.OWNER;
  const projectId = authenticationSession.getProjectId();
  
  // Fetch organizations for the platform
  const { data: orgsData } = organizationHooks.useOrganizations(platform?.id || '');
  const organizations = orgsData?.data || [];
  
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
  const location = useLocation();
  const isPlatformPage = location.pathname.includes('/platform/');
  const userHasPermissionToInviteUser = checkAccess(
    Permission.WRITE_INVITATION,
  );

  const { mutate, isPending } = useMutation<
    UserInvitationWithLink,
    HttpError,
    FormSchema
  >({
    mutationFn: async (data) => {
      // Handle inviting multiple emails for both PLATFORM and PROJECT invitations
      const promises = data.emails.map((email) => {
        if (data.type === InvitationType.PLATFORM) {
          return userInvitationApi.invite({
            email: email.trim().toLowerCase(),
            type: data.type,
            platformRole: data.platformRole,
            organizationName: data.organizationName,
            environment: data.environment,
          });
        } else {
          if (!project?.id) {
            throw new Error('Project is required for project invitations');
          }
          return userInvitationApi.invite({
            email: email.trim().toLowerCase(),
            type: data.type,
            projectRole: data.projectRole!,
            projectId: project.id,
          });
        }
      });

      const results = await Promise.all(promises);
      return results[0];
    },
    onSuccess: (res) => {
      if (res.link) {
        setInvitationLink(res.link);
      } else {
        setOpen(false);
        form.reset();
        toast.success(t('Invitation sent successfully'), {
          duration: 3000,
        });
      }
      refetch();
      onInviteSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message || t('Failed to send invitations'), {
        duration: 4000,
      });
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
  const defaultProjectRole =
    roles?.find((role) => role.name === 'Editor')?.name || roles?.[0]?.name;

  const isAdmin = currentUser?.platformRole === PlatformRole.ADMIN;

  const form = useForm<FormSchema>({
    resolver: typeboxResolver(FormSchema),
    defaultValues: {
    emails: [],
    type: isPlatformPage
      ? InvitationType.PLATFORM
      : platform.plan.projectRolesEnabled && project?.type === ProjectType.TEAM
      ? InvitationType.PROJECT
      : InvitationType.PLATFORM,
    platformRole: PlatformRole.MEMBER,
    projectRole: defaultProjectRole,
  },
});

  // Watch emails to update suggestions
  const currentEmails = form.watch('emails');

  // Watch organization and environment for ADMIN invitations
  const watchedOrganization = form.watch('organizationName');
  const watchedEnvironment = form.watch('environment');
  const selectedOrgData = organizations.find(
    (org) => org.name === watchedOrganization,
  );
  const { data: orgEnvironments } =
    organizationHooks.useOrganizationEnvironments(selectedOrgData?.id);

  const onSubmit = (data: FormSchema) => {
    if (data.emails.length === 0) {
      form.setError('emails', {
        type: 'required',
        message: t('Please enter at least one email address'),
      });
      return;
    }

    const invalidEmails = data.emails.filter(
      (email) => !formatUtils.emailRegex.test(email.trim()),
    );

    if (invalidEmails.length > 0) {
      form.setError('emails', {
        type: 'validation',
        message: t('Please fix invalid email addresses'),
      });
      return;
    }

    const projectRole = data.projectRole || defaultProjectRole;
    if (data.type === InvitationType.PROJECT && !projectRole) {
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

    mutate({
      ...data,
      projectRole,
    });
  };

  const copyInvitationLink = () => {
    navigator.clipboard.writeText(invitationLink);
    toast.success(t('Invitation link copied successfully'), {
      duration: 3000,
    });
  };

  const handleSelectUser = (email: string) => {
    const currentEmails = form.getValues('emails');
    form.setValue('emails', [...currentEmails, email]);
    setInputValue('');
    setShowSuggestions(false);
    // Force TagInput to remount and clear its internal input state
    setTagInputKey((prev) => prev + 1);
  };

  const handleInputChange = (value: string) => {
    setInputValue(value);
    setShowSuggestions(value.trim().length > 0 && !isPlatformPage);
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
            form.reset();
            setInvitationLink('');
            setInputValue('');
            setShowSuggestions(false);
            setTagInputKey(0);
          }}
        >
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>
                {invitationLink
                  ? t('Invitation Link')
                  : isPlatformPage
                  ? t('Invite to Your Platform')
                  : t('Add Members')}
              </DialogTitle>
              <DialogDescription>
                {invitationLink ? (
                  t(
                    'Please copy the link below and share it with the user you want to invite, the invitation expires in 7 days.',
                  )
                ) : isPlatformPage ? (
                  t(
                    'Invite team members to collaborate and build amazing flows together.',
                  )
                ) : (
                  <>
                    {t('Add new members to')}{' '}
                    <span className="text-foreground font-semibold">
                      {project?.displayName}
                    </span>
                    {'. '}
                    {t(
                      'They will be added immediately and receive an email notification.',
                    )}
                  </>
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
                    name="emails"
                    render={({ field }) => (
                      <FormItem className="grid gap-2">
                        <Label htmlFor="emails">{t('Emails')}</Label>
                        <UserSuggestionsPopover
                          open={showSuggestions}
                          onOpenChange={setShowSuggestions}
                          inputValue={inputValue}
                          currentEmails={currentEmails}
                          onSelectUser={handleSelectUser}
                          isPlatformPage={isPlatformPage}
                        >
                          <div ref={inputRef}>
                            <TagInput
                              key={tagInputKey}
                              {...field}
                              type="email"
                              placeholder={t('Invite users by email')}
                              onInputChange={handleInputChange}
                            />
                          </div>
                        </UserSuggestionsPopover>
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
            {(currentUser?.platformRole === PlatformRole.ADMIN ||
              currentUser?.platformRole === PlatformRole.OWNER) && (
              <SelectItem value={InvitationType.PLATFORM}>
                {t('Entire Platform')}
              </SelectItem>
            )}
            {platform.plan.projectRolesEnabled &&
              currentUser?.platformRole !== PlatformRole.OWNER &&
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
/>
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
                                  {organizations.length > 0 
                                    ? t('Type to search existing organizations or enter a new name (uppercase letters only)')
                                    : t('Enter organization name (uppercase letters only)')}
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
                          <Label>{t('Project Role')}</Label>
                          <Select
                            onValueChange={(value) => {
                              const selectedRole = roles.find(
                                (role) => role.name === value,
                              );
                              field.onChange(selectedRole?.name);
                            }}
                            value={field.value || defaultProjectRole}
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
                          (
                            !adminAvailability.available ||
                            // Also disable if selected environment is already taken
                            (watchedEnvironment &&
                              orgEnvironments &&
                              (orgEnvironments as any)?.some(
                                (env: any) => env.environment === watchedEnvironment
                              ))
                          )
                        )
                      }
                    >
                      {isPlatformPage ? t('Invite') : t('Add')}
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
