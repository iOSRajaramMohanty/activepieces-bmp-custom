import { isNil, Permission, PlatformRole } from '@activepieces/shared';
import { useQueryClient } from '@tanstack/react-query';
import { t } from 'i18next';
import {
  ChevronsUpDown,
  LogOut,
  UserCogIcon,
  UserPlus,
  ArrowLeft,
  Shield,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { UserAvatar } from '@/components/custom/user-avatar';
import { useEmbedding } from '@/components/providers/embed-provider';
import { useTelemetry } from '@/components/providers/telemetry-provider';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar-shadcn';
import { InviteUserDialog } from '@/features/members';
import {
  useAuthorization,
  useIsPlatformAdmin,
} from '@/hooks/authorization-hooks';
import { userHooks } from '@/hooks/user-hooks';
import { authenticationSession } from '@/lib/authentication-session';
import { cn } from '@/lib/utils';

import AccountSettingsDialog from '../account-settings';
import { HelpAndFeedback } from '../help-and-feedback';

export function SidebarUser() {
  const [accountSettingsOpen, setAccountSettingsOpen] = useState(false);
  const [inviteUserOpen, setInviteUserOpen] = useState(false);
  const { embedState } = useEmbedding();
  const { state } = useSidebar();
  const { data: user } = userHooks.useCurrentUser();
  const queryClient = useQueryClient();
  const { reset } = useTelemetry();
  const { checkAccess } = useAuthorization();
  const canInviteUsers = checkAccess(Permission.WRITE_INVITATION);
  const isSuperAdmin = user?.platformRole === PlatformRole.SUPER_ADMIN;
  const isOwner = user?.platformRole === PlatformRole.OWNER;
  const isOperator = user?.platformRole === PlatformRole.OPERATOR;
  const isMember = user?.platformRole === PlatformRole.MEMBER;
  const canShowInviteUser =
    canInviteUsers && !isSuperAdmin && !isOperator && !isMember;
  const location = useLocation();
  const isInPlatformAdmin = location.pathname.startsWith('/platform');
  const isCollapsed = state === 'collapsed';

  // Validate and clean switch stack on mount/update
  useEffect(() => {
    if (user) {
      authenticationSession.validateAndCleanSwitchStack(
        user.platformRole,
        authenticationSession.getCurrentUserId(),
      );
    }
  }, [user]);

  const isSwitchedAccount = authenticationSession.isSwitchedAccount();

  if (!user || embedState.isEmbedded) {
    return null;
  }

  const handleLogout = () => {
    userHooks.invalidateCurrentUser(queryClient);
    authenticationSession.logOut();
    reset();
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu modal>
          <DropdownMenuTrigger asChild className="w-full">
            <SidebarMenuButton className="h-10! pl-1! group-data-[collapsible=icon]:h-10! group-data-[collapsible=icon]:pl-1!">
              <div className="size-6 shrink-0 overflow-hidden flex items-center justify-center rounded-full">
                <UserAvatar
                  className={cn('size-full object-cover', {
                    'scale-150': isNil(user.imageUrl),
                  })}
                  name={user.firstName + ' ' + user.lastName}
                  email={user.email}
                  imageUrl={user.imageUrl}
                  size={24}
                  disableTooltip={true}
                />
              </div>

              {!isCollapsed && (
                <>
                  <span className="truncate">
                    {user.firstName + ' ' + user.lastName}
                  </span>
                  <ChevronsUpDown className="ml-auto size-4" />
                </>
              )}
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg z-999"
            side="top"
            align="start"
            sideOffset={10}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <div className="size-8 shrink-0 overflow-hidden rounded-full">
                  <UserAvatar
                    className="size-full object-cover"
                    name={user.firstName + ' ' + user.lastName}
                    email={user.email}
                    imageUrl={user.imageUrl}
                    size={32}
                    disableTooltip={true}
                  />
                </div>

                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">
                    {user.firstName + ' ' + user.lastName}
                  </span>
                  <span className="truncate text-xs">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {!isInPlatformAdmin && !isOwner && !isSuperAdmin && (
              <SidebarPlatformAdminButton />
            )}
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => setAccountSettingsOpen(true)}>
                <UserCogIcon className="w-4 h-4 mr-2" />
                {t('Account Settings')}
              </DropdownMenuItem>
              {canShowInviteUser && (
                <DropdownMenuItem onClick={() => setInviteUserOpen(true)}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  {t('Invite User')}
                </DropdownMenuItem>
              )}
              <HelpAndFeedback />
            </DropdownMenuGroup>
            {isSwitchedAccount &&
              user?.platformRole !== PlatformRole.OPERATOR &&
              user?.platformRole !== PlatformRole.MEMBER && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => {
                      authenticationSession.restorePreviousSession();
                    }}
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    {authenticationSession.getSwitchBackText()}
                  </DropdownMenuItem>
                </>
              )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              {t('Log out')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>

      <AccountSettingsDialog
        open={accountSettingsOpen}
        onClose={() => setAccountSettingsOpen(false)}
      />
      <InviteUserDialog open={inviteUserOpen} setOpen={setInviteUserOpen} />
    </SidebarMenu>
  );
}

function SidebarPlatformAdminButton() {
  const showPlatformAdminDashboard = useIsPlatformAdmin();
  const { embedState } = useEmbedding();
  const navigate = useNavigate();
  const { data: user } = userHooks.useCurrentUser();

  if (embedState.isEmbedded || !showPlatformAdminDashboard) {
    return null;
  }

  const defaultPlatformRoute =
    user?.platformRole === PlatformRole.ADMIN
      ? '/platform/users'
      : '/platform/projects';

  return (
    <DropdownMenuGroup>
      <DropdownMenuItem
        onClick={() => navigate(defaultPlatformRoute)}
        className="w-full flex items-center justify-center relative"
      >
        <div className="w-full flex items-center gap-2">
          <Shield className="size-4" />
          <span className="text-sm">{t('Platform Admin')}</span>
        </div>
      </DropdownMenuItem>
    </DropdownMenuGroup>
  );
}
