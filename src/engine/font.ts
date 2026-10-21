import { FONT_DATA, FONT_H } from './fontdata';
import { makeCanvas, Ctx } from './canvas';

// Bitmap font renderer: glyph atlas per colour, cached. Each char is one drawImage.
const CELL = 9;
const adv: number[] = [];
const rows: number[][] = [];
FONT_DATA.split('|').forEach((g, i) => {
  const [a, r] = g.split(':');
  adv[i] = i === 0 ? 3 : parseInt(a, 10);
  rows[i] = r.split(',').map((h) => parseInt(h, 16));
});
export const LINE_H = 11;
const atlases = new Map<string, HTMLCanvasElement>();

function atlas(color: string): HTMLCanvasElement {
  let a = atlases.get(color);
  if (a) return a;
  const [c, ctx] = makeCanvas(CELL * rows.length, FONT_H);
  ctx.fillStyle = color;
  for (let i = 0; i < rows.length; i++) {
    const rr = rows[i];
    for (let y = 0; y < rr.length; y++) {
      const v = rr[y];
      for (let x = 0; x < CELL; x++) if (v & (1 << x)) ctx.fillRect(i * CELL + x, y, 1, 1);
    }
  }
  atlases.set(color, c);
  return c;
}

export function charW(code: number): number {
  const i = code - 32;
  return i >= 0 && i < adv.length ? adv[i] : 4;
}

export function measure(s: string): number {
  let w = 0;
  for (let i = 0; i < s.length; i++) w += charW(s.charCodeAt(i));
  return w;
}

/** Draw text. Returns end x. `count` limits visible characters (typewriter). */
export function text(ctx: Ctx, s: string, x: number, y: number, color = '#f4e6c8', shadow: string | null = '#0a0d1c', count = 1e9): number {
  x = Math.round(x); y = Math.round(y);
  if (shadow) drawRun(ctx, s, x, y + 1, shadow, count);
  return drawRun(ctx, s, x, y, color, count);
}

function drawRun(ctx: Ctx, s: string, x: number, y: number, color: string, count: number): number {
  const a = atlas(color);
  const n = Math.min(s.length, count);
  for (let i = 0; i < n; i++) {
    const idx = s.charCodeAt(i) - 32;
    if (idx < 0 || idx >= adv.length) { x += 4; continue; }
    if (idx > 0) ctx.drawImage(a, idx * CELL, 0, CELL, FONT_H, x, y, CELL, FONT_H);
    x += adv[idx];
  }
  return x;
}

export function textC(ctx: Ctx, s: string, cx: number, y: number, color?: string, shadow?: string | null) {
  text(ctx, s, cx - Math.floor(measure(s) / 2), y, color, shadow === undefined ? '#0a0d1c' : shadow);
}
export function textR(ctx: Ctx, s: string, rx: number, y: number, color?: string, shadow?: string | null) {
  text(ctx, s, rx - measure(s), y, color, shadow === undefined ? '#0a0d1c' : shadow);
}

const wrapCache = new Map<string, string[]>();
export function wrap(s: string, maxW: number): string[] {
  const key = maxW + '|' + s;
  const c = wrapCache.get(key);
  if (c) return c;
  const out: string[] = [];
  for (const para of s.split('\n')) {
    const words = para.split(' ');
    let line = '';
    for (const w of words) {
      const t = line ? line + ' ' + w : w;
      if (measure(t) > maxW && line) { out.push(line); line = w; } else line = t;
    }
    out.push(line);
  }
  if (wrapCache.size > 500) wrapCache.clear();
  wrapCache.set(key, out);
  return out;
}
