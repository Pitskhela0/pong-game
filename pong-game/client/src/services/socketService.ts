import { io, Socket } from 'socket.io-client';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface SocketServiceEvents {
  statusChange: (status: ConnectionStatus) => void;
  error: (error: string) => void;
  welcome: (data: any) => void;
  clientConnected: (data: any) => void;
  clientDisconnected: (data: any) => void;
  pong: (data: any) => void;
}

export class SocketService {
  private socket: Socket | null = null;
  private status: ConnectionStatus = 'disconnected';
  private eventListeners: Partial<SocketServiceEvents> = {};
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private serverUrl: string;
  private isConnecting = false; // Add flag to prevent multiple connection attempts

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
    // Prevent multiple simultaneous connection attempts
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
      autoConnect: false // Disable auto-connect to have better control
    });

    this.setupEventListeners();
    this.socket.connect(); // Manually connect
  }

  // Disconnect from server
  disconnect(): void {
    if (this.socket) {
      console.log('🔌 Disconnecting from server...');
      this.socket.disconnect();
      this.socket = null;
      this.setStatus('disconnected');
      this.isConnecting = false;
      this.reconnectAttempts = 0; // Reset reconnect attempts
    }
  }

  // Setup socket event listeners
  private setupEventListeners(): void {
    if (!this.socket) return;

    // Connection successful
    this.socket.on('connect', () => {
      console.log('✅ Connected to server successfully');
      console.log('🆔 Socket ID:', this.socket?.id);
      this.setStatus('connected');
      this.reconnectAttempts = 0;
      this.isConnecting = false;
    });

    // Connection error
    this.socket.on('connect_error', (error) => {
      console.error('❌ Connection error:', error.message);
      this.setStatus('error');
      this.isConnecting = false;
      this.triggerEvent('error', `Connection failed: ${error.message}`);
      
      // Handle reconnection attempts
      this.handleReconnection();
    });

    // Disconnected
    this.socket.on('disconnect', (reason) => {
      console.log('🔌 Disconnected from server:', reason);
      this.setStatus('disconnected');
      this.isConnecting = false;
      
      // Auto-reconnect for certain disconnect reasons
      if (reason === 'io server disconnect') {
        // Server initiated disconnect - don't reconnect automatically
        this.triggerEvent('error', 'Server disconnected the connection');
      } else if (reason !== 'io client disconnect') {
        // Client-side issue - attempt reconnection (but not if user manually disconnected)
        this.handleReconnection();
      }
    });

    // Custom server events
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
}