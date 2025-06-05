import type { Ball, Player } from '../types/index';

export interface GameDimensions {
  width: number;
  height: number;
  paddleWidth: number;
  paddleHeight: number;
  paddleOffset: number;
  ballSize: number;
}

export const DEFAULT_GAME_DIMENSIONS: GameDimensions = {
  width: 800,
  height: 400,
  paddleWidth: 15,
  paddleHeight: 80,
  paddleOffset: 30,
  ballSize: 15
};

export class BallPhysics {
  private dimensions: GameDimensions;
  private readonly INITIAL_SPEED = 200; // pixels per second
  private readonly SPEED_INCREASE = 20; // pixels per second increase per hit
  private readonly MAX_SPEED = 400; // maximum pixels per second
  private readonly MIN_ANGLE = 0.2; // minimum angle to prevent horizontal movement

  constructor(dimensions: GameDimensions = DEFAULT_GAME_DIMENSIONS) {
    this.dimensions = dimensions;
  }

  /**
   * Update ball position based on velocity and time
   */
  updateBallPosition(ball: Ball, deltaTime: number): Ball {
    const updatedBall = { ...ball };
    
    // Update position based on velocity (deltaTime is in seconds)
    updatedBall.x += updatedBall.velocityX * deltaTime;
    updatedBall.y += updatedBall.velocityY * deltaTime;

    // Check wall collisions (top and bottom)
    this.checkWallCollisions(updatedBall);

    return updatedBall;
  }

  /**
   * Check collisions with top and bottom walls
   */
  private checkWallCollisions(ball: Ball): void {
    const ballRadius = this.dimensions.ballSize / 2;

    // Top wall collision
    if (ball.y - ballRadius <= 0) {
      ball.y = ballRadius;
      ball.velocityY = Math.abs(ball.velocityY); // Bounce down
    }

    // Bottom wall collision
    if (ball.y + ballRadius >= this.dimensions.height) {
      ball.y = this.dimensions.height - ballRadius;
      ball.velocityY = -Math.abs(ball.velocityY); // Bounce up
    }
  }

  /**
   * Check if ball has gone off left or right edge (scoring)
   */
  checkScoringCollisions(ball: Ball): 'left' | 'right' | null {
    const ballRadius = this.dimensions.ballSize / 2;

    if (ball.x + ballRadius < 0) {
      return 'left'; // Player 2 scores
    }

    if (ball.x - ballRadius > this.dimensions.width) {
      return 'right'; // Player 1 scores
    }

    return null;
  }

  /**
   * Check collision with paddles
   */
  checkPaddleCollisions(ball: Ball, players: Player[]): boolean {
    if (players.length < 2) return false;

    const ballRadius = this.dimensions.ballSize / 2;
    const ballLeft = ball.x - ballRadius;
    const ballRight = ball.x + ballRadius;
    const ballTop = ball.y - ballRadius;
    const ballBottom = ball.y + ballRadius;

    let collision = false;

    // Check collision with player 1 (left paddle)
    const player1 = players[0];
    if (player1) {
      const paddleLeft = this.dimensions.paddleOffset;
      const paddleRight = this.dimensions.paddleOffset + this.dimensions.paddleWidth;
      const paddleTop = player1.paddleY;
      const paddleBottom = player1.paddleY + this.dimensions.paddleHeight;

      if (ballLeft <= paddleRight && 
          ballRight >= paddleLeft && 
          ballBottom >= paddleTop && 
          ballTop <= paddleBottom &&
          ball.velocityX < 0) { // Ball moving left
        
        // Calculate collision point relative to paddle center
        const paddleCenter = paddleTop + this.dimensions.paddleHeight / 2;
        const hitPoint = (ball.y - paddleCenter) / (this.dimensions.paddleHeight / 2);
        
        // Reverse X direction and adjust Y direction based on hit point
        ball.velocityX = Math.abs(ball.velocityX);
        ball.velocityY = hitPoint * ball.speed * 0.7; // Max 70% of speed in Y direction
        
        // Ensure minimum angle
        if (Math.abs(ball.velocityY) < this.MIN_ANGLE * ball.speed) {
          ball.velocityY = Math.sign(ball.velocityY) * this.MIN_ANGLE * ball.speed;
        }

        // Position ball outside paddle
        ball.x = paddleRight + ballRadius;
        
        collision = true;
      }
    }

    // Check collision with player 2 (right paddle)
    const player2 = players[1];
    if (player2) {
      const paddleLeft = this.dimensions.width - this.dimensions.paddleOffset - this.dimensions.paddleWidth;
      const paddleRight = this.dimensions.width - this.dimensions.paddleOffset;
      const paddleTop = player2.paddleY;
      const paddleBottom = player2.paddleY + this.dimensions.paddleHeight;

      if (ballLeft <= paddleRight && 
          ballRight >= paddleLeft && 
          ballBottom >= paddleTop && 
          ballTop <= paddleBottom &&
          ball.velocityX > 0) { // Ball moving right
        
        // Calculate collision point relative to paddle center
        const paddleCenter = paddleTop + this.dimensions.paddleHeight / 2;
        const hitPoint = (ball.y - paddleCenter) / (this.dimensions.paddleHeight / 2);
        
        // Reverse X direction and adjust Y direction based on hit point
        ball.velocityX = -Math.abs(ball.velocityX);
        ball.velocityY = hitPoint * ball.speed * 0.7; // Max 70% of speed in Y direction
        
        // Ensure minimum angle
        if (Math.abs(ball.velocityY) < this.MIN_ANGLE * ball.speed) {
          ball.velocityY = Math.sign(ball.velocityY) * this.MIN_ANGLE * ball.speed;
        }

        // Position ball outside paddle
        ball.x = paddleLeft - ballRadius;
        
        collision = true;
      }
    }

    // Increase speed on collision
    if (collision) {
      this.increaseBallSpeed(ball);
    }

    return collision;
  }

  /**
   * Increase ball speed after paddle collision
   */
  private increaseBallSpeed(ball: Ball): void {
    const newSpeed = Math.min(ball.speed + this.SPEED_INCREASE, this.MAX_SPEED);
    
    // Maintain velocity direction ratios while increasing speed
    const speedRatio = newSpeed / ball.speed;
    ball.velocityX *= speedRatio;
    ball.velocityY *= speedRatio;
    ball.speed = newSpeed;
  }

  /**
   * Reset ball to center with random direction
   */
  resetBall(): Ball {
    const centerX = this.dimensions.width / 2;
    const centerY = this.dimensions.height / 2;
    
    // Random direction (left or right)
    const direction = Math.random() < 0.5 ? -1 : 1;
    
    // Random angle between 0.2 and 0.8 radians (roughly 11-46 degrees)
    const angle = (Math.random() * 0.6 + 0.2) * (Math.random() < 0.5 ? 1 : -1);
    
    const velocityX = direction * this.INITIAL_SPEED * Math.cos(angle);
    const velocityY = this.INITIAL_SPEED * Math.sin(angle);

    return {
      x: centerX,
      y: centerY,
      velocityX,
      velocityY,
      speed: this.INITIAL_SPEED
    };
  }

  /**
   * Create initial ball state
   */
  createInitialBall(): Ball {
    return this.resetBall();
  }

  /**
   * Normalize velocity vectors to maintain consistent speed
   */
  normalizeVelocity(ball: Ball): void {
    const currentSpeed = Math.sqrt(ball.velocityX * ball.velocityX + ball.velocityY * ball.velocityY);
    if (currentSpeed > 0) {
      ball.velocityX = (ball.velocityX / currentSpeed) * ball.speed;
      ball.velocityY = (ball.velocityY / currentSpeed) * ball.speed;
    }
  }

  /**
   * Get ball bounds for collision detection
   */
  getBallBounds(ball: Ball) {
    const radius = this.dimensions.ballSize / 2;
    return {
      left: ball.x - radius,
      right: ball.x + radius,
      top: ball.y - radius,
      bottom: ball.y + radius
    };
  }
}