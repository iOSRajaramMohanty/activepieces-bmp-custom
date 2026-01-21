import { Navigate } from 'react-router-dom';

import { userHooks } from '@/hooks/user-hooks';
import { PlatformRole } from '@activepieces/shared';

export const PlatformDefaultRoute = () => {
  const { data: currentUser } = userHooks.useCurrentUser();
  const isSuperAdmin = currentUser?.platformRole === PlatformRole.SUPER_ADMIN;
  const isOwner = currentUser?.platformRole === PlatformRole.OWNER;
  const isAdmin = currentUser?.platformRole === PlatformRole.ADMIN;
  
  // Route based on user role:
  // - SUPER_ADMIN: Goes to super admin dashboard
  // - OWNER (tenant): Goes to /platform/projects to view all admins' projects
  // - ADMIN (sub-owner): Goes to /platform/users to manage their operators/members
  // - Others: Default to /platform/users
  let defaultRoute = '/platform/users';
  if (isSuperAdmin) {
    defaultRoute = '/super-admin';
  } else if (isOwner) {
    defaultRoute = '/platform/projects';
  } else if (isAdmin) {
    defaultRoute = '/platform/users';
  }
  
  return <Navigate to={defaultRoute} replace />;
};
