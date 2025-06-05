import React, { useCallback } from 'react';
import { useMouse } from '../hooks/useMouse';
import Paddle from './Paddle';
import Ball from './Ball';
import ScoreBoard from './ScoreBoard';
import type { Player, GameStatus, Ball as BallType } from '../types/index';
import '../styles/Game.css';

export interface GameAreaProps {
  /** Array of players in the game */
  players: Player[];
  /** Current player (the one using this client) */
  currentPlayer: Player | null;
  /** Current game status */
  gameStatus: GameStatus;
  /** Ball state */
  ball: BallType | null;
  /** Winner ID if game finished */
  winnerId?: string | null;
  /** Game area width in pixels */
  width?: number;
  /** Game area height in pixels */
  height?: number;
  /** Callback when paddle position changes */
  onPaddleMove?: (paddleY: number) => void;
  /** Callback when player toggles ready state */
  onToggleReady?: (isReady: boolean) => void;
  /** Whether to show debug information */
  showDebug?: boolean;
}

const GameArea: React.FC<GameAreaProps> = ({
  players,
  currentPlayer,
  gameStatus,
  ball,
  winnerId,
  width = 800,
  height = 400,
  onPaddleMove,
  onToggleReady,
  showDebug = false
}) => {
  const paddleHeight = 80;

  // Mouse control hook
  const { mousePosition, handleMouseMove, resetPosition } = useMouse({
    gameAreaHeight: height,
    paddleHeight,
    throttleMs: 16, // 60fps
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

  // Get status text for overlay
  const getStatusOverlayText = (): string => {
    if (gameStatus === 'playing') return 'Game in progress';
    if (gameStatus === 'paused') return 'Game paused';
    return '';
  };

  return (
    <div className="game-container">
      {/* ScoreBoard */}
      <ScoreBoard
        players={players}
        currentPlayer={currentPlayer}
        gameStatus={gameStatus}
        winnerId={winnerId}
        onToggleReady={onToggleReady}
        showReadyState={gameStatus === 'ready' || gameStatus === 'waiting' || gameStatus === 'finished'}
      />

      <div
        className={gameAreaClasses}
        style={gameAreaStyles}
        onMouseMove={handleMouseMove}
        onMouseLeave={resetPosition}
      >
        {(gameStatus === 'playing' || gameStatus === 'paused') && (
          <div className="game-status">
            {getStatusOverlayText()}
          </div>
        )
        }



        {ball && (gameStatus === 'playing' || gameStatus === 'paused') && (
          <Ball
            x={ball.x}
            y={ball.y}
            size={15}
            showTrail={gameStatus === 'playing'}
          />
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
            Current Player: {currentPlayer?.id || 'None'}<br/>
            {ball && (
              <>
                Ball: ({Math.round(ball.x)}, {Math.round(ball.y)})<br/>
                Ball Speed: {Math.round(ball.speed)}px/s<br/>
                Ball Velocity: ({Math.round(ball.velocityX)}, {Math.round(ball.velocityY)})
              </>
            )}
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
        {gameStatus === 'ready' && players.length === 2 && (
          <p>
            Both players ready! Move your mouse over the game area to control your paddle.
            You are the <strong style={{ color: players[0]?.id === currentPlayer?.id ? '#3b82f6' : '#ef4444' }}>
              {players[0]?.id === currentPlayer?.id ? 'blue (left)' : 'red (right)'}
            </strong> paddle.
          </p>
        )}
        {(gameStatus === 'playing' || gameStatus === 'paused') && currentPlayer && (
          <p>
            Move your mouse over the game area to control your paddle. 
            You are the <strong style={{ color: players[0]?.id === currentPlayer?.id ? '#3b82f6' : '#ef4444' }}>
              {players[0]?.id === currentPlayer?.id ? 'blue (left)' : 'red (right)'}
            </strong> paddle.
          </p>
        )}
        {gameStatus === 'finished' && (
          <p style={{ color: '#22c55e', fontWeight: 'bold' }}>
            🎉 Game finished! {winnerId === currentPlayer?.id ? 'Congratulations!' : 'Better luck next time!'}
          </p>
        )}
      </div>
    </div>
  );
};

export default GameArea;