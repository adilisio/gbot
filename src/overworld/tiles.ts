import { Ctx, hash2, glow, makeCanvas, mix } from '../engine/canvas';
import { objSprite } from '../ui/art';

export const TS = 16;
const WALK = new Set(['.', ':', ',', '=', 'H', '*', 'x', 'S', '_', ';', 'L', '<', '>', '^', 'v', 'B']);
export const ENCOUNTER = new Set([',', ';']);
export const VENT: Record<string, [number, number]> = { '<': [-1, 0], '>': [1, 0], '^': [0, -1], 'v': [0, 1] };
export function walkable(ch: string, gateOpen: boolean) { return WALK.has(ch) || (ch === 'G' && gateOpen); }

export interface TileMapView {
  w: number; h: number; at(x: number, y: number): string; floor: string; gateOpen: boolean; light: string; seed: number;
}

const isWater = (c: string) => c === '~' || c === ' ';
const isPlatform = (c: string) => !isWater(c) && c !== '=' && c !== 'H';

function px(ctx: Ctx, x: number, y: number, w: number, h: number, c: string) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); }

function water(ctx: Ctx, m: TileMapView, tx: number, ty: number, X: number, Y: number, frame: number) {
  px(ctx, X, Y, TS, TS, '#0a1430');
  // Drowned city glimmering below
  const h = hash2(tx, ty, m.seed);
  if (h < 0.08) { px(ctx, X + 4, Y + 5, 3, 4, '#15264e'); px(ctx, X + 9, Y + 5, 3, 4, '#15264e'); }
  else if (h < 0.11) { px(ctx, X + 6, Y + 6, 4, 5, '#1d3a6a'); }
  for (let i = 0; i < 3; i++) {
    const hy = (Math.floor(hash2(tx, ty * 3 + i, 7) * 14) + frame * 2) % 15;
    const hx = Math.floor(hash2(tx * 5 + i, ty, 9) * 11);
    px(ctx, X + hx, Y + hy, 4 + i, 1, i === 0 ? '#1c3366' : '#14264e');
  }
  // Platform underside / supports
  const up = m.at(tx, ty - 1);
  if (isPlatform(up) && up !== '') {
    px(ctx, X, Y, TS, 3, '#160c10'); px(ctx, X, Y + 3, TS, 2, '#0c0810');
    if ((tx + ty) % 3 === 0) { px(ctx, X + 6, Y + 5, 3, 7, '#1a1014'); px(ctx, X + 6, Y + 12, 3, 1, '#2a4a7a'); }
  }
}

function planks(ctx: Ctx, m: TileMapView, tx: number, ty: number, X: number, Y: number, base = '#4a3328') {
  px(ctx, X, Y, TS, TS, base);
  for (let r = 0; r < 4; r++) {
    const v = hash2(tx, ty * 4 + r, m.seed);
    px(ctx, X, Y + r * 4, TS, 4, mix(base, v < 0.5 ? '#2e1e18' : '#5e4234', 0.25 + v * 0.2));
    px(ctx, X, Y + r * 4 + 3, TS, 1, '#2a1a16');
    const sx = Math.floor(hash2(tx * 7 + r, ty, 3) * 16);
    px(ctx, X + sx, Y + r * 4, 1, 3, '#2a1a16');
    if (v > 0.85) px(ctx, X + ((sx + 5) % 15), Y + r * 4 + 1, 1, 1, '#1a100c');
  }
  edges(ctx, m, tx, ty, X, Y);
}
function edges(ctx: Ctx, m: TileMapView, tx: number, ty: number, X: number, Y: number) {
  if (isWater(m.at(tx, ty - 1))) px(ctx, X, Y, TS, 1, '#7a5a44');
  if (isWater(m.at(tx - 1, ty))) px(ctx, X, Y, 1, TS, '#2a1a16');
  if (isWater(m.at(tx + 1, ty))) px(ctx, X + TS - 1, Y, 1, TS, '#2a1a16');
}
function cobble(ctx: Ctx, m: TileMapView, tx: number, ty: number, X: number, Y: number, base = '#363a50') {
  px(ctx, X, Y, TS, TS, '#22243a');
  for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) {
    const v = hash2(tx * 4 + i, ty * 4 + j, m.seed + 1);
    const off = j % 2 ? 2 : 0;
    px(ctx, X + ((i * 4 + off) % 16), Y + j * 4, 3, 3, mix(base, v < 0.5 ? '#2a2c42' : '#4a4e68', v * 0.6));
  }
  edges(ctx, m, tx, ty, X, Y);
}

function drawFloorFor(ctx: Ctx, m: TileMapView, tx: number, ty: number, X: number, Y: number) {
  const f = m.floor;
  if (f === '_') { cobble(ctx, m, tx, ty, X, Y, '#2a3a58'); ctx.globalAlpha = 0.45; px(ctx, X, Y, TS, TS, '#163a6a'); ctx.globalAlpha = 1; }
  else if (f === ':') cobble(ctx, m, tx, ty, X, Y); else if (f === 'L') carpet(ctx, tx, ty, X, Y); else planks(ctx, m, tx, ty, X, Y);
}
function carpet(ctx: Ctx, tx: number, ty: number, X: number, Y: number) {
  px(ctx, X, Y, TS, TS, '#3a1e30');
  if ((tx + ty) % 2 === 0) px(ctx, X + 6, Y + 6, 4, 4, '#4a2a40');
  px(ctx, X, Y + 15, TS, 1, '#2e1626');
}

export function drawTile(ctx: Ctx, m: TileMapView, tx: number, ty: number, frame: number) {
  const ch = m.at(tx, ty); const X = tx * TS, Y = ty * TS;
  const h = hash2(tx, ty, m.seed + 5);
  switch (ch) {
    case '~': case ' ': water(ctx, m, tx, ty, X, Y, frame); break;
    case '.': planks(ctx, m, tx, ty, X, Y); break;
    case 'B': drawFloorFor(ctx, m, tx, ty, X, Y); break;
    case ':': cobble(ctx, m, tx, ty, X, Y); break;
    case 'L': carpet(ctx, tx, ty, X, Y); break;
    case ',': case ';': {
      if (ch === ';') { px(ctx, X, Y, TS, TS, '#10284a'); px(ctx, X + 2, Y + (frame * 3 + 4) % 14, 6, 1, '#1f4a7a'); }
      else px(ctx, X, Y, TS, TS, '#173029');
      for (let i = 0; i < 7; i++) {
        const a = hash2(tx * 9 + i, ty, 11), b = hash2(tx, ty * 9 + i, 12);
        const x = X + Math.floor(a * 14), y = Y + Math.floor(b * 13);
        px(ctx, x, y, 1, 3, ch === ';' ? '#3a8a7a' : '#2f6a4a'); px(ctx, x + 1, y + 1, 1, 2, '#245a3e');
      }
      const gx = X + Math.floor(h * 12) + 2, gy = Y + Math.floor(hash2(ty, tx, 4) * 12) + 2;
      px(ctx, gx, gy, 1, 1, '#9fffc0');
      if (h > 0.5) px(ctx, X + 15 - Math.floor(h * 10), Y + 9, 1, 1, '#6fe0a0');
      edges(ctx, m, tx, ty, X, Y);
      break;
    }
    case '=': case 'H': {
      water(ctx, m, tx, ty, X, Y, frame);
      if (ch === '=') {
        px(ctx, X, Y + 2, TS, 12, '#5a3e2e');
        for (let i = 0; i < 4; i++) px(ctx, X + i * 4 + 3, Y + 2, 1, 12, '#2e1e18');
        px(ctx, X, Y + 2, TS, 1, '#7a5a44'); px(ctx, X, Y + 1, TS, 1, '#c8a37a'); px(ctx, X, Y + 14, TS, 1, '#1a100c');
        px(ctx, X, Y + 15, TS, 1, '#8a6a4a');
      } else {
        px(ctx, X + 2, Y, 12, TS, '#5a3e2e');
        for (let i = 0; i < 4; i++) px(ctx, X + 2, Y + i * 4 + 3, 12, 1, '#2e1e18');
        px(ctx, X + 1, Y, 1, TS, '#c8a37a'); px(ctx, X + 14, Y, 1, TS, '#8a6a4a');
      }
      break;
    }
    case '#': case 'W': {
      px(ctx, X, Y, TS, TS, '#231a2e');
      const lit = ch === 'W' || h < 0.18;
      const pc = lit ? '#c88a4a' : '#4a3850';
      px(ctx, X + 2, Y + 2, 5, 11, pc); px(ctx, X + 9, Y + 2, 5, 11, pc);
      if (lit) { px(ctx, X + 2, Y + 2, 5, 1, '#f0c070'); px(ctx, X + 9, Y + 2, 5, 1, '#f0c070'); px(ctx, X + 4, Y + 2, 1, 11, '#8a5a2a'); px(ctx, X + 11, Y + 2, 1, 11, '#8a5a2a'); }
      else { px(ctx, X + 4, Y + 2, 1, 11, '#3a2a40'); px(ctx, X + 11, Y + 2, 1, 11, '#3a2a40'); }
      if (m.at(tx, ty + 1) !== '#' && m.at(tx, ty + 1) !== 'W' && m.at(tx, ty + 1) !== 'D') px(ctx, X, Y + 14, TS, 2, '#120c18');
      break;
    }
    case 'R': {
      px(ctx, X, Y, TS, TS, '#2e1a36');
      for (let r = 0; r < 4; r++) { px(ctx, X, Y + r * 4 + 3, TS, 1, '#1e1026'); for (let i = 0; i < 3; i++) px(ctx, X + ((i * 6 + r * 3) % 16), Y + r * 4, 1, 3, '#24142c'); }
      if (m.at(tx, ty - 1) !== 'R') px(ctx, X, Y, TS, 2, '#5a3a5a');
      const below = m.at(tx, ty + 1);
      if (below !== 'R') { px(ctx, X, Y + 13, TS, 3, '#120a16'); px(ctx, X, Y + 12, TS, 1, '#4a2a4a'); if (tx % 2 === 0) { px(ctx, X + 7, Y + 14, 2, 2, '#ff9a4a'); } }
      break;
    }
    case 'D': {
      px(ctx, X, Y, TS, TS, '#231a2e');
      px(ctx, X + 3, Y + 1, 10, 15, '#0a0610'); px(ctx, X + 4, Y + 2, 8, 14, '#1a0e14');
      px(ctx, X + 4, Y + 12, 8, 4, '#5a3a24'); px(ctx, X + 4, Y + 15, 8, 1, '#c88a4a');
      break;
    }
    case 'T': {
      drawFloorFor(ctx, m, tx, ty, X, Y);
      px(ctx, X + 7, Y + 4, 2, 12, '#120c10'); px(ctx, X + 5, Y + 15, 6, 1, '#120c10');
      px(ctx, X + 4, Y + 1, 8, 8, '#120c10'); px(ctx, X + 5, Y + 2, 6, 6, m.light); px(ctx, X + 6, Y + 3, 4, 4, '#fff0c0');
      px(ctx, X + 5, Y + 2, 6, 1, mix(m.light, '#000000', 0.4)); px(ctx, X + 5, Y + 7, 6, 1, mix(m.light, '#000000', 0.4));
      break;
    }
    case '+': drawFloorFor(ctx, m, tx, ty, X, Y); ctx.drawImage(objSprite('crate'), X, Y); break;
    case 'o': {
      drawFloorFor(ctx, m, tx, ty, X, Y);
      px(ctx, X + 3, Y + 2, 10, 13, '#0a0a16'); px(ctx, X + 4, Y + 3, 8, 11, '#5a3a2a'); px(ctx, X + 4, Y + 5, 8, 1, '#2a1a16'); px(ctx, X + 4, Y + 11, 8, 1, '#2a1a16'); px(ctx, X + 5, Y + 3, 2, 11, '#6a4a34');
      break;
    }
    case 'r': {
      drawFloorFor(ctx, m, tx, ty, X, Y);
      px(ctx, X, Y + 6, TS, 2, '#7a5a44'); px(ctx, X, Y + 8, TS, 1, '#1a100c'); px(ctx, X + 2, Y + 6, 2, 8, '#5a3e2e'); px(ctx, X + 12, Y + 6, 2, 8, '#5a3e2e');
      break;
    }
    case '*': {
      drawFloorFor(ctx, m, tx, ty, X, Y);
      for (let i = 0; i < 3; i++) { const fx = X + 2 + Math.floor(hash2(tx, ty + i, 21) * 11), fy = Y + 2 + Math.floor(hash2(tx + i, ty, 22) * 11); px(ctx, fx, fy + 1, 1, 2, '#2f6a4a'); px(ctx, fx - 1, fy, 3, 1, i === 0 ? '#ff9ad0' : i === 1 ? '#ffd58a' : '#9fd8ff'); }
      break;
    }
    case 'x': {
      cobble(ctx, m, tx, ty, X, Y);
      px(ctx, X + 2, Y + 2, 12, 12, '#0e1020'); px(ctx, X + 3, Y + 3, 10, 10, '#2a3050'); px(ctx, X + 6, Y + 6, 4, 4, '#7fe0ff');
      break;
    }
    case 'G': {
      drawFloorFor(ctx, m, tx, ty, X, Y);
      if (!m.gateOpen) {
        px(ctx, X, Y + 1, TS, 2, '#0a0a16');
        for (let i = 0; i < 4; i++) { px(ctx, X + 1 + i * 4, Y + 1, 2, 15, '#0a0a16'); px(ctx, X + 1 + i * 4, Y + 1, 1, 15, '#8a8ab0'); }
        px(ctx, X, Y + 1, TS, 1, '#b4a0e0');
      } else { px(ctx, X, Y + 1, TS, 1, '#3a3a5a'); }
      break;
    }
    case '<': case '>': case '^': case 'v': {
      cobble(ctx, m, tx, ty, X, Y);
      px(ctx, X + 1, Y + 1, 14, 14, '#0c1022'); for (let i = 0; i < 4; i++) px(ctx, X + 2, Y + 3 + i * 3, 12, 1, '#2a3460');
      const [dx, dy] = VENT[ch];
      const cx = X + 8, cy = Y + 8;
      for (let i = -2; i <= 2; i++) {
        const ax = cx + dx * 3 - Math.abs(i) * dx + (dy ? i : 0), ay = cy + dy * 3 - Math.abs(i) * dy + (dx ? i : 0);
        px(ctx, ax, ay, 1, 1, '#c9d8ff');
      }
      break;
    }
    case 'S': {
      px(ctx, X, Y, TS, TS, '#2a2238');
      for (let i = 0; i < 4; i++) { px(ctx, X, Y + i * 4, TS, 3, i % 2 ? '#4a3e58' : '#3e3450'); px(ctx, X, Y + i * 4 + 3, TS, 1, '#161020'); }
      break;
    }
    case '_': {
      cobble(ctx, m, tx, ty, X, Y, '#2a3a58');
      ctx.globalAlpha = 0.45; px(ctx, X, Y, TS, TS, '#163a6a'); ctx.globalAlpha = 1;
      px(ctx, X + Math.floor(h * 10), Y + (frame * 4 + 3) % 15, 5, 1, '#4a7ab0');
      break;
    }
    case 'A': {
      px(ctx, X, Y, TS, TS, '#0c0e1a');
      px(ctx, X + 2, Y, 2, TS, '#4a5068'); px(ctx, X + 12, Y, 2, TS, '#4a5068');
      for (let i = 0; i < 2; i++) { ctx.fillStyle = '#3a4058'; for (let k = 0; k < 8; k++) { ctx.fillRect(X + 3 + k, Y + i * 8 + k, 1, 1); ctx.fillRect(X + 12 - k, Y + i * 8 + k, 1, 1); } }
      if (h < 0.3) px(ctx, X + 7, Y + 7, 2, 2, '#ff4a4a');
      break;
    }
    case 'k': {
      drawFloorFor(ctx, m, tx, ty, X, Y);
      const cols = ['#c03a3a', '#e8dcc0'];
      for (let i = 0; i < 4; i++) px(ctx, X + i * 4, Y, 4, 7, cols[(i + tx) % 2]);
      px(ctx, X, Y + 7, TS, 1, '#0a0a16');
      px(ctx, X, Y + 8, TS, 7, '#4a3020'); px(ctx, X, Y + 8, TS, 1, '#7a5a3a');
      px(ctx, X + 3, Y + 10, 3, 3, ['#ffb060', '#7fe07a', '#4fb3ff', '#b48cff'][Math.floor(h * 4)]); px(ctx, X + 9, Y + 10, 3, 3, '#ffd58a');
      break;
    }
    case 'C': {
      drawFloorFor(ctx, m, tx, ty, X, Y);
      px(ctx, X + 3, Y, 10, TS, '#0a0a16'); px(ctx, X + 4, Y, 8, TS, '#4a4e68'); px(ctx, X + 4, Y, 2, TS, '#6a6e88'); px(ctx, X + 10, Y, 2, TS, '#32354a');
      break;
    }
    case 'K': {
      drawFloorFor(ctx, m, tx, ty, X, Y);
      px(ctx, X + 1, Y + 2, 14, 13, '#0a0a16'); px(ctx, X + 2, Y + 3, 12, 11, '#3a3a50');
      px(ctx, X + 3, Y + 4, 6, 4, '#0a2a20'); px(ctx, X + 4, Y + 5, 4, 1, '#9fffd0');
      px(ctx, X + 11, Y + 5, 2, 2, h < 0.5 ? '#ff6a4a' : '#ffd58a'); px(ctx, X + 3, Y + 10, 10, 1, '#5a5a70');
      break;
    }
    case '%': {
      drawFloorFor(ctx, m, tx, ty, X, Y);
      px(ctx, X + 2, Y + 3, 12, 12, '#0a1410'); px(ctx, X + 3, Y + 4, 10, 10, '#1f4a34');
      px(ctx, X + 4, Y + 5, 4, 3, '#2f6a4a'); px(ctx, X + 9, Y + 8, 3, 3, '#2f6a4a');
      px(ctx, X + 6 + Math.floor(h * 4), Y + 6, 1, 1, '#9fffc0');
      break;
    }
    default: drawFloorFor(ctx, m, tx, ty, X, Y);
  }
}

/** Bake a full map layer (tiles + light) into a canvas. */
export function bakeMap(m: TileMapView, frame: number, lowFx: boolean): HTMLCanvasElement {
  const [cv, ctx] = makeCanvas(m.w * TS, m.h * TS);
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) drawTile(ctx, m, x, y, frame);
  ctx.globalCompositeOperation = 'lighter';
  const big = glow(44, m.light, lowFx ? 0.7 : 1), win = glow(14, '#ff9a4a', 0.6), moss = glow(7, '#6fe0a0', 0.5), cool = glow(10, '#9fd8ff', 0.5), teal = glow(12, '#9fffd0', 0.6), door = glow(12, '#ffb060', 0.6), red = glow(5, '#ff4a4a', 0.8);
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
    const ch = m.at(x, y); const X = x * TS + 8, Y = y * TS + 8;
    const h = hash2(x, y, m.seed + 5);
    if (ch === 'T') ctx.drawImage(big, X - 44, Y - 48);
    else if ((ch === 'W' || (ch === '#' && h < 0.18))) ctx.drawImage(win, X - 14, Y - 14);
    else if (ch === 'D') ctx.drawImage(door, X - 12, Y - 6);
    else if ((ch === ',' || ch === ';') && h < 0.35 && !lowFx) ctx.drawImage(moss, X - 7, Y - 7);
    else if (VENT[ch]) ctx.drawImage(cool, X - 10, Y - 10);
    else if (ch === 'K') ctx.drawImage(teal, X - 12, Y - 12);
    else if (ch === 'A' && h < 0.3) ctx.drawImage(red, X - 5, Y - 5);
    else if (ch === 'R' && m.at(x, y + 1) !== 'R' && x % 2 === 0 && !lowFx) ctx.drawImage(red, X - 5, Y + 1);
  }
  ctx.globalCompositeOperation = 'source-over';
  return cv;
}
