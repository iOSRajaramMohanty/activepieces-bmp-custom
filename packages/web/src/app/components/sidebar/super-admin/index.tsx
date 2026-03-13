import { PlatformRole } from '@activepieces/shared';
import { t } from 'i18next';

import { FileHeartIcon } from '@/components/icons/file-heart';
import { MousePointerClickIcon } from '@/components/icons/mouse-pointer-click';
import { PuzzleIcon } from '@/components/icons/puzzle';
import { ServerIcon } from '@/components/icons/server';
import { Settings2Icon } from '@/components/icons/settings2';
import { SquareDashedBottomCodeIcon } from '@/components/icons/square-dashed-bottom-code';
import { UsersIcon } from '@/components/icons/users';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarSeparator,
} from '@/components/ui/sidebar-shadcn';
import { userHooks } from '@/hooks/user-hooks';

import { ApSidebarItem } from '../ap-sidebar-item';
import { SidebarUser } from '../sidebar-user';

export function SuperAdminSidebar() {
  const { data: currentUser } = userHooks.useCurrentUser();
  
  const isSuperAdmin = currentUser?.platformRole === PlatformRole.SUPER_ADMIN;

  // For Super Admin - only show the dashboard
  if (isSuperAdmin) {
    return (
      <Sidebar className="border-r-0!">
        <div className="flex-1 overflow-y-auto scrollbar-hover pt-4">
          <SidebarContent className="gap-0">
            <SidebarGroup className="cursor-default shrink-0">
              <SidebarGroupLabel>{t('General')}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <ApSidebarItem
                    type="link"
                    to="/super-admin"
                    label={t('Super Admin Dashboard')}
                    icon={SquareDashedBottomCodeIcon}
                  />
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </div>
        <SidebarFooter>
          <SidebarUser />
        </SidebarFooter>
      </Sidebar>
    );
  }

  // For Owner - show Owner Dashboard, Users, Setup (Pieces, Organizations), and Infrastructure
  return (
    <Sidebar className="border-r-0!">
      <div className="flex-1 overflow-y-auto scrollbar-hover pt-4">
        <SidebarContent className="gap-0">
          <SidebarGroup className="cursor-default shrink-0">
            <SidebarGroupLabel>{t('General')}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <ApSidebarItem
                  type="link"
                  to="/owner-dashboard"
                  label={t('Owner Dashboard')}
                  icon={SquareDashedBottomCodeIcon}
                />
                <ApSidebarItem
                  type="link"
                  to="/platform/users"
                  label={t('Users')}
                  icon={UsersIcon}
                />
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          <SidebarGroup className="cursor-default shrink-0">
            <SidebarSeparator className="mb-3" />
            <SidebarGroupLabel>{t('Setup')}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <ApSidebarItem
                  type="link"
                  to="/platform/setup/pieces"
                  label={t('Pieces')}
                  icon={PuzzleIcon}
                />
                <ApSidebarItem
                  type="link"
                  to="/platform/organizations"
                  label={t('Organizations')}
                  icon={Settings2Icon}
                />
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          <SidebarGroup className="cursor-default shrink-0">
            <SidebarSeparator className="mb-3" />
            <SidebarGroupLabel>{t('Infrastructure')}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <ApSidebarItem
                  type="link"
                  to="/platform/infrastructure/workers"
                  label={t('Workers')}
                  icon={ServerIcon}
                />
                <ApSidebarItem
                  type="link"
                  to="/platform/infrastructure/health"
                  label={t('Health')}
                  icon={FileHeartIcon}
                />
                <ApSidebarItem
                  type="link"
                  to="/platform/infrastructure/triggers"
                  label={t('Triggers')}
                  icon={MousePointerClickIcon}
                />
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </div>

      <SidebarFooter>
        <SidebarUser />
      </SidebarFooter>
    </Sidebar>
  );
}
