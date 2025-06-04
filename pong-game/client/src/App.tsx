import React, { useEffect, useRef } from 'react';
import { useSocket } from './hooks/useSocket';

function App() {
  const { 
    connectionStatus, 
    isConnected, 
    error, 
    connect, 
    disconnect, 
    sendPing 
  } = useSocket();

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
      height: '100vh',
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#1a1a1a',
      color: 'white'
    }}>
      <h1 style={{ marginBottom: '2rem', fontSize: '3rem' }}>
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
        {error && (
          <p style={{ 
            margin: '0.5rem 0 0 0', 
            color: '#ef4444',
            fontSize: '0.9rem'
          }}>
            Error: {error}
          </p>
        )}
      </div>

      {/* Control Buttons */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        <button
          onClick={connect}
          disabled={isConnected || connectionStatus === 'connecting'}
          style={{
            padding: '0.75rem 1.5rem',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: isConnected ? '#6b7280' : '#22c55e',
            color: 'white',
            cursor: isConnected ? 'not-allowed' : 'pointer',
            fontSize: '1rem',
            fontWeight: 'bold'
          }}
        >
          Connect
        </button>
        
        <button
          onClick={disconnect}
          disabled={!isConnected}
          style={{
            padding: '0.75rem 1.5rem',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: !isConnected ? '#6b7280' : '#ef4444',
            color: 'white',
            cursor: !isConnected ? 'not-allowed' : 'pointer',
            fontSize: '1rem',
            fontWeight: 'bold'
          }}
        >
          Disconnect
        </button>
        
        <button
          onClick={() => sendPing('Test ping from React!')}
          disabled={!isConnected}
          style={{
            padding: '0.75rem 1.5rem',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: !isConnected ? '#6b7280' : '#3b82f6',
            color: 'white',
            cursor: !isConnected ? 'not-allowed' : 'pointer',
            fontSize: '1rem',
            fontWeight: 'bold'
          }}
        >
          Send Ping
        </button>
      </div>

      {/* Instructions */}
      <div style={{
        maxWidth: '600px',
        textAlign: 'center',
        color: '#9ca3af',
        lineHeight: '1.6'
      }}>
        <p>
          This is your Pong game client. The connection status shows your 
          real-time connection to the game server. Use the buttons to test 
          the connection and check your browser's developer console for 
          detailed Socket.IO logs.
        </p>
      </div>
    </div>
  );
}

export default App;