import {
  InvitationType,
  isNil,
  Permission,
  PlatformRole,
  ProjectType,
  UserInvitationWithLink,
} from '@activepieces/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { t } from 'i18next';
import { CopyIcon, AlertCircle } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';

import { TagInput } from '@/components/custom/tag-input';
import { useEmbedding } from '@/components/providers/embed-provider';
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { userInvitationApi } from '@/features/members/api/user-invitation';
import { PlatformRoleSelect } from '@/features/members/components/platform-role-select';
import { ProjectRoleSelect } from '@/features/members/components/project-role-select';
import { projectCollectionUtils } from '@/features/projects/stores/project-collection';
import { organizationHooks } from '@/features/platform-admin/api/organization-hooks';
import { useAuthorization } from '@/hooks/authorization-hooks';
import { platformHooks } from '@/hooks/platform-hooks';
import { userHooks } from '@/hooks/user-hooks';
import { HttpError } from '@/lib/api';
import { authenticationSession } from '@/lib/authentication-session';
import { formatUtils } from '@/lib/format-utils';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { userInvitationsHooks } from '../../hooks/user-invitations-hooks';

import { UserSuggestionsPopover } from './user-suggestions-popover';

const FormSchema = z.object({
  emails: z
    .array(z.string())
    .min(1, t('Please enter at least one email address')),
  type: z.nativeEnum(InvitationType, {
    message: t('Please select invitation type'),
  }),
  platformRole: z.nativeEnum(PlatformRole, {
    message: t('Please select platform role'),
  }),
  projectRole: z.string().optional(),
  organizationName: z.string().optional(),
  environment: z.string().optional(),
});

type FormSchema = z.infer<typeof FormSchema>;

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
  const [selectedOrg, setSelectedOrg] = useState<string>('');
  
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
  
  // Get current project (hook must be called unconditionally; owners may have no project)
  const projectQuery = projectCollectionUtils.useCurrentProject();
  const project = !isOwner && projectId ? (projectQuery?.project ?? null) : null;
  const defaultProjectRole = undefined;

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
            ...(data.organizationName != null && { organizationName: data.organizationName }),
            ...(data.environment != null && { environment: data.environment }),
          } as Parameters<typeof userInvitationApi.invite>[0]);
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

  const form = useForm<FormSchema>({
    resolver: zodResolver(FormSchema),
      defaultValues: {
        emails: [],
        type: isPlatformPage
          ? InvitationType.PLATFORM
          : platform.plan.projectRolesEnabled && project?.type === ProjectType.TEAM
          ? InvitationType.PROJECT
          : InvitationType.PLATFORM,
        platformRole: PlatformRole.MEMBER,
        projectRole: undefined,
      },
  });

  // Watch emails to update suggestions
  const currentEmails = form.watch('emails');

  // Watch organization for ADMIN invitations
  const watchedOrganization = form.watch('organizationName');

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

    if (data.type === InvitationType.PROJECT && !data.projectRole) {
      form.setError('projectRole', {
        type: 'required',
        message: t('Please select a project role'),
      });
      return;
    }

    if (isOwner && data.platformRole === PlatformRole.ADMIN && !data.organizationName) {
      form.setError('organizationName', {
        type: 'required',
        message: t('Please enter organization name'),
      });
      return;
    }

    mutate(data);
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
          onOpenChange={(newOpen) => {
            setOpen(newOpen);
            form.reset({
              emails: [],
              type: isPlatformPage
                ? InvitationType.PLATFORM
                : platform.plan.projectRolesEnabled && project?.type === ProjectType.TEAM
                ? InvitationType.PROJECT
                : InvitationType.PLATFORM,
              platformRole: isOwner ? PlatformRole.ADMIN : PlatformRole.MEMBER,
              projectRole: defaultProjectRole,
            });
            setInvitationLink('');
            setInputValue('');
            setShowSuggestions(false);
            setTagInputKey(0);
          }}
        >
          <DialogContent className="sm:max-w-[475px]">
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
                          {/* Environment selector hidden for ADMIN — multiple Admins per org, shared project */}
                        </>
                      )}
                    </>
                  )}
                  {form.getValues().type === InvitationType.PROJECT && (
                    <ProjectRoleSelect form={form} />
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
                          !form.getValues().organizationName)
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
