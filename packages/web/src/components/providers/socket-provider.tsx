import React, { useEffect, useRef, useMemo } from 'react';
import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';

import { authenticationSession } from '@/lib/authentication-session';

// Get API base URL dynamically - supports late SDK configuration
const getAPIBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sdkConfig = (window as any).__AP_SDK_CONFIG__;
    if (sdkConfig?.apiUrl) {
      return sdkConfig.apiUrl;
    }
  }
  return typeof window !== 'undefined' ? window.location.origin : '';
};

// Module-level socket instance (created lazily on first access)
let socketInstance: Socket | null = null;

const getOrCreateSocket = (): Socket => {
  if (!socketInstance) {
    const apiBaseUrl = getAPIBaseUrl();
    console.log('Creating socket connection to:', apiBaseUrl);
    socketInstance = io(apiBaseUrl, {
      transports: ['websocket'],
      path: '/api/socket.io',
      autoConnect: false,
      reconnection: true,
    });
  }
  return socketInstance;
};

// Create initial socket - this will use the URL available at the time
// For SDK usage, ensure __AP_SDK_CONFIG__ is set before SocketProvider mounts
const initialSocket = getOrCreateSocket();

const SocketContext = React.createContext<Socket>(initialSocket);

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const token = authenticationSession.getToken();
  const projectId = authenticationSession.getProjectId();
  const toastIdRef = useRef<string | null>(null);
  
  // Get the socket instance (will reuse existing or create new with current config)
  const socket = useMemo(() => getOrCreateSocket(), []);

  useEffect(() => {
    if (token) {
      socket.auth = { token, projectId };
      if (!socket.connected) {
        socket.connect();

        socket.on('connect', () => {
          if (toastIdRef.current) {
            toast.dismiss(toastIdRef.current);
            toastIdRef.current = null;
          }
          console.log('connected to socket');
        });

        socket.on('disconnect', (reason) => {
          if (!toastIdRef.current) {
            const id = toast('Connection Lost', {
              id: 'websocket-disconnected',
              description: 'We are trying to reconnect...',
              duration: Infinity,
            });
            toastIdRef.current = id?.toString() ?? null;
          }
          if (reason === 'io server disconnect') {
            socket.connect();
          }
        });
      }
    } else {
      socket.disconnect();
    }
    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.disconnect();
    };
  }, [token, projectId, socket]);

  return (
    <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
  );
};

export const useSocket = () => React.useContext(SocketContext);
