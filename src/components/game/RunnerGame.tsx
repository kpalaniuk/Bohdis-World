'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import { useGameStore, GameTheme } from '@/stores/gameStore';
import { useCharacterStore, CharacterType } from '@/stores/characterStore';
import { drawCharacter, CHARACTER_WIDTH, CHARACTER_HEIGHT } from './sprites/CharacterSprites';
import { drawObstacle, OBSTACLE_DIMENSIONS } from './sprites/Obstacles';
import { drawBackground, drawGround } from './sprites/Background';
import { playSound } from '@/lib/sounds';

interface Obstacle {
  x: number;
  type: 'rock' | 'seaweed' | 'crab';
  passed: boolean;
}

interface RunnerGameProps {
  onObstacleCleared?: () => void;
  disableSounds?: boolean;
  enableGlobalTouch?: boolean; // Enable document-level touch handlers (for gate phase)
}

const GRAVITY = 0.8;
const JUMP_FORCE = -15;
const DOUBLE_JUMP_FORCE = -12;
const GAME_SPEED_INITIAL = 5;
const GAME_SPEED_MAX = 12;
const GROUND_Y_OFFSET = 80;
const CHARACTER_SCALE = 2;

export function RunnerGame({ onObstacleCleared, disableSounds = false, enableGlobalTouch = false }: RunnerGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<number | undefined>(undefined);
  const lastTimeRef = useRef<number>(0);
  
  // Game state refs (for animation loop)
  const characterYRef = useRef<number>(0);
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
    soundEnabled,
  } = useGameStore();

  // Get character info
  const { selectedCharacter, getStrengths } = useCharacterStore();
  const characterType: CharacterType = selectedCharacter || 'surfer';
  const strengths = getStrengths();

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
      characterYRef.current = dimensions.height - GROUND_Y_OFFSET - CHARACTER_HEIGHT * CHARACTER_SCALE;
    }
  }, [dimensions.height]);

  // Check power-ups and apply character strengths
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

  // Jump handler - applies character jump strength
  const handleJump = useCallback(() => {
    const groundY = dimensions.height - GROUND_Y_OFFSET - CHARACTER_HEIGHT * CHARACTER_SCALE;
    const isOnGround = characterYRef.current >= groundY - 5;
    
    // Apply character jump strength modifier
    const jumpMultiplier = strengths?.jumpHeight || 1;
    const adjustedJumpForce = JUMP_FORCE * jumpMultiplier;
    const adjustedDoubleJumpForce = DOUBLE_JUMP_FORCE * (strengths?.doubleJump || 1);

    if (isOnGround) {
      velocityYRef.current = adjustedJumpForce;
      isJumpingRef.current = true;
      hasDoubleJumpedRef.current = false;
      
      if (!isPlaying) {
        setPlaying(true);
      }
      if (soundEnabled && !disableSounds) playSound('jump');
    } else if (canDoubleJumpRef.current && !hasDoubleJumpedRef.current) {
      velocityYRef.current = adjustedDoubleJumpForce;
      hasDoubleJumpedRef.current = true;
      if (soundEnabled && !disableSounds) playSound('doubleJump');
    }
  }, [dimensions.height, isPlaying, setPlaying, strengths, soundEnabled]);

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

  // Touch controls - only use document-level handlers during gate phase to not block scrolling
  useEffect(() => {
    if (!enableGlobalTouch) {
      // When site is unlocked, only listen on the canvas (handled by pointer-events-none on parent)
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const handleCanvasTouch = (e: TouchEvent) => {
        e.preventDefault();
        handleJump();
      };
      
      canvas.addEventListener('touchstart', handleCanvasTouch, { passive: false });
      return () => canvas.removeEventListener('touchstart', handleCanvasTouch);
    }
    
    // During gate phase, listen on document for full-screen touch support
    const handleTouch = (e: TouchEvent) => {
      // Don't prevent default on form elements
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'BUTTON' || target.tagName === 'A') {
        return;
      }
      e.preventDefault();
      handleJump();
    };

    const handleClick = (e: MouseEvent) => {
      // Don't trigger on form elements or buttons
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'BUTTON' || target.tagName === 'A' || target.closest('form')) {
        return;
      }
      handleJump();
    };

    // Listen on document for full coverage during gate phase
    document.addEventListener('touchstart', handleTouch, { passive: false });
    document.addEventListener('click', handleClick);
    
    return () => {
      document.removeEventListener('touchstart', handleTouch);
      document.removeEventListener('click', handleClick);
    };
  }, [handleJump, enableGlobalTouch]);

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

        // Update obstacles - only move when actively playing
        const groundY = dimensions.height - GROUND_Y_OFFSET;
        
        for (let i = obstaclesRef.current.length - 1; i >= 0; i--) {
          const obstacle = obstaclesRef.current[i];
          // Only move obstacles when actively playing
          if (isPlaying && !isPaused) {
            obstacle.x -= gameSpeedRef.current;
          }

          // Remove off-screen obstacles
          if (obstacle.x < -100) {
            obstaclesRef.current.splice(i, 1);
            continue;
          }

          // Draw obstacle
          const obsDims = OBSTACLE_DIMENSIONS[obstacle.type];
          const obsY = groundY - obsDims.height * CHARACTER_SCALE + 15;
          drawObstacle(ctx, obstacle.type, obstacle.x, obsY, CHARACTER_SCALE);

          // Check if passed - only when actively playing
          const characterX = 100;
          if (isPlaying && !isPaused && !obstacle.passed && obstacle.x + obsDims.width * CHARACTER_SCALE < characterX) {
            obstacle.passed = true;
            if (soundEnabled && !disableSounds) playSound('obstaclePass');
            onObstacleCleared?.();
          }

          // Collision detection - only when actively playing
          if (isPlaying && !isPaused) {
            const characterLeft = characterX;
            const characterRight = characterX + CHARACTER_WIDTH * CHARACTER_SCALE;
            const characterTop = characterYRef.current;
            const characterBottom = characterYRef.current + CHARACTER_HEIGHT * CHARACTER_SCALE;

            const obsLeft = obstacle.x;
            const obsRight = obstacle.x + obsDims.width * CHARACTER_SCALE;
            const obsTop = obsY;
            const obsBottom = obsY + obsDims.height * CHARACTER_SCALE;

            const collides = 
              characterLeft < obsRight &&
              characterRight > obsLeft &&
              characterTop < obsBottom &&
              characterBottom > obsTop;

            if (collides && !obstacle.passed) {
              if (hasShieldRef.current) {
                hasShieldRef.current = false;
                obstacle.passed = true; // Don't collide again
                if (soundEnabled && !disableSounds) playSound('powerup');
              } else {
                // Stumble effect - just continue, no game over
                obstacle.passed = true;
                if (soundEnabled && !disableSounds) playSound('collision');
              }
            }
          }
        }

        // Update character physics
        const groundYCharacter = dimensions.height - GROUND_Y_OFFSET - CHARACTER_HEIGHT * CHARACTER_SCALE;
        
        velocityYRef.current += GRAVITY;
        characterYRef.current += velocityYRef.current;

        if (characterYRef.current >= groundYCharacter) {
          characterYRef.current = groundYCharacter;
          velocityYRef.current = 0;
          isJumpingRef.current = false;
        }
      }

      // Draw ground details
      drawGround(ctx, dimensions.width, dimensions.height, currentTheme, scrollOffsetRef.current);

      // Draw character using the character system
      const characterX = 100;
      drawCharacter(ctx, characterType, characterX, characterYRef.current, CHARACTER_SCALE, isJumpingRef.current);

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
    characterType,
    setScore,
    spawnObstacle,
    onObstacleCleared,
    soundEnabled,
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
      className="fixed inset-0 z-0 pointer-events-none"
      style={{ 
        touchAction: enableGlobalTouch ? 'none' : 'auto',
        pointerEvents: enableGlobalTouch ? 'auto' : 'none',
      }}
    />
  );
}

export default RunnerGame;
