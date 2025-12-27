'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import { useCoinStore } from '@/stores/coinStore';
import { useGameStore } from '@/stores/gameStore';
import { useAuth } from '@/contexts/AuthContext';
import { playSound } from '@/lib/sounds';
import { getGameSettingsForUser } from '@/lib/gameSettings';
import confetti from 'canvas-confetti';

interface Asteroid {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  rotation: number;
  rotationSpeed: number;
  size: number; // 1 = large, 2 = medium, 3 = small
  points: number;
  vertices: { x: number; y: number }[];
  hasPowerUp?: boolean; // Free life power-up
}

interface PowerUp {
  x: number;
  y: number;
  type: 'life';
  life: number; // Frames until it disappears
}

interface Bullet {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  life: number;
}

interface Ship {
  x: number;
  y: number;
  rotation: number;
  velocityX: number;
  velocityY: number;
  thrusting: boolean;
}

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const SHIP_SIZE = 20;
const BASE_SHIP_SPEED = 0.1; // Base speed, will scale with level
const ROTATION_SPEED = 0.1;
const BASE_BULLET_SPEED = 6; // Base bullet speed, will scale with level
const BULLET_LIFE = 60;
const MAX_BULLETS = 5;
const POWERUP_LIFE = 300; // 5 seconds at 60fps

// Generate asteroid shape
function generateAsteroidShape(size: number): { x: number; y: number }[] {
  const radius = size === 1 ? 40 : size === 2 ? 25 : 15;
  const vertices = 8;
  const shape: { x: number; y: number }[] = [];
  
  for (let i = 0; i < vertices; i++) {
    const angle = (Math.PI * 2 * i) / vertices;
    const variation = radius * 0.7 + Math.random() * radius * 0.3;
    shape.push({
      x: Math.cos(angle) * variation,
      y: Math.sin(angle) * variation,
    });
  }
  
  return shape;
}

// Generate level asteroids
function generateLevelAsteroids(level: number, settings?: Record<string, unknown>): Asteroid[] {
  const asteroids: Asteroid[] = [];
  // Level 1: 2 asteroids, progressively more (or custom count)
  const baseCount = level === 1 ? 2 : level <= 3 ? 3 : level <= 5 ? 4 : level <= 7 ? 5 : level <= 9 ? 6 : 8;
  const customCount = settings?.asteroids?.asteroidCount as number | undefined;
  const count = customCount ? Math.max(1, Math.floor(baseCount * (customCount / 2))) : baseCount;
  
  for (let i = 0; i < count; i++) {
    // Spawn at edges
    const side = Math.floor(Math.random() * 4);
    let x: number, y: number;
    
    if (side === 0) { // Top
      x = Math.random() * CANVAS_WIDTH;
      y = -50;
    } else if (side === 1) { // Right
      x = CANVAS_WIDTH + 50;
      y = Math.random() * CANVAS_HEIGHT;
    } else if (side === 2) { // Bottom
      x = Math.random() * CANVAS_WIDTH;
      y = CANVAS_HEIGHT + 50;
    } else { // Left
      x = -50;
      y = Math.random() * CANVAS_HEIGHT;
    }
    
    const angle = Math.atan2(CANVAS_HEIGHT / 2 - y, CANVAS_WIDTH / 2 - x);
    // Level 1: slower (0.5), progressively faster (or custom speed)
    const baseSpeed = level === 1 ? 0.5 : level <= 3 ? 0.7 : level <= 5 ? 1.0 : level <= 7 ? 1.3 : level <= 9 ? 1.6 : 2.0;
    const speedMultiplier = (settings?.asteroids?.asteroidSpeed as number) || 1;
    const speed = baseSpeed * speedMultiplier;
    
    // Add power-ups randomly (custom chance or default 10%)
    const powerUpChance = (settings?.asteroids?.powerUpChance as number) || 0.1;
    const hasPowerUp = Math.random() < powerUpChance && level <= 7;
    
    asteroids.push({
      x,
      y,
      velocityX: Math.cos(angle) * speed,
      velocityY: Math.sin(angle) * speed,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.1,
      size: 1, // Start with large asteroids
      points: level * 20,
      vertices: generateAsteroidShape(1),
      hasPowerUp,
    });
  }
  
  return asteroids;
}

interface AsteroidsCanvasProps {
  onGameOver?: (score: number) => void;
  onLevelComplete?: (level: number) => void;
}

export function AsteroidsCanvas({ onGameOver, onLevelComplete }: AsteroidsCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<number | undefined>(undefined);
  
  const [gameState, setGameState] = useState<'ready' | 'playing' | 'paused' | 'gameover' | 'levelComplete'>('ready');
  const [currentLevel, setCurrentLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  
  // Load game settings
  useEffect(() => {
    if (user?.id) {
      getGameSettingsForUser(user.id, 'asteroids').then(settings => {
        setGameSettings(settings);
        if (settings?.asteroids?.startingLives) {
          setLives(settings.asteroids.startingLives as number);
        }
      });
    }
  }, [user]);
  const [powerUps, setPowerUps] = useState<PowerUp[]>([]);
  
  const shipRef = useRef<Ship>({
    x: CANVAS_WIDTH / 2,
    y: CANVAS_HEIGHT / 2,
    rotation: 0,
    velocityX: 0,
    velocityY: 0,
    thrusting: false,
  });
  
  const asteroidsRef = useRef<Asteroid[]>([]);
  const bulletsRef = useRef<Bullet[]>([]);
  const keysRef = useRef<Set<string>>(new Set());
  
  const { soundEnabled } = useGameStore();
  const { addCoins } = useCoinStore();
  const { user } = useAuth();
  const [gameSettings, setGameSettings] = useState<Record<string, unknown> | null>(null);
  
  // Initialize level
  useEffect(() => {
    if (gameState === 'ready' || gameState === 'playing') {
      asteroidsRef.current = generateLevelAsteroids(currentLevel, gameSettings || undefined);
      bulletsRef.current = [];
      setPowerUps([]);
      shipRef.current = {
        x: CANVAS_WIDTH / 2,
        y: CANVAS_HEIGHT / 2,
        rotation: 0,
        velocityX: 0,
        velocityY: 0,
        thrusting: false,
      };
    }
  }, [currentLevel, gameState, gameSettings]);
  
  // Reset game function
  const resetGame = useCallback(() => {
    setCurrentLevel(1);
    setScore(0);
    const startingLives = gameSettings?.asteroids?.startingLives ? (gameSettings.asteroids.startingLives as number) : 3;
    setLives(startingLives);
    setPowerUps([]);
    asteroidsRef.current = generateLevelAsteroids(1, gameSettings || undefined);
    bulletsRef.current = [];
    shipRef.current = {
      x: CANVAS_WIDTH / 2,
      y: CANVAS_HEIGHT / 2,
      rotation: 0,
      velocityX: 0,
      velocityY: 0,
      thrusting: false,
    };
    setGameState('ready');
  }, [gameSettings]);
  
  const startGame = useCallback(() => {
    setGameState('playing');
  }, []);
  
  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.code);
      
      // Restart on R key when game over
      if (e.code === 'KeyR' && gameState === 'gameover') {
        resetGame();
        return;
      }
      
      if (e.code === 'Space' && gameState === 'ready') {
        startGame();
      } else if (e.code === 'KeyP' || e.code === 'Escape') {
        if (gameState === 'playing') setGameState('paused');
        else if (gameState === 'paused') setGameState('playing');
      } else if (e.code === 'Space' && gameState === 'playing') {
        // Shoot bullet
        if (bulletsRef.current.length < MAX_BULLETS) {
          const ship = shipRef.current;
          // Level-based bullet speed with custom multiplier
          let bulletSpeed = BASE_BULLET_SPEED + (currentLevel - 1) * 0.3;
          if (gameSettings?.asteroids?.bulletSpeed) {
            bulletSpeed *= gameSettings.asteroids.bulletSpeed as number;
          }
          bulletsRef.current.push({
            x: ship.x + Math.cos(ship.rotation) * SHIP_SIZE,
            y: ship.y + Math.sin(ship.rotation) * SHIP_SIZE,
            velocityX: Math.cos(ship.rotation) * bulletSpeed,
            velocityY: Math.sin(ship.rotation) * bulletSpeed,
            life: BULLET_LIFE,
          });
          if (soundEnabled) playSound('jump');
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
  }, [gameState, startGame, soundEnabled, currentLevel, resetGame]);
  
  // Game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const gameLoop = () => {
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      
      // Draw starfield background
      ctx.fillStyle = '#000011';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 100; i++) {
        const x = (i * 73) % CANVAS_WIDTH;
        const y = (i * 47) % CANVAS_HEIGHT;
        const size = Math.sin(Date.now() * 0.001 + i) > 0 ? 1 : 2;
        ctx.fillRect(x, y, size, size);
      }
      
      if (gameState === 'playing') {
        const ship = shipRef.current;
        
        // Rotate ship
        if (keysRef.current.has('ArrowLeft') || keysRef.current.has('KeyA')) {
          ship.rotation -= ROTATION_SPEED;
        }
        if (keysRef.current.has('ArrowRight') || keysRef.current.has('KeyD')) {
          ship.rotation += ROTATION_SPEED;
        }
        
        // Thrust - level-based speed with custom multiplier
        ship.thrusting = keysRef.current.has('ArrowUp') || keysRef.current.has('KeyW');
        if (ship.thrusting) {
          let shipSpeed = BASE_SHIP_SPEED + (currentLevel - 1) * 0.01;
          if (gameSettings?.asteroids?.shipSpeed) {
            shipSpeed *= gameSettings.asteroids.shipSpeed as number;
          }
          ship.velocityX += Math.cos(ship.rotation) * shipSpeed;
          ship.velocityY += Math.sin(ship.rotation) * shipSpeed;
        }
        
        // Apply friction
        ship.velocityX *= 0.98;
        ship.velocityY *= 0.98;
        
        // Update ship position
        ship.x += ship.velocityX;
        ship.y += ship.velocityY;
        
        // Wrap around screen
        if (ship.x < 0) ship.x = CANVAS_WIDTH;
        if (ship.x > CANVAS_WIDTH) ship.x = 0;
        if (ship.y < 0) ship.y = CANVAS_HEIGHT;
        if (ship.y > CANVAS_HEIGHT) ship.y = 0;
        
        // Update bullets
        for (let i = bulletsRef.current.length - 1; i >= 0; i--) {
          const bullet = bulletsRef.current[i];
          bullet.x += bullet.velocityX;
          bullet.y += bullet.velocityY;
          bullet.life--;
          
          // Wrap around screen
          if (bullet.x < 0) bullet.x = CANVAS_WIDTH;
          if (bullet.x > CANVAS_WIDTH) bullet.x = 0;
          if (bullet.y < 0) bullet.y = CANVAS_HEIGHT;
          if (bullet.y > CANVAS_HEIGHT) bullet.y = 0;
          
          // Remove old bullets
          if (bullet.life <= 0) {
            bulletsRef.current.splice(i, 1);
            continue;
          }
          
          // Check bullet-asteroid collision
          for (let j = asteroidsRef.current.length - 1; j >= 0; j--) {
            const asteroid = asteroidsRef.current[j];
            const dx = bullet.x - asteroid.x;
            const dy = bullet.y - asteroid.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const asteroidRadius = asteroid.size === 1 ? 40 : asteroid.size === 2 ? 25 : 15;
            
            if (distance < asteroidRadius) {
              // Hit!
              bulletsRef.current.splice(i, 1);
              setScore(prev => prev + asteroid.points);
              addCoins(Math.floor(asteroid.points / 20));
              
              // Spawn power-up if asteroid had one
              if (asteroid.hasPowerUp) {
                setPowerUps(prev => [...prev, {
                  x: asteroid.x,
                  y: asteroid.y,
                  type: 'life',
                  life: POWERUP_LIFE,
                }]);
              }
              
              // Break asteroid into smaller pieces
              if (asteroid.size < 3) {
                const newSize = asteroid.size + 1;
                const newSpeed = Math.sqrt(asteroid.velocityX ** 2 + asteroid.velocityY ** 2) * 1.5;
                
                for (let k = 0; k < 2; k++) {
                  const angle = Math.random() * Math.PI * 2;
                  asteroidsRef.current.push({
                    x: asteroid.x,
                    y: asteroid.y,
                    velocityX: Math.cos(angle) * newSpeed,
                    velocityY: Math.sin(angle) * newSpeed,
                    rotation: Math.random() * Math.PI * 2,
                    rotationSpeed: (Math.random() - 0.5) * 0.1,
                    size: newSize,
                    points: asteroid.points / 2,
                    vertices: generateAsteroidShape(newSize),
                  });
                }
              }
              
              asteroidsRef.current.splice(j, 1);
              if (soundEnabled) playSound('obstaclePass');
              break;
            }
          }
        }
        
        // Update asteroids
        for (const asteroid of asteroidsRef.current) {
          asteroid.x += asteroid.velocityX;
          asteroid.y += asteroid.velocityY;
          asteroid.rotation += asteroid.rotationSpeed;
          
          // Wrap around screen
          if (asteroid.x < -100) asteroid.x = CANVAS_WIDTH + 100;
          if (asteroid.x > CANVAS_WIDTH + 100) asteroid.x = -100;
          if (asteroid.y < -100) asteroid.y = CANVAS_HEIGHT + 100;
          if (asteroid.y > CANVAS_HEIGHT + 100) asteroid.y = -100;
          
          // Check ship-asteroid collision
          const dx = ship.x - asteroid.x;
          const dy = ship.y - asteroid.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const asteroidRadius = asteroid.size === 1 ? 40 : asteroid.size === 2 ? 25 : 15;
          
          if (distance < asteroidRadius + SHIP_SIZE) {
            // Collision!
            setLives(prev => {
              const newLives = prev - 1;
              if (newLives <= 0) {
                setGameState('gameover');
                setPowerUps([]); // Clear power-ups
                if (soundEnabled) playSound('gameOver');
                onGameOver?.(score);
              } else {
                // Reset ship position
                ship.x = CANVAS_WIDTH / 2;
                ship.y = CANVAS_HEIGHT / 2;
                ship.velocityX = 0;
                ship.velocityY = 0;
                setPowerUps([]); // Clear power-ups on death
                if (soundEnabled) playSound('collision');
              }
              return newLives;
            });
          }
        }
        
        // Update power-ups
        setPowerUps(prev => {
          const updated = prev.map(pu => ({ 
            ...pu, 
            life: pu.life - 1,
            x: pu.x + (Math.random() - 0.5) * 0.5, // Slight drift
            y: pu.y + (Math.random() - 0.5) * 0.5,
          }))
            .filter(pu => pu.life > 0);
          
          // Check power-up collection
          const ship = shipRef.current;
          for (let i = updated.length - 1; i >= 0; i--) {
            const pu = updated[i];
            const dx = ship.x - pu.x;
            const dy = ship.y - pu.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < SHIP_SIZE + 15) {
              // Collected!
              setLives(prev => prev + 1);
              if (soundEnabled) playSound('coin');
              updated.splice(i, 1);
            }
          }
          
          return updated;
        });
        
        // Check level complete
        if (asteroidsRef.current.length === 0) {
          setGameState('levelComplete');
          if (soundEnabled) playSound('powerup');
          confetti({ particleCount: 50, spread: 70 });
          
          setTimeout(() => {
            if (currentLevel < 10) {
              setCurrentLevel(prev => prev + 1);
              setGameState('playing');
            } else {
              // Game complete!
              setGameState('gameover');
              onGameOver?.(score);
            }
          }, 2000);
        }
      }
      
      // Draw asteroids
      for (const asteroid of asteroidsRef.current) {
        ctx.save();
        ctx.translate(asteroid.x, asteroid.y);
        ctx.rotate(asteroid.rotation);
        
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(asteroid.vertices[0].x, asteroid.vertices[0].y);
        for (let i = 1; i < asteroid.vertices.length; i++) {
          ctx.lineTo(asteroid.vertices[i].x, asteroid.vertices[i].y);
        }
        ctx.closePath();
        ctx.stroke();
        
        // Power-up indicator
        if (asteroid.hasPowerUp) {
          ctx.restore();
          ctx.save();
          ctx.translate(asteroid.x, asteroid.y);
          ctx.fillStyle = '#FFD700';
          ctx.beginPath();
          ctx.arc(0, 0, 12, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#1a1a1a';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
        
        ctx.restore();
      }
      
      // Draw power-ups
      for (const pu of powerUps) {
        const alpha = pu.life / POWERUP_LIFE;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(pu.x, pu.y, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Draw heart icon
        ctx.fillStyle = '#FF6B6B';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('❤️', pu.x, pu.y);
        ctx.globalAlpha = 1;
      }
      
      // Draw bullets
      ctx.fillStyle = '#ffff00';
      for (const bullet of bulletsRef.current) {
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, 2, 0, Math.PI * 2);
        ctx.fill();
      }
      
      // Draw ship
      if (gameState === 'playing' || gameState === 'paused') {
        const ship = shipRef.current;
        ctx.save();
        ctx.translate(ship.x, ship.y);
        ctx.rotate(ship.rotation);
        
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(SHIP_SIZE, 0);
        ctx.lineTo(-SHIP_SIZE / 2, -SHIP_SIZE / 2);
        ctx.lineTo(-SHIP_SIZE / 2, SHIP_SIZE / 2);
        ctx.closePath();
        ctx.stroke();
        
        // Thrust flame
        if (ship.thrusting) {
          ctx.strokeStyle = '#ff6600';
          ctx.beginPath();
          ctx.moveTo(-SHIP_SIZE / 2, -SHIP_SIZE / 3);
          ctx.lineTo(-SHIP_SIZE - 5, 0);
          ctx.lineTo(-SHIP_SIZE / 2, SHIP_SIZE / 3);
          ctx.stroke();
        }
        
        ctx.restore();
      }
      
      // Draw UI
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px "Press Start 2P", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`LEVEL: ${currentLevel}/10`, 10, 30);
      ctx.fillText(`SCORE: ${score}`, 10, 50);
      ctx.fillText(`LIVES: ${lives}`, CANVAS_WIDTH - 150, 30);
      ctx.fillText(`ASTEROIDS: ${asteroidsRef.current.length}`, 10, 70);
      
      // Draw overlays
      if (gameState === 'ready') {
        drawOverlay(ctx, 'ASTEROIDS', 'Press SPACE to Start');
      } else if (gameState === 'paused') {
        drawOverlay(ctx, 'PAUSED', 'Press P to Continue');
      } else if (gameState === 'levelComplete') {
        drawOverlay(ctx, `LEVEL ${currentLevel} COMPLETE!`, currentLevel < 10 ? 'Next level...' : 'CONGRATULATIONS!');
      } else if (gameState === 'gameover') {
        drawOverlay(ctx, 'GAME OVER', `Final Score: ${score} | Press R to Restart`);
      }
      
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };
    
    gameLoopRef.current = requestAnimationFrame(gameLoop);
    
    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameState, currentLevel, score, lives, soundEnabled, addCoins, onGameOver, resetGame]);
  
  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      className="border-4 border-pixel-black cursor-pointer"
      style={{ 
        boxShadow: '8px 8px 0px #2d2d2d',
        touchAction: 'none',
      }}
    />
  );
}

function drawOverlay(
  ctx: CanvasRenderingContext2D,
  title: string,
  subtitle: string
) {
  ctx.fillStyle = 'rgba(0, 0, 17, 0.9)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  
  ctx.font = '24px "Press Start 2P", monospace';
  ctx.fillStyle = '#98D8AA';
  ctx.textAlign = 'center';
  ctx.fillText(title, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);
  
  ctx.font = '14px "Press Start 2P", monospace';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(subtitle, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);
}

export default AsteroidsCanvas;

