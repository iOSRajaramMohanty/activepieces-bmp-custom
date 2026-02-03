import { Navigate, useSearchParams } from 'react-router-dom';

import { FullLogo } from '@/components/ui/full-logo';
import { AuthFormTemplate } from '@/features/authentication/components/auth-form-template';
import { formatUtils } from '@/lib/utils';

const SignUpPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email')?.trim() || '';

  // Sign-up is invitation-only: require valid email from invitation link
  if (!email || !formatUtils.emailRegex.test(email)) {
    return <Navigate to="/sign-in?message=invitation-required" replace />;
  }

  return (
    <div className="mx-auto flex h-screen flex-col items-center justify-center gap-2">
      <FullLogo />
      <AuthFormTemplate form={'signup'} />
    </div>
  );
};

SignUpPage.displayName = 'SignUpPage';

export { SignUpPage };
