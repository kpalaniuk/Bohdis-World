// Sky Climber Game Sprites - Sky Island Theme

// ============================================
// PLAYER SPRITE (Little runner character)
// ============================================
export const PLAYER_WIDTH = 16;
export const PLAYER_HEIGHT = 24;

export function drawPlayer(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  isJumping: boolean,
  facingRight: boolean,
  isHurt: boolean,
  frame: number
) {
  ctx.save();
  
  // Flip if facing left
  if (!facingRight) {
    ctx.translate(x + PLAYER_WIDTH * scale, y);
    ctx.scale(-1, 1);
    x = 0;
    y = 0;
  }

  const s = scale;
  
  // Hurt flash effect
  if (isHurt && Math.floor(frame / 5) % 2 === 0) {
    ctx.globalAlpha = 0.5;
  }

  // Body (blue shirt)
  ctx.fillStyle = '#4A90D9';
  ctx.fillRect(x + 4 * s, y + 8 * s, 8 * s, 10 * s);
  
  // Head (skin tone)
  ctx.fillStyle = '#FFDAB9';
  ctx.fillRect(x + 4 * s, y + 2 * s, 8 * s, 6 * s);
  
  // Hair (brown)
  ctx.fillStyle = '#8B4513';
  ctx.fillRect(x + 4 * s, y, 8 * s, 4 * s);
  ctx.fillRect(x + 3 * s, y + 1 * s, 2 * s, 3 * s);
  
  // Eyes
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(x + 6 * s, y + 4 * s, 2 * s, 2 * s);
  ctx.fillRect(x + 10 * s, y + 4 * s, 2 * s, 2 * s);
  
  // Smile
  ctx.fillRect(x + 7 * s, y + 6 * s, 3 * s, 1 * s);
  
  // Arms
  ctx.fillStyle = '#FFDAB9';
  if (isJumping) {
    // Arms up when jumping
    ctx.fillRect(x + 1 * s, y + 6 * s, 3 * s, 4 * s);
    ctx.fillRect(x + 12 * s, y + 6 * s, 3 * s, 4 * s);
  } else {
    // Arms down when standing/running
    const armOffset = Math.sin(frame * 0.3) * 2;
    ctx.fillRect(x + 1 * s, y + (10 + armOffset) * s, 3 * s, 4 * s);
    ctx.fillRect(x + 12 * s, y + (10 - armOffset) * s, 3 * s, 4 * s);
  }
  
  // Legs (dark pants)
  ctx.fillStyle = '#2d2d2d';
  if (isJumping) {
    // Legs spread when jumping
    ctx.fillRect(x + 4 * s, y + 18 * s, 3 * s, 6 * s);
    ctx.fillRect(x + 9 * s, y + 18 * s, 3 * s, 6 * s);
  } else {
    // Running animation
    const legOffset = Math.sin(frame * 0.4) * 2;
    ctx.fillRect(x + 5 * s, y + 18 * s, 3 * s, (6 + legOffset) * s);
    ctx.fillRect(x + 8 * s, y + 18 * s, 3 * s, (6 - legOffset) * s);
  }
  
  // Shoes
  ctx.fillStyle = '#FF6B4A';
  ctx.fillRect(x + 4 * s, y + 22 * s, 4 * s, 2 * s);
  ctx.fillRect(x + 8 * s, y + 22 * s, 4 * s, 2 * s);

  ctx.restore();
}

// ============================================
// PLATFORM SPRITES
// ============================================
export const PLATFORM_HEIGHT = 20;

export type PlatformType = 'grass' | 'stone' | 'cloud' | 'ice' | 'crumble';

export function drawPlatform(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  type: PlatformType,
  scale: number,
  crumbleProgress: number = 0 // 0-1 for crumbling platforms
) {
  const s = scale;
  const w = width * s;
  const h = PLATFORM_HEIGHT * s;

  ctx.save();

  switch (type) {
    case 'grass':
      // Dirt base
      ctx.fillStyle = '#8B4513';
      ctx.fillRect(x, y + 4 * s, w, h - 4 * s);
      
      // Grass top
      ctx.fillStyle = '#4CAF50';
      ctx.fillRect(x, y, w, 6 * s);
      
      // Grass highlights
      ctx.fillStyle = '#66BB6A';
      for (let i = 0; i < width; i += 8) {
        ctx.fillRect(x + i * s, y, 4 * s, 3 * s);
      }
      
      // Grass blades
      ctx.fillStyle = '#81C784';
      for (let i = 4; i < width; i += 12) {
        ctx.fillRect(x + i * s, y - 3 * s, 2 * s, 4 * s);
        ctx.fillRect(x + (i + 4) * s, y - 2 * s, 2 * s, 3 * s);
      }
      
      // Pixel edge detail
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(x, y + h - 2 * s, w, 2 * s);
      break;

    case 'stone':
      // Stone base
      ctx.fillStyle = '#757575';
      ctx.fillRect(x, y, w, h);
      
      // Stone texture
      ctx.fillStyle = '#616161';
      for (let i = 0; i < width; i += 16) {
        ctx.fillRect(x + (i + 4) * s, y + 4 * s, 8 * s, 6 * s);
      }
      
      // Highlights
      ctx.fillStyle = '#9E9E9E';
      for (let i = 0; i < width; i += 16) {
        ctx.fillRect(x + i * s, y, 6 * s, 2 * s);
      }
      
      // Edge
      ctx.fillStyle = '#424242';
      ctx.fillRect(x, y + h - 2 * s, w, 2 * s);
      break;

    case 'cloud':
      // Fluffy cloud platform
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x + 4 * s, y, w - 8 * s, h);
      ctx.fillRect(x, y + 4 * s, w, h - 8 * s);
      
      // Cloud puffs
      ctx.fillRect(x - 4 * s, y + 6 * s, 8 * s, 8 * s);
      ctx.fillRect(x + w - 4 * s, y + 6 * s, 8 * s, 8 * s);
      
      // Shading
      ctx.fillStyle = '#E0E0E0';
      ctx.fillRect(x + 4 * s, y + h - 4 * s, w - 8 * s, 4 * s);
      break;

    case 'ice':
      // Ice platform
      ctx.fillStyle = '#B3E5FC';
      ctx.fillRect(x, y, w, h);
      
      // Shine
      ctx.fillStyle = '#E1F5FE';
      ctx.fillRect(x + 4 * s, y + 2 * s, w - 8 * s, 4 * s);
      
      // Cracks
      ctx.fillStyle = '#81D4FA';
      ctx.fillRect(x + 10 * s, y + 8 * s, 2 * s, 8 * s);
      ctx.fillRect(x + w - 20 * s, y + 6 * s, 2 * s, 10 * s);
      
      // Edge
      ctx.fillStyle = '#4FC3F7';
      ctx.fillRect(x, y + h - 2 * s, w, 2 * s);
      break;

    case 'crumble':
      // Crumbling platform with shake effect
      const shake = crumbleProgress > 0 ? Math.sin(crumbleProgress * 50) * 2 : 0;
      const alpha = 1 - crumbleProgress * 0.7;
      
      ctx.globalAlpha = alpha;
      
      // Sandy/rocky base
      ctx.fillStyle = '#A1887F';
      ctx.fillRect(x + shake, y, w, h);
      
      // Cracks (more as it crumbles)
      ctx.fillStyle = '#5D4037';
      const crackCount = Math.floor(crumbleProgress * 5) + 1;
      for (let i = 0; i < crackCount; i++) {
        const cx = x + (width / crackCount) * i * s + shake;
        ctx.fillRect(cx + 8 * s, y + 2 * s, 2 * s, h - 4 * s);
      }
      
      // Edge
      ctx.fillStyle = '#4E342E';
      ctx.fillRect(x + shake, y + h - 2 * s, w, 2 * s);
      break;
  }

  ctx.restore();
}

// ============================================
// SPIKE / HAZARD SPRITES
// ============================================
export const SPIKE_WIDTH = 16;
export const SPIKE_HEIGHT = 16;

export function drawSpike(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  onCeiling: boolean = false
) {
  const s = scale;
  
  ctx.save();
  
  if (onCeiling) {
    ctx.translate(x + SPIKE_WIDTH * s / 2, y + SPIKE_HEIGHT * s / 2);
    ctx.rotate(Math.PI);
    ctx.translate(-SPIKE_WIDTH * s / 2, -SPIKE_HEIGHT * s / 2);
    x = 0;
    y = 0;
  }

  // Spike body (metallic)
  ctx.fillStyle = '#9E9E9E';
  ctx.beginPath();
  ctx.moveTo(x + 8 * s, y);
  ctx.lineTo(x + 16 * s, y + 16 * s);
  ctx.lineTo(x, y + 16 * s);
  ctx.closePath();
  ctx.fill();
  
  // Spike highlight
  ctx.fillStyle = '#BDBDBD';
  ctx.beginPath();
  ctx.moveTo(x + 8 * s, y);
  ctx.lineTo(x + 10 * s, y + 8 * s);
  ctx.lineTo(x + 6 * s, y + 8 * s);
  ctx.closePath();
  ctx.fill();
  
  // Sharp tip
  ctx.fillStyle = '#E0E0E0';
  ctx.fillRect(x + 7 * s, y, 2 * s, 4 * s);
  
  // Base
  ctx.fillStyle = '#616161';
  ctx.fillRect(x, y + 14 * s, 16 * s, 2 * s);

  ctx.restore();
}

// ============================================
// COIN SPRITE
// ============================================
export const COIN_SIZE = 16;

export function drawCoin(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  frame: number
) {
  const s = scale;
  const bounce = Math.sin(frame * 0.1) * 2;
  const shimmer = Math.sin(frame * 0.2) * 0.3 + 0.7;
  
  ctx.save();
  
  // Coin glow
  ctx.fillStyle = `rgba(255, 215, 0, ${shimmer * 0.3})`;
  ctx.beginPath();
  ctx.arc(x + 8 * s, y + 8 * s + bounce, 12 * s, 0, Math.PI * 2);
  ctx.fill();
  
  // Coin body
  ctx.fillStyle = '#FFD700';
  ctx.beginPath();
  ctx.arc(x + 8 * s, y + 8 * s + bounce, 7 * s, 0, Math.PI * 2);
  ctx.fill();
  
  // Inner ring
  ctx.fillStyle = '#FFC107';
  ctx.beginPath();
  ctx.arc(x + 8 * s, y + 8 * s + bounce, 5 * s, 0, Math.PI * 2);
  ctx.fill();
  
  // Star/$ symbol
  ctx.fillStyle = '#FF8F00';
  ctx.fillRect(x + 6 * s, y + 6 * s + bounce, 4 * s, 4 * s);
  
  // Shine
  ctx.fillStyle = '#FFECB3';
  ctx.fillRect(x + 4 * s, y + 4 * s + bounce, 3 * s, 3 * s);
  
  ctx.restore();
}

// ============================================
// CHECKPOINT FLAG SPRITE
// ============================================
export const CHECKPOINT_WIDTH = 24;
export const CHECKPOINT_HEIGHT = 40;

export function drawCheckpoint(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  isActive: boolean,
  frame: number
) {
  const s = scale;
  const flagWave = Math.sin(frame * 0.1) * 2;
  
  // Pole
  ctx.fillStyle = '#8B4513';
  ctx.fillRect(x + 2 * s, y, 4 * s, 40 * s);
  
  // Pole base
  ctx.fillStyle = '#5D4037';
  ctx.fillRect(x, y + 36 * s, 8 * s, 4 * s);
  
  // Flag
  const flagColor = isActive ? '#4CAF50' : '#F44336';
  ctx.fillStyle = flagColor;
  ctx.beginPath();
  ctx.moveTo(x + 6 * s, y + 2 * s);
  ctx.lineTo(x + 24 * s + flagWave, y + 10 * s);
  ctx.lineTo(x + 6 * s, y + 18 * s);
  ctx.closePath();
  ctx.fill();
  
  // Flag highlight
  ctx.fillStyle = isActive ? '#66BB6A' : '#EF5350';
  ctx.beginPath();
  ctx.moveTo(x + 6 * s, y + 2 * s);
  ctx.lineTo(x + 18 * s + flagWave * 0.5, y + 8 * s);
  ctx.lineTo(x + 6 * s, y + 10 * s);
  ctx.closePath();
  ctx.fill();
  
  // Star on flag
  if (isActive) {
    ctx.fillStyle = '#FFEB3B';
    ctx.fillRect(x + 12 * s, y + 8 * s, 4 * s, 4 * s);
  }
  
  // Pole top
  ctx.fillStyle = '#FFD700';
  ctx.beginPath();
  ctx.arc(x + 4 * s, y, 4 * s, 0, Math.PI * 2);
  ctx.fill();
}

// ============================================
// POWER-UP SPRITES
// ============================================
export const POWERUP_SIZE = 20;

export type PowerUpType = 'double-jump' | 'shield' | 'speed';

export function drawPowerUp(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  type: PowerUpType,
  frame: number
) {
  const s = scale;
  const bounce = Math.sin(frame * 0.15) * 3;
  const glow = Math.sin(frame * 0.1) * 0.2 + 0.5;
  
  ctx.save();
  
  // Glow effect
  ctx.fillStyle = `rgba(147, 112, 219, ${glow})`;
  ctx.beginPath();
  ctx.arc(x + 10 * s, y + 10 * s + bounce, 14 * s, 0, Math.PI * 2);
  ctx.fill();
  
  // Box base
  ctx.fillStyle = '#9370DB';
  ctx.fillRect(x + 2 * s, y + 2 * s + bounce, 16 * s, 16 * s);
  
  // Box highlight
  ctx.fillStyle = '#BA68C8';
  ctx.fillRect(x + 2 * s, y + 2 * s + bounce, 16 * s, 4 * s);
  
  // Icon based on type
  ctx.fillStyle = '#ffffff';
  switch (type) {
    case 'double-jump':
      // Double arrow up
      ctx.fillRect(x + 8 * s, y + 5 * s + bounce, 4 * s, 8 * s);
      ctx.fillRect(x + 6 * s, y + 7 * s + bounce, 8 * s, 2 * s);
      ctx.fillRect(x + 6 * s, y + 12 * s + bounce, 8 * s, 2 * s);
      break;
    case 'shield':
      // Shield shape
      ctx.fillRect(x + 6 * s, y + 5 * s + bounce, 8 * s, 10 * s);
      ctx.fillRect(x + 8 * s, y + 15 * s + bounce, 4 * s, 2 * s);
      break;
    case 'speed':
      // Lightning bolt
      ctx.fillRect(x + 10 * s, y + 4 * s + bounce, 4 * s, 6 * s);
      ctx.fillRect(x + 6 * s, y + 8 * s + bounce, 8 * s, 3 * s);
      ctx.fillRect(x + 6 * s, y + 10 * s + bounce, 4 * s, 6 * s);
      break;
  }
  
  ctx.restore();
}

// ============================================
// SKY ISLAND BACKGROUND
// ============================================
export interface SkyTheme {
  skyTop: string;
  skyBottom: string;
  cloudColor: string;
  sunColor: string;
  starCount: number;
}

const SKY_THEMES: Record<string, SkyTheme> = {
  day: {
    skyTop: '#87CEEB',
    skyBottom: '#E0F7FA',
    cloudColor: '#ffffff',
    sunColor: '#FFD700',
    starCount: 0,
  },
  sunset: {
    skyTop: '#FF6B4A',
    skyBottom: '#FFD93D',
    cloudColor: '#FFB6C1',
    sunColor: '#FF4500',
    starCount: 0,
  },
  night: {
    skyTop: '#0a0a2e',
    skyBottom: '#1a1a4e',
    cloudColor: '#4a4a6e',
    sunColor: '#f0f0ff',
    starCount: 100,
  },
  space: {
    skyTop: '#000011',
    skyBottom: '#0a0a2e',
    cloudColor: '#2a2a4e',
    sunColor: '#ffffff',
    starCount: 200,
  },
};

export function getThemeForAltitude(altitude: number): string {
  if (altitude < 1000) return 'day';
  if (altitude < 2500) return 'sunset';
  if (altitude < 4000) return 'night';
  return 'space';
}

export function drawSkyBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  altitude: number,
  cameraY: number
) {
  const themeName = getThemeForAltitude(altitude);
  const theme = SKY_THEMES[themeName];
  
  // Interpolate between themes for smooth transition
  const nextThemeName = getThemeForAltitude(altitude + 500);
  const transitionProgress = (altitude % 1000) / 1000;
  
  // Sky gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, theme.skyTop);
  gradient.addColorStop(1, theme.skyBottom);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  
  // Stars (for night/space themes)
  if (theme.starCount > 0) {
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < theme.starCount; i++) {
      const starX = (i * 137 + cameraY * 0.02) % width;
      const starY = (i * 89) % height;
      const twinkle = Math.sin(Date.now() * 0.005 + i) > 0 ? 2 : 1;
      ctx.fillRect(starX, starY, twinkle, twinkle);
    }
  }
  
  // Sun/Moon
  const sunY = 80 - altitude * 0.01;
  ctx.fillStyle = theme.sunColor;
  ctx.beginPath();
  ctx.arc(width - 100, Math.max(50, sunY), 40, 0, Math.PI * 2);
  ctx.fill();
  
  // Floating clouds (parallax)
  drawFloatingClouds(ctx, width, height, theme.cloudColor, cameraY);
  
  // Distant floating islands (parallax - very slow)
  drawDistantIslands(ctx, width, height, cameraY);
}

function drawFloatingClouds(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  color: string,
  offset: number
) {
  ctx.fillStyle = color;
  
  const clouds = [
    { x: 50, y: 100, size: 1 },
    { x: 200, y: 200, size: 0.7 },
    { x: 400, y: 80, size: 1.2 },
    { x: 600, y: 150, size: 0.9 },
    { x: 750, y: 250, size: 0.8 },
  ];
  
  for (const cloud of clouds) {
    const x = ((cloud.x + offset * 0.1) % (width + 150)) - 75;
    const y = (cloud.y + offset * 0.02) % height;
    const s = cloud.size;
    
    // Pixelated cloud
    ctx.fillRect(x + 10 * s, y, 40 * s, 16 * s);
    ctx.fillRect(x, y + 8 * s, 60 * s, 16 * s);
    ctx.fillRect(x + 5 * s, y + 16 * s, 50 * s, 8 * s);
  }
}

function drawDistantIslands(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  offset: number
) {
  const islands = [
    { x: 100, y: 300, size: 0.5 },
    { x: 500, y: 350, size: 0.4 },
    { x: 700, y: 280, size: 0.6 },
  ];
  
  for (const island of islands) {
    const x = ((island.x + offset * 0.05) % (width + 200)) - 100;
    const y = (island.y + offset * 0.01) % (height - 100) + 100;
    const s = island.size;
    
    // Distant island silhouette
    ctx.fillStyle = 'rgba(100, 150, 100, 0.3)';
    ctx.fillRect(x, y, 80 * s, 15 * s);
    ctx.fillRect(x + 10 * s, y - 10 * s, 60 * s, 15 * s);
    
    // Little trees
    ctx.fillStyle = 'rgba(50, 100, 50, 0.3)';
    ctx.fillRect(x + 20 * s, y - 25 * s, 10 * s, 20 * s);
    ctx.fillRect(x + 40 * s, y - 20 * s, 8 * s, 15 * s);
  }
}

// ============================================
// GOAL / FINISH LINE
// ============================================
export function drawGoal(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  scale: number,
  frame: number
) {
  const s = scale;
  const glow = Math.sin(frame * 0.1) * 0.3 + 0.7;
  
  // Golden platform base
  ctx.fillStyle = '#FFD700';
  ctx.fillRect(x, y, width * s, 30 * s);
  
  // Shine effect
  ctx.fillStyle = `rgba(255, 255, 255, ${glow})`;
  ctx.fillRect(x, y, width * s, 8 * s);
  
  // Trophy in center
  const trophyX = x + (width * s) / 2 - 15 * s;
  const trophyY = y - 40 * s;
  
  // Trophy glow
  ctx.fillStyle = `rgba(255, 215, 0, ${glow * 0.5})`;
  ctx.beginPath();
  ctx.arc(trophyX + 15 * s, trophyY + 20 * s, 30 * s, 0, Math.PI * 2);
  ctx.fill();
  
  // Trophy cup
  ctx.fillStyle = '#FFD700';
  ctx.fillRect(trophyX + 5 * s, trophyY, 20 * s, 25 * s);
  ctx.fillRect(trophyX, trophyY + 5 * s, 30 * s, 15 * s);
  
  // Trophy handles
  ctx.fillRect(trophyX - 5 * s, trophyY + 8 * s, 8 * s, 8 * s);
  ctx.fillRect(trophyX + 27 * s, trophyY + 8 * s, 8 * s, 8 * s);
  
  // Trophy base
  ctx.fillStyle = '#B8860B';
  ctx.fillRect(trophyX + 8 * s, trophyY + 25 * s, 14 * s, 5 * s);
  ctx.fillRect(trophyX + 3 * s, trophyY + 30 * s, 24 * s, 8 * s);
  
  // Star on trophy
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(trophyX + 12 * s, trophyY + 8 * s, 6 * s, 6 * s);
  
  // "5000m" text
  ctx.font = `${12 * s}px "Press Start 2P", monospace`;
  ctx.fillStyle = '#FFD700';
  ctx.textAlign = 'center';
  ctx.fillText('5000m', x + (width * s) / 2, y + 50 * s);
}

