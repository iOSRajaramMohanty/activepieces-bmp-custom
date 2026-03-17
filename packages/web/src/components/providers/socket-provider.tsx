import React, { useEffect, useRef, useMemo, useCallback } from 'react';
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
let socketConnectionCount = 0;

const getOrCreateSocket = (): Socket => {
  if (!socketInstance) {
    const apiBaseUrl = getAPIBaseUrl();
    console.log('Creating socket connection to:', apiBaseUrl);
    socketInstance = io(apiBaseUrl, {
      transports: ['websocket'],
      path: '/api/socket.io',
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
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
  const isCleaningUpRef = useRef(false);
  
  // Get the socket instance (will reuse existing or create new with current config)
  const socket = useMemo(() => getOrCreateSocket(), []);

  const handleConnect = useCallback(() => {
    if (toastIdRef.current) {
      toast.dismiss(toastIdRef.current);
      toastIdRef.current = null;
    }
    console.log('connected to socket');
  }, []);

  const handleDisconnect = useCallback((reason: string) => {
    // Don't show toast if we're cleaning up (component unmounting)
    if (isCleaningUpRef.current) {
      return;
    }
    
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
  }, [socket]);

  useEffect(() => {
    isCleaningUpRef.current = false;
    
    if (token) {
      socket.auth = { token, projectId };
      
      // Remove old listeners before adding new ones
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      
      // Add listeners
      socket.on('connect', handleConnect);
      socket.on('disconnect', handleDisconnect);
      
      // Track connection count to prevent reconnect on Strict Mode remount
      socketConnectionCount++;
      const currentCount = socketConnectionCount;
      
      if (!socket.connected) {
        socket.connect();
      }
      
      return () => {
        isCleaningUpRef.current = true;
        socket.off('connect', handleConnect);
        socket.off('disconnect', handleDisconnect);
        
        // Only disconnect if this is the last component using the socket
        // This prevents disconnection during React Strict Mode double-invocation
        if (currentCount === socketConnectionCount) {
          // Use setTimeout to allow React Strict Mode's immediate remount
          setTimeout(() => {
            if (currentCount === socketConnectionCount && !token) {
              socket.disconnect();
            }
          }, 100);
        }
      };
    } else {
      socket.disconnect();
      return undefined;
    }
  }, [token, projectId, socket, handleConnect, handleDisconnect]);

  return (
    <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
  );
};

export const useSocket = () => React.useContext(SocketContext);
