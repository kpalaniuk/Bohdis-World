import { GameTheme } from '@/stores/gameStore';

// Theme color palettes
export const THEME_COLORS: Record<GameTheme, {
  sky: string[];
  water: string;
  waterHighlight: string;
  sand: string;
  sun: string;
  clouds: string;
  palmTrunk: string;
  palmLeaves: string;
}> = {
  beach: {
    sky: ['#87CEEB', '#4A90D9', '#2E5A8C'],
    water: '#4A90D9',
    waterHighlight: '#6BB3E9',
    sand: '#f5e6c8',
    sun: '#FFD700',
    clouds: '#ffffff',
    palmTrunk: '#8B4513',
    palmLeaves: '#228B22',
  },
  sunset: {
    sky: ['#FF6B4A', '#FF8C42', '#FFD93D'],
    water: '#2E5A8C',
    waterHighlight: '#4A7AAC',
    sand: '#DEB887',
    sun: '#FF4500',
    clouds: '#FFB6C1',
    palmTrunk: '#654321',
    palmLeaves: '#2F4F4F',
  },
  night: {
    sky: ['#0a0a2e', '#1a1a4e', '#2a2a6e'],
    water: '#1a1a4e',
    waterHighlight: '#2a2a6e',
    sand: '#3d3d5c',
    sun: '#f0f0ff',
    clouds: '#4a4a6e',
    palmTrunk: '#2d2d2d',
    palmLeaves: '#1a3a1a',
  },
  tropical: {
    sky: ['#00CED1', '#20B2AA', '#48D1CC'],
    water: '#00CED1',
    waterHighlight: '#40E0D0',
    sand: '#FFECD2',
    sun: '#FFD700',
    clouds: '#ffffff',
    palmTrunk: '#8B4513',
    palmLeaves: '#32CD32',
  },
};

export function drawBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  theme: GameTheme,
  scrollOffset: number
) {
  // Fallback to 'beach' if theme is not found (handles legacy 'default' theme)
  const colors = THEME_COLORS[theme] || THEME_COLORS['beach'];
  const groundY = height - 80;

  // Sky gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, groundY);
  gradient.addColorStop(0, colors.sky[0]);
  gradient.addColorStop(0.5, colors.sky[1]);
  gradient.addColorStop(1, colors.sky[2]);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, groundY);

  // Sun/Moon (parallax - moves slower)
  const sunX = (width * 0.8 - scrollOffset * 0.1) % (width + 100);
  ctx.beginPath();
  ctx.arc(sunX, height * 0.2, 40, 0, Math.PI * 2);
  ctx.fillStyle = colors.sun;
  ctx.fill();

  // Stars for night theme
  if (theme === 'night') {
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 50; i++) {
      const starX = (i * 73 + scrollOffset * 0.05) % width;
      const starY = (i * 47) % (groundY - 50);
      ctx.fillRect(starX, starY, 2, 2);
    }
  }

  // Clouds (parallax - moves at medium speed)
  drawClouds(ctx, width, groundY, colors.clouds, scrollOffset * 0.3);

  // Distant mountains/pier (parallax - moves slowly)
  drawDistantElements(ctx, width, groundY, scrollOffset * 0.2, theme);

  // Palm trees (parallax - medium-fast)
  drawPalmTrees(ctx, width, groundY, colors.palmTrunk, colors.palmLeaves, scrollOffset * 0.5);

  // Water
  ctx.fillStyle = colors.water;
  ctx.fillRect(0, groundY - 20, width, 40);
  
  // Water waves
  drawWaves(ctx, width, groundY, colors.waterHighlight, scrollOffset);

  // Sand/ground
  ctx.fillStyle = colors.sand;
  ctx.fillRect(0, groundY + 20, width, height - groundY);

  // Ground line (pixel style)
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(0, groundY + 18, width, 4);
}

function drawClouds(
  ctx: CanvasRenderingContext2D,
  width: number,
  maxY: number,
  color: string,
  offset: number
) {
  ctx.fillStyle = color;
  
  const cloudPositions = [
    { x: 100, y: 60, size: 1 },
    { x: 300, y: 80, size: 0.8 },
    { x: 500, y: 50, size: 1.2 },
    { x: 700, y: 90, size: 0.9 },
    { x: 900, y: 70, size: 1.1 },
  ];

  for (const cloud of cloudPositions) {
    const x = ((cloud.x - offset) % (width + 200)) - 100;
    const y = cloud.y;
    const s = cloud.size;

    // Pixelated cloud shape
    ctx.fillRect(x + 10 * s, y, 40 * s, 16 * s);
    ctx.fillRect(x, y + 8 * s, 60 * s, 16 * s);
    ctx.fillRect(x + 5 * s, y + 16 * s, 50 * s, 8 * s);
  }
}

function drawDistantElements(
  ctx: CanvasRenderingContext2D,
  width: number,
  groundY: number,
  offset: number,
  theme: GameTheme
) {
  // Distant pier/mountains based on theme
  ctx.fillStyle = theme === 'night' ? '#1a1a3e' : '#6B8E9F';
  
  // Mountains
  const mountainBaseY = groundY - 20;
  for (let i = 0; i < 3; i++) {
    const x = ((i * 400 - offset) % (width + 400)) - 200;
    const peakHeight = 60 + i * 20;
    
    ctx.beginPath();
    ctx.moveTo(x, mountainBaseY);
    ctx.lineTo(x + 100, mountainBaseY - peakHeight);
    ctx.lineTo(x + 200, mountainBaseY);
    ctx.closePath();
    ctx.fill();
  }

  // Pier
  const pierX = ((600 - offset) % (width + 400)) - 200;
  ctx.fillStyle = theme === 'night' ? '#2d2d4d' : '#8B7355';
  ctx.fillRect(pierX, mountainBaseY - 30, 8, 50);
  ctx.fillRect(pierX + 40, mountainBaseY - 30, 8, 50);
  ctx.fillRect(pierX - 10, mountainBaseY - 35, 70, 8);
}

function drawPalmTrees(
  ctx: CanvasRenderingContext2D,
  width: number,
  groundY: number,
  trunkColor: string,
  leafColor: string,
  offset: number
) {
  const treePositions = [200, 450, 750, 1000];

  for (const baseX of treePositions) {
    const x = ((baseX - offset) % (width + 300)) - 150;
    const treeY = groundY + 15;

    // Trunk
    ctx.fillStyle = trunkColor;
    ctx.fillRect(x, treeY - 80, 12, 80);
    ctx.fillRect(x + 2, treeY - 90, 8, 15);

    // Leaves (pixelated)
    ctx.fillStyle = leafColor;
    // Left leaves
    ctx.fillRect(x - 30, treeY - 95, 35, 8);
    ctx.fillRect(x - 25, treeY - 90, 30, 6);
    ctx.fillRect(x - 35, treeY - 85, 25, 6);
    
    // Right leaves
    ctx.fillRect(x + 7, treeY - 95, 35, 8);
    ctx.fillRect(x + 7, treeY - 90, 30, 6);
    ctx.fillRect(x + 22, treeY - 85, 25, 6);
    
    // Top leaves
    ctx.fillRect(x - 5, treeY - 105, 22, 6);
    ctx.fillRect(x, treeY - 100, 12, 8);
  }
}

function drawWaves(
  ctx: CanvasRenderingContext2D,
  width: number,
  groundY: number,
  highlightColor: string,
  offset: number
) {
  ctx.fillStyle = highlightColor;
  
  for (let x = -50; x < width + 50; x += 30) {
    const waveX = x + Math.sin((offset + x) * 0.02) * 10;
    const waveY = groundY - 10 + Math.sin((offset + x) * 0.03) * 5;
    
    // Pixelated wave caps
    ctx.fillRect(waveX, waveY, 20, 4);
    ctx.fillRect(waveX + 5, waveY - 3, 10, 3);
  }
}

export function drawGround(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  theme: GameTheme,
  scrollOffset: number
) {
  // Fallback to 'beach' if theme is not found (handles legacy 'default' theme)
  const colors = THEME_COLORS[theme] || THEME_COLORS['beach'];
  const groundY = height - 80;

  // Ground texture (moving)
  ctx.fillStyle = colors.sand;
  ctx.fillRect(0, groundY + 20, width, height - groundY);

  // Ground details (shells, pebbles)
  ctx.fillStyle = theme === 'night' ? '#4a4a6e' : '#DEB887';
  for (let i = 0; i < 20; i++) {
    const x = ((i * 80 - scrollOffset) % (width + 40)) - 20;
    const y = groundY + 35 + (i % 3) * 10;
    ctx.fillRect(x, y, 6, 4);
  }
}

