import React, { useEffect, useRef } from 'react';
import { useSocket } from './hooks/useSocket';
import { useGameState } from './hooks/useGameState';
import Lobby from './components/Lobby';

function App() {
  const { 
    socketService,
    connectionStatus, 
    isConnected, 
    error: socketError, 
    connect, 
    disconnect, 
    sendPing 
  } = useSocket();

  const gameState = useGameState(socketService);
  const hasAutoConnectedRef = useRef(false);

  // Auto-connect on component mount - but only once
  useEffect(() => {
    if (!hasAutoConnectedRef.current) {
      console.log('🚀 Auto-connecting to server...');
      hasAutoConnectedRef.current = true;
      connect();
    }
  }, [connect]);

  // Connection status styling
  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return '#22c55e'; // green
      case 'connecting': return '#f59e0b'; // yellow
      case 'error': return '#ef4444'; // red
      default: return '#6b7280'; // gray
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return '🟢 Connected';
      case 'connecting': return '🟡 Connecting...';
      case 'error': return '🔴 Connection Error';
      default: return '⚫ Disconnected';
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#1a1a1a',
      color: 'white',
      padding: '1rem'
    }}>
      <h1 style={{ marginBottom: '2rem', fontSize: '3rem', textAlign: 'center' }}>
        🏓 Pong Game
      </h1>
      
      {/* Connection Status */}
      <div style={{
        padding: '1rem 2rem',
        borderRadius: '8px',
        backgroundColor: '#2a2a2a',
        border: `2px solid ${getStatusColor()}`,
        marginBottom: '2rem',
        minWidth: '300px',
        textAlign: 'center'
      }}>
        <h3 style={{ margin: '0 0 0.5rem 0' }}>Connection Status</h3>
        <p style={{ 
          margin: 0, 
          color: getStatusColor(),
          fontWeight: 'bold',
          fontSize: '1.2rem'
        }}>
          {getStatusText()}
        </p>
        {socketError && (
          <p style={{ 
            margin: '0.5rem 0 0 0', 
            color: '#ef4444',
            fontSize: '0.9rem'
          }}>
            Error: {socketError}
          </p>
        )}
      </div>

      {/* Main Game Area - Show Lobby */}
      <div style={{
        width: '100%',
        maxWidth: '800px',
        display: 'flex',
        justifyContent: 'center',
        marginBottom: '2rem'
      }}>
        <Lobby gameState={gameState} isConnected={isConnected} />
      </div>

      {/* Debug/Control Panel - Only show when connected */}
      {isConnected && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1rem',
          padding: '1.5rem',
          backgroundColor: '#2a2a2a',
          borderRadius: '8px',
          border: '1px solid #4b5563',
          width: '100%',
          maxWidth: '600px'
        }}>
          <h4 style={{ margin: 0, color: '#9ca3af' }}>Debug Controls</h4>
          
          {/* Control Buttons */}
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              onClick={connect}
              disabled={isConnected || connectionStatus === 'connecting'}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: isConnected ? '#6b7280' : '#22c55e',
                color: 'white',
                cursor: isConnected ? 'not-allowed' : 'pointer',
                fontSize: '0.9rem',
                fontWeight: 'bold'
              }}
            >
              Reconnect
            </button>
            
            <button
              onClick={disconnect}
              disabled={!isConnected}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: !isConnected ? '#6b7280' : '#ef4444',
                color: 'white',
                cursor: !isConnected ? 'not-allowed' : 'pointer',
                fontSize: '0.9rem',
                fontWeight: 'bold'
              }}
            >
              Disconnect
            </button>
            
            <button
              onClick={() => sendPing('Test ping from React!')}
              disabled={!isConnected}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: !isConnected ? '#6b7280' : '#3b82f6',
                color: 'white',
                cursor: !isConnected ? 'not-allowed' : 'pointer',
                fontSize: '0.9rem',
                fontWeight: 'bold'
              }}
            >
              Send Ping
            </button>
          </div>

          {/* Game State Debug Info */}
          {gameState.isInRoom && (
            <div style={{
              width: '100%',
              padding: '1rem',
              backgroundColor: '#1a1a1a',
              borderRadius: '6px',
              border: '1px solid #374151'
            }}>
              <h5 style={{ margin: '0 0 0.5rem 0', color: '#3b82f6' }}>Room Debug Info:</h5>
              <div style={{ fontSize: '0.8rem', color: '#9ca3af', fontFamily: 'monospace' }}>
                <div>Room ID: {gameState.currentRoom?.id}</div>
                <div>Room Name: {gameState.currentRoom?.name}</div>
                <div>Players: {gameState.players.length}/2</div>
                <div>Status: {gameState.gameStatus}</div>
                <div>Current Player ID: {gameState.currentPlayer?.id}</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Instructions - Only show when not in room */}
      {!gameState.isInRoom && (
        <div style={{
          maxWidth: '600px',
          textAlign: 'center',
          color: '#9ca3af',
          lineHeight: '1.6',
          marginTop: '1rem'
        }}>
          <p>
            Welcome to the Pong game! Connect to the server and join a room to start playing. 
            You can create a new room or join an existing one. Each room supports up to 2 players.
          </p>
        </div>
      )}
    </div>
  );
}

export default App;