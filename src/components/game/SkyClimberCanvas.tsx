'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import { useSkyClimberStore } from '@/stores/skyClimberStore';
import { useCoinStore } from '@/stores/coinStore';
import confetti from 'canvas-confetti';

// ============================================
// GAME CONSTANTS
// ============================================
const GRAVITY = 0.5;
const JUMP_FORCE = 13;
const RUNNING_JUMP_BONUS = 2.5; // Extra jump power when moving sideways
const DOUBLE_JUMP_FORCE = 11;
const MOVE_SPEED = 5;
const MAX_FALL_SPEED = 12;
const PLAYER_SCALE = 2;

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

const PLAYER_WIDTH = 16;
const PLAYER_HEIGHT = 24;
const PLATFORM_HEIGHT = 16;
const SPIKE_SIZE = 16;
const COIN_SIZE = 16;
const CHECKPOINT_HEIGHT = 40;
const POWERUP_SIZE = 20;

// ============================================
// TYPES
// ============================================
type PlatformType = 'grass' | 'stone' | 'cloud' | 'ice' | 'crumble';

interface Platform {
  x: number;
  y: number; // World Y (0 = ground, 5000 = top) - higher = higher in world
  width: number;
  type: PlatformType;
  crumbleTimer?: number;
}

interface Spike {
  x: number;
  y: number;
}

interface Coin {
  x: number;
  y: number;
  collected: boolean;
}

interface CheckpointData {
  x: number;
  y: number;
  altitude: number;
  reached: boolean;
}

interface PowerUpItem {
  x: number;
  y: number;
  collected: boolean;
}

// ============================================
// LEVEL GENERATION
// ============================================
function generateLevel(): {
  platforms: Platform[];
  spikes: Spike[];
  coins: Coin[];
  checkpoints: CheckpointData[];
  powerUps: PowerUpItem[];
} {
  const platforms: Platform[] = [];
  const spikes: Spike[] = [];
  const coins: Coin[] = [];
  const checkpoints: CheckpointData[] = [];
  const powerUps: PowerUpItem[] = [];

  // Ground platform (y=0 is ground level)
  platforms.push({
    x: 0,
    y: 0,
    width: CANVAS_WIDTH,
    type: 'grass',
  });

  // Starting checkpoint at ground
  checkpoints.push({
    x: 100,
    y: PLATFORM_HEIGHT,
    altitude: 0,
    reached: true,
  });

  // Use zones to force platforms to alternate across the screen
  let currentZone = Math.floor(Math.random() * 3); // 0=left, 1=center, 2=right
  
  // Generate platforms up to 5000m
  for (let altitude = 80; altitude <= 5100; altitude += 70 + Math.random() * 50) {
    // Determine platform type based on altitude
    let type: PlatformType = 'grass';
    if (altitude > 4000) {
      type = Math.random() > 0.5 ? 'cloud' : 'stone';
    } else if (altitude > 2500) {
      type = Math.random() > 0.3 ? 'stone' : (Math.random() > 0.5 ? 'ice' : 'crumble');
    } else if (altitude > 1000) {
      type = Math.random() > 0.6 ? 'grass' : 'stone';
    }

    // Platform width - smaller platforms = harder game
    const baseWidth = altitude > 3000 ? 60 : (altitude > 1500 ? 70 : 80);
    const width = baseWidth + Math.random() * 50;
    
    // Force platforms to spread across screen by using zones
    // Zone 0: left third, Zone 1: center third, Zone 2: right third
    const zoneWidth = (CANVAS_WIDTH - width) / 3;
    const zoneStart = currentZone * zoneWidth + 20;
    const x = zoneStart + Math.random() * (zoneWidth - 40);
    
    // Switch to a different zone for next platform (force movement)
    const possibleZones = [0, 1, 2].filter(z => z !== currentZone);
    currentZone = possibleZones[Math.floor(Math.random() * possibleZones.length)];

    platforms.push({
      x: Math.max(20, Math.min(CANVAS_WIDTH - width - 20, x)),
      y: altitude,
      width,
      type,
    });

    // Add coins on some platforms (less common than before)
    // Place coins first so we can avoid spikes on them
    let coinX: number | null = null;
    if (Math.random() < 0.3) {
      coinX = x + width / 2 - COIN_SIZE / 2;
      coins.push({
        x: coinX,
        y: altitude + PLATFORM_HEIGHT + 25,
        collected: false,
      });
    }

    // Add spikes - MORE spikes, especially as you go higher
    // But avoid placing spikes where coins or checkpoints are
    const spikeChance = 0.15 + Math.min(0.4, altitude / 8000); // 15% at ground, up to 55% at top
    if (Math.random() < spikeChance && width > 60) {
      // Check if this platform has a checkpoint (checkpoints are placed at 1000, 2000, 3000, 4000m)
      const checkpointAltitudes = [1000, 2000, 3000, 4000];
      const hasCheckpoint = checkpointAltitudes.some(alt => Math.abs(altitude - alt) < 100);
      
      // Add 1-2 spikes on platforms, but avoid coin and checkpoint positions
      const numSpikes = altitude > 2000 && Math.random() > 0.6 ? 2 : 1;
      const spikePositions: number[] = [];
      
      for (let s = 0; s < numSpikes; s++) {
        let spikeX: number;
        let attempts = 0;
        const safeZone = SPIKE_SIZE * PLAYER_SCALE + 10; // Safe distance from collectibles
        
        do {
          spikeX = x + 20 + (s * 40) + Math.random() * Math.max(10, width - 80);
          spikeX = Math.min(spikeX, x + width - 40);
          attempts++;
        } while (
          attempts < 10 && (
            // Avoid coin position
            (coinX !== null && Math.abs(spikeX - coinX) < safeZone) ||
            // Avoid checkpoint position (center of platform)
            (hasCheckpoint && Math.abs(spikeX - (x + width / 2)) < safeZone) ||
            // Avoid other spikes
            spikePositions.some(pos => Math.abs(spikeX - pos) < safeZone)
          )
        );
        
        spikePositions.push(spikeX);
        spikes.push({
          x: spikeX,
          y: altitude + PLATFORM_HEIGHT,
        });
      }
    }
  }

  // Checkpoints every 1000m
  const checkpointAltitudes = [1000, 2000, 3000, 4000];
  for (const alt of checkpointAltitudes) {
    const nearestPlatform = platforms.find(p => Math.abs(p.y - alt) < 100);
    if (nearestPlatform) {
      checkpoints.push({
        x: nearestPlatform.x + nearestPlatform.width / 2 - 12,
        y: nearestPlatform.y + PLATFORM_HEIGHT,
        altitude: alt,
        reached: false,
      });
    }
  }

  // Power-ups scattered throughout (double jump is valuable!)
  const powerUpAltitudes = [300, 900, 1800, 2800, 3800];
  for (const alt of powerUpAltitudes) {
    const nearestPlatform = platforms.find(p => Math.abs(p.y - alt) < 150);
    if (nearestPlatform) {
      powerUps.push({
        x: nearestPlatform.x + nearestPlatform.width / 2 - POWERUP_SIZE / 2,
        y: nearestPlatform.y + PLATFORM_HEIGHT + 30,
        collected: false,
      });
    }
  }

  // Goal platform at 5000m
  platforms.push({
    x: CANVAS_WIDTH / 2 - 100,
    y: 5000,
    width: 200,
    type: 'cloud',
  });

  // Final checkpoint at goal
  checkpoints.push({
    x: CANVAS_WIDTH / 2 - 12,
    y: 5000 + PLATFORM_HEIGHT,
    altitude: 5000,
    reached: false,
  });

  return { platforms, spikes, coins, checkpoints, powerUps };
}

// ============================================
// DRAWING FUNCTIONS (simple pixel art)
// ============================================
function worldToScreen(worldY: number, cameraY: number): number {
  // Convert world Y (0=ground, increases upward) to screen Y (0=top, increases downward)
  return CANVAS_HEIGHT - (worldY - cameraY);
}

function drawPlayer(
  ctx: CanvasRenderingContext2D,
  x: number,
  screenY: number,
  facingRight: boolean,
  isJumping: boolean,
  isHurt: boolean,
  frame: number
) {
  ctx.save();
  
  if (isHurt && Math.floor(frame / 5) % 2 === 0) {
    ctx.globalAlpha = 0.5;
  }

  const s = PLAYER_SCALE;
  const drawX = facingRight ? x : x + PLAYER_WIDTH * s;
  const scaleX = facingRight ? 1 : -1;
  
  ctx.translate(drawX, screenY);
  ctx.scale(scaleX, 1);

  // Body (blue shirt)
  ctx.fillStyle = '#4A90D9';
  ctx.fillRect(4 * s, 8 * s, 8 * s, 10 * s);
  
  // Head (skin tone)
  ctx.fillStyle = '#FFDAB9';
  ctx.fillRect(4 * s, 2 * s, 8 * s, 6 * s);
  
  // Hair (brown)
  ctx.fillStyle = '#8B4513';
  ctx.fillRect(4 * s, 0, 8 * s, 4 * s);
  
  // Eyes
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(6 * s, 4 * s, 2 * s, 2 * s);
  ctx.fillRect(10 * s, 4 * s, 2 * s, 2 * s);
  
  // Arms
  ctx.fillStyle = '#FFDAB9';
  if (isJumping) {
    ctx.fillRect(1 * s, 6 * s, 3 * s, 4 * s);
    ctx.fillRect(12 * s, 6 * s, 3 * s, 4 * s);
  } else {
    ctx.fillRect(1 * s, 10 * s, 3 * s, 4 * s);
    ctx.fillRect(12 * s, 10 * s, 3 * s, 4 * s);
  }
  
  // Legs (dark pants)
  ctx.fillStyle = '#2d2d2d';
  ctx.fillRect(5 * s, 18 * s, 3 * s, 6 * s);
  ctx.fillRect(8 * s, 18 * s, 3 * s, 6 * s);
  
  // Shoes
  ctx.fillStyle = '#FF6B4A';
  ctx.fillRect(4 * s, 22 * s, 4 * s, 2 * s);
  ctx.fillRect(8 * s, 22 * s, 4 * s, 2 * s);

  ctx.restore();
}

function drawPlatform(
  ctx: CanvasRenderingContext2D,
  x: number,
  screenY: number,
  width: number,
  type: PlatformType,
  crumbleProgress: number = 0
) {
  const h = PLATFORM_HEIGHT;
  
  if (type === 'crumble' && crumbleProgress > 0) {
    ctx.globalAlpha = 1 - crumbleProgress * 0.7;
  }

  switch (type) {
    case 'grass':
      ctx.fillStyle = '#8B4513';
      ctx.fillRect(x, screenY + 4, width, h - 4);
      ctx.fillStyle = '#4CAF50';
      ctx.fillRect(x, screenY, width, 6);
      ctx.fillStyle = '#66BB6A';
      for (let i = 0; i < width; i += 12) {
        ctx.fillRect(x + i, screenY - 3, 3, 4);
      }
      break;
    case 'stone':
      ctx.fillStyle = '#757575';
      ctx.fillRect(x, screenY, width, h);
      ctx.fillStyle = '#616161';
      for (let i = 0; i < width; i += 20) {
        ctx.fillRect(x + i + 4, screenY + 4, 12, 8);
      }
      break;
    case 'cloud':
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x + 4, screenY, width - 8, h);
      ctx.fillRect(x, screenY + 3, width, h - 6);
      ctx.fillStyle = '#E0E0E0';
      ctx.fillRect(x + 4, screenY + h - 4, width - 8, 4);
      break;
    case 'ice':
      ctx.fillStyle = '#B3E5FC';
      ctx.fillRect(x, screenY, width, h);
      ctx.fillStyle = '#E1F5FE';
      ctx.fillRect(x + 4, screenY + 2, width - 8, 4);
      break;
    case 'crumble':
      ctx.fillStyle = '#A1887F';
      ctx.fillRect(x, screenY, width, h);
      ctx.fillStyle = '#5D4037';
      ctx.fillRect(x + width / 3, screenY + 2, 2, h - 4);
      ctx.fillRect(x + width * 2 / 3, screenY + 2, 2, h - 4);
      break;
  }
  
  ctx.globalAlpha = 1;
}

function drawSpike(ctx: CanvasRenderingContext2D, x: number, screenY: number) {
  const s = PLAYER_SCALE;
  ctx.fillStyle = '#9E9E9E';
  ctx.beginPath();
  ctx.moveTo(x + 8 * s, screenY);
  ctx.lineTo(x + 16 * s, screenY + 16 * s);
  ctx.lineTo(x, screenY + 16 * s);
  ctx.closePath();
  ctx.fill();
  
  ctx.fillStyle = '#E0E0E0';
  ctx.fillRect(x + 7 * s, screenY, 2 * s, 6 * s);
}

function drawCoin(ctx: CanvasRenderingContext2D, x: number, screenY: number, frame: number) {
  const bounce = Math.sin(frame * 0.1) * 2;
  const s = PLAYER_SCALE;
  
  ctx.fillStyle = '#FFD700';
  ctx.beginPath();
  ctx.arc(x + 8 * s, screenY + 8 * s + bounce, 7 * s, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.fillStyle = '#FFC107';
  ctx.beginPath();
  ctx.arc(x + 8 * s, screenY + 8 * s + bounce, 5 * s, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.fillStyle = '#FFECB3';
  ctx.fillRect(x + 4 * s, screenY + 4 * s + bounce, 3 * s, 3 * s);
}

function drawCheckpoint(ctx: CanvasRenderingContext2D, x: number, screenY: number, isActive: boolean, frame: number) {
  const flagWave = Math.sin(frame * 0.1) * 2;
  
  // Pole
  ctx.fillStyle = '#8B4513';
  ctx.fillRect(x + 4, screenY, 4, CHECKPOINT_HEIGHT);
  
  // Flag
  ctx.fillStyle = isActive ? '#4CAF50' : '#F44336';
  ctx.beginPath();
  ctx.moveTo(x + 8, screenY + 2);
  ctx.lineTo(x + 28 + flagWave, screenY + 12);
  ctx.lineTo(x + 8, screenY + 22);
  ctx.closePath();
  ctx.fill();
  
  // Pole top
  ctx.fillStyle = '#FFD700';
  ctx.beginPath();
  ctx.arc(x + 6, screenY, 4, 0, Math.PI * 2);
  ctx.fill();
}

function drawPowerUp(ctx: CanvasRenderingContext2D, x: number, screenY: number, frame: number) {
  const bounce = Math.sin(frame * 0.15) * 3;
  const s = PLAYER_SCALE;
  
  ctx.fillStyle = '#9370DB';
  ctx.fillRect(x, screenY + bounce, POWERUP_SIZE * s, POWERUP_SIZE * s);
  
  ctx.fillStyle = '#BA68C8';
  ctx.fillRect(x, screenY + bounce, POWERUP_SIZE * s, 6 * s);
  
  // Arrow up icon
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x + 8 * s, screenY + 4 * s + bounce, 4 * s, 10 * s);
  ctx.fillRect(x + 5 * s, screenY + 7 * s + bounce, 10 * s, 3 * s);
}

function drawGoal(ctx: CanvasRenderingContext2D, x: number, screenY: number, width: number, frame: number) {
  const glow = Math.sin(frame * 0.1) * 0.3 + 0.7;
  
  // Golden platform
  ctx.fillStyle = '#FFD700';
  ctx.fillRect(x, screenY, width, 30);
  
  ctx.fillStyle = `rgba(255, 255, 255, ${glow})`;
  ctx.fillRect(x, screenY, width, 8);
  
  // Trophy
  const trophyX = x + width / 2 - 15;
  const trophyY = screenY - 45;
  
  ctx.fillStyle = '#FFD700';
  ctx.fillRect(trophyX + 5, trophyY, 20, 25);
  ctx.fillRect(trophyX, trophyY + 5, 30, 15);
  ctx.fillRect(trophyX - 5, trophyY + 8, 8, 8);
  ctx.fillRect(trophyX + 27, trophyY + 8, 8, 8);
  
  ctx.fillStyle = '#B8860B';
  ctx.fillRect(trophyX + 8, trophyY + 25, 14, 5);
  ctx.fillRect(trophyX + 3, trophyY + 30, 24, 8);
  
  // 5000m text
  ctx.font = '12px "Press Start 2P", monospace';
  ctx.fillStyle = '#FFD700';
  ctx.textAlign = 'center';
  ctx.fillText('5000m', x + width / 2, screenY + 50);
}

function drawSkyBackground(ctx: CanvasRenderingContext2D, altitude: number) {
  // Sky gradient based on altitude
  let skyTop: string, skyBottom: string;
  
  if (altitude < 1000) {
    skyTop = '#87CEEB';
    skyBottom = '#E0F7FA';
  } else if (altitude < 2500) {
    skyTop = '#FF6B4A';
    skyBottom = '#FFD93D';
  } else if (altitude < 4000) {
    skyTop = '#1a1a4e';
    skyBottom = '#2a2a6e';
  } else {
    skyTop = '#000022';
    skyBottom = '#0a0a3e';
  }
  
  const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
  gradient.addColorStop(0, skyTop);
  gradient.addColorStop(1, skyBottom);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  
  // Stars for night/space
  if (altitude > 2500) {
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 100; i++) {
      const starX = (i * 137) % CANVAS_WIDTH;
      const starY = (i * 89) % CANVAS_HEIGHT;
      const twinkle = Math.sin(Date.now() * 0.003 + i) > 0.3 ? 2 : 1;
      ctx.fillRect(starX, starY, twinkle, twinkle);
    }
  }
  
  // Clouds
  ctx.fillStyle = altitude > 2500 ? 'rgba(100, 100, 150, 0.3)' : 'rgba(255, 255, 255, 0.7)';
  for (let i = 0; i < 5; i++) {
    const cloudX = ((i * 180 + altitude * 0.05) % (CANVAS_WIDTH + 100)) - 50;
    const cloudY = 50 + i * 100;
    ctx.fillRect(cloudX + 10, cloudY, 40, 16);
    ctx.fillRect(cloudX, cloudY + 8, 60, 16);
  }
  
  // Sun/Moon
  const sunY = 60;
  ctx.fillStyle = altitude > 2500 ? '#f0f0ff' : '#FFD700';
  ctx.beginPath();
  ctx.arc(CANVAS_WIDTH - 80, sunY, 30, 0, Math.PI * 2);
  ctx.fill();
}

// ============================================
// MAIN GAME COMPONENT
// ============================================
interface SkyClimberCanvasProps {
  onGameOver?: () => void;
  onVictory?: () => void;
}

export function SkyClimberCanvas({ onGameOver, onVictory }: SkyClimberCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<number | undefined>(undefined);
  const frameRef = useRef<number>(0);

  // Player state - world coordinates (Y increases upward)
  const playerXRef = useRef<number>(CANVAS_WIDTH / 2 - PLAYER_WIDTH);
  const playerYRef = useRef<number>(PLATFORM_HEIGHT + 10); // Start on ground platform
  const velocityXRef = useRef<number>(0);
  const velocityYRef = useRef<number>(0);
  const facingRightRef = useRef<boolean>(true);
  const isGroundedRef = useRef<boolean>(false);
  const hasDoubleJumpedRef = useRef<boolean>(false);
  const isHurtRef = useRef<boolean>(false);
  const hurtTimerRef = useRef<number>(0);

  // Camera - tracks player going UP
  const cameraYRef = useRef<number>(0);

  // Level data
  const levelRef = useRef<ReturnType<typeof generateLevel> | null>(null);

  // Input
  const keysRef = useRef<Set<string>>(new Set());

  // Game state
  const [gameState, setGameState] = useState<'ready' | 'playing' | 'paused' | 'gameover' | 'victory'>('ready');
  const [displayAltitude, setDisplayAltitude] = useState(0);
  const [lives, setLives] = useState(3);
  const [isMobile, setIsMobile] = useState(false);
  const [touchX, setTouchX] = useState<number | null>(null);
  const [mouseX, setMouseX] = useState<number | null>(null);
  const [isJumping, setIsJumping] = useState(false);
  
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
  const livesRef = useRef<number>(3);

  // Stores
  const { 
    highestAltitude,
    currentCheckpoint,
    hasDoubleJump,
    updateHighestAltitude,
    reachCheckpoint,
    resetLives,
    collectCoin: storeCollectCoin,
    activateDoubleJump,
    deactivateDoubleJump,
    reachTop,
  } = useSkyClimberStore();
  const { addCoins } = useCoinStore();

  // Initialize level
  useEffect(() => {
    if (!levelRef.current) {
      levelRef.current = generateLevel();
    }
  }, []);

  // Reset game
  const resetGame = useCallback((fromCheckpoint: boolean = false) => {
    const level = levelRef.current;
    if (!level) return;

    if (fromCheckpoint && currentCheckpoint > 0) {
      const checkpoint = level.checkpoints.find(c => c.altitude === currentCheckpoint * 1000);
      if (checkpoint) {
        playerXRef.current = checkpoint.x;
        playerYRef.current = checkpoint.y + 10;
        cameraYRef.current = Math.max(0, checkpoint.altitude - CANVAS_HEIGHT / 2);
      }
    } else {
      playerXRef.current = CANVAS_WIDTH / 2 - PLAYER_WIDTH;
      playerYRef.current = PLATFORM_HEIGHT + 10;
      cameraYRef.current = 0;
    }

    velocityXRef.current = 0;
    velocityYRef.current = 0;
    facingRightRef.current = true;
    isGroundedRef.current = false;
    hasDoubleJumpedRef.current = false;
    isHurtRef.current = false;
    hurtTimerRef.current = 0;
    livesRef.current = 3;
    setLives(3);
    resetLives();
    deactivateDoubleJump();

    if (!fromCheckpoint) {
      level.coins.forEach(c => c.collected = false);
      level.powerUps.forEach(p => p.collected = false);
      level.checkpoints.forEach((c, i) => c.reached = i === 0);
    }
  }, [currentCheckpoint, resetLives, deactivateDoubleJump]);

  const startGame = useCallback(() => {
    resetGame(false);
    setGameState('playing');
  }, [resetGame]);

  const respawnAtCheckpoint = useCallback(() => {
    resetGame(true);
    setGameState('playing');
  }, [resetGame]);

  // Jump - velocity goes POSITIVE (up in world coords)
  // Running jump bonus: moving sideways gives extra height!
  const handleJump = useCallback(() => {
    if (isGroundedRef.current) {
      // Check if player is moving horizontally for running jump bonus
      const isMoving = Math.abs(velocityXRef.current) > 0;
      const jumpPower = isMoving ? JUMP_FORCE + RUNNING_JUMP_BONUS : JUMP_FORCE;
      velocityYRef.current = jumpPower;
      isGroundedRef.current = false;
      hasDoubleJumpedRef.current = false;
    } else if (hasDoubleJump && !hasDoubleJumpedRef.current) {
      // Double jump also gets a small bonus if moving
      const isMoving = Math.abs(velocityXRef.current) > 0;
      const jumpPower = isMoving ? DOUBLE_JUMP_FORCE + (RUNNING_JUMP_BONUS * 0.5) : DOUBLE_JUMP_FORCE;
      velocityYRef.current = jumpPower;
      hasDoubleJumpedRef.current = true;
    }
  }, [hasDoubleJump]);

  // Keyboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.code);

      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        if (gameState === 'ready') {
          startGame();
        } else if (gameState === 'playing') {
          handleJump();
        } else if (gameState === 'gameover') {
          respawnAtCheckpoint();
        }
      }

      if (e.code === 'KeyP' || e.code === 'Escape') {
        if (gameState === 'playing') setGameState('paused');
        else if (gameState === 'paused') setGameState('playing');
      }

      if (e.code === 'KeyR' && (gameState === 'gameover' || gameState === 'paused')) {
        respawnAtCheckpoint();
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
  }, [gameState, startGame, handleJump, respawnAtCheckpoint]);

  // Game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const level = levelRef.current;
    if (!canvas || !level) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const gameLoop = () => {
      frameRef.current++;
      const frame = frameRef.current;

      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      const altitude = Math.max(0, Math.floor(playerYRef.current));

      // Background
      drawSkyBackground(ctx, altitude);

      if (gameState === 'playing') {
        // Input - use touch/mouse position for movement
        const targetX = touchX !== null ? touchX : (mouseX !== null ? mouseX : null);
        const canvasCenter = CANVAS_WIDTH / 2;
        
        if (targetX !== null) {
          // Move based on touch/mouse position relative to center
          const diff = targetX - canvasCenter;
          const deadZone = 30; // Dead zone in center to prevent jitter
          
          if (Math.abs(diff) > deadZone) {
            if (diff < 0) {
              velocityXRef.current = -MOVE_SPEED;
              facingRightRef.current = false;
            } else {
              velocityXRef.current = MOVE_SPEED;
              facingRightRef.current = true;
            }
          } else {
            velocityXRef.current = 0;
          }
        } else {
          // Fallback to keyboard
          if (keysRef.current.has('ArrowLeft') || keysRef.current.has('KeyA')) {
            velocityXRef.current = -MOVE_SPEED;
            facingRightRef.current = false;
          } else if (keysRef.current.has('ArrowRight') || keysRef.current.has('KeyD')) {
            velocityXRef.current = MOVE_SPEED;
            facingRightRef.current = true;
          } else {
            velocityXRef.current = 0;
          }
        }
        
        // Handle jump from touch - use a ref to track if jump was triggered
        if (isJumping) {
          if (isGroundedRef.current) {
            const isMoving = Math.abs(velocityXRef.current) > 0;
            const jumpPower = isMoving ? JUMP_FORCE + RUNNING_JUMP_BONUS : JUMP_FORCE;
            velocityYRef.current = jumpPower;
            if (soundEnabled) playSound('jump');
          }
          setIsJumping(false);
        }

        // Gravity pulls DOWN (reduces Y in world coords)
        velocityYRef.current -= GRAVITY;
        velocityYRef.current = Math.max(velocityYRef.current, -MAX_FALL_SPEED);

        // Update position
        playerXRef.current += velocityXRef.current;
        playerYRef.current += velocityYRef.current;

        // Screen wrap horizontally
        if (playerXRef.current < -PLAYER_WIDTH * PLAYER_SCALE) {
          playerXRef.current = CANVAS_WIDTH;
        } else if (playerXRef.current > CANVAS_WIDTH) {
          playerXRef.current = -PLAYER_WIDTH * PLAYER_SCALE;
        }

        // Platform collision
        isGroundedRef.current = false;
        const playerBottom = playerYRef.current;
        const playerTop = playerYRef.current + PLAYER_HEIGHT * PLAYER_SCALE;
        const playerLeft = playerXRef.current;
        const playerRight = playerXRef.current + PLAYER_WIDTH * PLAYER_SCALE;

        for (const platform of level.platforms) {
          const platTop = platform.y + PLATFORM_HEIGHT;
          const platBottom = platform.y;
          const platLeft = platform.x;
          const platRight = platform.x + platform.width;

          // Landing on platform (falling down, player bottom near platform top)
          if (
            velocityYRef.current <= 0 &&
            playerBottom <= platTop + 5 &&
            playerBottom >= platBottom &&
            playerRight > platLeft + 5 &&
            playerLeft < platRight - 5
          ) {
            playerYRef.current = platTop;
            velocityYRef.current = 0;
            isGroundedRef.current = true;
            hasDoubleJumpedRef.current = false;

            if (platform.type === 'crumble') {
              platform.crumbleTimer = (platform.crumbleTimer || 0) + 0.02;
              if (platform.crumbleTimer > 1) {
                platform.y = -10000;
              }
            }
          }
        }

        // Spike collision - KNOCK PLAYER DOWN HARD
        if (!isHurtRef.current) {
          for (const spike of level.spikes) {
            const spikeLeft = spike.x;
            const spikeRight = spike.x + SPIKE_SIZE * PLAYER_SCALE;
            const spikeBottom = spike.y;
            const spikeTop = spike.y + SPIKE_SIZE * PLAYER_SCALE;

            if (
              playerRight > spikeLeft + 4 &&
              playerLeft < spikeRight - 4 &&
              playerTop > spikeBottom &&
              playerBottom < spikeTop
            ) {
              isHurtRef.current = true;
              hurtTimerRef.current = 90; // Longer invincibility
              
              // KNOCK DOWN HARD - send player flying down!
              velocityYRef.current = -MAX_FALL_SPEED; // Max downward velocity
              playerYRef.current -= 50; // Immediately drop 50m
              
              // Also push player horizontally away from spike
              const spikeCenter = spike.x + (SPIKE_SIZE * PLAYER_SCALE) / 2;
              const playerCenter = playerXRef.current + (PLAYER_WIDTH * PLAYER_SCALE) / 2;
              velocityXRef.current = playerCenter < spikeCenter ? -8 : 8;
              
              livesRef.current--;
              setLives(livesRef.current);

              if (livesRef.current <= 0) {
                setGameState('gameover');
                onGameOver?.();
              }
              
              break; // Only hit one spike at a time
            }
          }
        }

        if (isHurtRef.current) {
          hurtTimerRef.current--;
          if (hurtTimerRef.current <= 0) {
            isHurtRef.current = false;
          }
        }

        // Coin collection
        for (const coin of level.coins) {
          if (coin.collected) continue;
          if (
            playerRight > coin.x &&
            playerLeft < coin.x + COIN_SIZE * PLAYER_SCALE &&
            playerTop > coin.y &&
            playerBottom < coin.y + COIN_SIZE * PLAYER_SCALE
          ) {
            coin.collected = true;
            storeCollectCoin();
            addCoins(1);
          }
        }

        // Power-up collection
        for (const powerUp of level.powerUps) {
          if (powerUp.collected) continue;
          if (
            playerRight > powerUp.x &&
            playerLeft < powerUp.x + POWERUP_SIZE * PLAYER_SCALE &&
            playerTop > powerUp.y &&
            playerBottom < powerUp.y + POWERUP_SIZE * PLAYER_SCALE
          ) {
            powerUp.collected = true;
            activateDoubleJump();
          }
        }

        // Checkpoint detection
        for (let i = 0; i < level.checkpoints.length; i++) {
          const checkpoint = level.checkpoints[i];
          if (checkpoint.reached) continue;
          if (
            playerRight > checkpoint.x &&
            playerLeft < checkpoint.x + 24 &&
            playerTop > checkpoint.y &&
            playerBottom < checkpoint.y + CHECKPOINT_HEIGHT
          ) {
            checkpoint.reached = true;
            reachCheckpoint(i);
            confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });

            if (checkpoint.altitude >= 5000) {
              setGameState('victory');
              reachTop();
              onVictory?.();
              confetti({ particleCount: 200, spread: 100, origin: { y: 0.5 } });
            }
          }
        }

        // Fall death
        if (playerYRef.current < cameraYRef.current - 100) {
          livesRef.current--;
          setLives(livesRef.current);
          
          if (livesRef.current <= 0) {
            setGameState('gameover');
            onGameOver?.();
          } else {
            respawnAtCheckpoint();
          }
        }

        // Camera follows player (smooth, only moves up)
        const targetCameraY = playerYRef.current - CANVAS_HEIGHT * 0.6;
        if (targetCameraY > cameraYRef.current) {
          cameraYRef.current += (targetCameraY - cameraYRef.current) * 0.1;
        }
        cameraYRef.current = Math.max(0, cameraYRef.current);

        setDisplayAltitude(altitude);
        updateHighestAltitude(altitude);
      }

      // ======== RENDER GAME OBJECTS ========
      const camY = cameraYRef.current;

      // Platforms
      for (const platform of level.platforms) {
        const screenY = worldToScreen(platform.y + PLATFORM_HEIGHT, camY);
        if (screenY > -50 && screenY < CANVAS_HEIGHT + 50) {
          drawPlatform(ctx, platform.x, screenY, platform.width, platform.type, platform.crumbleTimer || 0);
        }
      }

      // Spikes
      for (const spike of level.spikes) {
        const screenY = worldToScreen(spike.y + SPIKE_SIZE * PLAYER_SCALE, camY);
        if (screenY > -50 && screenY < CANVAS_HEIGHT + 50) {
          drawSpike(ctx, spike.x, screenY);
        }
      }

      // Coins
      for (const coin of level.coins) {
        if (coin.collected) continue;
        const screenY = worldToScreen(coin.y + COIN_SIZE * PLAYER_SCALE, camY);
        if (screenY > -50 && screenY < CANVAS_HEIGHT + 50) {
          drawCoin(ctx, coin.x, screenY, frame);
        }
      }

      // Power-ups
      for (const powerUp of level.powerUps) {
        if (powerUp.collected) continue;
        const screenY = worldToScreen(powerUp.y + POWERUP_SIZE * PLAYER_SCALE, camY);
        if (screenY > -50 && screenY < CANVAS_HEIGHT + 50) {
          drawPowerUp(ctx, powerUp.x, screenY, frame);
        }
      }

      // Checkpoints
      for (const checkpoint of level.checkpoints) {
        const screenY = worldToScreen(checkpoint.y + CHECKPOINT_HEIGHT, camY);
        if (screenY > -50 && screenY < CANVAS_HEIGHT + 50) {
          drawCheckpoint(ctx, checkpoint.x, screenY, checkpoint.reached, frame);
        }
      }

      // Goal
      if (camY > 4500) {
        const goalScreenY = worldToScreen(5000 + PLATFORM_HEIGHT + 30, camY);
        drawGoal(ctx, CANVAS_WIDTH / 2 - 100, goalScreenY, 200, frame);
      }

      // Player
      const playerScreenY = worldToScreen(playerYRef.current + PLAYER_HEIGHT * PLAYER_SCALE, camY);
      drawPlayer(
        ctx,
        playerXRef.current,
        playerScreenY,
        facingRightRef.current,
        !isGroundedRef.current,
        isHurtRef.current,
        frame
      );

      // Overlays
      if (gameState === 'ready') {
        drawOverlay(ctx, 'SKY CLIMBER', isMobile ? 'Tap Screen to Start' : 'Press SPACE or ↑ to Start');
      } else if (gameState === 'paused') {
        drawOverlay(ctx, 'PAUSED', 'Press P to Continue');
      } else if (gameState === 'gameover') {
        drawOverlay(ctx, 'GAME OVER', `Best: ${highestAltitude}m${isMobile ? ' - Tap to Retry' : ' - Press R to Retry'}`);
      } else if (gameState === 'victory') {
        drawOverlay(ctx, '🏆 VICTORY! 🏆', 'You reached 5000m!');
      }

      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoopRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [
    gameState,
    hasDoubleJump,
    highestAltitude,
    addCoins,
    storeCollectCoin,
    activateDoubleJump,
    updateHighestAltitude,
    reachCheckpoint,
    reachTop,
    onGameOver,
    onVictory,
    respawnAtCheckpoint,
    touchX,
    mouseX,
    isJumping,
    handleJump,
  ]);

  // Handle retry on game over
  const handleRetry = useCallback(() => {
    if (gameState === 'gameover') {
      respawnAtCheckpoint();
    }
  }, [gameState, respawnAtCheckpoint]);

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="border-4 border-pixel-black cursor-pointer"
        style={{
          boxShadow: '8px 8px 0px #2d2d2d',
          touchAction: 'none',
          maxWidth: '100%',
          height: 'auto',
        }}
        onClick={(e) => {
          if (gameState === 'gameover') {
            handleRetry();
          } else if (gameState === 'ready') {
            startGame();
          }
        }}
        onMouseMove={(e) => {
          if (gameState === 'playing') {
            const rect = canvasRef.current?.getBoundingClientRect();
            if (rect) {
              const x = e.clientX - rect.left;
              setMouseX(x);
            }
          }
        }}
        onMouseLeave={() => {
          setMouseX(null);
        }}
        onTouchStart={(e) => {
          if (gameState === 'gameover') {
            e.preventDefault();
            handleRetry();
          } else if (gameState === 'ready') {
            e.preventDefault();
            startGame();
          } else if (gameState === 'playing') {
            e.preventDefault();
            const rect = canvasRef.current?.getBoundingClientRect();
            if (rect && e.touches.length > 0) {
              const x = e.touches[0].clientX - rect.left;
              const y = e.touches[0].clientY - rect.top;
              setTouchX(x);
              // Jump if tapping in upper half of screen
              if (y < CANVAS_HEIGHT / 2) {
                setIsJumping(true);
              }
            }
          }
        }}
        onTouchMove={(e) => {
          if (gameState === 'playing') {
            e.preventDefault();
            const rect = canvasRef.current?.getBoundingClientRect();
            if (rect && e.touches.length > 0) {
              const x = e.touches[0].clientX - rect.left;
              setTouchX(x);
            }
          }
        }}
        onTouchEnd={() => {
          setTouchX(null);
          setIsJumping(false);
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
      
      {/* Mobile Instructions */}
      {isMobile && gameState === 'playing' && (
        <div className="absolute bottom-4 left-0 right-0 flex justify-center pointer-events-none z-10">
          <div className="bg-pixel-black/80 px-4 py-2 border-2 border-purple-400">
            <p className="font-lcd text-purple-300 text-xs text-center">
              Touch left/right to move • Tap top half to jump
            </p>
          </div>
        </div>
      )}
      
      {/* Retry Button Overlay (Game Over) */}
      {gameState === 'gameover' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <button
            onClick={handleRetry}
            onTouchEnd={(e) => {
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
        <div className="bg-pixel-black/80 px-4 py-2 border-2 border-pixel-shadow" style={{ boxShadow: '3px 3px 0px #1a1a1a' }}>
          <span className="font-pixel text-foamy-green text-sm">{displayAltitude}m</span>
          <span className="font-pixel text-gray-400 text-xs ml-2">/ 5000m</span>
        </div>

        <div className="bg-pixel-black/80 px-4 py-2 border-2 border-pixel-shadow flex gap-1" style={{ boxShadow: '3px 3px 0px #1a1a1a' }}>
          {[...Array(3)].map((_, i) => (
            <span key={i} className={`text-lg ${i < lives ? 'opacity-100' : 'opacity-30'}`}>❤️</span>
          ))}
        </div>
      </div>

      {/* Altitude bar */}
      <div className="absolute left-4 top-20 bottom-4 w-6 bg-pixel-black/60 border-2 border-pixel-shadow pointer-events-none">
        <div
          className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-foamy-green to-ocean-blue transition-all"
          style={{ height: `${Math.min(100, (displayAltitude / 5000) * 100)}%` }}
        />
        {[1000, 2000, 3000, 4000, 5000].map((alt) => (
          <div key={alt} className="absolute left-0 right-0 h-1 bg-yellow-400" style={{ bottom: `${(alt / 5000) * 100}%` }} />
        ))}
      </div>

      {hasDoubleJump && (
        <div className="absolute bottom-4 right-4 bg-pixel-black/80 px-3 py-2 border-2 border-purple-400 pointer-events-none">
          <span className="font-pixel text-xs text-purple-400">⬆️ DOUBLE JUMP</span>
        </div>
      )}
    </div>
  );
}

function drawOverlay(ctx: CanvasRenderingContext2D, title: string, subtitle: string) {
  ctx.fillStyle = 'rgba(26, 26, 26, 0.85)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  ctx.font = '24px "Press Start 2P", monospace';
  ctx.fillStyle = '#98D8AA';
  ctx.textAlign = 'center';
  ctx.fillText(title, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);

  ctx.font = '12px "Press Start 2P", monospace';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(subtitle, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);
}

export default SkyClimberCanvas;
