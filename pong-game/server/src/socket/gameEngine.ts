import { Server } from 'socket.io';
import { BallPhysics, DEFAULT_GAME_DIMENSIONS } from '../utils/gamePhysics';
import type { Room, Ball, GameStatus } from '../types/index';

export interface GameEngineEvents {
  gameStateUpdate: (roomName: string, gameState: any) => void;
  playerScored: (roomName: string, playerId: string, score: number) => void;
  gameFinished: (roomName: string, winnerId: string) => void;
}

export class GameEngine {
  private io: Server;
  private physics: BallPhysics;
  private gameLoops: Map<string, NodeJS.Timeout> = new Map();
  private lastUpdateTimes: Map<string, number> = new Map();
  private readonly FPS = 60;
  private readonly FRAME_TIME = 1000 / this.FPS; // 16.67ms
  private readonly WINNING_SCORE = 5;

  constructor(io: Server) {
    this.io = io;
    this.physics = new BallPhysics(DEFAULT_GAME_DIMENSIONS);
  }

  /**
   * Start game for a specific room
   */
  startGame(room: Room): void {
    if (this.gameLoops.has(room.name)) {
      console.log(`🎮 Game already running for room "${room.name}"`);
      return;
    }

    if (room.gameState.players.length < 2) {
      console.warn(`⚠️ Cannot start game - room "${room.name}" needs 2 players`);
      return;
    }

    console.log(`🚀 Starting game for room "${room.name}"`);

    // Initialize game state
    room.gameState.gameStatus = 'playing';
    room.gameState.ball = this.physics.createInitialBall();
    room.gameState.lastUpdate = Date.now();

    // Reset player scores
    room.gameState.players.forEach(player => {
      player.score = 0;
      player.isReady = true;
    });

    // Start game loop
    this.lastUpdateTimes.set(room.name, Date.now());
    
    const gameLoop = setInterval(() => {
      this.updateGame(room);
    }, this.FRAME_TIME);

    this.gameLoops.set(room.name, gameLoop);

    // Broadcast game start
    this.broadcastGameState(room);
    
    console.log(`✅ Game started for room "${room.name}" with ${this.FPS} FPS`);
  }

  /**
   * Stop game for a specific room
   */
  stopGame(roomName: string): void {
    const gameLoop = this.gameLoops.get(roomName);
    if (gameLoop) {
      clearInterval(gameLoop);
      this.gameLoops.delete(roomName);
      this.lastUpdateTimes.delete(roomName);
      console.log(`🛑 Game stopped for room "${roomName}"`);
    }
  }

  /**
   * Pause game for a specific room
   */
  pauseGame(room: Room): void {
    this.stopGame(room.name);
    room.gameState.gameStatus = 'paused';
    this.broadcastGameState(room);
    console.log(`⏸️ Game paused for room "${room.name}"`);
  }

  /**
   * Resume game for a specific room
   */
  resumeGame(room: Room): void {
    if (room.gameState.gameStatus === 'paused') {
      room.gameState.gameStatus = 'playing';
      this.startGame(room);
      console.log(`▶️ Game resumed for room "${room.name}"`);
    }
  }

  /**
   * Main game update loop
   */
  private updateGame(room: Room): void {
    const currentTime = Date.now();
    const lastTime = this.lastUpdateTimes.get(room.name) || currentTime;
    const deltaTime = (currentTime - lastTime) / 1000; // Convert to seconds

    // Update last time
    this.lastUpdateTimes.set(room.name, currentTime);

    // Skip if deltaTime is too large (game was paused)
    if (deltaTime > 0.1) {
      return;
    }

    try {
      // Update ball position
      room.gameState.ball = this.physics.updateBallPosition(room.gameState.ball, deltaTime);

      // Check paddle collisions
      const paddleHit = this.physics.checkPaddleCollisions(room.gameState.ball, room.gameState.players);
      
      if (paddleHit) {
        console.log(`🏓 Ball hit paddle in room "${room.name}"`);
      }

      // Check scoring collisions
      const scoring = this.physics.checkScoringCollisions(room.gameState.ball);
      
      if (scoring) {
        this.handleScoring(room, scoring);
        return; // Don't broadcast this frame, let scoring handle it
      }

      // Update game state timestamp
      room.gameState.lastUpdate = currentTime;

      // Broadcast updated game state
      this.broadcastGameState(room);

    } catch (error) {
      console.error(`❌ Error updating game for room "${room.name}":`, error);
      this.stopGame(room.name);
    }
  }

  /**
   * Handle scoring events
   */
  private handleScoring(room: Room, side: 'left' | 'right'): void {
    // Determine who scored
    let scoringPlayer;
    let scoringPlayerName;
    
    if (side === 'left') {
      // Ball went off left side, player 2 (right) scores
      scoringPlayer = room.gameState.players[1];
      scoringPlayerName = 'Player 2 (Right)';
    } else {
      // Ball went off right side, player 1 (left) scores
      scoringPlayer = room.gameState.players[0];
      scoringPlayerName = 'Player 1 (Left)';
    }

    if (!scoringPlayer) {
      console.error(`❌ No scoring player found for side "${side}" in room "${room.name}"`);
      return;
    }

    // Increase score
    scoringPlayer.score++;
    
    console.log(`🎯 ${scoringPlayerName} scored! Score: ${scoringPlayer.score} in room "${room.name}"`);

    // Reset ball to center with initial speed
    room.gameState.ball = this.physics.resetBall();
    room.gameState.lastUpdate = Date.now();

    // Broadcast point scored event
    this.io.to(room.name).emit('point-scored', {
      playerId: scoringPlayer.id,
      playerName: scoringPlayerName,
      score: scoringPlayer.score,
      side: side,
      gameState: room.gameState,
      timestamp: Date.now()
    });

    // Check for game end
    if (scoringPlayer.score >= this.WINNING_SCORE) {
      // Small delay before ending game to let clients process the score
      setTimeout(() => {
        this.endGame(room, scoringPlayer.id);
      }, 1500);
      return;
    }

    // Brief pause before continuing play
    setTimeout(() => {
      if (room.gameState.gameStatus === 'playing') {
        this.broadcastGameState(room);
      }
    }, 2000);
  }

  /**
   * End the game
   */
  private endGame(room: Room, winnerId: string): void {
    const winner = room.gameState.players.find(p => p.id === winnerId);
    const winnerName = winner ? 
      (room.gameState.players[0].id === winnerId ? 'Player 1 (Left)' : 'Player 2 (Right)') : 
      'Unknown Player';
    
    console.log(`🏆 Game finished! Winner: ${winnerName} (${winnerId}) in room "${room.name}"`);

    // Stop game loop
    this.stopGame(room.name);

    // Update game status
    room.gameState.gameStatus = 'finished';
    room.gameState.winner = winnerId;
    room.gameState.lastUpdate = Date.now();

    // Reset player ready states
    room.gameState.players.forEach(player => {
      player.isReady = false;
    });

    // Broadcast game end
    this.broadcastGameState(room);
    
    this.io.to(room.name).emit('game-ended', {
      winnerId,
      winnerName,
      finalScores: {
        player1: room.gameState.players[0]?.score || 0,
        player2: room.gameState.players[1]?.score || 0
      },
      gameState: room.gameState,
      timestamp: Date.now()
    });
  }

  /**
   * Broadcast game state to all players in room
   */
  private broadcastGameState(room: Room): void {
    this.io.to(room.name).emit('game-state-update', {
      gameState: room.gameState,
      timestamp: Date.now()
    });
  }

  /**
   * Check if room can start game
   */
  canStartGame(room: Room): boolean {
    return room.gameState.players.length === 2 && 
           room.gameState.players.every(player => player.isReady) &&
           room.gameState.gameStatus === 'ready';
  }

  /**
   * Try to start game if conditions are met
   */
  tryStartGame(room: Room): boolean {
    if (this.canStartGame(room)) {
      this.startGame(room);
      return true;
    }
    return false;
  }

  /**
   * Get game statistics
   */
  getGameStats(): { activeGames: number; totalRooms: string[] } {
    return {
      activeGames: this.gameLoops.size,
      totalRooms: Array.from(this.gameLoops.keys())
    };
  }

  /**
   * Clean up game engine
   */
  destroy(): void {
    console.log('Destroying game engine...');
    
    // Stop all game loops
    for (const [roomName, gameLoop] of this.gameLoops.entries()) {
      clearInterval(gameLoop);
      console.log(`🛑 Stopped game loop for room "${roomName}"`);
    }
    
    this.gameLoops.clear();
    this.lastUpdateTimes.clear();
  }

  /**
   * Reset game for room (for restarting)
   */
  resetGame(room: Room): void {
    this.stopGame(room.name);
    room.gameState.gameStatus = 'ready';
    room.gameState.winner = null;
    room.gameState.ball = this.physics.createInitialBall();
    room.gameState.players.forEach(player => {
      player.score = 0;
      player.isReady = false;
    });
    this.broadcastGameState(room);
  }
}