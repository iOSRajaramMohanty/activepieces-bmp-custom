import { useEffect } from 'react';

import { flagsHooks } from '@/hooks/flags-hooks';

// Check if we're in SDK mode - don't modify host app's title
const isSDKMode = typeof window !== 'undefined' && !!(window as any).__AP_SDK_CONFIG__;

type PageTitleProps = {
  title: string;
  children: React.ReactNode;
};

const PageTitle = ({ title, children }: PageTitleProps) => {
  const websiteBranding = flagsHooks.useWebsiteBranding();

  useEffect(() => {
    // Don't modify document title in SDK mode - let host app control it
    if (!isSDKMode) {
      document.title = `${title} | ${websiteBranding.websiteName}`;
    }
  }, [title, websiteBranding.websiteName]);

  return children;
};

PageTitle.displayName = 'PageTitle';

export { PageTitle };
