import React, { useState } from 'react';
import type { UseGameStateReturn } from '../hooks/useGameState';

interface LobbyProps {
  gameState: UseGameStateReturn;
  isConnected: boolean;
}

const Lobby: React.FC<LobbyProps> = ({ gameState, isConnected }) => {
  const [roomName, setRoomName] = useState('');
  const [playerName, setPlayerName] = useState('');

  const {
    currentRoom,
    players,
    currentPlayer,
    gameStatus,
    isInRoom,
    error,
    isLoading,
    joinRoom,
    leaveRoom,
    clearError
  } = gameState;

  const handleJoinRoom = () => {
    if (!roomName.trim() || !playerName.trim()) {
      return;
    }
    joinRoom(roomName, playerName);
  };

  const handleLeaveRoom = () => {
    leaveRoom();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading && isConnected && roomName.trim() && playerName.trim()) {
      handleJoinRoom();
    }
  };

  // If in a room, show room interface
  if (isInRoom && currentRoom) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: '100%',
        maxWidth: '600px',
        padding: '2rem',
        backgroundColor: '#2a2a2a',
        borderRadius: '12px',
        border: '2px solid #3b82f6'
      }}>
        <h2 style={{ 
          color: '#3b82f6', 
          marginBottom: '1.5rem',
          fontSize: '2rem'
        }}>
          🏠 Room: {currentRoom.name}
        </h2>

        {/* Game Status */}
        <div style={{
          padding: '1rem',
          backgroundColor: '#1a1a1a',
          borderRadius: '8px',
          marginBottom: '1.5rem',
          width: '100%',
          textAlign: 'center'
        }}>
          <h3 style={{ margin: '0 0 0.5rem 0', color: '#f59e0b' }}>Game Status</h3>
          <p style={{ 
            margin: 0, 
            fontSize: '1.2rem',
            color: gameStatus === 'ready' ? '#22c55e' : '#f59e0b',
            fontWeight: 'bold'
          }}>
            {gameStatus === 'waiting' && '⏳ Waiting for players...'}
            {gameStatus === 'ready' && '✅ Ready to play!'}
            {gameStatus === 'playing' && '🎮 Game in progress'}
            {gameStatus === 'paused' && '⏸️ Game paused'}
            {gameStatus === 'finished' && '🏁 Game finished'}
          </p>
        </div>

        {/* Players List */}
        <div style={{
          width: '100%',
          marginBottom: '1.5rem'
        }}>
          <h3 style={{ 
            margin: '0 0 1rem 0',
            color: '#e5e7eb',
            textAlign: 'center'
          }}>
            Players ({players.length}/2)
          </h3>
          
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem'
          }}>
            {players.map((player, index) => (
              <div
                key={player.id}
                style={{
                  padding: '0.75rem 1rem',
                  backgroundColor: player.id === currentPlayer?.id ? '#1e40af' : '#374151',
                  border: player.id === currentPlayer?.id ? '2px solid #3b82f6' : '1px solid #4b5563',
                  borderRadius: '6px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  color: 'white'
                }}
              >
                <span style={{ fontWeight: 'bold' }}>
                  {player.id === currentPlayer?.id ? '👤 You' : `👤 Player ${index + 1}`}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span style={{ fontSize: '0.9rem', color: '#9ca3af' }}>
                    Score: {player.score}
                  </span>
                  <span style={{
                    padding: '0.25rem 0.5rem',
                    borderRadius: '12px',
                    fontSize: '0.8rem',
                    backgroundColor: player.isReady ? '#22c55e' : '#f59e0b',
                    color: 'white'
                  }}>
                    {player.isReady ? 'Ready' : 'Not Ready'}
                  </span>
                </div>
              </div>
            ))}
            
            {/* Empty slots */}
            {Array.from({ length: 2 - players.length }, (_, index) => (
              <div
                key={`empty-${index}`}
                style={{
                  padding: '0.75rem 1rem',
                  backgroundColor: '#1a1a1a',
                  border: '2px dashed #4b5563',
                  borderRadius: '6px',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  color: '#6b7280',
                  fontStyle: 'italic'
                }}
              >
                Waiting for player...
              </div>
            ))}
          </div>
        </div>

        {/* Leave Room Button */}
        <button
          onClick={handleLeaveRoom}
          disabled={isLoading}
          style={{
            padding: '0.75rem 2rem',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: '#ef4444',
            color: 'white',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            fontSize: '1rem',
            fontWeight: 'bold',
            opacity: isLoading ? 0.7 : 1
          }}
        >
          {isLoading ? 'Leaving...' : 'Leave Room'}
        </button>
      </div>
    );
  }

  // Lobby interface for joining rooms
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      width: '100%',
      maxWidth: '500px',
      padding: '2rem',
      backgroundColor: '#2a2a2a',
      borderRadius: '12px',
      border: '2px solid #4b5563'
    }}>
      <h2 style={{ 
        color: '#3b82f6', 
        marginBottom: '2rem',
        fontSize: '2rem',
        textAlign: 'center'
      }}>
        🎮 Join Game Room
      </h2>

      {/* Error Message */}
      {error && (
        <div style={{
          width: '100%',
          padding: '1rem',
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '6px',
          marginBottom: '1rem',
          color: '#dc2626',
          textAlign: 'center'
        }}>
          <p style={{ margin: 0, fontWeight: 'bold' }}> {error}</p>
          <button
            onClick={clearError}
            style={{
              marginTop: '0.5rem',
              padding: '0.25rem 0.75rem',
              fontSize: '0.875rem',
              backgroundColor: 'transparent',
              border: '1px solid #dc2626',
              borderRadius: '4px',
              color: '#dc2626',
              cursor: 'pointer'
            }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Connection Status Warning */}
      {!isConnected && (
        <div style={{
          width: '100%',
          padding: '1rem',
          backgroundColor: '#fef3c7',
          border: '1px solid #fcd34d',
          borderRadius: '6px',
          marginBottom: '1rem',
          color: '#92400e',
          textAlign: 'center'
        }}>
          <p style={{ margin: 0, fontWeight: 'bold' }}>
            ⚠️ Not connected to server. Please wait for connection.
          </p>
        </div>
      )}

      {/* Input Fields */}
      <div style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        <div>
          <label style={{
            display: 'block',
            marginBottom: '0.5rem',
            color: '#e5e7eb',
            fontWeight: 'bold'
          }}>
            Player Name
          </label>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Enter your name..."
            disabled={isLoading || !isConnected}
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '6px',
              border: '2px solid #4b5563',
              backgroundColor: '#374151',
              color: 'white',
              fontSize: '1rem',
              outline: 'none',
              opacity: (isLoading || !isConnected) ? 0.7 : 1
            }}
          />
        </div>

        <div>
          <label style={{
            display: 'block',
            marginBottom: '0.5rem',
            color: '#e5e7eb',
            fontWeight: 'bold'
          }}>
            Room Name
          </label>
          <input
            type="text"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Enter room name..."
            disabled={isLoading || !isConnected}
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '6px',
              border: '2px solid #4b5563',
              backgroundColor: '#374151',
              color: 'white',
              fontSize: '1rem',
              outline: 'none',
              opacity: (isLoading || !isConnected) ? 0.7 : 1
            }}
          />
        </div>
      </div>

      {/* Join Room Button */}
      <button
        onClick={handleJoinRoom}
        disabled={!roomName.trim() || !playerName.trim() || isLoading || !isConnected}
        style={{
          width: '100%',
          padding: '1rem',
          borderRadius: '6px',
          border: 'none',
          backgroundColor: (!roomName.trim() || !playerName.trim() || isLoading || !isConnected) 
            ? '#6b7280' : '#3b82f6',
          color: 'white',
          cursor: (!roomName.trim() || !playerName.trim() || isLoading || !isConnected) 
            ? 'not-allowed' : 'pointer',
          fontSize: '1.1rem',
          fontWeight: 'bold',
          opacity: (!roomName.trim() || !playerName.trim() || isLoading || !isConnected) ? 0.7 : 1,
          transition: 'all 0.2s ease'
        }}
      >
        {isLoading ? 'Joining...' : 'Join Room'}
      </button>

      {/* Instructions */}
      <div style={{
        marginTop: '2rem',
        padding: '1rem',
        backgroundColor: '#1a1a1a',
        borderRadius: '8px',
        border: '1px solid #4b5563',
        width: '100%'
      }}>
        <h4 style={{ margin: '0 0 0.5rem 0', color: '#3b82f6' }}>How it works:</h4>
        <ul style={{
          margin: 0,
          paddingLeft: '1.5rem',
          color: '#9ca3af',
          lineHeight: '1.6'
        }}>
          <li>Enter your player name and room name</li>
          <li>If the room exists, you'll join it. Otherwise, a new room will be created</li>
          <li>Rooms can have a maximum of 2 players</li>
          <li>Game starts when both players are ready</li>
        </ul>
      </div>
    </div>
  );
};

export default Lobby;