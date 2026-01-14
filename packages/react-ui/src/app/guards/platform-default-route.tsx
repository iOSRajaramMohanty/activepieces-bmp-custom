import { Navigate } from 'react-router-dom';

import { userHooks } from '@/hooks/user-hooks';
import { PlatformRole } from '@activepieces/shared';

export const PlatformDefaultRoute = () => {
  const { data: currentUser } = userHooks.useCurrentUser();
  const isSuperAdmin = currentUser?.platformRole === PlatformRole.SUPER_ADMIN;
  
  // Super admin goes to super admin dashboard, tenant admin goes to users
  const defaultRoute = isSuperAdmin ? '/super-admin' : '/platform/users';
  
  return <Navigate to={defaultRoute} replace />;
};
