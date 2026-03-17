import { Suspense, useRef } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { useAuthorization } from '@/hooks/authorization-hooks';
import { userHooks } from '@/hooks/user-hooks';
import { authenticationSession } from '@/lib/authentication-session';
import { determineDefaultRoute } from '@/lib/route-utils';
import { getBmpDefaultRoute, isBmpEnabled } from '@/app/routes/bmp-routes';
import { LoadingScreen } from '@/components/custom/loading-screen';

function DefaultRouteContent() {
  const token = authenticationSession.getToken();
  const location = useLocation();
  const { checkAccess } = useAuthorization();
  const { data: currentUser } = userHooks.useCurrentUser();
  
  // Track navigation attempts to prevent infinite loops
  const navigationAttempts = useRef(0);
  const maxNavigationAttempts = 3;
  
  // Increment navigation counter on each render
  navigationAttempts.current += 1;
  
  // If we've tried too many times, redirect to sign-in to break the loop
  if (navigationAttempts.current > maxNavigationAttempts) {
    console.warn('[DefaultRoute] Too many navigation attempts, redirecting to sign-in');
    authenticationSession.clearSession();
    return <Navigate to="/sign-in" replace />;
  }
  
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
  
  // Check BMP routes first (when BMP is enabled and user has a BMP role)
  // Only SUPER_ADMIN and OWNER get BMP-specific routes
  if (currentUser) {
    const bmpRoute = getBmpDefaultRoute(currentUser.platformRole);
    if (bmpRoute) {
      return <Navigate to={bmpRoute} replace />;
    }
  }
  
  // Users with a project (ADMIN, MEMBER, OPERATOR, etc.) should go to flows/automations page
  const projectId = authenticationSession.getProjectId();
  if (projectId) {
    return <Navigate to={authenticationSession.appendProjectRoutePrefix('/flows')} replace />;
  }
  
  // Handle users without a projectId
  if (currentUser) {
    // SUPER_ADMIN and OWNER without project go to platform
    const platformOnlyRoles = ['SUPER_ADMIN', 'OWNER'];
    if (platformOnlyRoles.includes(currentUser.platformRole ?? '')) {
      return <Navigate to="/platform" replace />;
    }
    
    // ADMIN without project also goes to platform (to manage users, etc.)
    if (currentUser.platformRole === 'ADMIN') {
      return <Navigate to="/platform" replace />;
    }
  }
  
  // For BMP users without projectId, redirect to platform
  if (isBmpEnabled() && currentUser) {
    return <Navigate to="/platform" replace />;
  }
  
  // Fallback: Try to get a project-prefixed route, or go to platform
  const defaultRoute = determineDefaultRoute(checkAccess);
  if (!defaultRoute.startsWith('/projects/')) {
    return <Navigate to="/platform" replace />;
  }
  
  return <Navigate to={defaultRoute} replace />;
}

export const DefaultRoute = () => {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <DefaultRouteContent />
    </Suspense>
  );
};
