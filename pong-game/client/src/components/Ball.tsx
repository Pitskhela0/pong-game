import React from 'react';

export interface BallProps {
  /** X position of the ball center */
  x: number;
  /** Y position of the ball center */
  y: number;
  /** Ball size in pixels */
  size?: number;
  /** Additional CSS classes */
  className?: string;
  /** Whether to show trail effect */
  showTrail?: boolean;
}

const Ball: React.FC<BallProps> = ({
  x,
  y,
  size = 15,
  className = '',
  showTrail = false
}) => {
  // Calculate position (center the ball on the coordinates)
  const left = x - (size / 2);
  const top = y - (size / 2);

  // Position styles
  const ballStyles: React.CSSProperties = {
    position: 'absolute',
    left: `${left}px`,
    top: `${top}px`,
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #ffffff 0%, #f0f0f0 50%, #d0d0d0 100%)',
    boxShadow: `
      0 2px 8px rgba(0, 0, 0, 0.3),
      inset -2px -2px 4px rgba(0, 0, 0, 0.2),
      inset 2px 2px 4px rgba(255, 255, 255, 0.8)
    `,
    transition: 'all 0.016s linear', // Smooth movement at 60fps
    zIndex: 10,
    pointerEvents: 'none',
  };

  // Trail styles for enhanced visual effect
  const trailStyles: React.CSSProperties = showTrail ? {
    ...ballStyles,
    background: 'radial-gradient(circle, rgba(255, 255, 255, 0.6) 0%, rgba(255, 255, 255, 0.2) 70%, transparent 100%)',
    transform: 'scale(1.5)',
    opacity: 0.4,
    zIndex: 9,
  } : {};

  // Generate CSS classes
  const ballClasses = [
    'ball',
    showTrail ? 'ball--with-trail' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <>
      {/* Trail effect */}
      {showTrail && (
        <div
          className="ball-trail"
          style={trailStyles}
        />
      )}
      
      {/* Main ball */}
      <div
        className={ballClasses}
        style={ballStyles}
        data-x={Math.round(x)}
        data-y={Math.round(y)}
      />
    </>
  );
};

export default Ball;