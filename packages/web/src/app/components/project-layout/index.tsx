import { ApEdition, ApFlagId, isNil } from '@activepieces/shared';
import React, { ComponentType } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useLocation } from 'react-router-dom';

import { ChartLineIcon } from '@/components/icons/chart-line';
import { CompassIcon } from '@/components/icons/compass';
import { TrophyIcon } from '@/components/icons/trophy';
import { useEmbedding } from '@/components/providers/embed-provider';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar-shadcn';
import { PurchaseExtraFlowsDialog } from '@/features/billing';
import {
  ChatbotInAppProvider,
  IN_APP_CHATBOT_DRAWER_WIDTH_CLASS,
  useChatbotInApp,
} from '@/features/chatbots/chatbot-in-app-context';
import { InAppChatbot } from '@/features/chatbots/components/in-app-chatbot';
import { projectHooks } from '@/features/projects';
import { flagsHooks } from '@/hooks/flags-hooks';
import { cn } from '@/lib/utils';

import { cn } from '@/lib/utils';
import { authenticationSession } from '../../../lib/authentication-session';
import {
  GlobalSearchProvider,
  useGlobalSearch,
} from '../global-search/global-search-context';
import { ProjectDashboardSidebar } from '../sidebar/dashboard';

import { ProjectDashboardLayoutHeader } from './project-dashboard-layout-header';

export type ProjectDashboardLayoutHeaderTab = {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string; size?: number }>;
  hasPermission: boolean;
  show: boolean;
  beta?: boolean;
};

const ProjectChangedRedirector = ({
  currentProjectId,
  children,
}: {
  currentProjectId: string;
  children: React.ReactNode;
}) => {
  projectHooks.useReloadPageIfProjectIdChanged(currentProjectId);
  return children;
};

export function ProjectDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: edition } = flagsHooks.useFlag<ApEdition>(ApFlagId.EDITION);
  const currentProjectId = authenticationSession.getProjectId();
  const { t } = useTranslation();
  const location = useLocation();
  const isPlatformPage = location.pathname.includes('/platform/');
  const isEmbedded = useEmbedding().embedState.isEmbedded;
  if (isNil(currentProjectId) || currentProjectId === '') {
    return <Navigate to="/sign-in" replace />;
  }

  const itemsWithoutHeader: ProjectDashboardLayoutHeaderTab[] = [
    {
      to: '/templates',
      label: t('Explore'),
      show: !isEmbedded,
      icon: CompassIcon,
      hasPermission: true,
    },
    {
      to: '/impact',
      label: t('Impact'),
      show: !isEmbedded,
      icon: ChartLineIcon,
      hasPermission: true,
    },
    {
      to: '/leaderboard',
      label: t('Leaderboard'),
      show: !isEmbedded,
      icon: TrophyIcon,
      hasPermission: true,
    },
    {
      to: '/chat-with-ai',
      label: t('Chat with AI'),
      show: !isEmbedded,
      icon: CompassIcon,
      hasPermission: true,
    },
  ];

  const hideHeader =
    itemsWithoutHeader.some((item) => location.pathname.includes(item.to)) ||
    isPlatformPage;

  return (
    <ProjectChangedRedirector currentProjectId={currentProjectId}>
      <GlobalSearchProvider>
        <ChatbotInAppProvider>
          <ProjectDashboardLayoutInner
            hideHeader={hideHeader}
            isEmbedded={isEmbedded}
            currentProjectId={currentProjectId}
          >
            {children}
          </ProjectDashboardLayoutInner>
        </ChatbotInAppProvider>
        {edition === ApEdition.CLOUD && <PurchaseExtraFlowsDialog />}
      </GlobalSearchProvider>
    </ProjectChangedRedirector>
  );
}

function ProjectDashboardLayoutInner({
  hideHeader,
  isEmbedded,
  currentProjectId,
  children,
}: {
  hideHeader: boolean;
  isEmbedded: boolean;
  currentProjectId: string;
  children: React.ReactNode;
}) {
  const { open: searchOpen } = useGlobalSearch();
  const { drawerOpen } = useChatbotInApp();

  return (
    <SidebarProvider hoverMode={!searchOpen}>
      {!isEmbedded && <ProjectDashboardSidebar />}
      <SidebarInset className="flex flex-col h-full overflow-hidden bg-sidebar">
        <div
          className={cn(
            'flex-1 min-h-0 flex flex-col overflow-hidden p-2 pb-3 pt-3 transition-[padding] duration-200 ease-out',
            drawerOpen && IN_APP_CHATBOT_DRAWER_WIDTH_CLASS,
          )}
        >
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden bg-background rounded-xl shadow-[2px_0px_4px_-2px_rgba(0,0,0,0.05),0px_2px_4px_-2px_rgba(0,0,0,0.05)] border">
            {!hideHeader && (
              <ProjectDashboardLayoutHeader key={currentProjectId} />
            )}
            <div className="flex-1 min-h-0 overflow-auto scrollbar-none px-4">
              {' '}
              {children}{' '}
            </div>
          </div>
          <InAppChatbot />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
