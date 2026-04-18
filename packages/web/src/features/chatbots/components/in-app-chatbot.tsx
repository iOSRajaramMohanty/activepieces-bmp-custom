import { Permission, isNil } from '@activepieces/shared';
import { t } from 'i18next';
import { Loader2, X } from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import { BotIcon } from '@/components/icons/bot';
import { SendIcon } from '@/components/icons/send';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { internalErrorToast } from '@/components/ui/sonner';

import {
  chatbotMessageApi,
  type ChatbotMessage,
  type ChatbotMessageResponse,
  type ChatbotMode,
} from '../api/chatbot-message-api';
import { useChatbotInApp } from '../chatbot-in-app-context';

import { useAuthorization } from '@/hooks/authorization-hooks';
import { api } from '@/lib/api';
import { authenticationSession } from '@/lib/authentication-session';
import { cn } from '@/lib/utils';

const STORAGE_KEYS = {
  open: 'ap_in_app_chatbot_open',
  sessionPrefix: 'ap_in_app_chatbot_session',
  modePrefix: 'ap_in_app_chatbot_mode',
  flowIdPrefix: 'ap_in_app_chatbot_flow_id',
} as const;

/** Vaul adds a wide ::after on the drawer for background scaling; it is not needed for the right panel. */
const VAUL_RIGHT_DRAWER_HIDE_AFTER_CSS =
  '[data-slot="drawer-content"][data-vaul-drawer-direction="right"]::after{display:none!important;}';

function storageKeyForMode(): string {
  const projectId = authenticationSession.getProjectId() ?? 'unknown';
  return `${STORAGE_KEYS.modePrefix}:${projectId}`;
}

function storageKeyForSessionByMode(mode: ChatbotMode): string {
  const projectId = authenticationSession.getProjectId() ?? 'unknown';
  return `${STORAGE_KEYS.sessionPrefix}:${projectId}:${mode}`;
}

function getStoredChatbotMode(): ChatbotMode {
  try {
    const raw = window.localStorage.getItem(storageKeyForMode());
    return raw === 'agent' ? 'agent' : 'builder';
  } catch {
    return 'builder';
  }
}

function readSessionIdForMode(mode: ChatbotMode): string | undefined {
  try {
    const scoped = window.localStorage.getItem(
      storageKeyForSessionByMode(mode),
    );
    if (scoped) {
      return scoped;
    }
    const legacyKey = `${STORAGE_KEYS.sessionPrefix}:${
      authenticationSession.getProjectId() ?? 'unknown'
    }`;
    const legacyId = window.localStorage.getItem(legacyKey);
    if (isNil(legacyId) || legacyId.length === 0) {
      return undefined;
    }
    // Old builds used one session id per project; always preserve it under builder before dropping the legacy key.
    window.localStorage.setItem(
      storageKeyForSessionByMode('builder'),
      legacyId,
    );
    window.localStorage.removeItem(legacyKey);
    if (mode === 'builder') {
      return legacyId;
    }
    return undefined;
  } catch {
    return undefined;
  }
}

function storageKeyForFlowId(): string {
  const projectId = authenticationSession.getProjectId() ?? 'unknown';
  return `${STORAGE_KEYS.flowIdPrefix}:${projectId}`;
}

export function InAppChatbot() {
  const projectId = authenticationSession.getProjectId();
  const token = authenticationSession.getToken();
  const { checkAccess } = useAuthorization();

  const canRead = checkAccess(Permission.READ_FLOW) === true;
  const enabled = !isNil(projectId) && !isNil(token) && canRead;
  const { setDrawerOpen } = useChatbotInApp();

  const [open, setOpen] = useState<boolean>(() => {
    try {
      return window.localStorage.getItem(STORAGE_KEYS.open) === '1';
    } catch {
      return false;
    }
  });
  const [mode, setMode] = useState<ChatbotMode>(() => getStoredChatbotMode());
  const [flowId, setFlowId] = useState<string>(() => {
    try {
      return window.localStorage.getItem(storageKeyForFlowId()) ?? '';
    } catch {
      return '';
    }
  });
  const [sessionId, setSessionId] = useState<string | undefined>(() =>
    readSessionIdForMode(getStoredChatbotMode()),
  );
  const [messages, setMessages] = useState<ChatbotMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!enabled) {
      setOpen(false);
      return;
    }
  }, [enabled]);

  useEffect(() => {
    setDrawerOpen(open);
  }, [open, setDrawerOpen]);

  useEffect(() => {
    if (!enabled) {
      setDrawerOpen(false);
    }
  }, [enabled, setDrawerOpen]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.open, open ? '1' : '0');
    } catch {
      // ignore
    }
  }, [open]);

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKeyForMode(), mode);
    } catch {
      // ignore
    }
  }, [mode]);

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKeyForFlowId(), flowId);
    } catch {
      // ignore
    }
  }, [flowId]);

  useEffect(() => {
    try {
      if (sessionId) {
        window.localStorage.setItem(
          storageKeyForSessionByMode(mode),
          sessionId,
        );
      }
    } catch {
      // ignore
    }
  }, [sessionId, mode]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, open, isSending, isLoadingHistory]);

  useEffect(() => {
    if (!enabled || isNil(projectId) || !sessionId || !open) {
      setIsLoadingHistory(false);
      return;
    }
    let cancelled = false;
    setIsLoadingHistory(true);
    void chatbotMessageApi
      .getSession(projectId, { sessionId, mode })
      .then((data) => {
        if (cancelled) {
          return;
        }
        setMessages(data.messages);
        if (!isNil(data.flowId)) {
          setFlowId(data.flowId);
        }
        setIsLoadingHistory(false);
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }
        if (api.isError(error) && error.response?.status === 404) {
          try {
            window.localStorage.removeItem(storageKeyForSessionByMode(mode));
          } catch {
            // ignore
          }
          setSessionId(undefined);
          setMessages([]);
        }
        setIsLoadingHistory(false);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, projectId, sessionId, mode, open]);

  const panelTitle = useMemo(() => {
    return mode === 'builder'
      ? t('ChatbotInAppBuilderTitle')
      : t('ChatbotInAppAgentTitle');
  }, [mode]);

  if (!enabled) {
    return null;
  }

  return (
    <>
      {!open ? (
        <div className="fixed bottom-6 right-6 z-50 pointer-events-none">
          <div className="pointer-events-auto">
            <Button
              type="button"
              variant="default"
              size="icon-lg"
              className="!size-14 rounded-full shadow-lg [&_svg]:!size-10"
              onClick={() => setOpen(true)}
            >
              <BotIcon size={40} />
            </Button>
          </div>
        </div>
      ) : null}

      <Drawer open={open} onOpenChange={setOpen} direction="right">
        <DrawerContent
          data-ap-in-app-chatbot-drawer=""
          className={cn(
            'data-[vaul-drawer-direction=right]:z-[60]',
            'data-[vaul-drawer-direction=right]:w-[420px] data-[vaul-drawer-direction=right]:max-w-[95vw]',
            'data-[vaul-drawer-direction=right]:border-l',
            'flex h-full max-h-[100dvh] min-h-0 flex-col overflow-hidden bg-background',
          )}
          fullscreen={false}
        >
          <style>{VAUL_RIGHT_DRAWER_HIDE_AFTER_CSS}</style>
          <DrawerHeader className="shrink-0 border-b px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <BotIcon className="shrink-0" size={16} />
                <DrawerTitle className="truncate text-sm font-semibold leading-tight">
                  {panelTitle}
                </DrawerTitle>
              </div>
              <div className="relative z-10 flex shrink-0 items-center gap-2">
                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" variant="outline" size="xs">
                      {mode === 'builder'
                        ? t('ChatbotInAppModeBuilder')
                        : t('ChatbotInAppModeAgent')}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="z-[100]"
                    collisionPadding={12}
                    data-ap-chatbot-mode-menu=""
                  >
                    <DropdownMenuItem
                      onSelect={() => {
                        setMode('builder');
                        setSessionId(readSessionIdForMode('builder'));
                        setMessages([]);
                      }}
                    >
                      {t('ChatbotInAppModeBuilder')}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => {
                        setMode('agent');
                        setSessionId(readSessionIdForMode('agent'));
                        setMessages([]);
                      }}
                    >
                      {t('ChatbotInAppModeAgent')}
                    </DropdownMenuItem>
                    <Separator className="my-1" />
                    <DropdownMenuItem
                      variant="destructive"
                      onSelect={() => {
                        try {
                          window.localStorage.removeItem(
                            storageKeyForSessionByMode('builder'),
                          );
                          window.localStorage.removeItem(
                            storageKeyForSessionByMode('agent'),
                          );
                        } catch {
                          // ignore
                        }
                        setSessionId(undefined);
                        setMessages([]);
                        toast.success(t('ChatbotInAppCleared'));
                      }}
                    >
                      {t('Clear')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <DrawerClose asChild>
                  <Button type="button" variant="ghost" size="icon-sm">
                    <X className="size-4" />
                  </Button>
                </DrawerClose>
              </div>
            </div>
          </DrawerHeader>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {mode === 'agent' && (
              <details className="shrink-0 border-b border-border/80 px-4 pb-1 pt-2 group">
                <summary className="cursor-pointer list-none text-xs text-muted-foreground select-none py-1 [&::-webkit-details-marker]:hidden">
                  <span className="underline-offset-2 group-open:underline">
                    {t('ChatbotInAppAgentFlowIdOptionalSummary')}
                  </span>
                </summary>
                <div className="pt-2 pb-2 space-y-1">
                  <p className="text-xs text-muted-foreground">
                    {t('ChatbotInAppAgentFlowIdOptionalHint')}
                  </p>
                  <Input
                    value={flowId}
                    onChange={(e) => setFlowId(e.target.value)}
                    placeholder={t('ChatbotInAppFlowIdPlaceholder')}
                    className="font-mono text-xs"
                  />
                </div>
              </details>
            )}

            <div className="min-h-0 flex-1 px-2 pt-3">
              <ScrollArea className="h-full max-h-full">
                <div className="space-y-3 px-2 pb-4">
                  {isLoadingHistory ? (
                    <div className="flex items-center gap-2 px-2 py-6 text-xs text-muted-foreground">
                      <Loader2
                        className="size-4 shrink-0 animate-spin"
                        aria-hidden
                      />
                      {t('ChatbotInAppLoadingHistory')}
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="px-2 py-6 text-xs leading-relaxed text-muted-foreground">
                      {t('ChatbotInAppEmptyState')}
                    </div>
                  ) : (
                    messages.map((m, idx) => (
                      <MessageBubble key={idx} message={m} />
                    ))
                  )}
                  {isSending ? <ThinkingRow /> : null}
                  <div ref={bottomRef} />
                </div>
              </ScrollArea>
            </div>

            <DrawerFooter className="mt-0 shrink-0 gap-0 border-t bg-background p-3">
              <form
                className="flex items-center gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  void send();
                }}
              >
                <Input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={t('ChatbotInAppMessagePlaceholder')}
                  disabled={isSending || isLoadingHistory}
                  autoComplete="off"
                  name="ap-in-app-chatbot-message"
                  className={cn(
                    'h-8 border-border bg-background text-sm shadow-none',
                    '[&:is(:-webkit-autofill,:autofill)]:border-border',
                    '[&:is(:-webkit-autofill,:autofill)]:[-webkit-text-fill-color:hsl(var(--foreground))]',
                    '[&:is(:-webkit-autofill,:autofill)]:shadow-[inset_0_0_0_1000px_hsl(var(--background))]',
                  )}
                />
                <Button
                  type="submit"
                  size="sm"
                  className="shrink-0 gap-1.5 px-3"
                  disabled={
                    isSending || isLoadingHistory || draft.trim().length === 0
                  }
                >
                  <SendIcon size={14} />
                  {t('Send')}
                </Button>
              </form>
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );

  async function send(): Promise<void> {
    if (isNil(projectId)) {
      return;
    }
    const text = draft.trim();
    if (text.length === 0) {
      return;
    }
    const snapshot = messages;
    const optimisticUser: ChatbotMessage = {
      role: 'user',
      content: text,
      created: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticUser]);
    setDraft('');
    setIsSending(true);
    try {
      const result = await chatbotMessageApi.sendMessage(projectId, {
        mode,
        message: text,
        sessionId,
        ...(mode === 'agent' && flowId.trim().length > 0
          ? { flowId: flowId.trim() }
          : {}),
      });
      applyServerReply(result);
    } catch {
      setMessages(snapshot);
      setDraft(text);
      internalErrorToast();
    } finally {
      setIsSending(false);
    }
  }

  function applyServerReply(result: ChatbotMessageResponse): void {
    setSessionId(result.sessionId);
    setMessages(result.messages);
    if (!isNil(result.flowId)) {
      setFlowId(result.flowId);
    }
  }
}

function MessageBubble({ message }: { message: ChatbotMessage }) {
  const isUser = message.role === 'user';
  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[85%] break-words rounded-lg border px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap',
          isUser
            ? 'bg-primary text-primary-foreground border-primary/30'
            : 'bg-muted text-foreground border-border',
        )}
      >
        {message.content}
      </div>
    </div>
  );
}

function ThinkingRow() {
  return (
    <div className="flex justify-start">
      <div
        className={cn(
          'max-w-[85%] rounded-lg border border-border bg-muted px-3 py-2 text-xs text-muted-foreground',
          'flex items-center gap-2',
        )}
      >
        <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
        <span>{t('ChatbotInAppThinking')}</span>
      </div>
    </div>
  );
}
