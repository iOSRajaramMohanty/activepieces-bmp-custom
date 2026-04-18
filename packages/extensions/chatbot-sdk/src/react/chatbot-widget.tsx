import { tryCatch } from '@activepieces/shared';
import React, { useEffect, useMemo, useState } from 'react';

import { ChatbotMessage, ChatbotWidgetMode, ChatbotWidgetProps } from '../types';

const STORAGE_KEY_PREFIX = 'ap_chatbot_sdk_session';

/** Keeps typography consistent when the host page uses large root font sizes (rem/em). */
const rootStyle: React.CSSProperties = {
  boxSizing: 'border-box',
  fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  fontSize: 14,
  lineHeight: 1.45,
  color: '#111827',
  isolation: 'isolate',
};

const labelStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  lineHeight: 1.3,
};

const metaStyle: React.CSSProperties = {
  fontSize: 11,
  opacity: 0.65,
  lineHeight: 1.3,
};

const modeSelectStyle: React.CSSProperties = {
  fontSize: 12,
  lineHeight: 1.2,
  padding: '4px 8px',
  borderRadius: 6,
  border: '1px solid #d1d5db',
  background: '#fff',
  color: '#111827',
  cursor: 'pointer',
  maxWidth: 140,
  position: 'relative',
  zIndex: 2,
};

function readChatbotSessionId(data: unknown): string | undefined {
  if (typeof data !== 'object' || data === null || !('sessionId' in data)) {
    return undefined;
  }
  const value = Reflect.get(data, 'sessionId');
  return typeof value === 'string' ? value : undefined;
}

function readMessages(data: unknown): ChatbotMessage[] {
  if (typeof data !== 'object' || data === null || !('messages' in data)) {
    return [];
  }
  const raw = Reflect.get(data, 'messages');
  if (!Array.isArray(raw)) {
    return [];
  }
  const out: ChatbotMessage[] = [];
  for (const item of raw) {
    if (typeof item !== 'object' || item === null) {
      continue;
    }
    const role = Reflect.get(item, 'role');
    const content = Reflect.get(item, 'content');
    const created = Reflect.get(item, 'created');
    if (role !== 'user' && role !== 'assistant') {
      continue;
    }
    if (typeof content !== 'string' || typeof created !== 'string') {
      continue;
    }
    out.push({ role, content, created });
  }
  return out;
}

function storageKeyForSession(params: { projectId: string; mode: ChatbotWidgetMode }): string {
  return `${STORAGE_KEY_PREFIX}:${params.projectId}:${params.mode}`;
}

function readStoredSessionId(params: { projectId: string; mode: ChatbotWidgetMode }): string | undefined {
  try {
    const raw = window.localStorage.getItem(storageKeyForSession(params));
    return typeof raw === 'string' && raw.length > 0 ? raw : undefined;
  } catch {
    return undefined;
  }
}

function writeStoredSessionId(params: {
  projectId: string;
  mode: ChatbotWidgetMode;
  sessionId: string | undefined;
}): void {
  try {
    if (params.sessionId === undefined) {
      window.localStorage.removeItem(storageKeyForSession(params));
    } else {
      window.localStorage.setItem(storageKeyForSession(params), params.sessionId);
    }
  } catch {
    // ignore
  }
}

function resolveChatbotEndpoint(props: ChatbotWidgetProps): { url: string; useBearerAuth: boolean } {
  const root = props.apiUrl.replace(/\/$/, '');
  const hasKey = props.publishableKey !== undefined && props.publishableKey !== '';
  const hasToken = props.token !== undefined && props.token !== '';
  if (hasKey === hasToken) {
    throw new Error('ChatbotWidget: set exactly one of token or publishableKey');
  }
  if (hasKey) {
    return {
      url: `${root}/v1/chatbot/public/message`,
      useBearerAuth: false,
    };
  }
  const params = new URLSearchParams({ projectId: props.projectId });
  return {
    url: `${root}/v1/chatbot/message?${params.toString()}`,
    useBearerAuth: true,
  };
}

function resolveSessionFetchUrl(params: {
  apiUrl: string;
  projectId: string;
  mode: ChatbotWidgetMode;
  sessionId: string;
  publishableKey?: string;
}): { url: string; useBearerAuth: boolean } {
  const root = params.apiUrl.replace(/\/$/, '');
  const hasKey = params.publishableKey !== undefined && params.publishableKey !== '';
  if (hasKey) {
    const q = new URLSearchParams({
      projectId: params.projectId,
      publishableKey: params.publishableKey ?? '',
      sessionId: params.sessionId,
      mode: params.mode,
    });
    return {
      url: `${root}/v1/chatbot/public/session?${q.toString()}`,
      useBearerAuth: false,
    };
  }
  const q = new URLSearchParams({
    projectId: params.projectId,
    sessionId: params.sessionId,
    mode: params.mode,
  });
  return {
    url: `${root}/v1/chatbot/session?${q.toString()}`,
    useBearerAuth: true,
  };
}

export function ChatbotWidget(props: ChatbotWidgetProps) {
  const [message, setMessage] = useState('');
  const [mode, setMode] = useState<ChatbotWidgetMode>(() => props.mode);
  const [sessionId, setSessionId] = useState<string | undefined>(() =>
    readStoredSessionId({ projectId: props.projectId, mode: props.mode }),
  );
  const [messages, setMessages] = useState<ChatbotMessage[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const { url: endpoint, useBearerAuth } = useMemo(() => resolveChatbotEndpoint(props), [
    props.apiUrl,
    props.projectId,
    props.token,
    props.publishableKey,
  ]);

  useEffect(() => {
    setMode(props.mode);
  }, [props.mode]);

  useEffect(() => {
    const next = readStoredSessionId({ projectId: props.projectId, mode });
    setSessionId(next);
    setMessages([]);
  }, [props.projectId, mode]);

  useEffect(() => {
    if (sessionId === undefined || sessionId.length === 0) {
      setLoadingHistory(false);
      return;
    }
    let cancelled = false;
    setLoadingHistory(true);
    const { url: sessionUrl, useBearerAuth: sessionAuth } = resolveSessionFetchUrl({
      apiUrl: props.apiUrl,
      projectId: props.projectId,
      mode,
      sessionId,
      publishableKey: props.publishableKey,
    });
    const headers: Record<string, string> = {};
    if (sessionAuth) {
      if (props.token === undefined || props.token === '') {
        setLoadingHistory(false);
        return;
      }
      headers.authorization = `Bearer ${props.token}`;
    }
    void fetch(sessionUrl, { headers })
      .then(async (res) => {
        if (cancelled) {
          return;
        }
        if (res.status === 404) {
          writeStoredSessionId({
            projectId: props.projectId,
            mode,
            sessionId: undefined,
          });
          setSessionId(undefined);
          setMessages([]);
          return;
        }
        if (!res.ok) {
          return;
        }
        const data: unknown = await res.json();
        setMessages(readMessages(data));
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingHistory(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [props.apiUrl, props.projectId, props.publishableKey, props.token, mode, sessionId]);

  return (
    <div className="ap-chatbot-widget" style={rootStyle}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          marginBottom: 8,
          flexWrap: 'wrap',
        }}
      >
        <span style={labelStyle}>Chatbot</span>
        <label
          htmlFor="ap-chatbot-sdk-mode"
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#374151' }}
        >
          <span style={{ whiteSpace: 'nowrap' }}>Mode</span>
          <select
            id="ap-chatbot-sdk-mode"
            value={mode}
            style={modeSelectStyle}
            onChange={(e) => {
              const next = e.target.value === 'agent' ? 'agent' : 'builder';
              setMode(next);
            }}
          >
            <option value="builder">Builder</option>
            <option value="agent">Agent</option>
          </select>
        </label>
      </div>
      <div
        style={{
          border: '1px solid #e5e7eb',
          borderRadius: 8,
          minHeight: 120,
          maxHeight: 280,
          overflow: 'auto',
          padding: 8,
          marginBottom: 8,
          fontSize: 12,
          lineHeight: 1.45,
          background: '#fafafa',
          color: '#111827',
        }}
      >
        {loadingHistory ? (
          <div style={metaStyle}>Loading…</div>
        ) : messages.length === 0 ? (
          <div style={metaStyle}>
            Send a message to start. Session and history are kept per project and mode in this browser.
          </div>
        ) : (
          messages.map((m, idx) => (
            <div
              key={`${m.created}-${idx}`}
              style={{
                marginBottom: 8,
                display: 'flex',
                justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
              }}
            >
              <div
                style={{
                  maxWidth: '85%',
                  padding: '6px 10px',
                  borderRadius: 8,
                  fontSize: 12,
                  lineHeight: 1.45,
                  background: m.role === 'user' ? '#4f46e5' : '#fff',
                  color: m.role === 'user' ? '#fff' : '#111827',
                  border: m.role === 'user' ? 'none' : '1px solid #e5e7eb',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {m.content}
              </div>
            </div>
          ))
        )}
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message…"
          autoComplete="off"
          name="ap-chatbot-sdk-message"
          style={{
            flex: 1,
            minWidth: 0,
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            padding: '8px 10px',
            fontSize: 13,
            lineHeight: 1.4,
            color: '#111827',
            background: '#fff',
          }}
        />
        <button
          type="button"
          onClick={() => {
            void sendChatMessage({
              props,
              endpoint,
              useBearerAuth,
              message,
              mode,
              sessionId,
              setSessionId,
              setMessages,
              setMessage,
            });
          }}
          style={{
            border: '1px solid #d1d5db',
            borderRadius: 8,
            padding: '8px 12px',
            background: '#4f46e5',
            color: '#fff',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          Send
        </button>
      </div>
      <div style={{ ...metaStyle, marginTop: 8 }}>Endpoint: {endpoint}</div>
    </div>
  );
}

async function sendChatMessage(params: {
  props: ChatbotWidgetProps;
  endpoint: string;
  useBearerAuth: boolean;
  message: string;
  mode: ChatbotWidgetMode;
  sessionId: string | undefined;
  setSessionId: (id: string | undefined) => void;
  setMessages: (m: ChatbotMessage[]) => void;
  setMessage: (s: string) => void;
}): Promise<void> {
  const text = params.message.trim();
  if (text.length === 0) {
    return;
  }
  const baseBody = {
    mode: params.mode,
    message: text,
    ...(params.props.flowId ? { flowId: params.props.flowId } : {}),
    ...(params.sessionId ? { sessionId: params.sessionId } : {}),
  };
  let bodyObject: Record<string, unknown> = baseBody;
  if (!params.useBearerAuth) {
    if (params.props.publishableKey === undefined || params.props.publishableKey === '') {
      throw new Error('ChatbotWidget: publishableKey is required for embed mode');
    }
    bodyObject = {
      ...baseBody,
      projectId: params.props.projectId,
      publishableKey: params.props.publishableKey,
    };
  }
  const headers: Record<string, string> = {
    'content-type': 'application/json',
  };
  if (params.useBearerAuth) {
    if (params.props.token === undefined || params.props.token === '') {
      throw new Error('ChatbotWidget: token is required for authenticated mode');
    }
    headers.authorization = `Bearer ${params.props.token}`;
  }
  const result = await tryCatch(() =>
    fetch(params.endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(bodyObject),
    }),
  );
  if (result.data === null) {
    return;
  }
  const res = result.data;
  if (res.ok) {
    const parseResult = await tryCatch(async () => res.json() as Promise<unknown>);
    if (parseResult.data === null) {
      return;
    }
    const data = parseResult.data;
    const nextSessionId = readChatbotSessionId(data);
    if (nextSessionId !== undefined) {
      writeStoredSessionId({
        projectId: params.props.projectId,
        mode: params.mode,
        sessionId: nextSessionId,
      });
      params.setSessionId(nextSessionId);
    }
    params.setMessages(readMessages(data));
  }
  params.setMessage('');
}
