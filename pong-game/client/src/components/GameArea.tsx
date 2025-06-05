import React, { useCallback } from 'react';
import { useMouse } from '../hooks/useMouse';
import Paddle from './Paddle';
import type { Player, GameStatus } from '../types/index';
import '../styles/Game.css';

export interface GameAreaProps {
  /** Array of players in the game */
  players: Player[];
  /** Current player (the one using this client) */
  currentPlayer: Player | null;
  /** Current game status */
  gameStatus: GameStatus;
  /** Game area width in pixels */
  width?: number;
  /** Game area height in pixels */
  height?: number;
  /** Callback when paddle position changes */
  onPaddleMove?: (paddleY: number) => void;
  /** Whether to show debug information */
  showDebug?: boolean;
}

const GameArea: React.FC<GameAreaProps> = ({
  players,
  currentPlayer,
  gameStatus,
  width = 800,
  height = 400,
  onPaddleMove,
  showDebug = false
}) => {
  const paddleHeight = 80;

  // Mouse control hook
  const { mousePosition, handleMouseMove, resetPosition } = useMouse({
    gameAreaHeight: height,
    paddleHeight,
    throttleMs: 16, // ~60fps
    onPaddleMove: useCallback((paddleY: number) => {
      if (gameStatus === 'ready' || gameStatus === 'playing') {
        onPaddleMove?.(paddleY);
      }
    }, [gameStatus, onPaddleMove])
  });

  // Get player positions
  const getPlayerPaddleY = (player: Player): number => {
    if (currentPlayer && player.id === currentPlayer.id) {
      // Use mouse position for current player
      return mousePosition.paddleY;
    }
    // Use server-synchronized position for other players
    return player.paddleY;
  };

  // Determine player assignments
  const player1 = players[0] || null;
  const player2 = players[1] || null;

  // Game area classes
  const gameAreaClasses = [
    'game-area',
    gameStatus === 'waiting' ? 'game-area--waiting' : ''
  ].filter(Boolean).join(' ');

  // Game area styles
  const gameAreaStyles: React.CSSProperties = {
    width: `${width}px`,
    height: `${height}px`
  };

  // Get game status text
  const getStatusText = (): string => {
    switch (gameStatus) {
      case 'waiting':
        return 'Waiting for players...';
      case 'ready':
        return 'Ready to play!';
      case 'playing':
        return 'Game in progress';
      case 'paused':
        return 'Game paused';
      case 'finished':
        return 'Game finished';
      default:
        return 'Unknown status';
    }
  };

  return (
    <div className="game-container">
      <div
        className={gameAreaClasses}
        style={gameAreaStyles}
        onMouseMove={handleMouseMove}
        onMouseLeave={resetPosition}
      >
        {/* Game Status Overlay */}
        <div className="game-status">
          {getStatusText()}
        </div>

        {/* Score Display */}
        {player1 && player2 && (
          <div className="score-display">
            <span className="player1-score">{player1.score}</span>
            <span>:</span>
            <span className="player2-score">{player2.score}</span>
          </div>
        )}

        {/* Player 1 Paddle (Left) */}
        {player1 && (
          <Paddle
            y={getPlayerPaddleY(player1)}
            player={1}
            isCurrentPlayer={currentPlayer?.id === player1.id}
            height={paddleHeight}
          />
        )}

        {/* Player 2 Paddle (Right) */}
        {player2 && (
          <Paddle
            y={getPlayerPaddleY(player2)}
            player={2}
            isCurrentPlayer={currentPlayer?.id === player2.id}
            height={paddleHeight}
          />
        )}

        {/* Debug Information */}
        {showDebug && (
          <div className="mouse-debug">
            Mouse: ({Math.round(mousePosition.x)}, {Math.round(mousePosition.y)})<br/>
            Paddle Y: {Math.round(mousePosition.paddleY)}<br/>
            In Bounds: {mousePosition.isInBounds ? 'Yes' : 'No'}<br/>
            Current Player: {currentPlayer?.id || 'None'}
          </div>
        )}
      </div>

      {/* Game Controls Info */}
      <div style={{
        textAlign: 'center',
        color: '#9ca3af',
        fontSize: '0.9rem',
        maxWidth: '600px'
      }}>
        {gameStatus === 'waiting' && (
          <p>Waiting for another player to join the room...</p>
        )}
        {(gameStatus === 'ready' || gameStatus === 'playing') && currentPlayer && (
          <p>
            Move your mouse over the game area to control your paddle. 
            You are the <strong style={{ color: players[0]?.id === currentPlayer.id ? '#3b82f6' : '#ef4444' }}>
              {players[0]?.id === currentPlayer.id ? 'blue' : 'red'}
            </strong> paddle.
          </p>
        )}
      </div>
    </div>
  );
};

export default GameArea;