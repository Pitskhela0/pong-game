import React from 'react';

export interface PaddleProps {
  /** Y position of the paddle (top edge) */
  y: number;
  /** Which player this paddle belongs to (1 = left, 2 = right) */
  player: 1 | 2;
  /** Whether this paddle belongs to the current player */
  isCurrentPlayer?: boolean;
  /** Paddle width in pixels */
  width?: number;
  /** Paddle height in pixels */
  height?: number;
  /** Distance from game area edge */
  edgeDistance?: number;
  /** Additional CSS classes */
  className?: string;
}

const Paddle: React.FC<PaddleProps> = ({
  y,
  player,
  isCurrentPlayer = false,
  width = 15,
  height = 80,
  edgeDistance = 30,
  className = ''
}) => {
  // Calculate paddle position styles
  const positionStyles: React.CSSProperties = {
    top: `${y}px`,
    width: `${width}px`,
    height: `${height}px`,
    ...(player === 1 ? { left: `${edgeDistance}px` } : { right: `${edgeDistance}px` })
  };

  // Generate CSS classes
  const paddleClasses = [
    'paddle',
    `paddle--player${player}`,
    isCurrentPlayer ? 'paddle--current' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <div
      className={paddleClasses}
      style={positionStyles}
      data-player={player}
      data-current={isCurrentPlayer}
    />
  );
};

export default Paddle;