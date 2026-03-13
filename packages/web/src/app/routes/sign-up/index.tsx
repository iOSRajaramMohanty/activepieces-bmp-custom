import { Navigate, useSearchParams } from 'react-router-dom';

import { AuthFormTemplate } from '@/features/authentication';
import { formatUtils } from '@/lib/format-utils';

const SignUpPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email')?.trim() || '';

  // Sign-up is invitation-only: require valid email from invitation link
  if (!email || !formatUtils.emailRegex.test(email)) {
    return <Navigate to="/sign-in?message=invitation-required" replace />;
  }

  return (
    <div className="mx-auto flex h-screen flex-col items-center justify-center gap-2">
      <AuthFormTemplate form={'signup'} />
    </div>
  );
};

SignUpPage.displayName = 'SignUpPage';

export { SignUpPage };
