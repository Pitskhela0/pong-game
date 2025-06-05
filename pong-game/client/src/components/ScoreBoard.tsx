import React, { useState, useEffect } from 'react';
import type { Player, GameStatus } from '../types/index';

export interface ScoreBoardProps {
  /** Array of players (should be 2 for pong) */
  players: Player[];
  /** Current player (the one using this client) */
  currentPlayer: Player | null;
  /** Current game status */
  gameStatus: GameStatus;
  /** Winner ID if game is finished */
  winnerId?: string | null;
  /** Whether to show player ready states */
  showReadyState?: boolean;
  /** Callback when player toggles ready state */
  onToggleReady?: (isReady: boolean) => void;
  /** Maximum score to win */
  maxScore?: number;
}

const ScoreBoard: React.FC<ScoreBoardProps> = ({
  players,
  currentPlayer,
  gameStatus,
  winnerId,
  showReadyState = true,
  onToggleReady,
  maxScore = 5
}) => {
  const [animatingScore, setAnimatingScore] = useState<string | null>(null);

  // Get players in consistent order (player 1 left, player 2 right)
  const player1 = players[0] || null;
  const player2 = players[1] || null;

  // Track score changes for animations
  useEffect(() => {
    if (animatingScore) {
      const timer = setTimeout(() => {
        setAnimatingScore(null);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [animatingScore]);

  // Trigger animation when scores change
  useEffect(() => {
    const prevScores = { player1: 0, player2: 0 };
    if (player1 && player1.score > prevScores.player1) {
      setAnimatingScore('player1');
    }
    if (player2 && player2.score > prevScores.player2) {
      setAnimatingScore('player2');
    }
  }, [player1?.score, player2?.score]);

  const getPlayerName = (player: Player | null, playerNumber: 1 | 2): string => {
    if (!player) return `Player ${playerNumber}`;
    
    if (currentPlayer && player.id === currentPlayer.id) {
      return `You (P${playerNumber})`;
    }
    
    return `Player ${playerNumber}`;
  };

  const getPlayerColor = (playerNumber: 1 | 2): string => {
    return playerNumber === 1 ? '#3b82f6' : '#ef4444';
  };

  const isWinner = (player: Player | null): boolean => {
    return winnerId !== null && player?.id === winnerId;
  };

  const isCurrentPlayer = (player: Player | null): boolean => {
    return currentPlayer !== null && player?.id === currentPlayer.id;
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '1rem',
      padding: '1rem',
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      borderRadius: '12px',
      border: '2px solid #374151',
      backdropFilter: 'blur(5px)',
      minWidth: '400px'
    }}>
      {/* Game Status */}
      <div style={{
        fontSize: '1.1rem',
        fontWeight: 'bold',
        color: '#e5e7eb',
        textAlign: 'center'
      }}>
        {gameStatus === 'waiting' && 'Waiting for players...'}
        {gameStatus === 'ready' && 'Ready to play!'}
        {gameStatus === 'playing' && 'Game in progress'}
        {gameStatus === 'paused' && 'Game paused'}
        {gameStatus === 'finished' && winnerId && (
          <span style={{ color: '#22c55e' }}>
            🏆 {isCurrentPlayer(players.find(p => p.id === winnerId) || null) ? 'You win!' : `${getPlayerName(players.find(p => p.id === winnerId) || null, players.findIndex(p => p.id === winnerId) + 1 as 1 | 2)} wins!`}
          </span>
        )}
      </div>

      {/* Score Display */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '3rem',
        fontSize: '3rem',
        fontWeight: 'bold'
      }}>
        {/* Player 1 Score */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <div style={{
            fontSize: '1rem',
            color: getPlayerColor(1),
            fontWeight: 'bold',
            textAlign: 'center'
          }}>
            {getPlayerName(player1, 1)}
          </div>
          <div style={{
            color: getPlayerColor(1),
            textShadow: isWinner(player1) ? `0 0 20px ${getPlayerColor(1)}` : 'none',
            transform: animatingScore === 'player1' ? 'scale(1.2)' : 'scale(1)',
            transition: 'all 0.3s ease'
          }}>
            {player1?.score || 0}
          </div>
          {isWinner(player1) && (
            <div style={{
              fontSize: '1.5rem',
              animation: 'bounce 1s infinite'
            }}>
              🏆
            </div>
          )}
        </div>

        {/* Separator */}
        <div style={{
          color: '#9ca3af',
          fontSize: '2rem'
        }}>
          :
        </div>

        {/* Player 2 Score */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <div style={{
            fontSize: '1rem',
            color: getPlayerColor(2),
            fontWeight: 'bold',
            textAlign: 'center'
          }}>
            {getPlayerName(player2, 2)}
          </div>
          <div style={{
            color: getPlayerColor(2),
            textShadow: isWinner(player2) ? `0 0 20px ${getPlayerColor(2)}` : 'none',
            transform: animatingScore === 'player2' ? 'scale(1.2)' : 'scale(1)',
            transition: 'all 0.3s ease'
          }}>
            {player2?.score || 0}
          </div>
          {isWinner(player2) && (
            <div style={{
              fontSize: '1.5rem',
              animation: 'bounce 1s infinite'
            }}>
              🏆
            </div>
          )}
        </div>
      </div>

      {/* Win Condition Indicator */}
      <div style={{
        fontSize: '0.9rem',
        color: '#9ca3af',
        textAlign: 'center'
      }}>
        First to {maxScore} points wins
      </div>

      {/* Player Ready States */}
      {showReadyState && (gameStatus === 'ready' || gameStatus === 'waiting') && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          width: '100%',
          gap: '2rem'
        }}>
          {/* Player 1 Ready */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.9rem'
          }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: player1?.isReady ? '#22c55e' : '#6b7280'
            }} />
            <span style={{ color: player1?.isReady ? '#22c55e' : '#9ca3af' }}>
              {player1?.isReady ? 'Ready' : 'Not Ready'}
            </span>
          </div>

          {/* Ready Toggle for Current Player */}
          {currentPlayer && onToggleReady && (
            <button
              onClick={() => onToggleReady(!currentPlayer.isReady)}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: currentPlayer.isReady ? '#ef4444' : '#22c55e',
                color: 'white',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: 'bold'
              }}
            >
              {currentPlayer.isReady ? 'Not Ready' : 'Ready'}
            </button>
          )}

          {/* Player 2 Ready */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.9rem'
          }}>
            <span style={{ color: player2?.isReady ? '#22c55e' : '#9ca3af' }}>
              {player2?.isReady ? 'Ready' : 'Not Ready'}
            </span>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: player2?.isReady ? '#22c55e' : '#6b7280'
            }} />
          </div>
        </div>
      )}

      {/* Game Finished Actions */}
      {gameStatus === 'finished' && onToggleReady && (
        <div style={{
          display: 'flex',
          gap: '1rem',
          marginTop: '1rem',
          justifyContent: 'center'
        }}>
          <button
            onClick={() => onToggleReady(true)}
            style={{
              padding: '0.75rem 1.5rem',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: '#22c55e',
              color: 'white',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: 'bold',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#16a34a';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#22c55e';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            🎮 Ready for Next Game
          </button>
        </div>
      )}
    </div>
  );
};

export default ScoreBoard;