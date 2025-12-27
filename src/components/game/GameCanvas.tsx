'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import { useGameStore, GameTheme, PowerUp } from '@/stores/gameStore';
import { useUnlockStore } from '@/stores/unlockStore';
import { useCoinStore } from '@/stores/coinStore';
import { useCharacterStore, CharacterType } from '@/stores/characterStore';
import { drawCharacter, CHARACTER_WIDTH, CHARACTER_HEIGHT } from './sprites/CharacterSprites';
import { drawObstacle, OBSTACLE_DIMENSIONS } from './sprites/Obstacles';
import { drawBackground, drawGround } from './sprites/Background';
import { playSound } from '@/lib/sounds';

interface Obstacle {
  x: number;
  type: 'rock' | 'seaweed' | 'crab';
  passed: boolean;
  height: number; // Height multiplier for taller obstacles
}

interface GameCanvasProps {
  onGameOver?: (score: number) => void;
  onScoreUpdate?: (score: number) => void;
}

const GRAVITY = 0.8;
const JUMP_FORCE = -12; // Reduced from -16 for better control
const DOUBLE_JUMP_FORCE = -10; // Reduced from -13
const GAME_SPEED_INITIAL = 6;
const GAME_SPEED_MAX = 14;
const GROUND_Y_OFFSET = 100;
const CHARACTER_SCALE = 2.5;
const OBSTACLE_INTERVAL_MIN = 60;
const OBSTACLE_INTERVAL_MAX = 120;

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
  const [isMobile, setIsMobile] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [jumpHeight, setJumpHeight] = useState(1.0); // Multiplier for jump height (0.5 to 2.0)
  const [doubleJumpEnabled, setDoubleJumpEnabled] = useState(true); // Whether double jump is enabled
  
  // Detect mobile device - improved iPad detection
  useEffect(() => {
    const checkMobile = () => {
      const ua = navigator.userAgent.toLowerCase();
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isMobileUA = /iphone|ipad|ipod|android|webos|blackberry|iemobile|opera mini/i.test(ua);
      const isSmallScreen = window.innerWidth < 768;
      // Better iPad detection - iPadOS doesn't always include "iPad" in user agent
      const isIPad = (ua.includes('mac') && isTouchDevice) || ua.includes('ipad');
      setIsMobile(isMobileUA || isIPad || isSmallScreen || isTouchDevice);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const { currentTheme, activePowerUps, deactivatePowerUp, soundEnabled } = useGameStore();
  const { usePowerUp, getPowerUpCount } = useUnlockStore();
  const { addCoins } = useCoinStore();
  const { selectedCharacter, getStrengths } = useCharacterStore();
  
  // Get character info
  const characterType: CharacterType = selectedCharacter || 'surfer';
  const strengths = getStrengths();

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
      surferYRef.current = dimensions.height - GROUND_Y_OFFSET - CHARACTER_HEIGHT * CHARACTER_SCALE;
    }
  }, [dimensions.height]);

  // Reset game
  const resetGame = useCallback(() => {
    surferYRef.current = dimensions.height - GROUND_Y_OFFSET - CHARACTER_HEIGHT * CHARACTER_SCALE;
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

  // Jump handler - only double jump when explicitly pressed again
  const handleJump = useCallback(() => {
    if (gameState === 'ready') {
      startGame();
      return;
    }
    
    if (gameState !== 'playing') return;

    const groundY = dimensions.height - GROUND_Y_OFFSET - CHARACTER_HEIGHT * CHARACTER_SCALE;
    const isOnGround = surferYRef.current >= groundY - 5;
    const hasDoubleJumpPowerUp = activePowerUps.includes('double-jump');

    // Apply character jump strength modifier and user settings
    const jumpMultiplier = (strengths?.jumpHeight || 1) * jumpHeight;
    const adjustedJumpForce = JUMP_FORCE * jumpMultiplier;
    const adjustedDoubleJumpForce = DOUBLE_JUMP_FORCE * jumpMultiplier;

    if (isOnGround) {
      // Regular jump from ground
      velocityYRef.current = adjustedJumpForce;
      isJumpingRef.current = true;
      hasDoubleJumpedRef.current = false;
      if (soundEnabled) playSound('jump');
    } else if (doubleJumpEnabled && hasDoubleJumpPowerUp && !hasDoubleJumpedRef.current) {
      // Double jump - only if enabled and power-up is active and not already used
      velocityYRef.current = adjustedDoubleJumpForce;
      hasDoubleJumpedRef.current = true;
      if (soundEnabled) playSound('doubleJump');
    }
  }, [gameState, dimensions.height, activePowerUps, startGame, strengths, soundEnabled, jumpHeight, doubleJumpEnabled]);

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
      } else if (e.code === 'KeyS' && (gameState === 'playing' || gameState === 'paused')) {
        if (showSettings) {
          setShowSettings(false);
          if (gameState === 'paused') {
            setGameState('playing');
          }
        } else {
          setShowSettings(true);
          if (gameState === 'playing') {
            setGameState('paused');
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleJump, togglePause, gameState, startGame, showSettings]);

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

  // Spawn obstacle with varied heights and timing
  const spawnObstacle = useCallback(() => {
    const types: ('rock' | 'seaweed' | 'crab')[] = ['rock', 'seaweed', 'crab'];
    const type = types[Math.floor(Math.random() * types.length)];
    
    // Determine obstacle height based on score segments
    // Early game: mostly low obstacles
    // Mid game: mix of low and medium
    // Late game: more tall obstacles requiring higher jumps
    let heightMultiplier = 1;
    const scoreSegment = Math.floor(scoreRef.current / 1000);
    
    if (scoreSegment < 2) {
      // Early game: 80% low, 20% medium
      heightMultiplier = Math.random() < 0.8 ? 1 : 1.5;
    } else if (scoreSegment < 5) {
      // Mid game: 50% low, 40% medium, 10% tall
      const rand = Math.random();
      if (rand < 0.5) heightMultiplier = 1;
      else if (rand < 0.9) heightMultiplier = 1.5;
      else heightMultiplier = 2;
    } else {
      // Late game: 30% low, 40% medium, 30% tall
      const rand = Math.random();
      if (rand < 0.3) heightMultiplier = 1;
      else if (rand < 0.7) heightMultiplier = 1.5;
      else heightMultiplier = 2;
    }
    
    obstaclesRef.current.push({
      x: dimensions.width + 50,
      type,
      passed: false,
      height: heightMultiplier,
    });

    // Vary interval based on score segments - create waves of obstacles
    const baseInterval = Math.floor(
      Math.random() * (OBSTACLE_INTERVAL_MAX - OBSTACLE_INTERVAL_MIN) + OBSTACLE_INTERVAL_MIN
    );
    
    // Create obstacle clusters at certain intervals
    const clusterChance = scoreSegment % 3 === 0 ? 0.3 : 0.1;
    if (Math.random() < clusterChance) {
      // Spawn another obstacle soon after (cluster)
      nextObstacleIntervalRef.current = Math.max(30, baseInterval * 0.4);
    } else {
      nextObstacleIntervalRef.current = baseInterval;
    }
    
    // Gradually decrease interval as game speeds up, but not too fast
    nextObstacleIntervalRef.current = Math.max(
      40,
      nextObstacleIntervalRef.current - Math.floor(scoreRef.current / 1000)
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
          if (soundEnabled) playSound('coin');
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

        // Update obstacles - only move when actively playing
        const groundY = dimensions.height - GROUND_Y_OFFSET;
        const surferX = 80;
        
        for (let i = obstaclesRef.current.length - 1; i >= 0; i--) {
          const obstacle = obstaclesRef.current[i];
          // Only move obstacles when actively playing
          if (gameState === 'playing') {
            obstacle.x -= currentSpeed;
          }

          // Remove off-screen obstacles
          if (obstacle.x < -100) {
            obstaclesRef.current.splice(i, 1);
            continue;
          }

          // Draw obstacle with height multiplier
          const obsDims = OBSTACLE_DIMENSIONS[obstacle.type];
          const baseHeight = obsDims.height * CHARACTER_SCALE;
          const adjustedHeight = baseHeight * obstacle.height;
          const obsY = groundY - adjustedHeight + 20;
          
          // Scale the obstacle drawing based on height multiplier
          const drawScale = CHARACTER_SCALE * obstacle.height;
          drawObstacle(ctx, obstacle.type, obstacle.x, obsY, drawScale);

          // Check if passed (score point) - only when actively playing
          if (gameState === 'playing' && !obstacle.passed && obstacle.x + obsDims.width * drawScale < surferX) {
            obstacle.passed = true;
            if (soundEnabled) playSound('obstaclePass');
          }

          // Collision detection - only when actively playing
          if (gameState === 'playing' && invincibleFramesRef.current === 0) {
            const surferLeft = surferX + 10;
            const surferRight = surferX + CHARACTER_WIDTH * CHARACTER_SCALE - 10;
            const surferTop = surferYRef.current + 10;
            const surferBottom = surferYRef.current + CHARACTER_HEIGHT * CHARACTER_SCALE;

            const obsLeft = obstacle.x + 5;
            const obsRight = obstacle.x + obsDims.width * drawScale - 5;
            const obsTop = obsY + 5;
            const obsBottom = obsY + adjustedHeight;

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
                if (soundEnabled) playSound('powerup');
              } else {
                // Lose a life
                livesRef.current--;
                setLives(livesRef.current);
                obstacle.passed = true;
                invincibleFramesRef.current = 120;
                if (soundEnabled) playSound('collision');

                if (livesRef.current <= 0) {
                  // Game over
                  setGameState('gameover');
                  if (soundEnabled) playSound('gameOver');
                  onGameOver?.(Math.floor(scoreRef.current / 10));
                }
              }
            }
          }
        }

        // Update character physics
        const groundYSurfer = dimensions.height - GROUND_Y_OFFSET - CHARACTER_HEIGHT * CHARACTER_SCALE;
        
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

      // Draw character (blink when invincible)
      const shouldDraw = invincibleFramesRef.current === 0 || Math.floor(invincibleFramesRef.current / 5) % 2 === 0;
      if (shouldDraw) {
        const characterX = 80;
        drawCharacter(ctx, characterType, characterX, surferYRef.current, CHARACTER_SCALE, isJumpingRef.current);
      }

      // Draw UI overlays
      if (gameState === 'ready') {
        drawOverlay(ctx, 'SURF RUNNER', isMobile ? 'Tap Screen to Start' : 'Press SPACE to Start', dimensions);
      } else if (gameState === 'paused') {
        drawOverlay(ctx, 'PAUSED', isMobile ? 'Tap Screen to Continue' : 'Press SPACE to Continue', dimensions);
      } else if (gameState === 'gameover') {
        drawOverlay(ctx, 'GAME OVER', `Score: ${Math.floor(scoreRef.current / 10)}m${isMobile ? ' - Tap to Retry' : ' - Press R to Retry'}`, dimensions);
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
    characterType,
    strengths,
    soundEnabled,
    jumpHeight,
    doubleJumpEnabled,
    showSettings,
    isMobile,
  ]);

  // Handle retry on game over
  const handleRetry = useCallback(() => {
    if (gameState === 'gameover') {
      startGame();
    }
  }, [gameState, startGame]);

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
        onClick={(e) => {
          if (gameState === 'ready' || gameState === 'paused') {
            if (gameState === 'ready') {
              startGame();
            } else {
              setGameState('playing');
            }
          } else if (gameState === 'gameover') {
            handleRetry();
          } else {
            handleJump();
          }
        }}
        onTouchStart={(e) => {
          if (gameState === 'ready' || gameState === 'paused') {
            e.preventDefault();
            if (gameState === 'ready') {
              startGame();
            } else {
              setGameState('playing');
            }
          } else if (gameState === 'gameover') {
            e.preventDefault();
            handleRetry();
          } else {
            e.preventDefault();
            handleJump();
          }
        }}
      />
      
      {/* Start Button Overlay (Ready State) */}
      {isMobile && gameState === 'ready' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <button
            onClick={startGame}
            onTouchStart={(e) => {
              e.preventDefault();
              startGame();
            }}
            className="pointer-events-auto px-8 py-4 bg-foamy-green border-4 border-pixel-black text-pixel-black font-pixel text-lg hover:bg-yellow-300 active:bg-yellow-400 transition-colors"
            style={{ boxShadow: '6px 6px 0px #2d2d2d' }}
          >
            TAP TO START
          </button>
        </div>
      )}
      
      {/* Pause Resume Button */}
      {isMobile && gameState === 'paused' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <button
            onClick={() => setGameState('playing')}
            onTouchStart={(e) => {
              e.preventDefault();
              setGameState('playing');
            }}
            className="pointer-events-auto px-8 py-4 bg-ocean-blue border-4 border-pixel-black text-white font-pixel text-lg hover:bg-foamy-green hover:text-pixel-black active:bg-yellow-300 transition-colors"
            style={{ boxShadow: '6px 6px 0px #2d2d2d' }}
          >
            TAP TO RESUME
          </button>
        </div>
      )}
      
      {/* Retry Button Overlay (Game Over) */}
      {gameState === 'gameover' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <button
            onClick={handleRetry}
            onTouchStart={(e) => {
              e.preventDefault();
              handleRetry();
            }}
            className="pointer-events-auto px-8 py-4 bg-foamy-green border-4 border-pixel-black text-pixel-black font-pixel text-lg hover:bg-yellow-300 active:bg-yellow-400 transition-colors"
            style={{ boxShadow: '6px 6px 0px #2d2d2d' }}
          >
            TAP TO RETRY
          </button>
        </div>
      )}
      
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

      {/* Mobile Tap Instructions */}
      {isMobile && gameState === 'playing' && (
        <div className="absolute bottom-4 left-0 right-0 flex justify-center pointer-events-none z-10">
          <div className="bg-pixel-black/80 px-4 py-2 border-2 border-foamy-green">
            <p className="font-lcd text-foamy-green text-xs text-center">
              TAP ANYWHERE TO JUMP!
            </p>
          </div>
        </div>
      )}

      {/* Active power-ups indicator */}
      {activePowerUps.length > 0 && (
        <div className="absolute bottom-16 left-4 flex gap-2 pointer-events-none">
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
      
      {/* Settings Overlay */}
      {showSettings && (gameState === 'paused' || gameState === 'playing') && (
        <div 
          className="absolute inset-0 bg-black/95 flex items-center justify-center z-20"
          style={{ fontFamily: '"Press Start 2P", monospace' }}
        >
          <div className="text-center space-y-6">
            <h2 className="text-foamy-green text-xl mb-6">GAME SETTINGS</h2>
            
            <div className="space-y-4">
              <div>
                <p className="text-white text-sm mb-2">Jump Height: {(jumpHeight * 100).toFixed(0)}%</p>
                <div className="w-80 h-6 bg-pixel-black border-2 border-white mx-auto relative">
                  <div 
                    className="h-full bg-ocean-blue transition-all"
                    style={{ width: `${((jumpHeight - 0.5) / 1.5) * 100}%` }}
                  />
                </div>
                <div className="flex justify-center gap-2 mt-2">
                  <button
                    onClick={() => setJumpHeight(prev => Math.max(0.5, prev - 0.1))}
                    className="px-3 py-1 bg-pixel-shadow border-2 border-white text-white font-pixel text-xs hover:bg-ocean-blue"
                  >
                    -
                  </button>
                  <button
                    onClick={() => setJumpHeight(prev => Math.min(2.0, prev + 0.1))}
                    className="px-3 py-1 bg-pixel-shadow border-2 border-white text-white font-pixel text-xs hover:bg-ocean-blue"
                  >
                    +
                  </button>
                </div>
              </div>
              
              <div>
                <label className="flex items-center justify-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={doubleJumpEnabled}
                    onChange={(e) => setDoubleJumpEnabled(e.target.checked)}
                    className="w-5 h-5"
                  />
                  <span className="text-white text-sm">Enable Double Jump</span>
                </label>
                <p className="text-gray-400 text-xs mt-1">Double jump only works when you have the power-up</p>
              </div>
              
              <div className="space-y-2 text-xs text-gray-300">
                <p>Press S to close settings</p>
              </div>
            </div>
          </div>
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

