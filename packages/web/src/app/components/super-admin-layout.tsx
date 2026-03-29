import { ApEdition, ApFlagId, PlatformRole } from '@activepieces/shared';
import React, { Suspense } from 'react';
import { Navigate } from 'react-router-dom';

import { LoadingScreen } from '@/components/custom/loading-screen';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar-shadcn';
import { PurchaseExtraFlowsDialog } from '@/features/billing';
import { flagsHooks } from '@/hooks/flags-hooks';
import { userHooks } from '@/hooks/user-hooks';

import { AllowOnlyLoggedInUserOnlyGuard } from './allow-logged-in-user-only-guard';
import { GlobalSearchProvider } from './global-search/global-search-context';
import { SuperAdminSidebar } from './sidebar/super-admin';

function SuperAdminLayoutContent({ children }: { children: React.ReactNode }) {
  const { data: edition } = flagsHooks.useFlag<ApEdition>(ApFlagId.EDITION);
  const { data: currentUser } = userHooks.useCurrentUser();

  const showPlatformAdminDashboard =
    currentUser &&
    (currentUser.platformRole === PlatformRole.ADMIN ||
      currentUser.platformRole === PlatformRole.SUPER_ADMIN ||
      currentUser.platformRole === PlatformRole.OWNER);

  // If currentUser is null but we're in this layout, show loading
  // This prevents redirect loops when user data is still being fetched
  if (!currentUser) {
    return <LoadingScreen />;
  }

  // If user doesn't have admin privileges, redirect to platform (not root to avoid loops)
  if (!showPlatformAdminDashboard) {
    return <Navigate to="/platform" replace />;
  }

  return (
    <AllowOnlyLoggedInUserOnlyGuard>
      <GlobalSearchProvider>
        <SidebarProvider open={true}>
          <SuperAdminSidebar />
          <SidebarInset className="flex flex-col h-full overflow-hidden bg-sidebar">
            <div className="flex-1 flex flex-col p-1.5 overflow-hidden">
              <div className="flex flex-col h-full bg-background rounded-xl shadow-[2px_0px_4px_-2px_rgba(0,0,0,0.05),0px_2px_4px_-2px_rgba(0,0,0,0.05)] border overflow-hidden">
                <div className="flex flex-col flex-1 overflow-auto scrollbar-none px-2 pb-2">
                  {children}
                </div>
              </div>
            </div>
          </SidebarInset>
        </SidebarProvider>
        {edition === ApEdition.CLOUD && <PurchaseExtraFlowsDialog />}
      </GlobalSearchProvider>
    </AllowOnlyLoggedInUserOnlyGuard>
  );
}

export function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <SuperAdminLayoutContent>{children}</SuperAdminLayoutContent>
    </Suspense>
  );
}
