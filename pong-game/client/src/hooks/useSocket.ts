import { useEffect, useState, useRef, useCallback } from 'react';
import { SocketService, type ConnectionStatus } from '../services/socketService';

export interface UseSocketReturn {
  socketService: SocketService | null;
  connectionStatus: ConnectionStatus;
  isConnected: boolean;
  error: string | null;
  connect: () => void;
  disconnect: () => void;
  sendPing: (message?: string) => void;
}

export const useSocket = (serverUrl?: string): UseSocketReturn => {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const socketServiceRef = useRef<SocketService | null>(null);
  const isInitializedRef = useRef(false);

  // Initialize socket service only once
  useEffect(() => {
    // Prevent double initialization in React StrictMode
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    const socketService = new SocketService(serverUrl);
    socketServiceRef.current = socketService;

    // Setup event listeners
    socketService.on('statusChange', (status) => {
      console.log('🔄 Status changed to:', status);
      setConnectionStatus(status);
      if (status === 'connected') {
        setError(null); // Clear errors on successful connection
      }
    });

    socketService.on('error', (errorMessage) => {
      console.error('❌ Socket error:', errorMessage);
      setError(errorMessage);
    });

    socketService.on('welcome', (data) => {
      console.log('🎉 Welcome data:', data);
    });

    socketService.on('clientConnected', (data) => {
      console.log('📈 Client count updated:', data.totalClients);
    });

    socketService.on('clientDisconnected', (data) => {
      console.log('📉 Client count updated:', data.totalClients);
    });

    // Cleanup function
    return () => {
      console.log('🧹 Cleaning up socket service');
      socketService.disconnect();
      socketService.off('statusChange');
      socketService.off('error');
      socketService.off('welcome');
      socketService.off('clientConnected');
      socketService.off('clientDisconnected');
      isInitializedRef.current = false;
    };
  }, [serverUrl]);

  // Memoize connect function to prevent unnecessary re-renders
  const connect = useCallback(() => {
    console.log('🔌 Connect function called');
    if (socketServiceRef.current) {
      socketServiceRef.current.connect();
    }
  }, []);

  // Memoize disconnect function
  const disconnect = useCallback(() => {
    console.log('🔌 Disconnect function called');
    if (socketServiceRef.current) {
      socketServiceRef.current.disconnect();
    }
  }, []);

  // Memoize sendPing function
  const sendPing = useCallback((message?: string) => {
    console.log('🏓 SendPing function called');
    if (socketServiceRef.current) {
      socketServiceRef.current.sendPing(message);
    }
  }, []);

  return {
    socketService: socketServiceRef.current,
    connectionStatus,
    isConnected: connectionStatus === 'connected',
    error,
    connect,
    disconnect,
    sendPing
  };
};