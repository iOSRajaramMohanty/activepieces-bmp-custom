import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

const ChatbotInAppContext = createContext<ChatbotInAppContextValue | null>(null);

export function ChatbotInAppProvider({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpenState] = useState(false);
  const setDrawerOpen = useCallback((open: boolean) => {
    setDrawerOpenState(open);
  }, []);
  const value = useMemo(
    () => ({
      drawerOpen,
      setDrawerOpen,
    }),
    [drawerOpen, setDrawerOpen],
  );
  return (
    <ChatbotInAppContext.Provider value={value}>
      {children}
    </ChatbotInAppContext.Provider>
  );
}

export function useChatbotInApp(): ChatbotInAppContextValue {
  const ctx = useContext(ChatbotInAppContext);
  if (ctx === null) {
    throw new Error('useChatbotInApp must be used within ChatbotInAppProvider');
  }
  return ctx;
}

type ChatbotInAppContextValue = {
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
};

/** Matches `DrawerContent` width on `md+`; shifts main shell so tables/pagination are not under the panel. */
export const IN_APP_CHATBOT_DRAWER_WIDTH_CLASS = 'md:pr-[420px]';
