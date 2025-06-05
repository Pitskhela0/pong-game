import { io, Socket } from 'socket.io-client';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface SocketServiceEvents {
  statusChange: (status: ConnectionStatus) => void;
  error: (error: string) => void;
  welcome: (data: any) => void;
  clientConnected: (data: any) => void;
  clientDisconnected: (data: any) => void;
  pong: (data: any) => void;
  // Room events
  roomJoined: (data: any) => void;
  playerJoined: (data: any) => void;
  playerLeft: (data: any) => void;
  roomLeft: (data: any) => void;
  roomFull: (data: any) => void;
  roomError: (data: any) => void;
  // Game events
  paddleMoved: (data: any) => void;
}

export class SocketService {
  private socket: Socket | null = null;
  private status: ConnectionStatus = 'disconnected';
  private eventListeners: Partial<SocketServiceEvents> = {};
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private serverUrl: string;
  private isConnecting = false;
private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private isDestroyed = false;

  constructor(serverUrl: string = 'http://localhost:3001') {
    this.serverUrl = serverUrl;
  }

  // Get current connection status
  getStatus(): ConnectionStatus {
    return this.status;
  }

  // Get socket instance (for direct access if needed)
  getSocket(): Socket | null {
    return this.socket;
  }

  // Connect to server
  connect(): void {
    if (this.isDestroyed) {
      console.log('🚫 SocketService is destroyed, cannot connect');
      return;
    }

    if (this.isConnecting) {
      console.log('🔌 Connection already in progress...');
      return;
    }

    if (this.socket?.connected) {
      console.log('🔌 Already connected to server');
      return;
    }

    console.log(`🔌 Connecting to server at ${this.serverUrl}...`);
    console.log('🔧 Using polling transport only for debugging');
    this.isConnecting = true;
    this.setStatus('connecting');

    // Clear any existing socket
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
    }

    // Set up a connection timeout
    const connectionTimeout = setTimeout(() => {
      if (this.isConnecting && !this.socket?.connected) {
        console.error('❌ Connection timeout after 15 seconds');
        this.setStatus('error');
        this.isConnecting = false;
        this.triggerEvent('error', 'Connection timeout - server may not be running');
      }
    }, 15000);

    try {
      // Create new socket with polling only (for debugging)
      this.socket = io(this.serverUrl, {
        transports: ['polling'], // Use polling only to avoid WebSocket issues
        timeout: 15000, // Reduced timeout
        forceNew: true,
        autoConnect: false,
        reconnection: false, // We'll handle reconnection manually
        upgrade: false, // Don't try to upgrade to WebSocket
        rememberUpgrade: false
      });

      this.setupEventListeners();
      
      // Clear timeout on successful connection
      this.socket.on('connect', () => {
        clearTimeout(connectionTimeout);
      });
      
      // Clear timeout on error
      this.socket.on('connect_error', () => {
        clearTimeout(connectionTimeout);
      });
      
      // Manual connect
      console.log('🔌 Attempting to connect...');
      this.socket.connect();
    } catch (error) {
      clearTimeout(connectionTimeout);
      console.error('❌ Error creating socket:', error);
      this.setStatus('error');
      this.isConnecting = false;
      this.triggerEvent('error', 'Failed to create socket connection');
    }
  }

  // Disconnect from server
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.socket) {
      console.log('🔌 Disconnecting from server...');
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
      this.setStatus('disconnected');
      this.isConnecting = false;
      this.reconnectAttempts = 0;
    }
  }

  // Destroy the service (for cleanup)
  destroy(): void {
    console.log('🧹 Destroying SocketService...');
    this.isDestroyed = true;
    this.disconnect();
    this.eventListeners = {};
  }

  // Setup socket event listeners
  private setupEventListeners(): void {
    if (!this.socket || this.isDestroyed) return;

    console.log('🔧 Setting up socket event listeners...');

    // Connection events
    this.socket.on('connect', () => {
      if (this.isDestroyed) return;
      
      console.log('✅ Connected to server successfully');
      console.log('🆔 Socket ID:', this.socket?.id);
      
      // Safely access transport info
      try {
        if (this.socket?.io?.engine) {
          console.log('🚗 Transport:', this.socket.io.engine.transport.name);
          console.log('🔧 Transport readyState:', this.socket.io.engine.readyState);
        }
      } catch (error) {
        console.warn('⚠️ Could not access transport info:', error);
      }
      
      this.setStatus('connected');
      this.reconnectAttempts = 0;
      this.isConnecting = false;
    });

    this.socket.on('connect_error', (error) => {
      if (this.isDestroyed) return;
      
      console.error('❌ Connection error:', error);
      console.error('❌ Error type:', (error as any)?.type);
      console.error('❌ Error description:', (error as any)?.description);
      console.error('❌ Error message:', error.message);
      
      this.setStatus('error');
      this.isConnecting = false;
      
      let errorMessage = 'Connection failed';
      if ((error as any)?.description) {
        errorMessage += `: ${(error as any)?.description}`;
      } else if (error.message) {
        errorMessage += `: ${error.message}`;
      }
      
      this.triggerEvent('error', errorMessage);
      this.handleReconnection();
    });

    this.socket.on('disconnect', (reason, details) => {
      if (this.isDestroyed) return;
      
      console.log('🔌 Disconnected from server:', reason);
      if (details) {
        console.log('🔌 Disconnect details:', details);
      }
      this.setStatus('disconnected');
      this.isConnecting = false;
      
      if (reason === 'io server disconnect') {
        this.triggerEvent('error', 'Server disconnected the connection');
      } else if (reason !== 'io client disconnect') {
        console.log('🔄 Unexpected disconnect, attempting to reconnect...');
        this.handleReconnection();
      }
    });

    // Safely setup engine events
    try {
      if (this.socket.io) {
        this.socket.io.on('error', (error) => {
          if (this.isDestroyed) return;
          console.error('❌ Socket.IO error:', error);
        });

        // Wait for engine to be available before setting up engine events
        if (this.socket.io.engine) {
          this.setupEngineEvents();
        } else {
          // Listen for engine creation
          this.socket.io.on('open', () => {
            if (!this.isDestroyed && this.socket?.io?.engine) {
              this.setupEngineEvents();
            }
          });
        }
      }
    } catch (error) {
      console.warn('⚠️ Could not setup engine events:', error);
    }

    // Server events
    this.socket.on('welcome', (data) => {
      if (this.isDestroyed) return;
      console.log('👋 Welcome message from server:', data);
      this.triggerEvent('welcome', data);
    });

    this.socket.on('clientConnected', (data) => {
      if (this.isDestroyed) return;
      console.log('👤 Another client connected:', data);
      this.triggerEvent('clientConnected', data);
    });

    this.socket.on('clientDisconnected', (data) => {
      if (this.isDestroyed) return;
      console.log('👤 Client disconnected:', data);
      this.triggerEvent('clientDisconnected', data);
    });

    this.socket.on('pong', (data) => {
      if (this.isDestroyed) return;
      console.log('🏓 Pong received:', data);
      this.triggerEvent('pong', data);
    });

    // Room events
    this.socket.on('room-joined', (data) => {
      if (this.isDestroyed) return;
      console.log('🏠 Room joined:', data);
      this.triggerEvent('roomJoined', data);
    });

    this.socket.on('player-joined', (data) => {
      if (this.isDestroyed) return;
      console.log('👤 Player joined room:', data);
      this.triggerEvent('playerJoined', data);
    });

    this.socket.on('player-left', (data) => {
      if (this.isDestroyed) return;
      console.log('👤 Player left room:', data);
      this.triggerEvent('playerLeft', data);
    });

    this.socket.on('room-left', (data) => {
      if (this.isDestroyed) return;
      console.log('🚪 Left room:', data);
      this.triggerEvent('roomLeft', data);
    });

    this.socket.on('room-full', (data) => {
      if (this.isDestroyed) return;
      console.log('🚫 Room full:', data);
      this.triggerEvent('roomFull', data);
    });

    this.socket.on('room-error', (data) => {
      if (this.isDestroyed) return;
      console.log('❌ Room error:', data);
      this.triggerEvent('roomError', data);
    });

    // Game events
    this.socket.on('paddle-moved', (data) => {
      if (this.isDestroyed) return;
      console.log('🏓 Paddle moved:', data);
      this.triggerEvent('paddleMoved', data);
    });
  }

  private setupEngineEvents(): void {
    if (!this.socket?.io?.engine || this.isDestroyed) return;

    console.log('🔧 Setting up engine events...');

    this.socket.io.engine.on('open', () => {
      if (this.isDestroyed) return;
      console.log('🔧 Engine opened');
    });

    this.socket.io.engine.on('close', (reason) => {
      if (this.isDestroyed) return;
      console.log('🔧 Engine closed:', reason);
    });

    this.socket.io.engine.on('error', (error) => {
      if (this.isDestroyed) return;
      console.error('🔧 Engine error:', error);
    });

    this.socket.io.engine.on('upgradeError', (error) => {
      if (this.isDestroyed) return;
      console.error('🔧 Engine upgrade error:', error);
    });
  }

  // Handle reconnection logic
  private handleReconnection(): void {
    if (this.isDestroyed) return;
    
    if (this.reconnectAttempts < this.maxReconnectAttempts && !this.isConnecting) {
      this.reconnectAttempts++;
      const delay = Math.min(2000 * this.reconnectAttempts, 10000);
      
      console.log(`🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      this.reconnectTimer = setTimeout(() => {
        if (!this.isDestroyed && this.status !== 'connected' && !this.isConnecting) {
          this.connect();
        }
      }, delay);
    } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached');
      this.triggerEvent('error', 'Unable to reconnect to server. Please check if the server is running on http://localhost:3001');
    }
  }

  // Update connection status
  private setStatus(status: ConnectionStatus): void {
    if (this.isDestroyed) return;
    
    if (this.status !== status) {
      console.log(`📊 Status changing from ${this.status} to ${status}`);
      this.status = status;
      this.triggerEvent('statusChange', status);
    }
  }

  // Event listener management
  on<K extends keyof SocketServiceEvents>(event: K, callback: SocketServiceEvents[K]): void {
    if (this.isDestroyed) return;
    this.eventListeners[event] = callback;
  }

  off<K extends keyof SocketServiceEvents>(event: K): void {
    delete this.eventListeners[event];
  }

  private triggerEvent<K extends keyof SocketServiceEvents>(
    event: K, 
    data: Parameters<SocketServiceEvents[K]>[0]
  ): void {
    if (this.isDestroyed) return;
    
    const callback = this.eventListeners[event];
    if (callback) {
      (callback as any)(data);
    }
  }

  // Send test ping to server
  sendPing(message: string = 'Hello from client!'): void {
    if (this.isDestroyed) return;
    
    if (this.socket?.connected) {
      console.log('🏓 Sending ping:', message);
      this.socket.emit('ping', {
        message,
        timestamp: new Date().toISOString()
      });
    } else {
      console.warn('⚠️ Cannot send ping - not connected to server');
    }
  }

  // Room management methods
  joinRoom(roomName: string, playerName: string): void {
    if (this.isDestroyed) return;
    
    if (this.socket?.connected) {
      console.log('🏠 Joining room:', { roomName, playerName });
      this.socket.emit('join-room', { roomName, playerName });
    } else {
      console.warn('⚠️ Cannot join room - not connected to server');
    }
  }

  leaveRoom(): void {
    if (this.isDestroyed) return;
    
    if (this.socket?.connected) {
      console.log('🚪 Leaving room');
      this.socket.emit('leave-room');
    } else {
      console.warn('⚠️ Cannot leave room - not connected to server');
    }
  }

  // Paddle movement method
  movePaddle(paddleY: number): void {
    if (this.isDestroyed) return;
    
    if (this.socket?.connected) {
      this.socket.emit('paddle-move', { paddleY });
    } else {
      console.warn('⚠️ Cannot move paddle - not connected to server');
    }
  }
}