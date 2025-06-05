import React, { useEffect, useState } from 'react';
import type { Player } from '../types/index';

export interface GameEndScreenProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Array of players with final scores */
  players: Player[];
  /** Current player (the one using this client) */
  currentPlayer: Player | null;
  /** Winner player ID */
  winnerId: string | null;
  /** Callback when return to lobby is clicked */
  onReturnToLobby: () => void;
  /** Callback when play again is clicked */
  onPlayAgain: () => void;
  /** Callback to close modal */
  onClose?: () => void;
}

const GameEndScreen: React.FC<GameEndScreenProps> = ({
  isOpen,
  players,
  currentPlayer,
  winnerId,
  onReturnToLobby,
  onPlayAgain,
  onClose
}) => {
  const [showCelebration, setShowCelebration] = useState(false);

  // Get winner and loser
  const winner = players.find(p => p.id === winnerId);
  const loser = players.find(p => p.id !== winnerId);
  const isCurrentPlayerWinner = currentPlayer?.id === winnerId;

  // Trigger celebration animation
  useEffect(() => {
    if (isOpen) {
      setShowCelebration(true);
      const timer = setTimeout(() => setShowCelebration(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  // Focus management for accessibility
  useEffect(() => {
    if (isOpen) {
      const focusableElements = document.querySelectorAll(
        '.game-end-modal button, .game-end-modal [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0] as HTMLElement;
      firstElement?.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const getPlayerName = (player: Player | undefined, index: number): string => {
    if (!player) return `Player ${index + 1}`;
    if (currentPlayer && player.id === currentPlayer.id) {
      return 'You';
    }
    return `Player ${index + 1}`;
  };

  const getPlayerColor = (index: number): string => {
    return index === 0 ? '#3b82f6' : '#ef4444';
  };

  return (
    <div 
      className="game-end-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        backdropFilter: 'blur(5px)',
        animation: 'fadeIn 0.3s ease-out'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) {
          onClose();
        }
      }}
    >
      <div 
        className="game-end-modal"
        style={{
          backgroundColor: '#1a1a1a',
          borderRadius: '16px',
          padding: '2rem',
          minWidth: '400px',
          maxWidth: '600px',
          border: '2px solid #374151',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
          animation: 'modalSlideIn 0.4s ease-out',
          position: 'relative'
        }}
      >
        {/* Close button */}
        {onClose && (
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '1rem',
              right: '1rem',
              background: 'none',
              border: 'none',
              color: '#9ca3af',
              fontSize: '1.5rem',
              cursor: 'pointer',
              padding: '0.5rem',
              borderRadius: '4px'
            }}
            aria-label="Close modal"
          >
            ×
          </button>
        )}

        {/* Celebration animations */}
        {showCelebration && isCurrentPlayerWinner && (
          <div
            style={{
              position: 'absolute',
              top: '-50px',
              left: '50%',
              transform: 'translateX(-50%)',
              fontSize: '3rem',
              animation: 'celebration 2s ease-out',
              pointerEvents: 'none'
            }}
          >
            🎉🏆🎉
          </div>
        )}

        {/* Winner announcement */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{
            fontSize: '2.5rem',
            marginBottom: '1rem',
            color: isCurrentPlayerWinner ? '#22c55e' : '#e5e7eb',
            textShadow: isCurrentPlayerWinner ? '0 0 20px #22c55e' : 'none',
            animation: showCelebration && isCurrentPlayerWinner ? 'pulse 1s infinite' : 'none'
          }}>
            {isCurrentPlayerWinner ? '🏆 Victory!' : '😔 Game Over'}
          </h1>
          
          <p style={{
            fontSize: '1.3rem',
            color: '#9ca3af',
            marginBottom: '1rem'
          }}>
            {isCurrentPlayerWinner 
              ? 'Congratulations! You won the game!' 
              : `${getPlayerName(winner, players.findIndex(p => p.id === winnerId))} wins the game!`
            }
          </p>
        </div>

        {/* Final scores */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '3rem',
          marginBottom: '2rem',
          padding: '1.5rem',
          backgroundColor: '#2a2a2a',
          borderRadius: '12px',
          border: '1px solid #374151'
        }}>
          {players.map((player, index) => (
            <div 
              key={player.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <div style={{
                fontSize: '1rem',
                color: getPlayerColor(index),
                fontWeight: 'bold'
              }}>
                {getPlayerName(player, index)}
                {player.id === winnerId && ' 👑'}
              </div>
              
              <div style={{
                fontSize: '3rem',
                fontWeight: 'bold',
                color: getPlayerColor(index),
                textShadow: player.id === winnerId ? `0 0 15px ${getPlayerColor(index)}` : 'none'
              }}>
                {player.score}
              </div>
              
              <div style={{
                fontSize: '0.9rem',
                color: '#9ca3af'
              }}>
                {player.id === winnerId ? 'Winner' : 'Runner-up'}
              </div>
            </div>
          ))}
        </div>

        {/* Match summary */}
        <div style={{
          textAlign: 'center',
          marginBottom: '2rem',
          padding: '1rem',
          backgroundColor: '#0f172a',
          borderRadius: '8px',
          border: '1px solid #1e293b'
        }}>
          <h3 style={{ color: '#3b82f6', marginBottom: '0.5rem' }}>Match Summary</h3>
          <p style={{ color: '#9ca3af', fontSize: '0.9rem' }}>
            Final Score: <strong style={{ color: '#e5e7eb' }}>
              {players[0]?.score || 0} - {players[1]?.score || 0}
            </strong>
          </p>
          <p style={{ color: '#9ca3af', fontSize: '0.9rem' }}>
            {winner && `${getPlayerName(winner, players.findIndex(p => p.id === winnerId))} won ${winner.score} to ${loser?.score || 0}`}
          </p>
        </div>

        {/* Action buttons */}
        <div style={{
          display: 'flex',
          gap: '1rem',
          justifyContent: 'center',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={onPlayAgain}
            style={{
              padding: '0.75rem 2rem',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#22c55e',
              color: 'white',
              fontSize: '1rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 12px rgba(34, 197, 94, 0.3)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#16a34a';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(34, 197, 94, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#22c55e';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(34, 197, 94, 0.3)';
            }}
          >
            🎮 Play Again
          </button>

          <button
            onClick={onReturnToLobby}
            style={{
              padding: '0.75rem 2rem',
              borderRadius: '8px',
              border: '2px solid #374151',
              backgroundColor: 'transparent',
              color: '#e5e7eb',
              fontSize: '1rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#374151';
              e.currentTarget.style.borderColor = '#4b5563';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.borderColor = '#374151';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            🏠 Return to Lobby
          </button>
        </div>

        {/* Tips for next game */}
        <div style={{
          marginTop: '1.5rem',
          textAlign: 'center',
          fontSize: '0.8rem',
          color: '#6b7280'
        }}>
          <p>💡 Tip: The ball speeds up with each paddle hit. Stay focused!</p>
        </div>
      </div>

      <style>
  {`
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes modalSlideIn {
      from {
        opacity: 0;
        transform: translateY(-30px) scale(0.95);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    @keyframes celebration {
      0% {
        transform: translateX(-50%) translateY(0) scale(1);
        opacity: 1;
      }
      50% {
        transform: translateX(-50%) translateY(-20px) scale(1.2);
        opacity: 1;
      }
      100% {
        transform: translateX(-50%) translateY(-40px) scale(1);
        opacity: 0;
      }
    }

    @keyframes pulse {
      0%, 100% {
        transform: scale(1);
      }
      50% {
        transform: scale(1.05);
      }
    }
  `}
</style>

    </div>
  );
};

export default GameEndScreen;