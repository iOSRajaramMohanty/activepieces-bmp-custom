import dayjs from 'dayjs';
import { jwtDecode } from 'jwt-decode';
import { t } from 'i18next';

import {
  AuthenticationResponse,
  isNil,
  UserPrincipal,
} from '@activepieces/shared';

import { ApStorage } from './ap-browser-storage';
import { authenticationApi } from './authentication-api';
const tokenKey = 'token';
const projectIdKey = 'projectId';
const switchStackKey = 'switchStack'; // Stack of { token, projectId, switchType, userId, platformId }
export const authenticationSession = {
  setProjectId(projectId: string) {
    ApStorage.getInstance().setItem(projectIdKey, projectId);
  },
  saveResponse(response: AuthenticationResponse, isEmbedding: boolean) {
    if (isEmbedding) {
      ApStorage.setInstanceToSessionStorage();
    }
    ApStorage.getInstance().setItem(tokenKey, response.token);
    // Super Admins and Owners don't have projectId
    if (response.projectId) {
      ApStorage.getInstance().setItem(projectIdKey, response.projectId);
    } else {
      ApStorage.getInstance().removeItem(projectIdKey);
    }
    // Note: We don't clear switch stack here because saveResponse is also called
    // during account switching. The switch stack should only be cleared on logout
    // or when explicitly invalidated.
    window.dispatchEvent(new Event('storage'));
  },
  isJwtExpired(token: string): boolean {
    if (!token) {
      return true;
    }
    try {
      const decoded = jwtDecode(token);
      if (decoded && decoded.exp && dayjs().isAfter(dayjs.unix(decoded.exp))) {
        return true;
      }
      return false;
    } catch (e) {
      return true;
    }
  },
  getToken(): string | null {
    return ApStorage.getInstance().getItem(tokenKey) ?? null;
  },

  getProjectId(): string | null {
    const token = this.getToken();
    if (isNil(token)) {
      return null;
    }
    const projectId = ApStorage.getInstance().getItem(projectIdKey);
    if (!isNil(projectId)) {
      return projectId;
    }
    const decodedJwt = getDecodedJwt(token);
    if ('projectId' in decodedJwt && typeof decodedJwt.projectId === 'string') {
      return decodedJwt.projectId;
    }
    return null;
  },
  getCurrentUserId(): string | null {
    const token = this.getToken();
    if (isNil(token)) {
      return null;
    }
    const decodedJwt = getDecodedJwt(token);
    return decodedJwt.id;
  },
  appendProjectRoutePrefix(path: string): string {
    const projectId = this.getProjectId();

    if (isNil(projectId)) {
      return path;
    }
    return `/projects/${projectId}${path.startsWith('/') ? path : `/${path}`}`;
  },
  getPlatformId(): string | null {
    const token = this.getToken();
    if (isNil(token)) {
      return null;
    }
    const decodedJwt = getDecodedJwt(token);
    return decodedJwt.platform.id;
  },
  async switchToPlatform(platformId: string) {
    if (authenticationSession.getPlatformId() === platformId) {
      return;
    }
    const result = await authenticationApi.switchPlatform({
      platformId,
    });
    ApStorage.getInstance().setItem(tokenKey, result.token);
    // Super Admins and Owners don't have projectId
    if (result.projectId) {
      ApStorage.getInstance().setItem(projectIdKey, result.projectId);
    } else {
      ApStorage.getInstance().removeItem(projectIdKey);
    }
    window.location.href = '/';
  },
  switchToProject(projectId: string) {
    if (authenticationSession.getProjectId() === projectId) {
      return;
    }
    ApStorage.getInstance().setItem(projectIdKey, projectId);
    window.dispatchEvent(new Event('storage'));
  },
  isLoggedIn(): boolean {
    const token = this.getToken();
    if (isNil(token)) {
      return false;
    }
    return !this.isJwtExpired(token);
  },
  clearSession() {
    ApStorage.getInstance().removeItem(projectIdKey);
    ApStorage.getInstance().removeItem(tokenKey);
    this.clearSwitchStack(); // Clear switch stack on logout
  },
  logOut() {
    this.clearSession();
    window.location.href = '/sign-in';
  },

  // Account switching methods - stack-based for nested switching
  pushSwitchSession(params: {
    token: string;
    projectId: string | null;
    switchType: 'SUPER_ADMIN_TO_OWNER' | 'OWNER_TO_ADMIN';
    userId: string;
    platformId: string | null;
  }) {
    const stack = this.getSwitchStack();
    const currentToken = this.getToken();
    const currentProjectId = this.getProjectId();
    const currentUserId = this.getCurrentUserId();
    const currentPlatformId = this.getPlatformId();
    
    // Push current session to stack
    if (currentToken && currentUserId) {
      stack.push({
        token: currentToken,
        projectId: currentProjectId,
        switchType: params.switchType,
        userId: currentUserId,
        platformId: currentPlatformId,
      });
    }
    
    ApStorage.getInstance().setItem(switchStackKey, JSON.stringify(stack));
  },

  getSwitchStack(): Array<{
    token: string;
    projectId: string | null;
    switchType: 'SUPER_ADMIN_TO_OWNER' | 'OWNER_TO_ADMIN';
    userId: string;
    platformId: string | null;
  }> {
    const stackJson = ApStorage.getInstance().getItem(switchStackKey);
    if (!stackJson) {
      return [];
    }
    try {
      return JSON.parse(stackJson);
    } catch {
      return [];
    }
  },

  getCurrentSwitchType(): 'SUPER_ADMIN_TO_OWNER' | 'OWNER_TO_ADMIN' | null {
    const stack = this.getSwitchStack();
    if (stack.length === 0) {
      return null;
    }
    return stack[stack.length - 1].switchType;
  },

  getSwitchBackText(): string {
    const stack = this.getSwitchStack();
    if (stack.length === 0) {
      return t('Switch Back');
    }
    
    // Get the last switch type (most recent switch)
    const lastSwitch = stack[stack.length - 1];
    
    if (lastSwitch.switchType === 'SUPER_ADMIN_TO_OWNER') {
      // We're in Owner account, going back to Super Admin
      return t('Back to Super Admin');
    } else if (lastSwitch.switchType === 'OWNER_TO_ADMIN') {
      // We're in Admin account
      if (stack.length > 1) {
        // Nested: Super Admin -> Owner -> Admin, so going back to Owner
        return t('Back to Owner');
      } else {
        // Direct: Owner -> Admin, so going back to Owner
        return t('Back to Owner Account');
      }
    }
    
    return t('Switch Back');
  },

  clearSwitchStack() {
    ApStorage.getInstance().removeItem(switchStackKey);
  },

  popSwitchSession(): {
    token: string;
    projectId: string | null;
    switchType: 'SUPER_ADMIN_TO_OWNER' | 'OWNER_TO_ADMIN';
    userId: string;
    platformId: string | null;
  } | null {
    const stack = this.getSwitchStack();
    if (stack.length === 0) {
      return null;
    }
    
    const previousSession = stack.pop()!;
    ApStorage.getInstance().setItem(switchStackKey, JSON.stringify(stack));
    return previousSession;
  },

  restorePreviousSession() {
    const previousSession = this.popSwitchSession();
    
    if (!previousSession) {
      // No more switches, clear everything
      this.clearSwitchStack();
      return;
    }
    
    // Restore previous session
    ApStorage.getInstance().setItem(tokenKey, previousSession.token);
    if (previousSession.projectId) {
      ApStorage.getInstance().setItem(projectIdKey, previousSession.projectId);
    } else {
      ApStorage.getInstance().removeItem(projectIdKey);
    }
    
    window.location.href = '/';
  },

  isSwitchedAccount(): boolean {
    const stack = this.getSwitchStack();
    if (stack.length === 0) {
      return false;
    }
    
    // Validate that the switch stack is valid
    // If the current user ID matches any entry in the stack, it means we're back to original
    // and the stack is stale
    const currentUserId = this.getCurrentUserId();
    if (currentUserId) {
      // Check if current user matches any entry in the stack (means we're back to original)
      const isBackToOriginal = stack.some(entry => entry.userId === currentUserId);
      if (isBackToOriginal) {
        // We're back to original account, clear stale stack
        this.clearSwitchStack();
        return false;
      }
    }
    
    return true;
  },

  validateAndCleanSwitchStack(currentUserRole: string | undefined, currentUserId: string | null): void {
    const stack = this.getSwitchStack();
    if (stack.length === 0) {
      return;
    }
    
    // If current user is Operator or Member, clear the stack (they can't be switched)
    if (currentUserRole === 'OPERATOR' || currentUserRole === 'MEMBER') {
      this.clearSwitchStack();
      return;
    }
    
    // If current user ID matches any entry in the stack, we're back to original account
    // This means the stack is stale and should be cleared
    if (currentUserId) {
      const isBackToOriginal = stack.some(entry => entry.userId === currentUserId);
      if (isBackToOriginal) {
        this.clearSwitchStack();
        return;
      }
    }
  },
};

function getDecodedJwt(token: string): UserPrincipal {
  return jwtDecode<UserPrincipal>(token);
}
