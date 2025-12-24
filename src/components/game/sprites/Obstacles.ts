// Pixel art obstacle sprites

export const OBSTACLE_COLORS = {
  0: 'transparent',
  1: '#8B4513', // Brown (rock)
  2: '#A0522D', // Sienna (rock highlight)
  3: '#654321', // Dark brown (rock shadow)
  4: '#228B22', // Green (seaweed)
  5: '#006400', // Dark green (seaweed shadow)
  6: '#FF4500', // Orange-red (crab)
  7: '#FF6347', // Tomato (crab highlight)
  8: '#1a1a1a', // Outline/eyes
};

// Rock obstacle (24x20)
export const ROCK_SPRITE = [
  '000000011111111000000000',
  '000001122222211110000000',
  '000012222222221111000000',
  '000122222222222111100000',
  '001222222222222211110000',
  '012222222222222221111000',
  '122222222222222222111100',
  '122222222222222222211110',
  '222222222222222222221111',
  '222222222222222222222111',
  '222222222222222222222211',
  '122222222222222222222221',
  '122222222222222222222221',
  '112222222222222222222211',
  '011222222222222222222110',
  '001122222222222222221100',
  '000112222222222222211000',
  '000011222222222222110000',
  '000001112222222211100000',
  '000000011111111110000000',
];

// Seaweed obstacle (16x28)
export const SEAWEED_SPRITE = [
  '0000044440000000',
  '0000444444000000',
  '0004444444400000',
  '0004445444400000',
  '0044455544440000',
  '0044455544440000',
  '0444455554444000',
  '0444455554444000',
  '4444455554444400',
  '4444455554444400',
  '0444455554444000',
  '0044455544440000',
  '0044455544440000',
  '0004445444400000',
  '0004444444400000',
  '0000444440000000',
  '0000044440000000',
  '0000444440000000',
  '0004444444000000',
  '0004445444000000',
  '0044455444400000',
  '0044455544440000',
  '0444455554444000',
  '0444455554444000',
  '4444455554444400',
  '4445555555444440',
  '5555555555555550',
  '5555555555555550',
];

// Crab obstacle (20x12)
export const CRAB_SPRITE = [
  '00066000000000660000',
  '00666600000006666000',
  '06666660000066666600',
  '66666666006666666660',
  '66666666666666666666',
  '67666686668666666766',
  '67766666666666666776',
  '06776666666666667760',
  '00677766666666677600',
  '00006776666667760000',
  '00000066666666000000',
  '00000006666660000000',
];

export function drawObstacle(
  ctx: CanvasRenderingContext2D,
  type: 'rock' | 'seaweed' | 'crab',
  x: number,
  y: number,
  scale: number = 2
) {
  let sprite: string[];
  let colors: Record<number, string>;

  switch (type) {
    case 'rock':
      sprite = ROCK_SPRITE;
      colors = OBSTACLE_COLORS;
      break;
    case 'seaweed':
      sprite = SEAWEED_SPRITE;
      colors = OBSTACLE_COLORS;
      break;
    case 'crab':
      sprite = CRAB_SPRITE;
      colors = OBSTACLE_COLORS;
      break;
  }

  const pixelSize = scale;

  ctx.save();
  
  for (let row = 0; row < sprite.length; row++) {
    for (let col = 0; col < sprite[row].length; col++) {
      const colorIndex = parseInt(sprite[row][col]) as keyof typeof colors;
      const color = colors[colorIndex];
      
      if (color !== 'transparent') {
        ctx.fillStyle = color;
        ctx.fillRect(
          x + col * pixelSize,
          y + row * pixelSize,
          pixelSize,
          pixelSize
        );
      }
    }
  }
  
  ctx.restore();
}

export const OBSTACLE_DIMENSIONS = {
  rock: { width: 24, height: 20 },
  seaweed: { width: 16, height: 28 },
  crab: { width: 20, height: 12 },
};

