import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';

const app = express();
const server = createServer(app);

// Enhanced Socket.IO configuration with resource limits
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  },
  // Add these configuration options
  maxHttpBufferSize: 1e6, // 1MB
  pingTimeout: 60000,
  pingInterval: 25000,
  upgradeTimeout: 10000,
  allowEIO3: true
});

const PORT = process.env.PORT || 3001;

// Basic middleware
app.use(express.json());

// Add explicit CORS headers for HTTP requests
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// Hello World endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Pong Server Running!',
    connectedClients: io.engine.clientsCount,
    timestamp: new Date().toISOString()
  });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`🔌 New client connected: ${socket.id}`);
  console.log(`📊 Total connected clients: ${io.engine.clientsCount}`);
  
  // Send welcome message
  socket.emit('welcome', {
    message: 'Connected successfully',
    socketId: socket.id
  });
  
  // Handle client disconnect
  socket.on('disconnect', (reason) => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
    console.log(`📊 Disconnect reason: ${reason}`);
    console.log(`📊 Remaining clients: ${io.engine.clientsCount}`);
  });
  
  // Handle connection errors
  socket.on('error', (error) => {
    console.error(`❌ Socket error for ${socket.id}:`, error);
  });
});

// Global Socket.IO error handling
io.on('error', (error) => {
  console.error('❌ Socket.IO server error:', error);
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

// Start server with error handling
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔗 Socket.IO ready for connections`);
}).on('error', (err) => {
  console.error('❌ Server startup error:', err);
  process.exit(1);
});