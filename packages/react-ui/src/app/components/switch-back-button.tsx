import { t } from 'i18next';
import { ArrowLeft } from 'lucide-react';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { authenticationSession } from '@/lib/authentication-session';
import { userHooks } from '@/hooks/user-hooks';
import { PlatformRole } from '@activepieces/shared';

export function SwitchBackButton() {
  const { data: currentUser } = userHooks.useCurrentUser();
  
  // Validate and clean switch stack on mount/update
  useEffect(() => {
    if (currentUser) {
      authenticationSession.validateAndCleanSwitchStack(
        currentUser.platformRole,
        authenticationSession.getCurrentUserId()
      );
    }
  }, [currentUser]);
  
  const isSwitchedAccount = authenticationSession.isSwitchedAccount();

  // Only show switch back button if:
  // 1. User is actually in a switched account state (has switch stack)
  // 2. Current user role is OWNER or ADMIN (these are the only roles that can be switched to)
  // Operators and Members should never see this button
  if (!isSwitchedAccount) {
    return null;
  }

  // Hide for operators and members - they can't be in a switched account state
  if (currentUser?.platformRole === PlatformRole.OPERATOR || 
      currentUser?.platformRole === PlatformRole.MEMBER) {
    return null;
  }

  // Additional validation: Check if switch stack is valid
  // If owner logs in directly (not switched), the stack should be empty
  const stack = authenticationSession.getSwitchStack();
  if (stack.length > 0 && currentUser) {
    const lastSwitch = stack[stack.length - 1];
    // If current user ID matches the last switch's userId, we're back to original account
    // This means the stack is stale
    if (lastSwitch.userId === currentUser.id) {
      return null;
    }
  }

  const buttonText = authenticationSession.getSwitchBackText();

  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-2"
      onClick={() => {
        authenticationSession.restorePreviousSession();
      }}
    >
      <ArrowLeft className="size-4" />
      {buttonText}
    </Button>
  );
}
