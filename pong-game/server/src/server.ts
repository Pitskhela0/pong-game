import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';

const app = express();
const server = createServer(app);

// Enhanced Socket.IO configuration with more permissive CORS for debugging
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:5173", "http://127.0.0.1:5173"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
  },
  // Configuration options
  maxHttpBufferSize: 1e6, // 1MB
  pingTimeout: 60000,
  pingInterval: 25000,
  upgradeTimeout: 10000,
  allowEIO3: true,
  transports: ['websocket', 'polling']
});

const PORT = process.env.PORT || 3001;

// Basic middleware
app.use(express.json());

// Enhanced CORS middleware for HTTP requests
app.use((req, res, next) => {
  console.log(`📡 HTTP Request: ${req.method} ${req.url} from ${req.headers.origin || 'unknown'}`);
  
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  
  next();
});

// Enhanced hello endpoint with more debug info
app.get('/', (req, res) => {
  const response = { 
    message: 'Pong Server Running!',
    status: 'healthy',
    port: PORT,
    connectedClients: io.engine.clientsCount,
    timestamp: new Date().toISOString(),
    cors: {
      enabled: true,
      origins: ["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:5173", "http://127.0.0.1:5173"]
    }
  };
  
  console.log('📊 HTTP Health check requested, responding with:', response);
  res.json(response);
});

// Test endpoint for debugging
app.get('/api/test', (req, res) => {
  res.json({
    message: 'Test endpoint working',
    timestamp: new Date().toISOString(),
    userAgent: req.headers['user-agent']
  });
});

// Socket.IO connection handling with enhanced logging
io.on('connection', (socket) => {
  console.log(`🔌 New client connected: ${socket.id}`);
  console.log(`📊 Total connected clients: ${io.engine.clientsCount}`);
  console.log(`🔍 Client info:`, {
    id: socket.id,
    transport: socket.conn.transport.name,
    upgraded: socket.conn.upgraded,
    remoteAddress: socket.conn.remoteAddress
  });
  
  // Send welcome message
  socket.emit('welcome', {
    message: 'Connected successfully to Pong server',
    socketId: socket.id,
    serverTime: new Date().toISOString(),
    transport: socket.conn.transport.name
  });
  
  // Handle ping for testing
  socket.on('ping', (data) => {
    console.log(`🏓 Ping received from ${socket.id}:`, data);
    socket.emit('pong', {
      message: 'Pong from server!',
      originalMessage: data.message,
      timestamp: new Date().toISOString()
    });
  });

  // Handle join room (simplified for debugging)
  socket.on('join-room', (data: { roomName: string; playerName: string }) => {
    console.log(`🏠 Join room request from ${socket.id}:`, data);
    
    try {
      // Simple room join without RoomManager for now
      socket.join(data.roomName);
      
      socket.emit('room-joined', {
        room: {
          id: `room_${data.roomName}`,
          name: data.roomName,
          gameState: {
            id: `game_${data.roomName}`,
            players: [{
              id: socket.id,
              socketId: socket.id,
              paddleY: 250,
              score: 0,
              isReady: false
            }],
            ball: { x: 400, y: 300, velocityX: 5, velocityY: 3, speed: 5 },
            gameStatus: 'waiting',
            winner: null,
            lastUpdate: Date.now()
          },
          createdAt: Date.now()
        },
        playerId: socket.id,
        playerName: data.playerName
      });

      console.log(`✅ Player ${data.playerName} joined room ${data.roomName}`);
      
    } catch (error) {
      console.error('❌ Error joining room:', error);
      socket.emit('room-error', {
        message: 'Failed to join room'
      });
    }
  });

  // Handle leave room
  socket.on('leave-room', () => {
    console.log(`🚪 Leave room request from ${socket.id}`);
    socket.emit('room-left', { roomName: 'test' });
  });
  
  // Broadcast client connected to all other clients
  socket.broadcast.emit('clientConnected', {
    socketId: socket.id,
    totalClients: io.engine.clientsCount
  });
  
  // Handle connection errors
  socket.on('error', (error) => {
    console.error(`❌ Socket error for ${socket.id}:`, error);
  });
  
  // Handle disconnect
  socket.on('disconnect', (reason) => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
    console.log(`📊 Disconnect reason: ${reason}`);
    console.log(`📊 Remaining clients: ${io.engine.clientsCount}`);
    
    // Broadcast client disconnected to all other clients
    socket.broadcast.emit('clientDisconnected', {
      socketId: socket.id,
      totalClients: io.engine.clientsCount
    });
  });
});

// Global Socket.IO error handling
io.on('error', (error) => {
  console.error('❌ Socket.IO server error:', error);
});

// Engine debugging
io.engine.on('connection_error', (err) => {
  console.error('❌ Engine connection error:', {
    code: err.code,
    message: err.message,
    context: err.context
  });
});

// Enhanced graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server gracefully...');
  
  // Close all socket connections first
  io.disconnectSockets();
  
  io.close((err) => {
    if (err) {
      console.error('❌ Error closing Socket.IO server:', err);
    } else {
      console.log('✅ Socket.IO server closed successfully');
    }
    
    server.close((err) => {
      if (err) {
        console.error('❌ Error closing HTTP server:', err);
        process.exit(1);
      } else {
        console.log('✅ HTTP server closed successfully');
        process.exit(0);
      }
    });
  });
});

// Start server with enhanced error handling
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🔗 Socket.IO ready for connections`);
  console.log(`🌐 CORS enabled for multiple origins`);
  console.log(`🔧 Available endpoints:`);
  console.log(`   📍 GET  /           - Health check`);
  console.log(`   📍 GET  /api/test   - Test endpoint`);
  console.log(`🔍 Debug mode: Simplified room management for testing`);
}).on('error', (err: any) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use!`);
    console.error(`   Try: kill -9 $(lsof -t -i:${PORT})`);
    console.error(`   Or use a different port: PORT=3002 npm run dev`);
  } else {
    console.error('❌ Server startup error:', err);
  }
  process.exit(1);
});