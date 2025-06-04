import { useState, useEffect, useCallback } from 'react';
import { SocketService } from '../services/socketService';
import type { Room, Player, GameStatus } from '../types/index';

export interface GameStateData {
  currentRoom: Room | null;
  players: Player[];
  currentPlayer: Player | null;
  gameStatus: GameStatus;
  isInRoom: boolean;
  error: string | null;
  isLoading: boolean;
}

export interface UseGameStateReturn extends GameStateData {
  joinRoom: (roomName: string, playerName: string) => void;
  leaveRoom: () => void;
  clearError: () => void;
}

export const useGameState = (socketService: SocketService | null): UseGameStateReturn => {
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [gameStatus, setGameStatus] = useState<GameStatus>('waiting');
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
      setGameStatus(data.room.gameState.gameStatus);
      setCurrentPlayer(data.room.gameState.players.find(p => p.id === data.playerId) || null);
      setError(null);
      setIsLoading(false);
    });

    // Handle player joined (another player joined the room)
    socket.on('player-joined', (data: { player: Player; playerName: string; room: Room }) => {
      console.log('👤 Player joined room:', data);
      setCurrentRoom(data.room);
      setPlayers(data.room.gameState.players);
      setGameStatus(data.room.gameState.gameStatus);
    });

    // Handle player left
    socket.on('player-left', (data: { playerId: string; room: Room; reason?: string }) => {
      console.log('👤 Player left room:', data);
      setCurrentRoom(data.room);
      setPlayers(data.room.gameState.players);
      setGameStatus(data.room.gameState.gameStatus);
      
      // If the current player left, reset state
      if (data.playerId === currentPlayer?.id) {
        setCurrentRoom(null);
        setPlayers([]);
        setCurrentPlayer(null);
        setGameStatus('waiting');
      }
    });

    // Handle room left (current player left)
    socket.on('room-left', (data: { roomName: string }) => {
      console.log('🚪 Left room:', data);
      setCurrentRoom(null);
      setPlayers([]);
      setCurrentPlayer(null);
      setGameStatus('waiting');
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

    // Cleanup function
    return () => {
      socket.off('room-joined');
      socket.off('player-joined');
      socket.off('player-left');
      socket.off('room-left');
      socket.off('room-full');
      socket.off('room-error');
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

    console.log('🔄 Attempting to join room:', { roomName, playerName });
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

    console.log('🔄 Leaving room');
    socket.emit('leave-room');
  }, [socketService]);

  // Clear error function
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    currentRoom,
    players,
    currentPlayer,
    gameStatus,
    isInRoom: currentRoom !== null,
    error,
    isLoading,
    joinRoom,
    leaveRoom,
    clearError
  };
};