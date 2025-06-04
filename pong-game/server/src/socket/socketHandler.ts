import { Server, Socket } from 'socket.io';
import { RoomManager } from './roomManager';
import { Player } from '../types/index';

export class SocketHandler {
  private io: Server;
  private roomManager: RoomManager;

  constructor(io: Server) {
    this.io = io;
    this.roomManager = new RoomManager();
  }

  // Setup all socket event handlers
  setupSocketHandlers(socket: Socket): void {
    console.log(`🔌 Setting up handlers for socket: ${socket.id}`);

    // Handle join room
    socket.on('join-room', (data: { roomName: string; playerName: string }) => {
      this.handleJoinRoom(socket, data);
    });

    // Handle leave room
    socket.on('leave-room', () => {
      this.handleLeaveRoom(socket);
    });

    // Handle disconnect
    socket.on('disconnect', (reason) => {
      this.handleDisconnect(socket, reason);
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
  }

  // Handle join room event
  private handleJoinRoom(socket: Socket, data: { roomName: string; playerName: string }): void {
    try {
      const { roomName, playerName } = data;

      if (!roomName || !playerName) {
        socket.emit('room-error', {
          message: 'Room name and player name are required'
        });
        return;
      }

      // Create player object
      const player: Player = {
        id: socket.id,
        socketId: socket.id,
        paddleY: 250, // Center paddle position
        score: 0,
        isReady: false
      };

      // Try to join or create room
      const room = this.roomManager.joinOrCreateRoom(roomName, player);

      // Join socket to room for broadcasting
      socket.join(roomName);

      // Send success response to the joining player
      socket.emit('room-joined', {
        room: room,
        playerId: player.id,
        playerName: playerName
      });

      // Broadcast to other players in the room
      socket.to(roomName).emit('player-joined', {
        player: player,
        playerName: playerName,
        room: room
      });

      console.log(`✅ Player ${playerName} (${socket.id}) joined room "${roomName}"`);
      console.log(`📊 Room status: ${room.gameState.players.length}/2 players`);

    } catch (error) {
      console.error(`❌ Error joining room:`, error);
      
      if (error instanceof Error && error.message.includes('full')) {
        socket.emit('room-full', {
          message: error.message,
          roomName: data.roomName
        });
      } else {
        socket.emit('room-error', {
          message: error instanceof Error ? error.message : 'Failed to join room'
        });
      }
    }
  }

  // Handle leave room event
  private handleLeaveRoom(socket: Socket): void {
    try {
      const room = this.roomManager.findRoomByPlayerId(socket.id);
      
      if (!room) {
        console.log(`⚠️ Player ${socket.id} not in any room to leave`);
        return;
      }

      const roomName = room.name;
      const updatedRoom = this.roomManager.removePlayerFromRoom(socket.id);

      // Leave socket room
      socket.leave(roomName);

      // Confirm to the leaving player
      socket.emit('room-left', {
        roomName: roomName
      });

      // If room still exists, notify remaining players
      if (updatedRoom) {
        socket.to(roomName).emit('player-left', {
          playerId: socket.id,
          room: updatedRoom
        });
      }

      console.log(`✅ Player ${socket.id} left room "${roomName}"`);

    } catch (error) {
      console.error(`❌ Error leaving room:`, error);
      socket.emit('room-error', {
        message: error instanceof Error ? error.message : 'Failed to leave room'
      });
    }
  }

  // Handle disconnect event
  private handleDisconnect(socket: Socket, reason: string): void {
    console.log(`🔌 Player ${socket.id} disconnected: ${reason}`);

    try {
      const room = this.roomManager.findRoomByPlayerId(socket.id);
      
      if (room) {
        const roomName = room.name;
        const updatedRoom = this.roomManager.removePlayerFromRoom(socket.id);

        // Notify remaining players in the room
        if (updatedRoom) {
          socket.to(roomName).emit('player-left', {
            playerId: socket.id,
            room: updatedRoom,
            reason: 'disconnected'
          });
        }

        console.log(`🧹 Cleaned up player ${socket.id} from room "${roomName}"`);
      }

    } catch (error) {
      console.error(`❌ Error during disconnect cleanup:`, error);
    }

    // Log room statistics
    console.log(`📊 Current rooms: ${this.roomManager.getRoomCount()}`);
    console.log(`📊 Total players: ${this.roomManager.getTotalPlayers()}`);
  }

  // Get room manager instance (for external access if needed)
  getRoomManager(): RoomManager {
    return this.roomManager;
  }

  // Get room statistics
  getRoomStats() {
    return {
      totalRooms: this.roomManager.getRoomCount(),
      totalPlayers: this.roomManager.getTotalPlayers(),
      rooms: this.roomManager.getAllRooms().map(room => ({
        name: room.name,
        playerCount: room.gameState.players.length,
        status: room.gameState.gameStatus,
        createdAt: room.createdAt
      }))
    };
  }
}