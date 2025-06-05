import { Room, GameState, Player, Ball } from '../types/index';

export class RoomManager {
  private rooms: Map<string, Room> = new Map();
  private readonly MAX_PLAYERS = 2;

  // Create a new room
  createRoom(roomName: string): Room {
    if (this.rooms.has(roomName)) {
      throw new Error(`Room "${roomName}" already exists`);
    }

    const room: Room = {
      id: this.generateRoomId(),
      name: roomName,
      gameState: this.createInitialGameState(),
      createdAt: Date.now()
    };

    this.rooms.set(roomName, room);
    console.log(`Room "${roomName}" created with ID: ${room.id}`);
    return room;
  }

  // Join an existing room or create if it doesn't exist
  joinOrCreateRoom(roomName: string, player: Player): Room {
    let room = this.rooms.get(roomName);

    if (!room) {
      room = this.createRoom(roomName);
    }

    // Check room capacity
    if (room.gameState.players.length >= this.MAX_PLAYERS) {
      throw new Error(`Room "${roomName}" is full (${this.MAX_PLAYERS}/${this.MAX_PLAYERS})`);
    }

    // Check if player is already in the room
    const existingPlayer = room.gameState.players.find(p => p.id === player.id);
    if (existingPlayer) {
      console.log(`👤 Player ${player.id} already in room "${roomName}"`);
      return room;
    }

    // Add player to room
    room.gameState.players.push(player);
    console.log(`👤 Player ${player.id} joined room "${roomName}" (${room.gameState.players.length}/${this.MAX_PLAYERS})`);

    // Update game status if room is full
    if (room.gameState.players.length === this.MAX_PLAYERS) {
      room.gameState.gameStatus = 'ready';
      console.log(`🎮 Room "${roomName}" is now ready to play!`);
    }

    return room;
  }

  // Find room by name
  findRoomByName(roomName: string): Room | undefined {
    return this.rooms.get(roomName);
  }

  // Find room by player ID
  findRoomByPlayerId(playerId: string): Room | undefined {
    for (const room of this.rooms.values()) {
      if (room.gameState.players.some(player => player.id === playerId)) {
        return room;
      }
    }
    return undefined;
  }

  // Remove player from room
  removePlayerFromRoom(playerId: string): Room | null {
    const room = this.findRoomByPlayerId(playerId);
    if (!room) {
      console.warn(`⚠️ Player ${playerId} not found in any room`);
      return null;
    }

    // Remove player from room
    const playerIndex = room.gameState.players.findIndex(p => p.id === playerId);
    if (playerIndex !== -1) {
      const removedPlayer = room.gameState.players.splice(playerIndex, 1)[0];
      console.log(`👤 Player ${removedPlayer.id} removed from room "${room.name}"`);

      // Update game status
      if (room.gameState.players.length < this.MAX_PLAYERS) {
        room.gameState.gameStatus = 'waiting';
      }

      // Clean up empty room
      if (room.gameState.players.length === 0) {
        this.rooms.delete(room.name);
        console.log(`Empty room "${room.name}" cleaned up`);
        return null;
      }
    }

    return room;
  }

  // Get all rooms
  getAllRooms(): Room[] {
    return Array.from(this.rooms.values());
  }

  // Get room count
  getRoomCount(): number {
    return this.rooms.size;
  }

  // Get total players across all rooms
  getTotalPlayers(): number {
    return Array.from(this.rooms.values())
      .reduce((total, room) => total + room.gameState.players.length, 0);
  }

  // Clean up empty rooms (utility method)
  cleanupEmptyRooms(): number {
    let cleanedCount = 0;
    for (const [roomName, room] of this.rooms.entries()) {
      if (room.gameState.players.length === 0) {
        this.rooms.delete(roomName);
        cleanedCount++;
        console.log(`Cleaned up empty room "${roomName}"`);
      }
    }
    return cleanedCount;
  }

  // Private helper methods
  private generateRoomId(): string {
    return `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private createInitialGameState(): GameState {
    const initialBall: Ball = {
      x: 400, // Center of 800px game width
      y: 300, // Center of 600px game height
      velocityX: 5,
      velocityY: 3,
      speed: 5
    };

    return {
      id: this.generateRoomId(),
      players: [],
      ball: initialBall,
      gameStatus: 'waiting',
      winner: null,
      lastUpdate: Date.now()
    };
  }
}