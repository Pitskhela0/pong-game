import { useState, useEffect, useCallback } from 'react';
import { SocketService } from '../services/socketService';
import type { Room, Player, GameStatus, Ball } from '../types/index';

export interface GameStateData {
  currentRoom: Room | null;
  players: Player[];
  currentPlayer: Player | null;
  ball: Ball | null;
  gameStatus: GameStatus;
  winnerId: string | null;
  isInRoom: boolean;
  error: string | null;
  isLoading: boolean;
}

export interface UseGameStateReturn extends GameStateData {
  joinRoom: (roomName: string, playerName: string) => void;
  leaveRoom: () => void;
  clearError: () => void;
  movePaddle: (paddleY: number) => void;
  setPlayerReady: (isReady: boolean) => void;
  returnToLobby: () => void;
}

export const useGameState = (socketService: SocketService | null): UseGameStateReturn => {
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [ball, setBall] = useState<Ball | null>(null);
  const [gameStatus, setGameStatus] = useState<GameStatus>('waiting');
  const [winnerId, setWinnerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Setup socket event listeners
  useEffect(() => {
    if (!socketService) return;

    const socket = socketService.getSocket();
    if (!socket) return;

    // Handle successful room join
    socket.on('room-joined', (data: { room: Room; playerId: string; playerName: string }) => {
      console.log('🎮 Successfully joined room:', data);
      setCurrentRoom(data.room);
      setPlayers(data.room.gameState.players);
      setBall(data.room.gameState.ball);
      setGameStatus(data.room.gameState.gameStatus);
      setWinnerId(data.room.gameState.winner);
      setCurrentPlayer(data.room.gameState.players.find(p => p.id === data.playerId) || null);
      setError(null);
      setIsLoading(false);
    });

    // Handle player joined (another player joined the room)
    socket.on('player-joined', (data: { player: Player; playerName: string; room: Room }) => {
      console.log('Player joined room:', data);
      setCurrentRoom(data.room);
      setPlayers(data.room.gameState.players);
      setBall(data.room.gameState.ball);
      setGameStatus(data.room.gameState.gameStatus);
    });

    // Handle player left
    socket.on('player-left', (data: { playerId: string; room: Room; reason?: string }) => {
      console.log('Player left room:', data);
      setCurrentRoom(data.room);
      setPlayers(data.room.gameState.players);
      setBall(data.room.gameState.ball);
      setGameStatus(data.room.gameState.gameStatus);
      
      // If the current player left, reset state
      if (data.playerId === currentPlayer?.id) {
        setCurrentRoom(null);
        setPlayers([]);
        setCurrentPlayer(null);
        setBall(null);
        setGameStatus('waiting');
      }
    });

    // Handle room left (current player left)
    socket.on('room-left', (data: { roomName: string }) => {
      console.log('🚪 Left room:', data);
      setCurrentRoom(null);
      setPlayers([]);
      setCurrentPlayer(null);
      setBall(null);
      setGameStatus('waiting');
      setWinnerId(null);
      setError(null);
      setIsLoading(false);
    });

    // Handle room full error
    socket.on('room-full', (data: { message: string; roomName: string }) => {
      console.error('🚫 Room full:', data);
      setError(`Room "${data.roomName}" is full. Please try another room.`);
      setIsLoading(false);
    });

    // Handle general room errors
    socket.on('room-error', (data: { message: string }) => {
      console.error('❌ Room error:', data);
      setError(data.message);
      setIsLoading(false);
    });

    // Handle paddle movement from other players
    socket.on('paddle-moved', (data: { playerId: string; paddleY: number; timestamp: number }) => {
      console.log('🏓 Other player paddle moved:', data);
      
      // Update the specific player's paddle position
      setPlayers(prevPlayers => 
        prevPlayers.map(player => 
          player.id === data.playerId 
            ? { ...player, paddleY: data.paddleY }
            : player
        )
      );

      // Also update the room state if available
      setCurrentRoom(prevRoom => {
        if (!prevRoom) return prevRoom;
        
        const updatedPlayers = prevRoom.gameState.players.map(player =>
          player.id === data.playerId
            ? { ...player, paddleY: data.paddleY }
            : player
        );

        return {
          ...prevRoom,
          gameState: {
            ...prevRoom.gameState,
            players: updatedPlayers,
            lastUpdate: data.timestamp
          }
        };
      });
    });

    // Handle game state updates (ball position, scores, etc.)
    socket.on('game-state-update', (data: { gameState: any; timestamp: number }) => {
      const { gameState } = data;
      
      // Update ball position
      setBall(gameState.ball);
      
      // Update players (scores, paddle positions)
      setPlayers(gameState.players);
      
      // Update game status
      setGameStatus(gameState.gameStatus);
      
      // Update winner
      setWinnerId(gameState.winner);
      
      // Update current room
      setCurrentRoom(prevRoom => {
        if (!prevRoom) return prevRoom;
        return {
          ...prevRoom,
          gameState: gameState
        };
      });
    });

    // Handle player scoring
    socket.on('point-scored', (data: { playerId: string; playerName: string; score: number; side: string; gameState: any; timestamp: number }) => {
      console.log('Point scored:', data);
      
      // Update game state with new scores
      setPlayers(data.gameState.players);
      setBall(data.gameState.ball);
      setGameStatus(data.gameState.gameStatus);
      setWinnerId(data.gameState.winner);
      
      // Update current room
      setCurrentRoom(prevRoom => {
        if (!prevRoom) return prevRoom;
        return {
          ...prevRoom,
          gameState: data.gameState
        };
      });
    });

    // Handle game finished
    socket.on('game-ended', (data: { winnerId: string; winnerName: string; finalScores: any; gameState: any; timestamp: number }) => {
      console.log('🏆 Game ended:', data);
      
      setGameStatus('finished');
      setPlayers(data.gameState.players);
      setBall(data.gameState.ball);
      setWinnerId(data.winnerId);
      
      // Update current room
      setCurrentRoom(prevRoom => {
        if (!prevRoom) return prevRoom;
        return {
          ...prevRoom,
          gameState: data.gameState
        };
      });
    });

    // Handle player ready updates
    socket.on('player-ready-update', (data: { playerId: string; isReady: boolean; room: Room }) => {
      console.log('Player ready update:', data);
      
      setCurrentRoom(data.room);
      setPlayers(data.room.gameState.players);
      setGameStatus(data.room.gameState.gameStatus);
    });

    // Handle return to lobby
    socket.on('returned-to-lobby', (data: { room: Room; message: string }) => {
      console.log('Returned to lobby:', data);
      
      // Reset all game state
      setCurrentRoom(data.room);
      setPlayers(data.room.gameState.players);
      setBall(data.room.gameState.ball);
      setGameStatus(data.room.gameState.gameStatus);
      setWinnerId(null);
      
      // Update current player's state
      setCurrentPlayer(prevPlayer => {
        if (!prevPlayer) return null;
        const updatedPlayer = data.room.gameState.players.find(p => p.id === prevPlayer.id);
        return updatedPlayer || prevPlayer;
      });
    });

    // Cleanup function
    return () => {
      socket.off('room-joined');
      socket.off('player-joined');
      socket.off('player-left');
      socket.off('room-left');
      socket.off('room-full');
      socket.off('room-error');
      socket.off('paddle-moved');
      socket.off('game-state-update');
      socket.off('point-scored');
      socket.off('game-ended');
      socket.off('player-ready-update');
      socket.off('returned-to-lobby');
    };
  }, [socketService, currentPlayer?.id]);

  // Join room function
  const joinRoom = useCallback((roomName: string, playerName: string) => {
    if (!socketService) {
      setError('Socket service not available');
      return;
    }

    const socket = socketService.getSocket();
    if (!socket || !socket.connected) {
      setError('Not connected to server');
      return;
    }

    if (!roomName.trim()) {
      setError('Room name is required');
      return;
    }

    if (!playerName.trim()) {
      setError('Player name is required');
      return;
    }

    setIsLoading(true);
    setError(null);

    console.log('Attempting to join room:', { roomName, playerName });
    socket.emit('join-room', { roomName: roomName.trim(), playerName: playerName.trim() });
  }, [socketService]);

  // Leave room function
  const leaveRoom = useCallback(() => {
    if (!socketService) {
      setError('Socket service not available');
      return;
    }

    const socket = socketService.getSocket();
    if (!socket || !socket.connected) {
      setError('Not connected to server');
      return;
    }

    setIsLoading(true);
    setError(null);

    console.log('Leaving room');
    socket.emit('leave-room');
  }, [socketService]);

  // Move paddle function
  const movePaddle = useCallback((paddleY: number) => {
    if (!socketService) {
      console.warn('⚠️ Socket service not available for paddle move');
      return;
    }

    socketService.movePaddle(paddleY);
  }, [socketService]);

  // Set player ready function
  const setPlayerReady = useCallback((isReady: boolean) => {
    if (!socketService) {
      console.warn('⚠️ Socket service not available for ready toggle');
      return;
    }

    socketService.setPlayerReady(isReady);
  }, [socketService]);

  // Return to lobby function
  const returnToLobby = useCallback(() => {
    if (!socketService) {
      console.warn('⚠️ Socket service not available for return to lobby');
      return;
    }

    socketService.returnToLobby();
  }, [socketService]);

  // Clear error function
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    currentRoom,
    players,
    currentPlayer,
    ball,
    gameStatus,
    winnerId,
    isInRoom: currentRoom !== null,
    error,
    isLoading,
    joinRoom,
    leaveRoom,
    clearError,
    movePaddle,
    setPlayerReady,
    returnToLobby
  };
};