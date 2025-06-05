import { Server, Socket } from 'socket.io';
import { RoomManager } from './roomManager';
import { GameEngine } from './gameEngine';
import { Player } from '../types/index';

export class SocketHandler {
  private io: Server;
  private roomManager: RoomManager;
  private gameEngine: GameEngine;
  private readonly MAX_PLAYERS = 2;

  constructor(io: Server) {
    this.io = io;
    this.roomManager = new RoomManager();
    this.gameEngine = new GameEngine(io);
  }

  // Setup all socket event handlers
  setupSocketHandlers(socket: Socket): void {
    console.log(`Setting up handlers for socket: ${socket.id}`);

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

    // Handle paddle movement
    socket.on('paddle-move', (data: { paddleY: number }) => {
      this.handlePaddleMove(socket, data);
    });

    // Handle player ready toggle
    socket.on('player-ready', (data: { isReady: boolean }) => {
      this.handlePlayerReady(socket, data);
    });

    // Handle return to lobby
    socket.on('return-to-lobby', () => {
      this.handleReturnToLobby(socket);
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
        paddleY: 250, // Center paddle position (400px height - 80px paddle = 320px max, so 160px is center)
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
      console.log(`Room status: ${room.gameState.players.length}/${this.MAX_PLAYERS} players`);

      // Update game status if room is full
      if (room.gameState.players.length === this.MAX_PLAYERS) {
        room.gameState.gameStatus = 'ready';
        console.log(`🎮 Room "${roomName}" is now ready to play!`);
      }

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
      
      // Stop game if it was running
      this.gameEngine.stopGame(roomName);
      
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
    console.log(`Player ${socket.id} disconnected: ${reason}`);

    try {
      const room = this.roomManager.findRoomByPlayerId(socket.id);
      
      if (room) {
        const roomName = room.name;
        
        // Stop game if it was running
        this.gameEngine.stopGame(roomName);
        
        const updatedRoom = this.roomManager.removePlayerFromRoom(socket.id);

        // Notify remaining players in the room
        if (updatedRoom) {
          // Update game status since player left
          if (updatedRoom.gameState.players.length < this.MAX_PLAYERS) {
            updatedRoom.gameState.gameStatus = 'waiting';
          }
          
          socket.to(roomName).emit('player-left', {
            playerId: socket.id,
            room: updatedRoom,
            reason: 'disconnected'
          });
        }

        console.log(`Cleaned up player ${socket.id} from room "${roomName}"`);
      }

    } catch (error) {
      console.error(`❌ Error during disconnect cleanup:`, error);
    }

    // Log room statistics
    console.log(`Current rooms: ${this.roomManager.getRoomCount()}`);
    console.log(`Total players: ${this.roomManager.getTotalPlayers()}`);
  }

  // Handle paddle movement
  private handlePaddleMove(socket: Socket, data: { paddleY: number }): void {
    try {
      const { paddleY } = data;

      // Validate paddle position (should be between 0 and 320 for 400px game height - 80px paddle height)
      if (typeof paddleY !== 'number' || paddleY < 0 || paddleY > 320) {
        console.warn(`⚠️ Invalid paddle position from ${socket.id}: ${paddleY}`);
        return;
      }

      // Find the player's room
      const room = this.roomManager.findRoomByPlayerId(socket.id);
      if (!room) {
        console.warn(`⚠️ Player ${socket.id} not in any room for paddle move`);
        return;
      }

      // Update the player's paddle position
      const player = room.gameState.players.find(p => p.id === socket.id);
      if (!player) {
        console.warn(`⚠️ Player ${socket.id} not found in room for paddle move`);
        return;
      }

      // Update paddle position
      player.paddleY = paddleY;
      room.gameState.lastUpdate = Date.now();

      // Broadcast paddle position to other players in the room
      socket.to(room.name).emit('paddle-moved', {
        playerId: socket.id,
        paddleY: paddleY,
        timestamp: room.gameState.lastUpdate
      });

    } catch (error) {
      console.error(`❌ Error handling paddle move from ${socket.id}:`, error);
    }
  }

  // Handle player ready toggle
  private handlePlayerReady(socket: Socket, data: { isReady: boolean }): void {
    try {
      const { isReady } = data;

      // Find the player's room
      const room = this.roomManager.findRoomByPlayerId(socket.id);
      if (!room) {
        console.warn(`⚠️ Player ${socket.id} not in any room for ready toggle`);
        return;
      }

      // Update the player's ready status
      const player = room.gameState.players.find(p => p.id === socket.id);
      if (!player) {
        console.warn(`⚠️ Player ${socket.id} not found in room for ready toggle`);
        return;
      }

      player.isReady = isReady;
      room.gameState.lastUpdate = Date.now();

      console.log(`Player ${socket.id} is ${isReady ? 'ready' : 'not ready'} in room "${room.name}"`);

      // Broadcast player ready status to all players in the room
      this.io.to(room.name).emit('player-ready-update', {
        playerId: socket.id,
        isReady: isReady,
        room: room
      });

      // Try to start game if all players are ready
      if (room.gameState.players.length === 2 && room.gameState.players.every(p => p.isReady)) {
        console.log(`🚀 All players ready in room "${room.name}", starting game!`);
        this.gameEngine.tryStartGame(room);
      }

    } catch (error) {
      console.error(`❌ Error handling player ready from ${socket.id}:`, error);
    }
  }

  // Handle return to lobby
  private handleReturnToLobby(socket: Socket): void {
    try {
      // Find the player's room
      const room = this.roomManager.findRoomByPlayerId(socket.id);
      if (!room) {
        console.warn(`⚠️ Player ${socket.id} not in any room for return to lobby`);
        return;
      }

      console.log(`Player ${socket.id} returning to lobby in room "${room.name}"`);

      // Stop the game if it's running
      this.gameEngine.stopGame(room.name);

      // Reset game state
      room.gameState.gameStatus = 'waiting';
      room.gameState.winner = null;
      room.gameState.ball = {
        x: 400, // Center of 800px game width
        y: 200, // Center of 400px game height
        velocityX: 5,
        velocityY: 3,
        speed: 200
      };

      // Reset all players
      room.gameState.players.forEach(player => {
        player.score = 0;
        player.isReady = false;
        player.paddleY = 160; // Center paddle position (400px/2 - 80px/2 = 160px)
      });

      // Update room status based on player count
      if (room.gameState.players.length === 2) {
        room.gameState.gameStatus = 'ready';
      } else {
        room.gameState.gameStatus = 'waiting';
      }

      room.gameState.lastUpdate = Date.now();

      // Broadcast updated room state to all players
      this.io.to(room.name).emit('returned-to-lobby', {
        room: room,
        message: 'Game has been reset. Ready up to play again!'
      });

      console.log(`Room "${room.name}" reset to lobby state`);

    } catch (error) {
      console.error(`Error handling return to lobby from ${socket.id}:`, error);
      socket.emit('room-error', {
        message: 'Failed to return to lobby'
      });
    }
  }

  // Get room manager instance (for external access if needed)
  getRoomManager(): RoomManager {
    return this.roomManager;
  }

  // Get game engine instance
  getGameEngine(): GameEngine {
    return this.gameEngine;
  }

  // Get room statistics
  getRoomStats() {
    const gameStats = this.gameEngine.getGameStats();
    
    return {
      totalRooms: this.roomManager.getRoomCount(),
      totalPlayers: this.roomManager.getTotalPlayers(),
      activeGames: gameStats.activeGames,
      rooms: this.roomManager.getAllRooms().map(room => ({
        name: room.name,
        playerCount: room.gameState.players.length,
        status: room.gameState.gameStatus,
        createdAt: room.createdAt,
        isGameRunning: gameStats.totalRooms.includes(room.name)
      }))
    };
  }

  // Cleanup method
  destroy(): void {
    console.log('Destroying SocketHandler...');
    this.gameEngine.destroy();
  }
}