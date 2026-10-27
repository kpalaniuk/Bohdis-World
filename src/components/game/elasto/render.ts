import { TUNING } from './physics';
import type { SimState, Vec, WheelState } from './types';

export interface Camera {
  x: number;
  y: number;
}

export interface View {
  width: number;
  height: number;
  dpr?: number;
  scale?: number;
  riderColor?: string;
  bestTimeMs?: number;
}

const patternCache = new WeakMap<CanvasRenderingContext2D, CanvasPattern>();


// Short tips shown for the first few seconds of the harder levels (keyboard key / iPad button).
const LEVEL_TIPS: Record<string, string> = {
  'Wheelie Tunnel': 'TIP: Lean forward (RIGHT / FWD) as you go over the hill.',
  'Mind the Gap': 'TIP: Lean forward off the ramp and grab the apple in the air!',
  'Half-Pipe': 'TIP: Turn around (SPACE / FLIP) in the bowl and fly off the left lip.',
  'Stairway': 'TIP: An apple is behind you. Turn around first (SPACE / FLIP).',
  'Turnaround': 'TIP: Dead end? Turn around with SPACE or FLIP.',
  'Spike Garden': 'TIP: Lean forward off the ramps to sail over the spikes.',
  'Sunset Finale': 'TIP: An apple is behind you. Turn around first (SPACE / FLIP).',
};

function groundPattern(ctx: CanvasRenderingContext2D, scale: number): CanvasPattern | string {
  const cached = patternCache.get(ctx);
  if (cached) return cached;
  const tile = document.createElement('canvas');
  tile.width = 8;
  tile.height = 8;
  const tileCtx = tile.getContext('2d');
  if (!tileCtx) return '#8A5A36';
  tileCtx.fillStyle = '#8A5A36';
  tileCtx.fillRect(0, 0, 8, 8);
  tileCtx.fillStyle = '#7A4E2E';
  tileCtx.fillRect(0, 0, 4, 4);
  tileCtx.fillRect(4, 4, 4, 4);
  const pattern = ctx.createPattern(tile, 'repeat');
  if (!pattern) return '#8A5A36';
  pattern.setTransform(new DOMMatrix().scale(1 / scale));
  patternCache.set(ctx, pattern);
  return pattern;
}

function tracePolygon(ctx: CanvasRenderingContext2D, polygon: Vec[]): void {
  ctx.moveTo(polygon[0].x, polygon[0].y);
  for (let i = 1; i < polygon.length; i += 1) ctx.lineTo(polygon[i].x, polygon[i].y);
  ctx.closePath();
}

function drawBackground(ctx: CanvasRenderingContext2D, camera: Camera, view: View): void {
  const gradient = ctx.createLinearGradient(0, 0, 0, view.height);
  gradient.addColorStop(0, '#4A90D9');
  gradient.addColorStop(0.62, '#BFE3F2');
  gradient.addColorStop(1, '#f5e6c8');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, view.width, view.height);

  const bands = [
    { color: '#9CC7DE', speed: 0.2, base: 355, height: 72 },
    { color: '#7FB3CF', speed: 0.4, base: 405, height: 92 },
  ];
  for (const band of bands) {
    const offset = ((-camera.x * 42 * band.speed) % 240) - 240;
    ctx.beginPath();
    ctx.moveTo(0, view.height);
    ctx.lineTo(0, band.base);
    for (let x = offset; x <= view.width + 240; x += 120) {
      ctx.quadraticCurveTo(x + 60, band.base - band.height, x + 120, band.base);
    }
    ctx.lineTo(view.width, view.height);
    ctx.closePath();
    ctx.fillStyle = band.color;
    ctx.fill();
  }
}

function drawTerrain(ctx: CanvasRenderingContext2D, sim: SimState, scale: number): void {
  const room = sim.level.polygons[0];
  ctx.beginPath();
  ctx.rect(-100, -100, 400, 300);
  tracePolygon(ctx, room);
  ctx.fillStyle = groundPattern(ctx, scale);
  ctx.fill('evenodd');

  for (const island of sim.level.polygons.slice(1)) {
    ctx.beginPath();
    tracePolygon(ctx, island);
    ctx.fillStyle = groundPattern(ctx, scale);
    ctx.fill();
  }

  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.lineWidth = 4 / scale;
  ctx.strokeStyle = '#1a1a1a';
  for (const polygon of sim.level.polygons) {
    ctx.beginPath();
    tracePolygon(ctx, polygon);
    ctx.stroke();
  }

  ctx.strokeStyle = '#98D8AA';
  ctx.lineWidth = 5 / scale;
  for (let polygonIndex = 0; polygonIndex < sim.level.polygons.length; polygonIndex += 1) {
    const polygon = sim.level.polygons[polygonIndex];
    for (let i = 0; i < polygon.length; i += 1) {
      const a = polygon[i];
      const b = polygon[(i + 1) % polygon.length];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const length = Math.hypot(dx, dy) || 1;
      const upNormalY = polygonIndex === 0 ? dx / length : -dx / length;
      if (upNormalY > -0.45) continue;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
  }
}

function drawApple(ctx: CanvasRenderingContext2D, p: Vec, time: number, scale: number): void {
  const y = p.y + Math.sin(time * 2.4 + p.x) * 0.07;
  ctx.beginPath();
  ctx.arc(p.x, y, 0.22, 0, Math.PI * 2);
  ctx.fillStyle = '#ff6b4a';
  ctx.fill();
  ctx.lineWidth = 2 / scale;
  ctx.strokeStyle = '#1a1a1a';
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(p.x + 0.12, y - 0.23, 0.11, 0.055, -0.5, 0, Math.PI * 2);
  ctx.fillStyle = '#98D8AA';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(p.x - 0.07, y - 0.07, 0.035, 0, Math.PI * 2);
  ctx.fillStyle = '#fff';
  ctx.fill();
}

function drawFlower(ctx: CanvasRenderingContext2D, p: Vec, time: number, scale: number): void {
  ctx.strokeStyle = '#497d55';
  ctx.lineWidth = 3 / scale;
  ctx.beginPath();
  ctx.moveTo(p.x, p.y + 0.35);
  ctx.lineTo(p.x, p.y);
  ctx.stroke();
  ctx.save();
  ctx.translate(p.x, p.y - 0.1);
  ctx.rotate(time * 0.45);
  for (let i = 0; i < 5; i += 1) {
    ctx.rotate(Math.PI * 2 / 5);
    ctx.beginPath();
    ctx.ellipse(0, -0.2, 0.11, 0.2, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#ff8fab';
    ctx.fill();
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 1.5 / scale;
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(0, 0, 0.12, 0, Math.PI * 2);
  ctx.fillStyle = '#f5e6c8';
  ctx.fill();
  ctx.restore();
}

function drawKiller(ctx: CanvasRenderingContext2D, p: Vec, time: number, scale: number): void {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(time * 0.55);
  for (let i = 0; i < 8; i += 1) {
    ctx.rotate(Math.PI / 4);
    ctx.beginPath();
    ctx.moveTo(-0.09, -0.3);
    ctx.lineTo(0, -0.62);
    ctx.lineTo(0.09, -0.3);
    ctx.closePath();
    ctx.fillStyle = '#ff6b4a';
    ctx.fill();
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 2 / scale;
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(0, 0, TUNING.killerRadius, 0, Math.PI * 2);
  ctx.fillStyle = '#1a1a1a';
  ctx.fill();
  ctx.restore();
}

function drawWheel(ctx: CanvasRenderingContext2D, wheel: WheelState, scale: number): void {
  ctx.save();
  ctx.translate(wheel.p.x, wheel.p.y);
  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath();
  ctx.arc(0, 0, TUNING.wheelRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.rotate(wheel.q);
  ctx.strokeStyle = '#f5e6c8';
  ctx.lineWidth = 2 / scale;
  for (let i = 0; i < 6; i += 1) {
    ctx.rotate(Math.PI / 3);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, TUNING.wheelRadius * 0.78);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(0, 0, 0.08, 0, Math.PI * 2);
  ctx.fillStyle = '#f5e6c8';
  ctx.fill();
  ctx.restore();
}

function drawBike(ctx: CanvasRenderingContext2D, sim: SimState, scale: number, color: string): void {
  const { bike } = sim;
  drawWheel(ctx, bike.rear, scale);
  drawWheel(ctx, bike.front, scale);
  ctx.save();
  ctx.translate(bike.p.x, bike.p.y);
  ctx.rotate(bike.a);
  ctx.scale(bike.dir, 1);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 4 / scale;
  ctx.beginPath();
  ctx.moveTo(-0.62, 0.38);
  ctx.lineTo(-0.15, -0.08);
  ctx.lineTo(0.62, 0.38);
  ctx.moveTo(-0.15, -0.08);
  ctx.lineTo(0.42, -0.05);
  ctx.lineTo(0.62, 0.38);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-0.35, -0.26);
  ctx.lineTo(0.31, -0.25);
  ctx.lineTo(0.42, -0.05);
  ctx.lineTo(-0.15, -0.08);
  ctx.closePath();
  ctx.fillStyle = '#4A90D9';
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineWidth = 8 / scale;
  ctx.beginPath();
  ctx.moveTo(-0.08, -0.34);
  ctx.lineTo(0.02, -0.66);
  ctx.lineTo(0.28, -0.42);
  ctx.stroke();
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 4 / scale;
  ctx.beginPath();
  ctx.moveTo(0.02, -0.62);
  ctx.lineTo(0.43, -0.35);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(TUNING.headX, TUNING.headY, TUNING.headRadius, 0, Math.PI * 2);
  ctx.fillStyle = '#f5e6c8';
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0.12, -0.91);
  ctx.lineTo(0.31, -0.86);
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 5 / scale;
  ctx.stroke();
  ctx.restore();
}

function formatTime(seconds: number): string {
  const centiseconds = Math.floor(seconds * 100) % 100;
  const whole = Math.floor(seconds);
  const minutes = Math.floor(whole / 60);
  const secs = whole % 60;
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(centiseconds).padStart(2, '0')}`;
}

function formatMilliseconds(ms: number): string {
  return formatTime(ms / 1000);
}

function shadowText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, align: CanvasTextAlign): void {
  ctx.textAlign = align;
  ctx.fillStyle = '#1a1a1a';
  ctx.fillText(text, x + 2, y + 2);
  ctx.fillStyle = '#fff';
  ctx.fillText(text, x, y);
}

export function drawFrame(ctx: CanvasRenderingContext2D, sim: SimState, camera: Camera, view: View): void {
  const scale = view.scale ?? 42;
  ctx.save();
  const dpr = view.dpr ?? 1;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawBackground(ctx, camera, view);
  ctx.translate(view.width / 2 - camera.x * scale, view.height * 0.55 - camera.y * scale);
  ctx.scale(scale, scale);
  drawTerrain(ctx, sim, scale);
  sim.level.apples.forEach((apple, index) => {
    if (!sim.collected[index]) drawApple(ctx, apple, sim.time, scale);
  });
  for (const killer of sim.level.killers) drawKiller(ctx, killer, sim.time, scale);
  drawFlower(ctx, sim.level.flower, sim.time, scale);
  drawBike(ctx, sim, scale, view.riderColor ?? '#ff6b4a');
  ctx.restore();

  ctx.save();
  ctx.fillStyle = 'rgba(26,26,26,0.62)';
  ctx.fillRect(0, 0, view.width, 48);
  ctx.font = "12px 'Press Start 2P'";
  shadowText(ctx, sim.level.name.toUpperCase(), 16, 30, 'left');
  ctx.font = '28px VT323';
  shadowText(ctx, formatTime(sim.finishTime ?? sim.time), view.width / 2, 31, 'center');
  ctx.font = '18px VT323';
  const collected = sim.collected.filter(Boolean).length;
  shadowText(ctx, `🍎 ${collected}/${sim.collected.length}`, view.width - 16, 22, 'right');
  if (view.bestTimeMs !== undefined) {
    ctx.font = '15px VT323';
    shadowText(ctx, `BEST ${formatMilliseconds(view.bestTimeMs)}`, view.width - 16, 40, 'right');
  }
  if (sim.flowerBlocked) {
    ctx.font = "11px 'Press Start 2P'";
    shadowText(ctx, 'GRAB ALL THE APPLES FIRST!', view.width / 2, 78, 'center');
    ctx.font = '20px VT323';
    shadowText(ctx, 'Missed one? Press R or RESTART to try again.', view.width / 2, 102, 'center');
  } else if (sim.time < 6 && LEVEL_TIPS[sim.level.name]) {
    ctx.font = '22px VT323';
    shadowText(ctx, LEVEL_TIPS[sim.level.name], view.width / 2, 80, 'center');
  }
  ctx.restore();
}
