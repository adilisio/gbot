import { makeCanvas, mix, shade, glow } from '../engine/canvas';
import { SPECIES } from '../data/glimmers';
import { TYPE_COLOR, TYPE_DARK } from '../data/types';

// ---------- Glimmer sprites (procedural from per-species ops) ----------
const N = 40;
const monCache = new Map<string, HTMLCanvasElement>();

function rasterOps(ops: (string | number)[][], mask: Int8Array, eyes: [number, number][]) {
  const set = (x: number, y: number, c: number) => { if (x >= 0 && y >= 0 && x < N && y < N) mask[y * N + x] = c; };
  const ell = (cx: number, cy: number, rx: number, ry: number, c: number) => {
    const rxx = rx + 0.5, ryy = ry + 0.5;
    for (let y = Math.floor(cy - ry - 1); y <= cy + ry + 1; y++)
      for (let x = Math.floor(cx - rx - 1); x <= cx + rx + 1; x++) {
        const dx = (x + 0.5 - cx) / rxx, dy = (y + 0.5 - cy) / ryy;
        if (dx * dx + dy * dy <= 1) set(x, y, c);
      }
  };
  const tri = (x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, c: number) => {
    const minx = Math.floor(Math.min(x1, x2, x3)), maxx = Math.ceil(Math.max(x1, x2, x3));
    const miny = Math.floor(Math.min(y1, y2, y3)), maxy = Math.ceil(Math.max(y1, y2, y3));
    const s = (ax: number, ay: number, bx: number, by: number, px: number, py: number) => (bx - ax) * (py - ay) - (by - ay) * (px - ax);
    for (let y = miny; y <= maxy; y++) for (let x = minx; x <= maxx; x++) {
      const px = x + 0.5, py = y + 0.5;
      const a = s(x1, y1, x2, y2, px, py), b = s(x2, y2, x3, y3, px, py), d = s(x3, y3, x1, y1, px, py);
      if ((a >= 0 && b >= 0 && d >= 0) || (a <= 0 && b <= 0 && d <= 0)) set(x, y, c);
    }
  };
  const rect = (x: number, y: number, w: number, h: number, c: number) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) set(x + i, y + j, c); };
  for (const op of ops) {
    const k = op[0] as string; const a = op.slice(1) as number[];
    const mir = k === 'E' || k === 'T' || k === 'R';
    switch (k.toLowerCase()) {
      case 'e': ell(a[0], a[1], a[2], a[3], a[4]); if (mir) ell(N - a[0], a[1], a[2], a[3], a[4]); break;
      case 't': tri(a[0], a[1], a[2], a[3], a[4], a[5], a[6]); if (mir) tri(N - a[0], a[1], N - a[2], a[3], N - a[4], a[5], a[6]); break;
      case 'r': rect(a[0], a[1], a[2], a[3], a[4]); if (mir) rect(N - a[0] - a[2], a[1], a[2], a[3], a[4]); break;
      case 'eyes': eyes.push([a[0] - a[2] - 1, a[1] - 1], [a[0] + a[2] - 1, a[1] - 1]); break;
      case 'eye': eyes.push([a[0], a[1] - 1]); break;
    }
  }
}

export function monSprite(spId: string, flip = false, silhouette = false): HTMLCanvasElement {
  const key = spId + (flip ? 'f' : '') + (silhouette ? 's' : '');
  let c = monCache.get(key);
  if (c) return c;
  const s = SPECIES[spId];
  const mask = new Int8Array(N * N).fill(-1);
  const eyes: [number, number][] = [];
  rasterOps(s.art, mask, eyes);
  const base = TYPE_COLOR[s.type];
  const pal = [base, mix(base, TYPE_DARK[s.type], 0.55), mix(base, '#ffffff', 0.4), s.accent, '#fff8dc'];
  const outline = shade(TYPE_DARK[s.type], 0.45);
  const [cv, ctx] = makeCanvas(N, N);
  const img = ctx.createImageData(N, N);
  const put = (x: number, y: number, hex: string) => {
    const n = parseInt(hex.slice(1), 16), i = (y * N + (flip ? N - 1 - x : x)) * 4;
    img.data[i] = (n >> 16) & 255; img.data[i + 1] = (n >> 8) & 255; img.data[i + 2] = n & 255; img.data[i + 3] = 255;
  };
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= N || y >= N ? -1 : mask[y * N + x]);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const v = at(x, y);
    if (silhouette) { if (v >= 0) put(x, y, '#0a0d1c'); else if (at(x - 1, y) >= 0 || at(x + 1, y) >= 0 || at(x, y - 1) >= 0 || at(x, y + 1) >= 0) put(x, y, '#3a3f6a'); continue; }
    if (v >= 0) {
      let col = pal[v];
      if (v !== 4) {
        if (at(x, y - 1) !== v || at(x - 1, y) !== v && at(x, y - 1) !== v) col = mix(col, '#ffffff', 0.22);
        else if (at(x, y + 1) !== v || at(x + 1, y + 1) < 0) col = mix(col, '#000010', 0.25);
      }
      put(x, y, col);
    } else if (at(x - 1, y) >= 0 || at(x + 1, y) >= 0 || at(x, y - 1) >= 0 || at(x, y + 1) >= 0) put(x, y, outline);
  }
  if (!silhouette) for (const [ex, ey] of eyes) {
    put(ex, ey, '#140c1c'); put(ex + 1, ey, '#140c1c'); put(ex, ey + 1, '#140c1c'); put(ex + 1, ey + 1, '#140c1c');
    put(flip ? ex + 1 : ex, ey, '#ffffff');
  }
  ctx.putImageData(img, 0, 0);
  monCache.set(key, cv);
  return cv;
}

/** 20x20 icon (half-res) for menus. */
const iconCache = new Map<string, HTMLCanvasElement>();
export function monIcon(spId: string): HTMLCanvasElement {
  let c = iconCache.get(spId);
  if (c) return c;
  const src = monSprite(spId);
  const [cv, ctx] = makeCanvas(20, 20);
  const sctx = src.getContext('2d')!;
  const d = sctx.getImageData(0, 0, N, N).data;
  const out = ctx.createImageData(20, 20);
  // Pick the most "solid" pixel of each 2x2 block (keeps outlines).
  for (let y = 0; y < 20; y++) for (let x = 0; x < 20; x++) {
    let best = -1, ba = 0;
    for (const [ox, oy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
      const i = ((y * 2 + oy) * N + x * 2 + ox) * 4;
      if (d[i + 3] > ba) { ba = d[i + 3]; best = i; }
    }
    if (best >= 0) { const o = (y * 20 + x) * 4; out.data[o] = d[best]; out.data[o + 1] = d[best + 1]; out.data[o + 2] = d[best + 2]; out.data[o + 3] = d[best + 3]; }
  }
  ctx.putImageData(out, 0, 0);
  iconCache.set(spId, cv);
  return cv;
}

export function monGlow(spId: string) { return glow(36, TYPE_COLOR[SPECIES[spId].type], 0.9); }

// ---------- Characters (16x16, palette-swapped) ----------
const BODY_DOWN = [
  '................', '.....kkkkkk.....', '....khhhhhhk....', '...khhhhhhhhk...', '..kkkkkkkkkkkk..', '....kssssssk....', '....ksessesk....', '....kssssssk....',
  '...kllllllllk...', '..kcccllllccck..', '..kcccccccccck..', '..ksCccccccCsk..', '...kCCCCCCCCk...',
];
const BODY_UP = [
  '................', '.....kkkkkk.....', '....khhhhhhk....', '...khhhhhhhhk...', '..kkkkkkkkkkkk..', '....khhhhhhk....', '....khhhhhhk....', '....kshhhhsk....',
  '...kllllllllk...', '..kcccccccccck..', '..kcccccccccck..', '..ksCccccccCsk..', '...kCCCCCCCCk...',
];
const BODY_SIDE = [
  '................', '.....kkkkkk.....', '....khhhhhhk....', '...khhhhhhhhk...', '...kkkkkkkkkkkk.', '.....khsssssk...', '.....khssseskk..', '.....khsssssk...',
  '....kllllllk....', '....kccccllk....', '....kcccccck....', '....kcCsscck....', '....kCCCCCCk....',
];
const LEGS_A = ['....kppkkppk....', '....kbbkkbbk....', '....kkk..kkk....'];
const LEGS_B = ['...kppk..kppk...', '...kbbk..kbbk...', '...kkk....kkk...'];
const LEGS_SA = ['.....kppppk.....', '.....kbbbbk.....', '.....kkkkkk.....'];
const LEGS_SB = ['....kppkkppk....', '...kbbk..kbbk...', '...kkk....kkk...'];

export interface Look { h: string; s: string; c: string; C?: string; p: string; b: string; l: string; e?: string; }
export const LOOKS: Record<string, Look> = {
  player: { h: '#2a3a6a', s: '#f0c8a0', c: '#2f8a8a', p: '#2a2440', b: '#4a2a20', l: '#ffb04a' },
  juniper: { h: '#c8502a', s: '#e8b890', c: '#6a4aa0', p: '#2a2440', b: '#3a2020', l: '#ffd86a' },
  guild: { h: '#d8b060', s: '#f0c8a0', c: '#a07820', p: '#3a2a18', b: '#201810', l: '#fff0a0' },
  provost: { h: '#e8e0d0', s: '#e8c0a0', c: '#c8a030', p: '#4a3010', b: '#201810', l: '#ffffff' },
  kite: { h: '#202030', s: '#c89070', c: '#c03a3a', p: '#2a2a3a', b: '#2a1a10', l: '#f0f0f0' },
  tide: { h: '#2a6a7a', s: '#b8d8d0', c: '#1f4a6a', p: '#1a2a3a', b: '#102020', l: '#7fe0ff' },
  elder: { h: '#c8c8d0', s: '#d8b090', c: '#5a4a6a', p: '#2a2030', b: '#2a1a1a', l: '#b48cff' },
  dock: { h: '#5a3a2a', s: '#d8a880', c: '#4a6a3a', p: '#2a2a2a', b: '#2a1a10', l: '#c8a37a' },
  kid: { h: '#e8c040', s: '#f0c8a0', c: '#d86a8a', p: '#3a2a4a', b: '#3a2020', l: '#7fe07a' },
  radio: { h: '#1a1a2a', s: '#8a5a40', c: '#3a3a5a', p: '#1a1a2a', b: '#1a1a1a', l: '#9fffd0' },
  merchant: { h: '#6a2a5a', s: '#e0b890', c: '#8a6a2a', p: '#3a2030', b: '#2a1a10', l: '#ffd58a' },
  ghost: { h: '#4a6a9a', s: '#8ab0d0', c: '#3a5a8a', p: '#2a4a7a', b: '#2a4a7a', l: '#bff0ff', e: '#e8ffff' },
  courier: { h: '#3a2a1a', s: '#d8a880', c: '#8a3a2a', p: '#2a2440', b: '#3a2020', l: '#ffb04a' },
  ferry: { h: '#2a2a2a', s: '#c89070', c: '#2a4a5a', p: '#202a30', b: '#101010', l: '#ffd58a' },
};

const charCache = new Map<string, HTMLCanvasElement>();
/** dir: 0 down,1 up,2 left,3 right. frame 0/1 */
export function charSprite(look: string, dir: number, frame: number): HTMLCanvasElement {
  const key = look + dir + frame;
  let c = charCache.get(key);
  if (c) return c;
  const L = LOOKS[look] || LOOKS.courier;
  const side = dir >= 2;
  const body = dir === 0 ? BODY_DOWN : dir === 1 ? BODY_UP : BODY_SIDE;
  const legs = side ? (frame ? LEGS_SB : LEGS_SA) : (frame ? LEGS_B : LEGS_A);
  const rows = body.concat(legs);
  const pal: Record<string, string> = {
    k: '#0a0a16', h: L.h, s: L.s, e: L.e || '#140c1c', c: L.c, C: L.C || shade(L.c, 0.7), p: L.p, b: L.b, l: L.l,
  };
  const [cv, ctx] = makeCanvas(16, 16);
  for (let y = 0; y < 16; y++) {
    const r = rows[y];
    for (let x = 0; x < 16; x++) {
      const ch = r[x];
      if (!ch || ch === '.') continue;
      ctx.fillStyle = pal[ch] || '#ff00ff';
      ctx.fillRect(dir === 2 ? 15 - x : x, y, 1, 1);
    }
  }
  charCache.set(key, cv);
  return cv;
}

// ---------- Small object sprites ----------
const objCache = new Map<string, HTMLCanvasElement>();
export function objSprite(kind: string): HTMLCanvasElement {
  let c = objCache.get(kind);
  if (c) return c;
  const [cv, ctx] = makeCanvas(16, 16);
  const R = (x: number, y: number, w: number, h: number, col: string) => { ctx.fillStyle = col; ctx.fillRect(x, y, w, h); };
  switch (kind) {
    case 'parcel': R(3, 6, 10, 8, '#0a0a16'); R(4, 7, 8, 6, '#c89a5a'); R(4, 7, 8, 1, '#e8c080'); R(7, 7, 2, 6, '#7a3a2a'); R(4, 9, 8, 1, '#7a3a2a'); break;
    case 'crate': R(1, 2, 14, 13, '#0a0a16'); R(2, 3, 12, 11, '#7a5a3a'); R(2, 3, 12, 1, '#a07a4a'); R(2, 8, 12, 1, '#4a3420'); R(3, 4, 1, 9, '#5a4028'); R(12, 4, 1, 9, '#5a4028'); break;
    case 'rest': R(6, 1, 4, 2, '#0a0a16'); R(4, 3, 8, 10, '#0a0a16'); R(5, 4, 6, 8, '#ffcf7a'); R(6, 5, 4, 6, '#fff0c0'); R(5, 4, 6, 1, '#c87a2a'); R(5, 11, 6, 1, '#c87a2a'); R(7, 13, 2, 3, '#3a2a2a'); break;
    case 'sign': R(2, 3, 12, 8, '#0a0a16'); R(3, 4, 10, 6, '#8a6a42'); R(4, 6, 8, 1, '#4a3420'); R(4, 8, 6, 1, '#4a3420'); R(7, 11, 2, 5, '#4a3420'); break;
    case 'chest': R(2, 5, 12, 10, '#0a0a16'); R(3, 6, 10, 8, '#6a3a5a'); R(3, 6, 10, 2, '#8a5a7a'); R(7, 9, 2, 3, '#ffd58a'); break;
    case 'brazier': R(4, 8, 8, 7, '#0a0a16'); R(5, 9, 6, 5, '#4a4a5a'); R(3, 7, 10, 2, '#6a6a7a'); R(7, 14, 2, 2, '#2a2a3a'); break;
    case 'pedestal': R(4, 6, 8, 10, '#0a0a16'); R(5, 7, 6, 8, '#3a4a5a'); R(6, 3, 4, 4, '#0a0a16'); R(7, 4, 2, 2, '#9fffd0'); R(5, 9, 6, 1, '#9fffd0'); break;
    case 'bell': R(3, 3, 10, 11, '#0a0a16'); R(4, 4, 8, 9, '#8a7ab0'); R(4, 4, 8, 1, '#b4a0e0'); R(2, 12, 12, 2, '#0a0a16'); R(7, 14, 2, 2, '#ffd58a'); break;
    case 'radio': R(2, 5, 12, 10, '#0a0a16'); R(3, 6, 10, 8, '#5a3a2a'); R(4, 7, 5, 6, '#2a1a1a'); R(10, 8, 2, 2, '#ffd58a'); R(10, 11, 2, 1, '#9fffd0'); R(12, 1, 1, 5, '#0a0a16'); break;
    case 'boat': R(0, 8, 16, 6, '#0a0a16'); R(1, 9, 14, 4, '#5a3a2a'); R(1, 9, 14, 1, '#7a5a3a'); R(7, 2, 1, 7, '#2a1a10'); R(8, 3, 4, 4, '#e8dcc0'); break;
  }
  objCache.set(kind, cv);
  return cv;
}
