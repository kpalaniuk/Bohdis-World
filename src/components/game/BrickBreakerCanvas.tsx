'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import { useCoinStore } from '@/stores/coinStore';
import { useGameStore } from '@/stores/gameStore';
import { useAuth } from '@/contexts/AuthContext';
import { playSound } from '@/lib/sounds';
import { logActivity } from '@/lib/activityTracking';
import { getGameSettingsForUser, GameSettingsConfig } from '@/lib/gameSettings';
import confetti from 'canvas-confetti';

interface Brick {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  destroyed: boolean;
  points: number;
  hasPowerUp?: boolean; // Free ball power-up
}

interface Ball {
  x: number;
  y: number;
  radius: number;
  velocityX: number;
  velocityY: number;
}

interface PowerUp {
  x: number;
  y: number;
  type: 'life';
  life: number; // Frames until it disappears
}

interface Paddle {
  x: number;
  y: number;
  width: number;
  height: number;
}

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const PADDLE_WIDTH = 100;
const PADDLE_HEIGHT = 15;
const BALL_RADIUS = 8;
const BRICK_ROWS = 5;
const BRICK_COLS = 10;
const BRICK_WIDTH = 70;
const BRICK_HEIGHT = 25;
const BRICK_PADDING = 5;
const BRICK_OFFSET_TOP = 60;
const BRICK_OFFSET_LEFT = (CANVAS_WIDTH - (BRICK_COLS * (BRICK_WIDTH + BRICK_PADDING) - BRICK_PADDING)) / 2;
const POWERUP_LIFE = 300; // 5 seconds at 60fps

// Fun colors for bricks
const BRICK_COLORS = [
  '#FF6B6B', // Red
  '#4ECDC4', // Teal
  '#45B7D1', // Blue
  '#FFA07A', // Light Salmon
  '#98D8C8', // Mint
  '#F7DC6F', // Yellow
  '#BB8FCE', // Purple
  '#85C1E2', // Sky Blue
  '#F8B739', // Orange
  '#EA5455', // Coral
];

// Level configurations
function generateLevel(level: number, settings?: GameSettingsConfig): Brick[] {
  const bricks: Brick[] = [];
  const colorsPerRow = Math.min(BRICK_COLORS.length, BRICK_ROWS);
  
  // Get custom brick rows/cols from settings
  const customRows = settings?.brickBreaker?.brickRows as number | undefined;
  const customCols = settings?.brickBreaker?.brickCols as number | undefined;
  const rowsForLevel = customRows || (level === 1 ? 3 : level <= 3 ? 4 : BRICK_ROWS);
  const colsForLevel = customCols || BRICK_COLS;
  
  for (let row = 0; row < rowsForLevel; row++) {
    const colorIndex = row % colorsPerRow;
    const color = BRICK_COLORS[colorIndex];
    
    // Increase difficulty: some bricks require multiple hits on higher levels
    const hitPoints = level > 5 ? (row < 2 ? 2 : 1) : 1;
    const points = hitPoints * (level * 10 + (rowsForLevel - row) * 5);
    
    const powerUpChance = (settings?.brickBreaker?.powerUpChance as number) || 0.1;
    
    for (let col = 0; col < colsForLevel; col++) {
      // Skip some bricks on higher levels for variety
      if (level > 3 && Math.random() < 0.1) continue;
      
      // Add power-ups randomly based on settings
      const hasPowerUp = Math.random() < powerUpChance && level <= 7;
      
      bricks.push({
        x: BRICK_OFFSET_LEFT + col * (BRICK_WIDTH + BRICK_PADDING),
        y: BRICK_OFFSET_TOP + row * (BRICK_HEIGHT + BRICK_PADDING),
        width: BRICK_WIDTH,
        height: BRICK_HEIGHT,
        color,
        destroyed: false,
        points,
        hasPowerUp,
      });
    }
  }
  
  return bricks;
}

interface BrickBreakerCanvasProps {
  onGameOver?: (score: number) => void;
  onLevelComplete?: (level: number) => void;
}

export function BrickBreakerCanvas({ onGameOver, onLevelComplete }: BrickBreakerCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<number | undefined>(undefined);
  
  const [gameState, setGameState] = useState<'ready' | 'playing' | 'paused' | 'gameover' | 'levelComplete'>('ready');
  const [currentLevel, setCurrentLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(() => {
    // Will be updated when settings load
    return 3;
  });
  const [cheatActive, setCheatActive] = useState(false);
  const [cheatInput, setCheatInput] = useState('');
  const [powerUps, setPowerUps] = useState<PowerUp[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [paddleSpeed, setPaddleSpeed] = useState(1.0); // Multiplier for paddle speed
  const [isMobile, setIsMobile] = useState(false);
  const [mouseX, setMouseX] = useState<number | null>(null);
  const [touchX, setTouchX] = useState<number | null>(null);
  
  // Detect mobile device - improved iPad detection
  useEffect(() => {
    const checkMobile = () => {
      const ua = navigator.userAgent.toLowerCase();
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isMobileUA = /iphone|ipad|ipod|android|webos|blackberry|iemobile|opera mini/i.test(ua);
      const isSmallScreen = window.innerWidth < 768;
      const isIPad = (ua.includes('mac') && isTouchDevice) || ua.includes('ipad');
      setIsMobile(isMobileUA || isIPad || isSmallScreen || isTouchDevice);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  const paddleRef = useRef<Paddle>({
    x: CANVAS_WIDTH / 2 - PADDLE_WIDTH / 2,
    y: CANVAS_HEIGHT - 40,
    width: PADDLE_WIDTH,
    height: PADDLE_HEIGHT,
  });
  
  const ballRef = useRef<Ball>({
    x: CANVAS_WIDTH / 2,
    y: CANVAS_HEIGHT - 60,
    radius: BALL_RADIUS,
    velocityX: 4,
    velocityY: -4,
  });
  
  const bricksRef = useRef<Brick[]>([]);
  const keysRef = useRef<Set<string>>(new Set());
  const lastCollisionBrickRef = useRef<string | null>(null); // Track last hit brick to prevent double hits
  
  const { soundEnabled } = useGameStore();
  const { addCoins } = useCoinStore();
  const { user } = useAuth();
  const [gameSettings, setGameSettings] = useState<GameSettingsConfig | null>(null);
  
  // Load game settings
  useEffect(() => {
    if (user?.id) {
      getGameSettingsForUser(user.id, 'brickBreaker').then(settings => {
        setGameSettings(settings);
        if (settings?.brickBreaker?.startingLives) {
          setLives(settings.brickBreaker.startingLives as number);
        }
      });
    }
  }, [user]);

  // Reset ball function - must be declared before useEffect that uses it
  const resetBall = useCallback(() => {
    // Level-based speed: slower for level 1, progressively faster
    let baseSpeed = currentLevel === 1 ? 2.5 : currentLevel <= 3 ? 3 : currentLevel <= 5 ? 3.5 : currentLevel <= 7 ? 4 : currentLevel <= 9 ? 4.5 : 5;
    
    // Apply custom ball speed multiplier if set
    if (gameSettings?.brickBreaker?.ballSpeed) {
      baseSpeed *= gameSettings.brickBreaker.ballSpeed as number;
    }
    
    ballRef.current = {
      x: CANVAS_WIDTH / 2,
      y: CANVAS_HEIGHT - 60,
      radius: BALL_RADIUS,
      velocityX: (Math.random() > 0.5 ? 1 : -1) * baseSpeed,
      velocityY: -baseSpeed,
    };
    lastCollisionBrickRef.current = null;
  }, [currentLevel, gameSettings]);

  // Initialize level
  useEffect(() => {
    bricksRef.current = generateLevel(currentLevel, gameSettings || undefined);
    setPowerUps([]);
    setCheatActive(false);
    resetBall();
  }, [currentLevel, resetBall, gameSettings]);
  
  const startGame = useCallback(async () => {
    resetBall();
    setGameState('playing');
    
    // Log game start
    if (user?.id) {
      await logActivity(user.id, 'game_played', { game: 'brick-breaker', level: currentLevel });
    }
  }, [resetBall, user, currentLevel]);
  
  // Cheat code handler
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (gameState !== 'playing') {
        setCheatInput(''); // Reset cheat input when not playing
        return;
      }
      
      // Build cheat input
      const key = e.key.toLowerCase();
      if (key.match(/[a-z]/)) {
        setCheatInput(prev => {
          const newInput = (prev + key).slice(-11); // Keep last 11 chars
          
          if (newInput === 'bohdiiscool') {
            setCheatActive(true);
            if (soundEnabled) playSound('powerup');
            return '';
          }
          
          return newInput;
        });
      } else {
        // Reset on non-letter key
        setCheatInput('');
      }
    };
    
    window.addEventListener('keypress', handleKeyPress);
    return () => window.removeEventListener('keypress', handleKeyPress);
  }, [gameState, soundEnabled]);
  
  // Reset game function
  const resetGame = useCallback(() => {
    setCurrentLevel(1);
    setScore(0);
    const startingLives = gameSettings?.brickBreaker?.startingLives ? (gameSettings.brickBreaker.startingLives as number) : 3;
    setLives(startingLives);
    setCheatActive(false);
    setPowerUps([]);
    setGameState('ready');
    bricksRef.current = generateLevel(1, gameSettings || undefined);
    resetBall();
    paddleRef.current = {
      x: CANVAS_WIDTH / 2 - PADDLE_WIDTH / 2,
      y: CANVAS_HEIGHT - 40,
      width: PADDLE_WIDTH,
      height: PADDLE_HEIGHT,
    };
  }, [gameSettings, resetBall]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.code);
      
      if (e.code === 'Space' && gameState === 'ready') {
        startGame();
      } else if (e.code === 'KeyP' || e.code === 'Escape') {
        if (gameState === 'playing') {
          setGameState('paused');
          setShowSettings(false);
        } else if (gameState === 'paused') {
          setGameState('playing');
        }
      } else if (e.code === 'KeyR' && gameState === 'gameover') {
        resetGame();
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
    
    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.code);
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState, startGame, resetGame]);
  
  // Game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const gameLoop = () => {
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      
      // Draw background
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      
      // Draw grid pattern
      ctx.strokeStyle = '#16213e';
      ctx.lineWidth = 1;
      for (let i = 0; i < CANVAS_WIDTH; i += 40) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, CANVAS_HEIGHT);
        ctx.stroke();
      }
      for (let i = 0; i < CANVAS_HEIGHT; i += 40) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(CANVAS_WIDTH, i);
        ctx.stroke();
      }
      
      if (gameState === 'playing') {
        // Move paddle - use mouse/touch position directly
        const paddle = paddleRef.current;
        const targetX = touchX !== null ? touchX : (mouseX !== null ? mouseX : null);
        
        if (targetX !== null) {
          // Move paddle to mouse/touch position (centered on paddle)
          const targetPaddleX = Math.max(0, Math.min(CANVAS_WIDTH - paddle.width, targetX - paddle.width / 2));
          const basePaddleSpeed = gameSettings?.brickBreaker?.paddleSpeed ? 7 * (gameSettings.brickBreaker.paddleSpeed as number) : 7;
          const adjustedPaddleSpeed = basePaddleSpeed * paddleSpeed;
          
          // Smooth movement towards target
          const diff = targetPaddleX - paddle.x;
          if (Math.abs(diff) > 1) {
            paddle.x += Math.sign(diff) * Math.min(Math.abs(diff), adjustedPaddleSpeed);
          } else {
            paddle.x = targetPaddleX;
          }
        } else {
          // Fallback to keyboard controls if no mouse/touch
          const basePaddleSpeed = gameSettings?.brickBreaker?.paddleSpeed ? 7 * (gameSettings.brickBreaker.paddleSpeed as number) : 7;
          const adjustedPaddleSpeed = basePaddleSpeed * paddleSpeed;
          if (keysRef.current.has('ArrowLeft') || keysRef.current.has('KeyA')) {
            paddle.x = Math.max(0, paddle.x - adjustedPaddleSpeed);
          }
          if (keysRef.current.has('ArrowRight') || keysRef.current.has('KeyD')) {
            paddle.x = Math.min(CANVAS_WIDTH - paddle.width, paddle.x + adjustedPaddleSpeed);
          }
        }
        
        // Move ball
        const ball = ballRef.current;
        ball.x += ball.velocityX;
        ball.y += ball.velocityY;
        
        // Ball collision with walls
        if (ball.x - ball.radius <= 0 || ball.x + ball.radius >= CANVAS_WIDTH) {
          ball.velocityX = -ball.velocityX;
          if (soundEnabled) playSound('obstaclePass');
        }
        if (ball.y - ball.radius <= 0) {
          ball.velocityY = -ball.velocityY;
          if (soundEnabled) playSound('obstaclePass');
        }
        
        // Ball collision with paddle
        if (
          ball.y + ball.radius >= paddle.y &&
          ball.y - ball.radius <= paddle.y + paddle.height &&
          ball.x + ball.radius >= paddle.x &&
          ball.x - ball.radius <= paddle.x + paddle.width
        ) {
          // Calculate hit position on paddle (-1 to 1)
          const hitPos = (ball.x - (paddle.x + paddle.width / 2)) / (paddle.width / 2);
          ball.velocityX = hitPos * 6;
          ball.velocityY = -Math.abs(ball.velocityY);
          ball.y = paddle.y - ball.radius;
          if (soundEnabled) playSound('jump');
        }
        
        // Ball collision with bricks - only check one collision per frame
        const brickKey = (brick: Brick) => `${brick.x}-${brick.y}`;
        let hitBrick: Brick | null = null;
        
        for (const brick of bricksRef.current) {
          if (brick.destroyed) continue;
          
          // Skip if we already hit this brick this frame (prevent double hits)
          if (lastCollisionBrickRef.current === brickKey(brick)) continue;
          
          if (
            ball.x + ball.radius >= brick.x &&
            ball.x - ball.radius <= brick.x + brick.width &&
            ball.y + ball.radius >= brick.y &&
            ball.y - ball.radius <= brick.y + brick.height
          ) {
            hitBrick = brick;
            lastCollisionBrickRef.current = brickKey(brick);
            
            // Cheat mode: destroy all bricks instantly (but only one per frame)
            if (cheatActive) {
              brick.destroyed = true;
              setScore(prev => prev + brick.points);
              if (soundEnabled) playSound('coin');
              break;
            }
            
            // Normal collision
            brick.destroyed = true;
            setScore(prev => prev + brick.points);
            addCoins(Math.floor(brick.points / 10));
            
            // Spawn power-up if brick had one
            if (brick.hasPowerUp) {
              setPowerUps(prev => [...prev, {
                x: brick.x + brick.width / 2,
                y: brick.y + brick.height / 2,
                type: 'life',
                life: POWERUP_LIFE,
              }]);
            }
            
            // Determine bounce direction
            const ballCenterX = ball.x;
            const ballCenterY = ball.y;
            const brickCenterX = brick.x + brick.width / 2;
            const brickCenterY = brick.y + brick.height / 2;
            
            const dx = ballCenterX - brickCenterX;
            const dy = ballCenterY - brickCenterY;
            
            if (Math.abs(dx) > Math.abs(dy)) {
              ball.velocityX = ball.velocityX > 0 ? -Math.abs(ball.velocityX) : Math.abs(ball.velocityX);
            } else {
              ball.velocityY = ball.velocityY > 0 ? -Math.abs(ball.velocityY) : Math.abs(ball.velocityY);
            }
            
            if (soundEnabled) playSound('obstaclePass');
            break;
          }
        }
        
        // Reset collision tracking if ball moved away from last hit brick
        if (!hitBrick && lastCollisionBrickRef.current) {
          const [lastX, lastY] = lastCollisionBrickRef.current.split('-').map(Number);
          const distance = Math.sqrt((ball.x - lastX) ** 2 + (ball.y - lastY) ** 2);
          if (distance > 100) {
            lastCollisionBrickRef.current = null;
          }
        }
        
        // Update power-ups
        setPowerUps(prev => {
          const updated = prev.map(pu => ({ ...pu, life: pu.life - 1, y: pu.y + 2 }))
            .filter(pu => pu.life > 0 && pu.y < CANVAS_HEIGHT);
          
          // Check power-up collection
          const paddle = paddleRef.current;
          for (let i = updated.length - 1; i >= 0; i--) {
            const pu = updated[i];
            if (
              pu.x >= paddle.x &&
              pu.x <= paddle.x + paddle.width &&
              pu.y >= paddle.y &&
              pu.y <= paddle.y + paddle.height
            ) {
              // Collected!
              setLives(prev => prev + 1);
              if (soundEnabled) playSound('coin');
              updated.splice(i, 1);
            }
          }
          
          return updated;
        });
        
        // Check if all bricks destroyed
        if (bricksRef.current.every(b => b.destroyed)) {
          setGameState('levelComplete');
          if (soundEnabled) playSound('powerup');
          confetti({ particleCount: 50, spread: 70 });
          
          // Log level completion
          if (user?.id) {
            logActivity(user.id, 'level_complete', { 
              game: 'brick-breaker', 
              level: currentLevel,
              score 
            });
          }
          
          setTimeout(() => {
            if (currentLevel < 10) {
              setCurrentLevel(prev => prev + 1);
              setCheatActive(false); // Reset cheat for next level
              resetBall();
              setGameState('playing');
            } else {
              // Game complete!
              setGameState('gameover');
              onGameOver?.(score);
            }
          }, 2000);
        }
        
        // Ball fell off screen
        if (ball.y > CANVAS_HEIGHT) {
          setLives(prev => {
            const newLives = prev - 1;
            if (newLives <= 0) {
              setGameState('gameover');
              if (soundEnabled) playSound('gameOver');
              // Log game over
              if (user?.id) {
                logActivity(user.id, 'game_played', { 
                  game: 'brick-breaker', 
                  level: currentLevel,
                  score,
                  completed: false 
                });
              }
              onGameOver?.(score);
            } else {
              resetBall();
              setCheatActive(false); // Reset cheat on life loss
              setPowerUps([]); // Clear power-ups
              if (soundEnabled) playSound('collision');
            }
            return newLives;
          });
        }
      }
      
      // Draw bricks
      for (const brick of bricksRef.current) {
        if (brick.destroyed) continue;
        
        ctx.fillStyle = brick.color;
        ctx.fillRect(brick.x, brick.y, brick.width, brick.height);
        
        // Brick border
        ctx.strokeStyle = '#1a1a1a';
        ctx.lineWidth = 2;
        ctx.strokeRect(brick.x, brick.y, brick.width, brick.height);
        
        // Brick highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(brick.x, brick.y, brick.width, 5);
        
        // Power-up indicator
        if (brick.hasPowerUp) {
          ctx.fillStyle = '#FFD700';
          ctx.beginPath();
          ctx.arc(brick.x + brick.width / 2, brick.y + brick.height / 2, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#1a1a1a';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
      
      // Draw power-ups
      for (const pu of powerUps) {
        const alpha = pu.life / POWERUP_LIFE;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(pu.x, pu.y, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#1a1a1a';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Draw heart icon
        ctx.fillStyle = '#FF6B6B';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('❤️', pu.x, pu.y);
        ctx.globalAlpha = 1;
      }
      
      // Draw paddle
      const paddle = paddleRef.current;
      ctx.fillStyle = '#4A90D9';
      ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
      ctx.strokeStyle = '#1a1a1a';
      ctx.lineWidth = 2;
      ctx.strokeRect(paddle.x, paddle.y, paddle.width, paddle.height);
      
      // Draw ball
      const ball = ballRef.current;
      if (cheatActive) {
        // Cheat ball is glowing
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#FFD700';
      }
      ctx.fillStyle = cheatActive ? '#FFD700' : '#ffffff';
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      
      // Draw UI
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px "Press Start 2P", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`LEVEL: ${currentLevel}/10`, 10, 30);
      ctx.fillText(`SCORE: ${score}`, 10, 50);
      ctx.fillText(`LIVES: ${lives}`, CANVAS_WIDTH - 150, 30);
      
      if (cheatActive) {
        ctx.fillStyle = '#FFD700';
        ctx.font = '12px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('CHEAT MODE ACTIVE!', CANVAS_WIDTH / 2, CANVAS_HEIGHT - 20);
      }
      
      // Draw overlays
      if (gameState === 'ready') {
        drawOverlay(ctx, 'BRICK BREAKER', isMobile ? 'Tap Screen to Start' : 'Press SPACE to Start');
      } else if (gameState === 'paused') {
        drawOverlay(ctx, 'PAUSED', 'Press P to Continue');
      } else if (gameState === 'levelComplete') {
        drawOverlay(ctx, `LEVEL ${currentLevel} COMPLETE!`, currentLevel < 10 ? 'Next level...' : 'CONGRATULATIONS!');
      } else if (gameState === 'gameover') {
        drawOverlay(ctx, 'GAME OVER', `Final Score: ${score}${isMobile ? ' - Tap to Restart' : ' - Press R to Restart'}`);
      }
      
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };
    
    gameLoopRef.current = requestAnimationFrame(gameLoop);
    
    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameState, currentLevel, score, lives, cheatActive, soundEnabled, resetBall, addCoins, onGameOver, paddleSpeed]);
  
  // Handle paddle speed adjustment in settings
  useEffect(() => {
    if (!showSettings || gameState !== 'paused') return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        setPaddleSpeed(prev => Math.max(0.5, prev - 0.1));
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        setPaddleSpeed(prev => Math.min(2.0, prev + 0.1));
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showSettings, gameState]);
  
  // Handle mouse movement for paddle control
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (gameState === 'playing') {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const x = e.clientX - rect.left;
        setMouseX(x);
      }
    }
  }, [gameState]);

  const handleMouseLeave = useCallback(() => {
    setMouseX(null);
  }, []);

  // Handle touch movement for paddle control
  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    if (gameState === 'playing') {
      e.preventDefault();
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect && e.touches.length > 0) {
        const x = e.touches[0].clientX - rect.left;
        setTouchX(x);
      }
    }
  }, [gameState]);

  const handleTouchEnd = useCallback(() => {
    setTouchX(null);
  }, []);

  // Handle canvas tap for game over retry
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (gameState === 'gameover') {
      resetGame();
    } else if (gameState === 'ready') {
      startGame();
    }
  }, [gameState, resetGame, startGame]);

  // Handle touch for game over retry
  const handleCanvasTouchStart = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    if (gameState === 'gameover') {
      e.preventDefault();
      resetGame();
    } else if (gameState === 'ready') {
      e.preventDefault();
      startGame();
    }
  }, [gameState, resetGame, startGame]);

  return (
    <div className="relative inline-block">
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="border-4 border-pixel-black cursor-pointer"
        style={{ 
          boxShadow: '8px 8px 0px #2d2d2d',
          touchAction: 'none',
        }}
        onClick={handleCanvasClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleCanvasTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />
      
      {/* Retry Button Overlay (Game Over) */}
      {gameState === 'gameover' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <button
            onClick={resetGame}
            onTouchEnd={(e) => {
              e.preventDefault();
              resetGame();
            }}
            className="pointer-events-auto px-8 py-4 bg-foamy-green border-4 border-pixel-black text-pixel-black font-pixel text-lg hover:bg-yellow-300 active:bg-yellow-400 transition-colors"
            style={{ boxShadow: '6px 6px 0px #2d2d2d' }}
          >
            TAP TO RETRY
          </button>
        </div>
      )}
      
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
      
      {/* Settings Overlay */}
      {showSettings && (gameState === 'paused' || gameState === 'playing') && (
        <div 
          className="absolute inset-0 bg-black/95 flex items-center justify-center z-10"
          style={{ fontFamily: '"Press Start 2P", monospace' }}
        >
          <div className="text-center space-y-6">
            <h2 className="text-foamy-green text-xl mb-6">GAME SETTINGS</h2>
            
            <div className="space-y-4">
              <div>
                <p className="text-white text-sm mb-2">Paddle Speed: {(paddleSpeed * 100).toFixed(0)}%</p>
                <div className="w-80 h-6 bg-pixel-black border-2 border-white mx-auto relative">
                  <div 
                    className="h-full bg-ocean-blue transition-all"
                    style={{ width: `${(paddleSpeed - 0.5) / 1.5 * 100}%` }}
                  />
                </div>
              </div>
              
              <div className="space-y-2 text-xs text-gray-300">
                <p>Press LEFT/RIGHT or A/D to adjust</p>
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
  subtitle: string
) {
  ctx.fillStyle = 'rgba(26, 26, 26, 0.85)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  
  ctx.font = '24px "Press Start 2P", monospace';
  ctx.fillStyle = '#98D8AA';
  ctx.textAlign = 'center';
  ctx.fillText(title, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);
  
  ctx.font = '14px "Press Start 2P", monospace';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(subtitle, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);
}

export default BrickBreakerCanvas;

