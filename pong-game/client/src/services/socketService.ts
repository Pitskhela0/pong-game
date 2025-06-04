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
}

export class SocketService {
  private socket: Socket | null = null;
  private status: ConnectionStatus = 'disconnected';
  private eventListeners: Partial<SocketServiceEvents> = {};
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private serverUrl: string;
  private isConnecting = false;

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
    if (this.isConnecting) {
      console.log('🔌 Connection already in progress...');
      return;
    }

    if (this.socket?.connected) {
      console.log('🔌 Already connected to server');
      return;
    }

    console.log('🔌 Connecting to server...');
    this.isConnecting = true;
    this.setStatus('connecting');

    this.socket = io(this.serverUrl, {
      transports: ['websocket', 'polling'],
      timeout: 10000,
      forceNew: true,
      autoConnect: false
    });

    this.setupEventListeners();
    this.socket.connect();
  }

  // Disconnect from server
  disconnect(): void {
    if (this.socket) {
      console.log('🔌 Disconnecting from server...');
      this.socket.disconnect();
      this.socket = null;
      this.setStatus('disconnected');
      this.isConnecting = false;
      this.reconnectAttempts = 0;
    }
  }

  // Setup socket event listeners
  private setupEventListeners(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('✅ Connected to server successfully');
      console.log('🆔 Socket ID:', this.socket?.id);
      this.setStatus('connected');
      this.reconnectAttempts = 0;
      this.isConnecting = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Connection error:', error.message);
      this.setStatus('error');
      this.isConnecting = false;
      this.triggerEvent('error', `Connection failed: ${error.message}`);
      this.handleReconnection();
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 Disconnected from server:', reason);
      this.setStatus('disconnected');
      this.isConnecting = false;
      
      if (reason === 'io server disconnect') {
        this.triggerEvent('error', 'Server disconnected the connection');
      } else if (reason !== 'io client disconnect') {
        this.handleReconnection();
      }
    });

    // Server events
    this.socket.on('welcome', (data) => {
      console.log('👋 Welcome message from server:', data);
      this.triggerEvent('welcome', data);
    });

    this.socket.on('clientConnected', (data) => {
      console.log('👤 Another client connected:', data);
      this.triggerEvent('clientConnected', data);
    });

    this.socket.on('clientDisconnected', (data) => {
      console.log('👤 Client disconnected:', data);
      this.triggerEvent('clientDisconnected', data);
    });

    this.socket.on('pong', (data) => {
      console.log('🏓 Pong received:', data);
      this.triggerEvent('pong', data);
    });

    // Room events - these will be handled by the useGameState hook
    this.socket.on('room-joined', (data) => {
      console.log('🏠 Room joined:', data);
      this.triggerEvent('roomJoined', data);
    });

    this.socket.on('player-joined', (data) => {
      console.log('👤 Player joined room:', data);
      this.triggerEvent('playerJoined', data);
    });

    this.socket.on('player-left', (data) => {
      console.log('👤 Player left room:', data);
      this.triggerEvent('playerLeft', data);
    });

    this.socket.on('room-left', (data) => {
      console.log('🚪 Left room:', data);
      this.triggerEvent('roomLeft', data);
    });

    this.socket.on('room-full', (data) => {
      console.log('🚫 Room full:', data);
      this.triggerEvent('roomFull', data);
    });

    this.socket.on('room-error', (data) => {
      console.log('❌ Room error:', data);
      this.triggerEvent('roomError', data);
    });
  }

  // Handle reconnection logic
  private handleReconnection(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts && !this.isConnecting) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);
      
      console.log(`🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        if (this.status !== 'connected' && !this.isConnecting) {
          this.connect();
        }
      }, delay);
    } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached');
      this.triggerEvent('error', 'Unable to reconnect to server');
    }
  }

  // Update connection status
  private setStatus(status: ConnectionStatus): void {
    if (this.status !== status) {
      console.log(`📊 Status changing from ${this.status} to ${status}`);
      this.status = status;
      this.triggerEvent('statusChange', status);
    }
  }

  // Event listener management
  on<K extends keyof SocketServiceEvents>(event: K, callback: SocketServiceEvents[K]): void {
    this.eventListeners[event] = callback;
  }

  off<K extends keyof SocketServiceEvents>(event: K): void {
    delete this.eventListeners[event];
  }

  private triggerEvent<K extends keyof SocketServiceEvents>(
    event: K, 
    data: Parameters<SocketServiceEvents[K]>[0]
  ): void {
    const callback = this.eventListeners[event];
    if (callback) {
      (callback as any)(data);
    }
  }

  // Send test ping to server
  sendPing(message: string = 'Hello from client!'): void {
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
    if (this.socket?.connected) {
      console.log('🏠 Joining room:', { roomName, playerName });
      this.socket.emit('join-room', { roomName, playerName });
    } else {
      console.warn('⚠️ Cannot join room - not connected to server');
    }
  }

  leaveRoom(): void {
    if (this.socket?.connected) {
      console.log('🚪 Leaving room');
      this.socket.emit('leave-room');
    } else {
      console.warn('⚠️ Cannot leave room - not connected to server');
    }
  }
}