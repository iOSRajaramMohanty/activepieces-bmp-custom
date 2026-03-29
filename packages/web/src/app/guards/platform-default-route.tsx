import { PlatformRole } from '@activepieces/shared';
import { Navigate } from 'react-router-dom';

import { getBmpDefaultRoute } from '@/app/routes/bmp-routes';
import { userHooks } from '@/hooks/user-hooks';

export const PlatformDefaultRoute = () => {
  const { data: currentUser } = userHooks.useCurrentUser();
  const isSuperAdmin = currentUser?.platformRole === PlatformRole.SUPER_ADMIN;
  const isOwner = currentUser?.platformRole === PlatformRole.OWNER;
  const isAdmin = currentUser?.platformRole === PlatformRole.ADMIN;

  // Check BMP routes first (when BMP is enabled)
  const bmpRoute = getBmpDefaultRoute(currentUser?.platformRole);
  if (bmpRoute) {
    return <Navigate to={bmpRoute} replace />;
  }

  // Route based on user role (when BMP is disabled or role not matched):
  // - SUPER_ADMIN: Goes to super admin dashboard (only if BMP enabled above)
  // - OWNER (tenant): Goes to owner dashboard (only if BMP enabled above)
  // - ADMIN (sub-owner): Goes to /platform/users to manage their operators/members
  // - Others: Default to /platform/users
  let defaultRoute = '/platform/users';
  if (isSuperAdmin) {
    // Fallback if BMP is disabled - super admin still goes to platform users
    defaultRoute = '/platform/users';
  } else if (isOwner) {
    // Fallback if BMP is disabled - owner goes to platform users
    defaultRoute = '/platform/users';
  } else if (isAdmin) {
    defaultRoute = '/platform/users';
  }

  return <Navigate to={defaultRoute} replace />;
};
