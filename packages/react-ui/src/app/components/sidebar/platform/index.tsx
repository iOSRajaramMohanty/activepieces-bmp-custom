import { t } from 'i18next';
import {
  ArrowLeft,
  Server,
  Users,
  Puzzle,
  FileHeart,
  MousePointerClick,
  Shield,
} from 'lucide-react';
import { ComponentType, SVGProps } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { buttonVariants } from '@/components/ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarHeader,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenuButton,
  SidebarGroupLabel,
  SidebarSeparator,
} from '@/components/ui/sidebar-shadcn';
import { flagsHooks } from '@/hooks/flags-hooks';
import { platformHooks } from '@/hooks/platform-hooks';
import { userHooks } from '@/hooks/user-hooks';
import { cn } from '@/lib/utils';
import { PlatformRole } from '@activepieces/shared';

import { ApSidebarItem } from '../ap-sidebar-item';
import { SidebarUser } from '../sidebar-user';

export function PlatformSidebar() {
  const navigate = useNavigate();
  const { platform } = platformHooks.useCurrentPlatform();
  const branding = flagsHooks.useWebsiteBranding();
  const { data: currentUser } = userHooks.useCurrentUser();
  const isSuperAdmin = currentUser?.platformRole === PlatformRole.SUPER_ADMIN;
  
  // Determine platform admin default route based on user role
  const platformAdminDefaultRoute = isSuperAdmin ? '/super-admin' : '/platform/users';

  const setupItems = [
    {
      to: '/platform/setup/pieces',
      label: t('Pieces'),
      icon: Puzzle,
    },
  ];

  const generalItems: {
    to: string;
    label: string;
    icon?: ComponentType<SVGProps<SVGSVGElement>>;
    locked?: boolean;
  }[] = [];

  // Add Super Admin Dashboard link only for super admins
  if (isSuperAdmin) {
    generalItems.push({
      to: '/super-admin',
      label: t('Super Admin Dashboard'),
      icon: Shield,
    });
  } else {
    // Show Users option only for non-super admin platform admins
    generalItems.push({
      to: '/platform/users',
      label: t('Users'),
      icon: Users,
    });
  }

  const groups: {
    label: string;
    items: {
      to: string;
      label: string;
      icon?: ComponentType<SVGProps<SVGSVGElement>>;
      locked?: boolean;
    }[];
  }[] = [
    {
      label: t('General'),
      items: generalItems,
    },
    {
      label: t('Setup'),
      items: setupItems,
    },
    {
      label: t('Infrastructure'),
      items: [
        {
          to: '/platform/infrastructure/workers',
          label: t('Workers'),
          icon: Server,
        },
        {
          to: '/platform/infrastructure/health',
          label: t('Health'),
          icon: FileHeart,
        },
        {
          to: '/platform/infrastructure/triggers',
          label: t('Triggers'),
          icon: MousePointerClick,
        },
      ],
    },
  ];

  return (
    <Sidebar className="p-1" variant="inset">
      <SidebarHeader className="px-3">
        <div className="w-full pb-2 flex items-center gap-2">
          <Link
            to={platformAdminDefaultRoute}
            className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }))}
          >
            <img
              src={branding.logos.logoIconUrl}
              alt={t('home')}
              className="h-5 w-5 object-contain"
            />
          </Link>
          <h1 className="truncate font-semibold">{branding.websiteName}</h1>
        </div>
      </SidebarHeader>
      <div className="flex-1 overflow-y-auto scrollbar-hover">
        <SidebarContent className="px-1 gap-0">
          {/* Hide "Exit platform admin" for Super Admins and Owners - they don't have personal projects */}
          {currentUser?.platformRole !== PlatformRole.SUPER_ADMIN && currentUser?.platformRole !== PlatformRole.OWNER && (
            <>
              <SidebarGroup className="cursor-default shrink-0">
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuButton
                      onClick={() => {
                        navigate('/', { replace: true });
                      }}
                      className="py-5 px-2"
                    >
                      <ArrowLeft />
                      {t('Exit platform admin')}
                    </SidebarMenuButton>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
              <SidebarSeparator className="mb-3" />
            </>
          )}
          {groups.map((group, idx) => (
            <SidebarGroup key={group.label} className="cursor-default shrink-0">
              {idx > 0 && <SidebarSeparator className="mb-3" />}
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((item) => (
                    <ApSidebarItem
                      type="link"
                      key={item.label}
                      to={item.to}
                      label={item.label}
                      icon={item.icon}
                      locked={item.locked}
                    />
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>
      </div>

      <SidebarFooter className="px-3">
        <SidebarUser />
      </SidebarFooter>
    </Sidebar>
  );
}
