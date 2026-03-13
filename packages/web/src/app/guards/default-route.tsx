import { Navigate, useLocation } from 'react-router-dom';

import { useAuthorization } from '@/hooks/authorization-hooks';
import { userHooks } from '@/hooks/user-hooks';
import { authenticationSession } from '@/lib/authentication-session';
import { determineDefaultRoute } from '@/lib/route-utils';
import { PlatformRole } from '@activepieces/shared';

export const DefaultRoute = () => {
  const token = authenticationSession.getToken();
  const location = useLocation();
  const { checkAccess } = useAuthorization();
  const { data: currentUser } = userHooks.useCurrentUser();
  
  if (!token) {
    const searchParams = new URLSearchParams();
    searchParams.set('from', location.pathname + location.search);
    return (
      <Navigate
        to={`/sign-in?${searchParams.toString()}`}
        replace={true}
      ></Navigate>
    );
  }
  
  // Super Admins: redirect to Super Admin Dashboard
  if (currentUser?.platformRole === PlatformRole.SUPER_ADMIN) {
    return <Navigate to="/super-admin" replace />;
  }
  
  // Owners: redirect to Owner Dashboard
  if (currentUser?.platformRole === PlatformRole.OWNER) {
    return <Navigate to="/owner-dashboard" replace />;
  }
  
  // Regular users with project: redirect to flows page
  const projectId = authenticationSession.getProjectId();
  if (projectId) {
    return <Navigate to={authenticationSession.appendProjectRoutePrefix('/flows')} replace />;
  }
  
  // Fallback: if no projectId, try to determine default route
  // This shouldn't happen for regular users, but handle it gracefully
  return <Navigate to={determineDefaultRoute(checkAccess)} replace></Navigate>;
};
