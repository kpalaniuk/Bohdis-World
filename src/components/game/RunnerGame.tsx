'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import { useGameStore, GameTheme } from '@/stores/gameStore';
import { drawSurfer, SURFER_WIDTH, SURFER_HEIGHT } from './sprites/Surfer';
import { drawObstacle, OBSTACLE_DIMENSIONS } from './sprites/Obstacles';
import { drawBackground, drawGround } from './sprites/Background';

interface Obstacle {
  x: number;
  type: 'rock' | 'seaweed' | 'crab';
  passed: boolean;
}

interface RunnerGameProps {
  onObstacleCleared?: () => void;
}

const GRAVITY = 0.8;
const JUMP_FORCE = -15;
const DOUBLE_JUMP_FORCE = -12;
const GAME_SPEED_INITIAL = 5;
const GAME_SPEED_MAX = 12;
const GROUND_Y_OFFSET = 80;
const SURFER_SCALE = 2;

export function RunnerGame({ onObstacleCleared }: RunnerGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<number | undefined>(undefined);
  const lastTimeRef = useRef<number>(0);
  
  // Game state refs (for animation loop)
  const surferYRef = useRef<number>(0);
  const velocityYRef = useRef<number>(0);
  const isJumpingRef = useRef<boolean>(false);
  const canDoubleJumpRef = useRef<boolean>(false);
  const hasDoubleJumpedRef = useRef<boolean>(false);
  const obstaclesRef = useRef<Obstacle[]>([]);
  const scrollOffsetRef = useRef<number>(0);
  const gameSpeedRef = useRef<number>(GAME_SPEED_INITIAL);
  const scoreRef = useRef<number>(0);
  const hasShieldRef = useRef<boolean>(false);
  
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  const {
    isPaused,
    isPlaying,
    setScore,
    updateHighScore,
    activePowerUps,
    currentTheme,
    setPlaying,
  } = useGameStore();

  // Handle resize
  useEffect(() => {
    const updateDimensions = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Initialize ground position
  useEffect(() => {
    if (dimensions.height > 0) {
      surferYRef.current = dimensions.height - GROUND_Y_OFFSET - SURFER_HEIGHT * SURFER_SCALE;
    }
  }, [dimensions.height]);

  // Check power-ups
  useEffect(() => {
    canDoubleJumpRef.current = activePowerUps.includes('double-jump');
    hasShieldRef.current = activePowerUps.includes('shield');
    
    if (activePowerUps.includes('slow-mo')) {
      gameSpeedRef.current = Math.max(GAME_SPEED_INITIAL * 0.5, gameSpeedRef.current * 0.7);
    }
  }, [activePowerUps]);

  // Spawn obstacles
  const spawnObstacle = useCallback(() => {
    const types: ('rock' | 'seaweed' | 'crab')[] = ['rock', 'seaweed', 'crab'];
    const type = types[Math.floor(Math.random() * types.length)];
    
    obstaclesRef.current.push({
      x: dimensions.width + 50,
      type,
      passed: false,
    });
  }, [dimensions.width]);

  // Jump handler
  const handleJump = useCallback(() => {
    const groundY = dimensions.height - GROUND_Y_OFFSET - SURFER_HEIGHT * SURFER_SCALE;
    const isOnGround = surferYRef.current >= groundY - 5;

    if (isOnGround) {
      velocityYRef.current = JUMP_FORCE;
      isJumpingRef.current = true;
      hasDoubleJumpedRef.current = false;
      
      if (!isPlaying) {
        setPlaying(true);
      }
    } else if (canDoubleJumpRef.current && !hasDoubleJumpedRef.current) {
      velocityYRef.current = DOUBLE_JUMP_FORCE;
      hasDoubleJumpedRef.current = true;
    }
  }, [dimensions.height, isPlaying, setPlaying]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        handleJump();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleJump]);

  // Touch controls
  useEffect(() => {
    const handleTouch = (e: TouchEvent) => {
      e.preventDefault();
      handleJump();
    };

    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener('touchstart', handleTouch, { passive: false });
      return () => canvas.removeEventListener('touchstart', handleTouch);
    }
  }, [handleJump]);

  // Game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || dimensions.width === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let obstacleTimer = 0;
    const OBSTACLE_INTERVAL = 120; // frames between obstacles

    const gameLoop = (timestamp: number) => {
      const deltaTime = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;

      // Clear canvas
      ctx.clearRect(0, 0, dimensions.width, dimensions.height);

      // Draw background (always moving slowly even when paused)
      const bgSpeed = isPaused ? 0.5 : 1;
      scrollOffsetRef.current += gameSpeedRef.current * bgSpeed;
      drawBackground(ctx, dimensions.width, dimensions.height, currentTheme, scrollOffsetRef.current);

      if (!isPaused && isPlaying) {
        // Update score
        scoreRef.current += 1;
        if (scoreRef.current % 60 === 0) {
          setScore(Math.floor(scoreRef.current / 10));
        }

        // Gradually increase speed
        if (scoreRef.current % 500 === 0 && gameSpeedRef.current < GAME_SPEED_MAX) {
          gameSpeedRef.current += 0.5;
        }

        // Spawn obstacles
        obstacleTimer++;
        if (obstacleTimer >= OBSTACLE_INTERVAL) {
          spawnObstacle();
          obstacleTimer = 0;
        }

        // Update obstacles
        const groundY = dimensions.height - GROUND_Y_OFFSET;
        
        for (let i = obstaclesRef.current.length - 1; i >= 0; i--) {
          const obstacle = obstaclesRef.current[i];
          obstacle.x -= gameSpeedRef.current;

          // Remove off-screen obstacles
          if (obstacle.x < -100) {
            obstaclesRef.current.splice(i, 1);
            continue;
          }

          // Draw obstacle
          const obsDims = OBSTACLE_DIMENSIONS[obstacle.type];
          const obsY = groundY - obsDims.height * SURFER_SCALE + 15;
          drawObstacle(ctx, obstacle.type, obstacle.x, obsY, SURFER_SCALE);

          // Check if passed
          const surferX = 100;
          if (!obstacle.passed && obstacle.x + obsDims.width * SURFER_SCALE < surferX) {
            obstacle.passed = true;
            onObstacleCleared?.();
          }

          // Collision detection
          const surferLeft = surferX;
          const surferRight = surferX + SURFER_WIDTH * SURFER_SCALE;
          const surferTop = surferYRef.current;
          const surferBottom = surferYRef.current + SURFER_HEIGHT * SURFER_SCALE;

          const obsLeft = obstacle.x;
          const obsRight = obstacle.x + obsDims.width * SURFER_SCALE;
          const obsTop = obsY;
          const obsBottom = obsY + obsDims.height * SURFER_SCALE;

          const collides = 
            surferLeft < obsRight &&
            surferRight > obsLeft &&
            surferTop < obsBottom &&
            surferBottom > obsTop;

          if (collides && !obstacle.passed) {
            if (hasShieldRef.current) {
              hasShieldRef.current = false;
              obstacle.passed = true; // Don't collide again
            } else {
              // Stumble effect - just continue, no game over
              obstacle.passed = true;
            }
          }
        }

        // Update surfer physics
        const groundYSurfer = dimensions.height - GROUND_Y_OFFSET - SURFER_HEIGHT * SURFER_SCALE;
        
        velocityYRef.current += GRAVITY;
        surferYRef.current += velocityYRef.current;

        if (surferYRef.current >= groundYSurfer) {
          surferYRef.current = groundYSurfer;
          velocityYRef.current = 0;
          isJumpingRef.current = false;
        }
      }

      // Draw ground details
      drawGround(ctx, dimensions.width, dimensions.height, currentTheme, scrollOffsetRef.current);

      // Draw surfer
      const surferX = 100;
      drawSurfer(ctx, surferX, surferYRef.current, SURFER_SCALE, isJumpingRef.current);

      // Draw score
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px "Press Start 2P", monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`${Math.floor(scoreRef.current / 10)}m`, dimensions.width - 20, 30);

      // Continue loop
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoopRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [
    dimensions,
    isPaused,
    isPlaying,
    currentTheme,
    setScore,
    spawnObstacle,
    onObstacleCleared,
  ]);

  // Update high score when game ends or pauses
  useEffect(() => {
    if (isPaused || !isPlaying) {
      updateHighScore(Math.floor(scoreRef.current / 10));
    }
  }, [isPaused, isPlaying, updateHighScore]);

  return (
    <canvas
      ref={canvasRef}
      width={dimensions.width}
      height={dimensions.height}
      className="fixed inset-0 z-0"
      style={{ touchAction: 'none' }}
    />
  );
}

export default RunnerGame;

