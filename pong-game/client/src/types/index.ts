export interface Player {
  id: string;
  socketId: string;
  paddleY: number;
  score: number;
  isReady: boolean;
}

export interface Ball{
    x: number;
    y: number;
    velocityX: number;
    velocityY: number;
    speed: number;
}

export type GameStatus = 'waiting' | 'ready' | 'playing' | 'paused' | 'finished';

export interface GameState {
    id: string;
    players: Player[];
    ball: Ball;
    gameStatus: GameStatus;
    winner: string | null;
    lastUpdate: number;
}

export interface Room{
    id: string;
    name: string;
    gameState: GameState;
    createdAt: number;
}