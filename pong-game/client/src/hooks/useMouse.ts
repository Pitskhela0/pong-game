import { useState, useCallback, useRef, useEffect } from 'react';

export interface MousePosition {
  x: number;
  y: number;
  paddleY: number;
  isInBounds: boolean;
}

export interface UseMouseReturn {
  mousePosition: MousePosition;
  handleMouseMove: (event: React.MouseEvent<HTMLDivElement>) => void;
  resetPosition: () => void;
}

interface UseMouseOptions {
  gameAreaHeight?: number;
  paddleHeight?: number;
  throttleMs?: number;
  onPaddleMove?: (paddleY: number) => void;
}

export const useMouse = (options: UseMouseOptions = {}): UseMouseReturn => {
  const {
    gameAreaHeight = 400,
    paddleHeight = 80,
    throttleMs = 16, // ~60fps
    onPaddleMove
  } = options;

  const [mousePosition, setMousePosition] = useState<MousePosition>({
    x: 0,
    y: 0,
    paddleY: (gameAreaHeight - paddleHeight) / 2, // Center paddle initially
    isInBounds: false
  });

  const lastUpdateRef = useRef<number>(0);
  const lastPaddleYRef = useRef<number>((gameAreaHeight - paddleHeight) / 2);

  // Calculate paddle position from mouse Y coordinate
  const calculatePaddlePosition = useCallback((mouseY: number, gameAreaRect: DOMRect): number => {
    // Convert mouse position to relative position within game area
    const relativeY = mouseY - gameAreaRect.top;
    
    // Calculate paddle center position (mouse position minus half paddle height)
    const paddleCenterY = relativeY - (paddleHeight / 2);
    
    // Clamp paddle position within game area bounds
    const minY = 0;
    const maxY = gameAreaHeight - paddleHeight;
    
    return Math.max(minY, Math.min(maxY, paddleCenterY));
  }, [gameAreaHeight, paddleHeight]);

  // Throttled mouse move handler
  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    const now = Date.now();
    
    // Throttle updates to prevent excessive socket emissions
    if (now - lastUpdateRef.current < throttleMs) {
      return;
    }
    
    lastUpdateRef.current = now;
    
    const gameAreaElement = event.currentTarget;
    const rect = gameAreaElement.getBoundingClientRect();
    
    // Calculate mouse position relative to game area
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    
    // Check if mouse is within game area bounds
    const isInBounds = mouseX >= 0 && mouseX <= rect.width && mouseY >= 0 && mouseY <= rect.height;
    
    // Calculate paddle position
    const paddleY = calculatePaddlePosition(event.clientY, rect);
    
    // Update state
    const newPosition: MousePosition = {
      x: mouseX,
      y: mouseY,
      paddleY,
      isInBounds
    };
    
    setMousePosition(newPosition);
    
    // Call paddle move callback if position changed significantly
    if (Math.abs(paddleY - lastPaddleYRef.current) > 1 && onPaddleMove && isInBounds) {
      lastPaddleYRef.current = paddleY;
      onPaddleMove(paddleY);
    }
  }, [calculatePaddlePosition, throttleMs, onPaddleMove]);

  // Reset position to center
  const resetPosition = useCallback(() => {
    const centerY = (gameAreaHeight - paddleHeight) / 2;
    setMousePosition({
      x: 0,
      y: 0,
      paddleY: centerY,
      isInBounds: false
    });
    lastPaddleYRef.current = centerY;
  }, [gameAreaHeight, paddleHeight]);

  // Reset position when game area dimensions change
  useEffect(() => {
    resetPosition();
  }, [gameAreaHeight, paddleHeight, resetPosition]);

  return {
    mousePosition,
    handleMouseMove,
    resetPosition
  };
};