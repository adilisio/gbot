// Internal resolution. Everything renders at this size, then the canvas is
// integer-scaled by CSS with `image-rendering: pixelated` (compositor-only upscale).
export const W = 384;
export const H = 216;

export type Ctx = CanvasRenderingContext2D;

export function makeCanvas(w: number, h: number): [HTMLCanvasElement, Ctx] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  return [c, ctx];
}

// Deterministic hash noise for procedural art (no allocation).
export function hash2(x: number, y: number, s = 0): number {
  let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

export function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---- Glow sprites: pre-rendered radial gradients (fake bloom) ----
const glowCache = new Map<string, HTMLCanvasElement>();
export function glow(radius: number, color: string, strength = 1): HTMLCanvasElement {
  const key = radius + color + strength;
  let c = glowCache.get(key);
  if (c) return c;
  const s = radius * 2;
  const [cv, ctx] = makeCanvas(s, s);
  const g = ctx.createRadialGradient(radius, radius, 0, radius, radius, radius);
  g.addColorStop(0, rgba(color, 0.55 * strength));
  g.addColorStop(0.25, rgba(color, 0.28 * strength));
  g.addColorStop(0.6, rgba(color, 0.08 * strength));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  // Posterise alpha into a few bands for a pixel-art look.
  const id = ctx.getImageData(0, 0, s, s);
  const d = id.data;
  for (let i = 3; i < d.length; i += 4) d[i] = Math.round(d[i] / 18) * 18;
  ctx.putImageData(id, 0, 0);
  glowCache.set(key, cv);
  return cv;
}

export function rgba(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

export function shade(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, Math.round(((n >> 16) & 255) * f)));
  const g = Math.max(0, Math.min(255, Math.round(((n >> 8) & 255) * f)));
  const b = Math.max(0, Math.min(255, Math.round((n & 255) * f)));
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}

export function mix(a: string, b: string, t: number): string {
  const x = parseInt(a.slice(1), 16), y = parseInt(b.slice(1), 16);
  const r = Math.round(((x >> 16) & 255) * (1 - t) + ((y >> 16) & 255) * t);
  const g = Math.round(((x >> 8) & 255) * (1 - t) + ((y >> 8) & 255) * t);
  const bl = Math.round((x & 255) * (1 - t) + (y & 255) * t);
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1);
}
