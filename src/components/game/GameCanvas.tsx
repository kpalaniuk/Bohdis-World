'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import { useGameStore, GameTheme, PowerUp } from '@/stores/gameStore';
import { useUnlockStore } from '@/stores/unlockStore';
import { useCoinStore } from '@/stores/coinStore';
import { drawSurfer, SURFER_WIDTH, SURFER_HEIGHT } from './sprites/Surfer';
import { drawObstacle, OBSTACLE_DIMENSIONS } from './sprites/Obstacles';
import { drawBackground, drawGround } from './sprites/Background';

interface Obstacle {
  x: number;
  type: 'rock' | 'seaweed' | 'crab';
  passed: boolean;
}

interface GameCanvasProps {
  onGameOver?: (score: number) => void;
  onScoreUpdate?: (score: number) => void;
}

const GRAVITY = 0.8;
const JUMP_FORCE = -16;
const DOUBLE_JUMP_FORCE = -13;
const GAME_SPEED_INITIAL = 6;
const GAME_SPEED_MAX = 14;
const GROUND_Y_OFFSET = 100;
const SURFER_SCALE = 2.5;
const OBSTACLE_INTERVAL_MIN = 80;
const OBSTACLE_INTERVAL_MAX = 150;

export function GameCanvas({ onGameOver, onScoreUpdate }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<number | undefined>(undefined);
  
  // Game state refs
  const surferYRef = useRef<number>(0);
  const velocityYRef = useRef<number>(0);
  const isJumpingRef = useRef<boolean>(false);
  const hasDoubleJumpedRef = useRef<boolean>(false);
  const obstaclesRef = useRef<Obstacle[]>([]);
  const scrollOffsetRef = useRef<number>(0);
  const gameSpeedRef = useRef<number>(GAME_SPEED_INITIAL);
  const scoreRef = useRef<number>(0);
  const obstacleTimerRef = useRef<number>(0);
  const nextObstacleIntervalRef = useRef<number>(OBSTACLE_INTERVAL_MAX);
  const livesRef = useRef<number>(3);
  const invincibleFramesRef = useRef<number>(0);
  
  const [gameState, setGameState] = useState<'ready' | 'playing' | 'paused' | 'gameover'>('ready');
  const [displayScore, setDisplayScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });

  const { currentTheme, activePowerUps, deactivatePowerUp } = useGameStore();
  const { usePowerUp, getPowerUpCount } = useUnlockStore();
  const { addCoins } = useCoinStore();

  // Handle resize
  useEffect(() => {
    const updateDimensions = () => {
      const container = canvasRef.current?.parentElement;
      if (container) {
        const width = Math.min(container.clientWidth, 1000);
        const height = Math.min(width * 0.6, 600);
        setDimensions({ width, height });
      }
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

  // Reset game
  const resetGame = useCallback(() => {
    surferYRef.current = dimensions.height - GROUND_Y_OFFSET - SURFER_HEIGHT * SURFER_SCALE;
    velocityYRef.current = 0;
    isJumpingRef.current = false;
    hasDoubleJumpedRef.current = false;
    obstaclesRef.current = [];
    scrollOffsetRef.current = 0;
    gameSpeedRef.current = GAME_SPEED_INITIAL;
    scoreRef.current = 0;
    obstacleTimerRef.current = 0;
    nextObstacleIntervalRef.current = OBSTACLE_INTERVAL_MAX;
    livesRef.current = 3;
    invincibleFramesRef.current = 0;
    setDisplayScore(0);
    setLives(3);
  }, [dimensions.height]);

  // Start game
  const startGame = useCallback(() => {
    resetGame();
    setGameState('playing');
  }, [resetGame]);

  // Pause game
  const togglePause = useCallback(() => {
    if (gameState === 'playing') {
      setGameState('paused');
    } else if (gameState === 'paused') {
      setGameState('playing');
    }
  }, [gameState]);

  // Use power-up
  const activatePowerUpFromInventory = useCallback((powerUp: PowerUp) => {
    if (getPowerUpCount(powerUp) > 0 && usePowerUp(powerUp)) {
      // Activate the power-up in game store
      useGameStore.getState().activatePowerUp(powerUp);
      
      // Auto-deactivate after duration
      const duration = powerUp === 'slow-mo' ? 5000 : powerUp === 'shield' ? 10000 : 15000;
      setTimeout(() => {
        deactivatePowerUp(powerUp);
      }, duration);
    }
  }, [getPowerUpCount, usePowerUp, deactivatePowerUp]);

  // Jump handler
  const handleJump = useCallback(() => {
    if (gameState === 'ready') {
      startGame();
      return;
    }
    
    if (gameState !== 'playing') return;

    const groundY = dimensions.height - GROUND_Y_OFFSET - SURFER_HEIGHT * SURFER_SCALE;
    const isOnGround = surferYRef.current >= groundY - 5;
    const hasDoubleJump = activePowerUps.includes('double-jump');

    if (isOnGround) {
      velocityYRef.current = JUMP_FORCE;
      isJumpingRef.current = true;
      hasDoubleJumpedRef.current = false;
    } else if (hasDoubleJump && !hasDoubleJumpedRef.current) {
      velocityYRef.current = DOUBLE_JUMP_FORCE;
      hasDoubleJumpedRef.current = true;
    }
  }, [gameState, dimensions.height, activePowerUps, startGame]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        handleJump();
      } else if (e.code === 'Escape' || e.code === 'KeyP') {
        togglePause();
      } else if (e.code === 'KeyR' && gameState === 'gameover') {
        startGame();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleJump, togglePause, gameState, startGame]);

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

  // Spawn obstacle
  const spawnObstacle = useCallback(() => {
    const types: ('rock' | 'seaweed' | 'crab')[] = ['rock', 'seaweed', 'crab'];
    const type = types[Math.floor(Math.random() * types.length)];
    
    obstaclesRef.current.push({
      x: dimensions.width + 50,
      type,
      passed: false,
    });

    // Randomize next interval
    nextObstacleIntervalRef.current = Math.floor(
      Math.random() * (OBSTACLE_INTERVAL_MAX - OBSTACLE_INTERVAL_MIN) + OBSTACLE_INTERVAL_MIN
    );
    
    // Decrease interval as game speeds up
    nextObstacleIntervalRef.current = Math.max(
      60,
      nextObstacleIntervalRef.current - Math.floor(scoreRef.current / 500)
    );
  }, [dimensions.width]);

  // Game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || dimensions.width === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const gameLoop = () => {
      // Clear canvas
      ctx.clearRect(0, 0, dimensions.width, dimensions.height);

      // Calculate speed (slow-mo affects this)
      const speedMultiplier = activePowerUps.includes('slow-mo') ? 0.5 : 1;
      const currentSpeed = gameSpeedRef.current * speedMultiplier;

      // Update scroll
      if (gameState === 'playing') {
        scrollOffsetRef.current += currentSpeed;
      }

      // Draw background
      drawBackground(ctx, dimensions.width, dimensions.height, currentTheme, scrollOffsetRef.current);

      if (gameState === 'playing') {
        // Update score
        scoreRef.current += 1;
        if (scoreRef.current % 10 === 0) {
          const newScore = Math.floor(scoreRef.current / 10);
          setDisplayScore(newScore);
          onScoreUpdate?.(newScore);
        }

        // Award coins every 100m
        if (scoreRef.current % 1000 === 0) {
          addCoins(1);
        }

        // Gradually increase speed
        if (scoreRef.current % 500 === 0 && gameSpeedRef.current < GAME_SPEED_MAX) {
          gameSpeedRef.current += 0.3;
        }

        // Spawn obstacles
        obstacleTimerRef.current++;
        if (obstacleTimerRef.current >= nextObstacleIntervalRef.current) {
          spawnObstacle();
          obstacleTimerRef.current = 0;
        }

        // Update invincibility
        if (invincibleFramesRef.current > 0) {
          invincibleFramesRef.current--;
        }

        // Update obstacles
        const groundY = dimensions.height - GROUND_Y_OFFSET;
        const surferX = 80;
        
        for (let i = obstaclesRef.current.length - 1; i >= 0; i--) {
          const obstacle = obstaclesRef.current[i];
          obstacle.x -= currentSpeed;

          // Remove off-screen obstacles
          if (obstacle.x < -100) {
            obstaclesRef.current.splice(i, 1);
            continue;
          }

          // Draw obstacle
          const obsDims = OBSTACLE_DIMENSIONS[obstacle.type];
          const obsY = groundY - obsDims.height * SURFER_SCALE + 20;
          drawObstacle(ctx, obstacle.type, obstacle.x, obsY, SURFER_SCALE);

          // Check if passed (score point)
          if (!obstacle.passed && obstacle.x + obsDims.width * SURFER_SCALE < surferX) {
            obstacle.passed = true;
          }

          // Collision detection
          if (invincibleFramesRef.current === 0) {
            const surferLeft = surferX + 10;
            const surferRight = surferX + SURFER_WIDTH * SURFER_SCALE - 10;
            const surferTop = surferYRef.current + 10;
            const surferBottom = surferYRef.current + SURFER_HEIGHT * SURFER_SCALE;

            const obsLeft = obstacle.x + 5;
            const obsRight = obstacle.x + obsDims.width * SURFER_SCALE - 5;
            const obsTop = obsY + 5;
            const obsBottom = obsY + obsDims.height * SURFER_SCALE;

            const collides = 
              surferLeft < obsRight &&
              surferRight > obsLeft &&
              surferTop < obsBottom &&
              surferBottom > obsTop;

            if (collides && !obstacle.passed) {
              // Check for shield
              if (activePowerUps.includes('shield')) {
                deactivatePowerUp('shield');
                obstacle.passed = true;
                invincibleFramesRef.current = 60;
              } else {
                // Lose a life
                livesRef.current--;
                setLives(livesRef.current);
                obstacle.passed = true;
                invincibleFramesRef.current = 120;

                if (livesRef.current <= 0) {
                  // Game over
                  setGameState('gameover');
                  onGameOver?.(Math.floor(scoreRef.current / 10));
                }
              }
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

      // Draw ground
      drawGround(ctx, dimensions.width, dimensions.height, currentTheme, scrollOffsetRef.current);

      // Draw surfer (blink when invincible)
      const shouldDraw = invincibleFramesRef.current === 0 || Math.floor(invincibleFramesRef.current / 5) % 2 === 0;
      if (shouldDraw) {
        const surferX = 80;
        drawSurfer(ctx, surferX, surferYRef.current, SURFER_SCALE, isJumpingRef.current);
      }

      // Draw UI overlays
      if (gameState === 'ready') {
        drawOverlay(ctx, 'SURF RUNNER', 'Press SPACE to Start', dimensions);
      } else if (gameState === 'paused') {
        drawOverlay(ctx, 'PAUSED', 'Press SPACE to Continue', dimensions);
      } else if (gameState === 'gameover') {
        drawOverlay(ctx, 'GAME OVER', `Score: ${Math.floor(scoreRef.current / 10)}m - Press R to Retry`, dimensions);
      }

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
    gameState,
    currentTheme,
    activePowerUps,
    spawnObstacle,
    onScoreUpdate,
    onGameOver,
    addCoins,
    deactivatePowerUp,
  ]);

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        className="border-4 border-pixel-black bg-ocean-blue cursor-pointer"
        style={{ 
          boxShadow: '8px 8px 0px #2d2d2d',
          touchAction: 'none',
        }}
        onClick={handleJump}
      />
      
      {/* HUD */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none">
        {/* Score */}
        <div 
          className="bg-pixel-black/80 px-4 py-2 border-2 border-pixel-shadow"
          style={{ boxShadow: '3px 3px 0px #1a1a1a' }}
        >
          <span className="font-pixel text-foamy-green text-sm">{displayScore}m</span>
        </div>

        {/* Lives */}
        <div 
          className="bg-pixel-black/80 px-4 py-2 border-2 border-pixel-shadow flex gap-1"
          style={{ boxShadow: '3px 3px 0px #1a1a1a' }}
        >
          {[...Array(3)].map((_, i) => (
            <span 
              key={i} 
              className={`text-lg ${i < lives ? 'opacity-100' : 'opacity-30'}`}
            >
              ❤️
            </span>
          ))}
        </div>
      </div>

      {/* Active power-ups indicator */}
      {activePowerUps.length > 0 && (
        <div className="absolute bottom-4 left-4 flex gap-2 pointer-events-none">
          {activePowerUps.map((powerUp) => (
            <div
              key={powerUp}
              className="bg-pixel-black/80 px-3 py-1 border-2 border-foamy-green font-pixel text-xs text-foamy-green animate-pulse"
            >
              {powerUp === 'double-jump' && '⬆️ 2X JUMP'}
              {powerUp === 'shield' && '🛡️ SHIELD'}
              {powerUp === 'slow-mo' && '⏱️ SLOW-MO'}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function drawOverlay(
  ctx: CanvasRenderingContext2D,
  title: string,
  subtitle: string,
  dimensions: { width: number; height: number }
) {
  // Semi-transparent background
  ctx.fillStyle = 'rgba(26, 26, 26, 0.8)';
  ctx.fillRect(0, 0, dimensions.width, dimensions.height);

  // Title
  ctx.font = '24px "Press Start 2P", monospace';
  ctx.fillStyle = '#98D8AA';
  ctx.textAlign = 'center';
  ctx.fillText(title, dimensions.width / 2, dimensions.height / 2 - 20);

  // Subtitle
  ctx.font = '14px "Press Start 2P", monospace';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(subtitle, dimensions.width / 2, dimensions.height / 2 + 20);
}

export default GameCanvas;

