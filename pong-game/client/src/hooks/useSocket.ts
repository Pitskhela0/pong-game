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

  // Initialize socket service only once
  useEffect(() => {
    console.log('🔧 useSocket effect running...');
    
    // If we already have a socket service, don't create another one
    if (socketServiceRef.current) {
      console.log('🔧 Socket service already exists, reusing...');
      return;
    }

    console.log('🔧 Creating new socket service...');
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

    socketService.on('paddleMoved', (data) => {
      console.log('🏓 Paddle moved:', data);
    });

    // Cleanup function - only runs when component actually unmounts
    return () => {
      console.log('🧹 useSocket cleanup - component unmounting');
      if (socketServiceRef.current) {
        socketServiceRef.current.destroy();
        socketServiceRef.current = null;
      }
    };
  }, []); // No dependencies to prevent re-running

  // Memoize connect function to prevent unnecessary re-renders
  const connect = useCallback(() => {
    console.log('🔌 Connect function called');
    if (socketServiceRef.current) {
      socketServiceRef.current.connect();
    } else {
      console.warn('⚠️ SocketService not available');
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