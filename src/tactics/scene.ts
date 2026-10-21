import { Ctx, W, H, makeCanvas, glow, hash2, mulberry } from '../engine/canvas';
import { input } from '../engine/input';
import { audio } from '../engine/audio';
import { settings } from '../engine/settings';
import { text, textC, textR, wrap, measure } from '../engine/font';
import { scenes, Scene, clock } from '../game';
import { G, bondOf, oilMax, flag, setFlag } from '../state';
import { WICKS, Ability, ELEM_COLOR, COURIER_ABILITIES } from '../data/wicks';
import { panel, COL, bar } from '../ui/widgets';
import { monIcon, charSprite } from '../ui/art';
import { Board, Unit, Fx, ENEMIES, EncounterDef, DIRS, T_WALL, T_WATER, T_BRAZIER, T_EXIT } from './rules';
import { GuideScene } from './guide';

export type FightResult = 'win' | 'lose';
const TS = 20;
const LEFT_W = 94, RIGHT_X = 290;

// ---------------- sprite caches ----------------
const cache: Record<string, HTMLCanvasElement> = {};
export function shadeSprite(kind: string): HTMLCanvasElement {
  const key = 'sh_' + kind;
  if (cache[key]) return cache[key];
  const k = ENEMIES[kind];
  if (k.art) { cache[key] = monIcon(k.art); return cache[key]; }
  const [c, x] = makeCanvas(20, 20);
  const px = (a: number, b: number, w: number, h: number, col: string) => { x.fillStyle = col; x.fillRect(a, b, w, h); };
  if (kind === 'shade' || kind === 'snuffer') {
    const body = kind === 'shade' ? '#1c1236' : '#24142a', edge = kind === 'shade' ? '#4a3a7a' : '#6a3a4a';
    px(6, 4, 8, 2, edge); px(5, 6, 10, 8, edge); px(6, 5, 8, 10, body); px(5, 14, 2, 3, edge); px(9, 14, 2, 4, edge); px(13, 14, 2, 3, edge);
    px(6, 7, 8, 7, body);
    if (kind === 'snuffer') { px(4, 2, 12, 2, '#3a2a30'); px(7, 1, 6, 2, '#3a2a30'); }
    const eye = kind === 'shade' ? '#ff6a8a' : '#ffa04a';
    px(7, 8, 2, 2, eye); px(11, 8, 2, 2, eye);
  } else if (kind === 'moth') {
    px(2, 5, 6, 8, '#2a2440'); px(12, 5, 6, 8, '#2a2440'); px(3, 6, 4, 5, '#3c3460'); px(13, 6, 4, 5, '#3c3460');
    px(8, 5, 4, 10, '#141024'); px(8, 3, 1, 2, '#3c3460'); px(11, 3, 1, 2, '#3c3460'); px(8, 7, 1, 1, '#ffe05a'); px(11, 7, 1, 1, '#ffe05a');
  } else if (kind === 'drowned') {
    px(5, 4, 10, 4, '#1a3a40'); px(4, 8, 12, 8, '#163036'); px(5, 16, 3, 3, '#163036'); px(12, 16, 3, 3, '#163036');
    px(6, 6, 2, 2, '#bff8ff'); px(12, 6, 2, 2, '#bff8ff'); px(6, 11, 1, 4, '#3a8a9a'); px(13, 10, 1, 5, '#3a8a9a'); px(9, 9, 2, 1, '#0a1a1e');
  } else if (kind === 'bell') {
    px(8, 1, 4, 2, '#4a3a24'); px(6, 3, 8, 3, '#3a2c1c'); px(5, 6, 10, 7, '#2c2016'); px(3, 13, 14, 3, '#4a3a24'); px(9, 16, 2, 2, '#6a5a3a');
    px(9, 8, 2, 2, '#ff6a4a'); px(6, 4, 1, 8, '#5a4a30');
  } else if (kind === 'gilt') {
    px(9, 0, 2, 3, '#c9a040'); px(5, 3, 10, 2, '#e0b850'); px(5, 15, 10, 2, '#e0b850'); px(5, 5, 1, 10, '#c9a040'); px(14, 5, 1, 10, '#c9a040');
    px(9, 5, 1, 10, '#c9a040'); px(6, 5, 8, 10, 'rgba(40,20,10,0.8)'); px(8, 8, 4, 4, '#ffd06a'); px(9, 9, 2, 2, '#fff4c0');
    px(2, 6, 3, 1, '#ffd06a'); px(15, 9, 3, 1, '#ffd06a'); px(3, 12, 2, 1, '#ffd06a');
  }
  cache[key] = c; return c;
}

const THEME: Record<string, { floor: string; floor2: string; wall: string; wallTop: string; bg: string }> = {
  docks: { floor: '#3a2a24', floor2: '#2e221e', wall: '#4a3428', wallTop: '#6a4a34', bg: '#060a18' },
  moss: { floor: '#1e2e24', floor2: '#18261e', wall: '#2e3a28', wallTop: '#4a5a34', bg: '#050c0c' },
  market: { floor: '#2e2638', floor2: '#262030', wall: '#4a3446', wallTop: '#6a4a62', bg: '#08061a' },
  belfry: { floor: '#202a34', floor2: '#1a222c', wall: '#34404c', wallTop: '#4a5a6a', bg: '#040a14' },
  heights: { floor: '#2a2a3a', floor2: '#222232', wall: '#3a3a52', wallTop: '#55557a', bg: '#06061a' },
  heart: { floor: '#3a3020', floor2: '#30281a', wall: '#4a3e26', wallTop: '#7a6638', bg: '#0c0806' },
  void: { floor: '#161830', floor2: '#121428', wall: '#24284a', wallTop: '#383e6a', bg: '#02030a' },
};

function bakeBoard(b: Board, theme: string, waterFrame: number): HTMLCanvasElement {
  const th = THEME[theme] || THEME.docks;
  const [c, x] = makeCanvas(b.w * TS, b.h * TS);
  for (let ty = 0; ty < b.h; ty++) for (let tx = 0; tx < b.w; tx++) {
    const X = tx * TS, Y = ty * TS, t = b.t(tx, ty);
    const r = hash2(tx, ty, 3);
    if (t === T_WATER) {
      x.fillStyle = '#0c1e3c'; x.fillRect(X, Y, TS, TS);
      x.fillStyle = '#16305a';
      for (let i = 0; i < 3; i++) { const yy = (i * 7 + waterFrame * 2 + ((r * 5) | 0)) % TS; x.fillRect(X + 2 + ((i * 5 + r * 7) % 10), Y + yy, 6, 1); }
      continue;
    }
    x.fillStyle = (tx + ty) % 2 ? th.floor : th.floor2; x.fillRect(X, Y, TS, TS);
    x.fillStyle = 'rgba(0,0,0,0.18)'; x.fillRect(X, Y + TS - 1, TS, 1); x.fillRect(X + TS - 1, Y, 1, TS);
    if (theme === 'docks') { x.fillStyle = 'rgba(0,0,0,0.2)'; x.fillRect(X, Y + 6, TS, 1); x.fillRect(X, Y + 13, TS, 1); }
    if (theme === 'moss' && r > 0.5) { x.fillStyle = '#2e5a34'; x.fillRect(X + ((r * 13) | 0), Y + ((r * 17) | 0) % 16, 2, 1); }
    if (r > 0.82) { x.fillStyle = 'rgba(255,255,255,0.05)'; x.fillRect(X + 4, Y + 4, 3, 1); }
    if (t === T_WALL) {
      x.fillStyle = 'rgba(0,0,0,0.4)'; x.fillRect(X + 1, Y + 3, TS - 1, TS - 2);
      x.fillStyle = th.wall; x.fillRect(X + 1, Y + 1, TS - 3, TS - 4);
      x.fillStyle = th.wallTop; x.fillRect(X + 1, Y + 1, TS - 3, 4);
      x.fillStyle = 'rgba(0,0,0,0.25)'; x.fillRect(X + 3, Y + 8, TS - 7, 1); x.fillRect(X + 9, Y + 5, 1, TS - 9);
    }
    if (t === T_EXIT) {
      x.fillStyle = '#5a4020'; x.fillRect(X + 3, Y + 2, 14, 16);
      x.fillStyle = '#ffd58a'; x.fillRect(X + 5, Y + 4, 10, 12);
      x.fillStyle = '#fff4d0'; x.fillRect(X + 7, Y + 6, 6, 8);
      x.fillStyle = '#5a4020'; x.fillRect(X + 9, Y + 4, 2, 12);
    }
  }
  return c;
}
function darkTile(f: number): HTMLCanvasElement {
  const key = 'dark' + f;
  if (cache[key]) return cache[key];
  const [c, x] = makeCanvas(TS, TS);
  x.fillStyle = 'rgba(6,3,16,0.78)'; x.fillRect(0, 0, TS, TS);
  const r = mulberry(11 + f * 7);
  for (let i = 0; i < 14; i++) { x.fillStyle = r() < 0.5 ? 'rgba(70,40,110,0.5)' : 'rgba(20,10,40,0.7)'; x.fillRect((r() * TS) | 0, (r() * TS) | 0, 1 + ((r() * 3) | 0), 1); }
  cache[key] = c; return c;
}
function brazierSprite(lit: boolean, f: number): HTMLCanvasElement {
  const key = 'brz' + (lit ? 1 : 0) + (lit ? f : 0);
  if (cache[key]) return cache[key];
  const [c, x] = makeCanvas(TS, TS);
  x.fillStyle = 'rgba(0,0,0,0.35)'; x.fillRect(4, 16, 12, 2);
  x.fillStyle = '#3a2e24'; x.fillRect(8, 10, 4, 7); x.fillRect(5, 16, 10, 2);
  x.fillStyle = '#6a5040'; x.fillRect(3, 7, 14, 4); x.fillStyle = '#8a6a50'; x.fillRect(3, 7, 14, 1);
  if (lit) {
    x.fillStyle = '#ff8a3a'; x.fillRect(5, 3 + (f % 2), 10, 4); x.fillRect(7, 1 + (f % 2), 6, 2);
    x.fillStyle = '#ffd06a'; x.fillRect(7, 3 + (f % 2), 6, 4); x.fillStyle = '#fff4c0'; x.fillRect(9, 4 + (f % 2), 2, 3);
  } else { x.fillStyle = '#2a2026'; x.fillRect(5, 6, 10, 1); x.fillStyle = '#5a5a6a'; x.fillRect(9, 4, 1, 2); x.fillRect(11, 3, 1, 2); }
  cache[key] = c; return c;
}

interface Floater { x: number; y: number; t: number; s: string; col: string; }

const TIPS: Record<string, string[]> = {
  drill: [
    'Shades telegraph. RED tiles show exactly where each shade will strike when you end your turn. Hover a shade to see it clearly.',
    'Your courier and every glimmer in your lantern are on the board. Click one (or press Tab), then click a blue tile to move it.',
    'Then pick a light on the left (keys 1-3). Light clears dark tiles and burns, soaks, stuns or shoves shades. Hover a target to preview exactly what will happen.',
    'Oil is your lifeline. Lights cost oil, and every hit drains it. If the lantern runs dry you wake at the last shrine you rested at. Shrines refill it.',
    'Dark tiles gnaw 1 oil from anyone standing in them at the end of a round. Purple brackets show where the dark will creep next.',
    'The objective is top-right - here, hold out for 3 turns. Press F or click End Turn when you\'re done. T opens the Field Guide any time.',
  ],
  wet: ['Drowned are always WET. Fire is doused on wet shades. Push them, stun them - or hit them with Static, which jumps between touching wet shades.'],
  gilt: ['Binding lanterns pull a new shade out of the dark beside them every turn (watch for the swirl marker). Break them first.'],
};

export class TacticsScene implements Scene {
  name = 'tactics';
  b: Board;
  base: HTMLCanvasElement[] = [];
  phase: 'intro' | 'player' | 'enemy' | 'end' = 'intro';
  sel: Unit | null = null; abil = -1;
  cx = 0; cy = 0; hx = -1; hy = -1;
  reachMap: Map<number, number> | null = null;
  targetSet: Set<number> | null = null;
  pv: Board | null = null; pvFx: Fx[] = []; pvKey = '';
  steps: (() => Fx[])[] = []; stepT = 0;
  floaters: Floater[] = [];
  flashes: { x: number; y: number; t: number; col: string }[] = [];
  undo: { uid: number; x: number; y: number } | null = null;
  info: string[] = []; infoKey = ''; infoTitle = ''; infoCol = COL.hi;
  tips: string[] = []; tipI = 0;
  endT = 0; shake = 0;
  ox: number; oy: number;
  hoverBtn = -1;

  constructor(public def: EncounterDef, private done: (r: FightResult) => void) {
    const wicks = G.lantern.slice(0, 3);
    this.b = Board.create(def, wicks, Math.max(1, G.oil), oilMax(), G.bag.flask || 0, (G.playtime * 1000) | 0 || 7);
    this.ox = LEFT_W + 2 + Math.floor((RIGHT_X - LEFT_W - 4 - this.b.w * TS) / 2);
    this.oy = 18 + Math.floor((9 - this.b.h) * TS / 2);
    const frames = settings.lowFx ? 1 : 3;
    for (let f = 0; f < frames; f++) this.base.push(bakeBoard(this.b, def.theme, f));
    const c = this.b.courier; this.cx = c.x; this.cy = c.y;
    audio.play(def.music || (def.boss ? 'boss' : 'battle'));
    if (def.tip && !flag('tip_' + def.tip)) { this.tips.push(...TIPS[def.tip]); setFlag('tip_' + def.tip); }
    if (def.map.some((r) => r.includes('g')) && !flag('tip_gilt')) { this.tips.push(...TIPS.gilt); setFlag('tip_gilt'); }
  }

  pages() { return [this.def.intro || this.def.title, ...this.tips]; }
  // ---------------- helpers ----------------
  tileAtMouse(): [number, number] | null {
    const tx = Math.floor((input.mx - this.ox) / TS), ty = Math.floor((input.my - this.oy) / TS);
    return this.b.in(tx, ty) && input.mx >= this.ox && input.my >= this.oy ? [tx, ty] : null;
  }
  readyAllies() { return this.b.allies().filter((a) => !a.acted || !a.moved); }
  ability(u: Unit, i: number): Ability | null { return this.b.abilitiesOf(u)[i] || null; }
  bondFor(u: Unit) { return u.kind === 'courier' ? 3 : bondOf(u.kind); }
  select(u: Unit | null) {
    this.sel = u; this.abil = -1; this.targetSet = null; this.clearPreview();
    this.reachMap = u && !u.moved && !u.acted ? this.b.reach(u) : null;
    if (u) { this.cx = u.x; this.cy = u.y; audio.sfx('blip'); }
  }
  chooseAbility(i: number) {
    if (this.phase !== 'player') return;
    if (!this.sel) this.select(this.b.courier);
    const u = this.sel!; const ab = this.ability(u, i); if (!ab) return;
    const why = this.b.canUse(u, ab, this.bondFor(u), i);
    if (why) { audio.sfx('deny'); this.toastAt(u.x, u.y, why, COL.bad); return; }
    if (this.abil === i && (ab.shape === 'self' || ab.shape === 'ring')) { this.commit(); return; }
    this.abil = i; this.reachMap = null; this.clearPreview();
    this.targetSet = Board.needsTile(ab) ? new Set(this.b.targets(u, ab)) : null;
    audio.sfx('select');
    if (ab.shape === 'self' || ab.shape === 'ring') this.updatePreview(u.x, u.y);
  }
  aimOf(u: Unit, ab: Ability, tx: number, ty: number): { dir: number; tx: number; ty: number } | null {
    if (ab.shape === 'self' || ab.shape === 'ring') return { dir: 0, tx: u.x, ty: u.y };
    if (Board.needsTile(ab)) return this.targetSet?.has(this.b.idx(tx, ty)) ? { dir: 0, tx, ty } : null;
    const dx = tx - u.x, dy = ty - u.y;
    if (!dx && !dy) return null;
    const dir = Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 3 : 2) : (dy > 0 ? 0 : 1);
    return { dir, tx, ty };
  }
  clearPreview() { this.pv = null; this.pvFx = []; this.pvKey = ''; }
  updatePreview(tx: number, ty: number) {
    const u = this.sel; if (!u || this.abil < 0) { this.clearPreview(); return; }
    const ab = this.ability(u, this.abil)!;
    const aim = this.aimOf(u, ab, tx, ty);
    if (!aim) { this.clearPreview(); return; }
    const key = `${u.uid}:${this.abil}:${aim.dir}:${aim.tx},${aim.ty}`;
    if (key === this.pvKey) return;
    this.pvKey = key;
    const c = this.b.clone();
    const cu = c.units.find((v) => v.uid === u.uid)!;
    this.pvFx = c.cast(cu, ab, aim.dir, aim.tx, aim.ty);
    this.pv = c;
  }
  commit() {
    const u = this.sel; if (!u || this.abil < 0) return;
    const ab = this.ability(u, this.abil)!;
    const aim = this.aimOf(u, ab, this.hx, this.hy) || ((ab.shape === 'self' || ab.shape === 'ring') ? { dir: 0, tx: u.x, ty: u.y } : null);
    if (!aim) { audio.sfx('deny'); return; }
    const fx = this.b.cast(u, ab, aim.dir, aim.tx, aim.ty);
    this.playFx(fx, ab);
    this.undo = null;
    this.clearPreview(); this.abil = -1; this.targetSet = null; this.reachMap = null;
    // auto-select next ready ally
    const next = this.readyAllies().find((a) => !a.acted);
    this.select(next || null);
    this.infoKey = '';
  }
  endTurn() {
    if (this.phase !== 'player') return;
    this.select(null); this.undo = null;
    this.phase = 'enemy'; this.steps = this.b.enemySteps(); this.stepT = 20;
    audio.sfx('select');
  }

  toastAt(x: number, y: number, s: string, col: string) {
    this.floaters.push({ x: this.ox + x * TS + TS / 2, y: this.oy + y * TS, t: 0, s, col });
  }
  playFx(fx: Fx[], ab?: Ability) {
    let snd = '';
    for (const f of fx) {
      switch (f.k) {
        case 'dmg': this.toastAt(f.x, f.y, '-' + f.n, COL.hi); snd = snd || 'hit'; break;
        case 'kill': this.flash(f.x, f.y, '#ffffff'); snd = 'faint'; break;
        case 'sink': this.toastAt(f.x, f.y, 'sinks!', '#7fc8ff'); snd = 'faint'; break;
        case 'douse': this.toastAt(f.x, f.y, 'doused', '#7fc8ff'); break;
        case 'wet': break;
        case 'quench': this.toastAt(f.x, f.y, 'quenched', '#7fc8ff'); break;
        case 'stun': this.toastAt(f.x, f.y, 'stunned', '#fff27a'); break;
        case 'ignite': this.toastAt(f.x, f.y, 'burning', '#ff9a4a'); break;
        case 'relight': this.flash(f.x, f.y, '#ffd06a'); this.toastAt(f.x, f.y, 'relit!', '#ffd58a'); snd = 'puzzle'; break;
        case 'snuff': this.toastAt(f.x, f.y, 'snuffed', COL.bad); break;
        case 'oil': if (f.n! > 0) this.toastAt(f.x, f.y, '+' + f.n + ' oil', '#ffd58a'); else if (ab === undefined) this.toastAt(f.x, f.y, f.n + ' oil', COL.bad); break;
        case 'hit': this.flash(f.x, f.y, '#ff4a4a'); this.shake = 6; snd = 'hit'; break;
        case 'block': this.toastAt(f.x, f.y, 'shielded', '#9fd8ff'); break;
        case 'slash': this.flash(f.x, f.y, '#ff5a5a'); break;
        case 'spawn': this.flash(f.x, f.y, '#6a3aa0'); break;
        case 'blockspawn': this.toastAt(f.x, f.y, 'blocked', '#ffd58a'); break;
        case 'gnaw': this.toastAt(f.x, f.y, 'dark gnaws', '#b48cff'); break;
        case 'fan': this.toastAt(f.x, f.y, 'fanned!', '#ffb05a'); break;
        case 'immune': this.toastAt(f.x, f.y, 'immune', COL.dim); break;
        case 'anchored': this.toastAt(f.x, f.y, 'anchored', COL.dim); break;
        case 'fizzle': this.toastAt(f.x, f.y, 'stunned', '#fff27a'); break;
        case 'flask': snd = 'heal'; break;
        case 'zap': this.flash(f.tx!, f.ty!, '#fff27a'); break;
        case 'light': if (!settings.lowFx) this.flash(f.x, f.y, ab ? ELEM_COLOR[ab.elem] : '#ffd06a', 10); break;
      }
    }
    if (ab) audio.sfx(snd || 'select'); else if (snd) audio.sfx(snd);
  }
  flash(x: number, y: number, col: string, t = 16) { if (this.flashes.length < 40) this.flashes.push({ x, y, t, col }); }

  // ---------------- update ----------------
  update() {
    G.playtime += 1 / 60;
    for (const u of this.b.units) if (u.at < 1) u.at = Math.min(1, u.at + 1 / 7);
    for (let i = this.floaters.length - 1; i >= 0; i--) { const f = this.floaters[i]; f.t++; if (f.t > 50) this.floaters.splice(i, 1); }
    for (let i = this.flashes.length - 1; i >= 0; i--) { if (--this.flashes[i].t <= 0) this.flashes.splice(i, 1); }
    if (this.shake > 0) this.shake--;

    if (this.phase === 'intro') {
      if (input.hit('confirm') || input.clicked) {
        input.clicked = false; audio.sfx('blip');
        this.tipI++;
        if (this.tipI >= this.pages().length) { this.phase = 'player'; this.select(this.b.courier); }
      }
      return;
    }
    if (this.phase === 'end') {
      this.endT++;
      if (this.endT > 40 && (input.hit('confirm') || input.clicked)) { input.consumeAll(); this.finish(); }
      return;
    }
    if (this.phase === 'enemy') {
      if (--this.stepT > 0) return;
      const st = this.steps.shift();
      if (!st) { this.phase = this.b.result !== 'none' ? 'end' : 'player'; if (this.phase === 'player') { this.select(this.readyAllies()[0] || this.b.courier); } else this.onEnd(); return; }
      const fx = st();
      this.playFx(fx);
      this.stepT = fx.length ? 26 : 2;
      if (this.b.result !== 'none') { this.steps.length = 0; this.stepT = 30; }
      return;
    }
    // player phase
    if (this.b.result !== 'none') { this.phase = 'end'; this.onEnd(); return; }
    if (input.hit('chart')) { scenes.push(new GuideScene()); return; }
    if (input.hit('end')) { this.endTurn(); return; }
    if (input.hit('a1')) this.chooseAbility(0);
    if (input.hit('a2')) this.chooseAbility(1);
    if (input.hit('a3')) this.chooseAbility(2);
    if (input.hit('cycle')) {
      const r = this.b.allies().filter((a) => !a.acted);
      if (r.length) { const i = this.sel ? r.indexOf(this.sel) : -1; this.select(r[(i + 1) % r.length]); }
    }
    if (input.hit('undo')) this.doUndo();
    if (input.hit('back') || input.rclicked) {
      input.rclicked = false;
      if (this.abil >= 0) { this.abil = -1; this.targetSet = null; this.clearPreview(); this.reachMap = this.sel && !this.sel.moved ? this.b.reach(this.sel) : null; audio.sfx('back'); }
      else if (this.sel) { this.select(null); audio.sfx('back'); }
      else scenes.push(new GuideScene());
      return;
    }
    // cursor
    let moved = false;
    if (input.hit('left')) { this.cx = Math.max(0, this.cx - 1); moved = true; }
    if (input.hit('right')) { this.cx = Math.min(this.b.w - 1, this.cx + 1); moved = true; }
    if (input.hit('up')) { this.cy = Math.max(0, this.cy - 1); moved = true; }
    if (input.hit('down')) { this.cy = Math.min(this.b.h - 1, this.cy + 1); moved = true; }
    let hx = this.cx, hy = this.cy;
    const mt = input.usingMouse ? this.tileAtMouse() : null;
    if (input.usingMouse && !moved) { if (mt) { hx = mt[0]; hy = mt[1]; this.cx = hx; this.cy = hy; } else { hx = -1; hy = -1; } }
    this.hx = hx; this.hy = hy;
    if (this.abil >= 0 && this.sel) { const ab = this.ability(this.sel, this.abil)!; if (ab.shape !== 'self' && ab.shape !== 'ring') { if (hx >= 0) this.updatePreview(hx, hy); else this.clearPreview(); } }
    // side panel buttons (mouse)
    this.hoverBtn = -1;
    if (input.usingMouse) this.panelMouse();
    if (input.clicked && mt) { input.clicked = false; this.clickTile(mt[0], mt[1]); }
    else if (input.hit('confirm') && !input.usingMouse) this.clickTile(this.cx, this.cy);
    else if (input.hit('confirm') && input.usingMouse && mt) this.clickTile(mt[0], mt[1]);
    this.updateInfo();
  }

  panelMouse() {
    // unit roster rows
    const al = this.b.allies();
    for (let i = 0; i < al.length; i++) {
      if (input.inRect(2, 18 + i * 23, LEFT_W - 4, 22)) { this.hoverBtn = 100 + i; if (input.clicked) { input.clicked = false; this.select(al[i]); } }
    }
    // abilities
    const u = this.sel || null;
    if (u) for (let i = 0; i < 3; i++) {
      if (input.inRect(2, 114 + i * 22, LEFT_W - 4, 21)) { this.hoverBtn = i; if (input.clicked) { input.clicked = false; this.chooseAbility(i); } }
    }
    if (input.inRect(RIGHT_X + 4, H - 40, 88, 16)) { this.hoverBtn = 50; if (input.clicked) { input.clicked = false; this.endTurn(); } }
    if (input.inRect(RIGHT_X + 4, H - 22, 42, 16)) { this.hoverBtn = 51; if (input.clicked) { input.clicked = false; this.doUndo(); } }
    if (input.inRect(RIGHT_X + 50, H - 22, 42, 16)) { this.hoverBtn = 52; if (input.clicked) { input.clicked = false; scenes.push(new GuideScene()); } }
  }

  doUndo() {
    const u = this.undo && this.b.units.find((v) => v.uid === this.undo!.uid);
    if (!u || u.acted) { audio.sfx('deny'); return; }
    u.x = this.undo!.x; u.y = this.undo!.y; u.ax = u.x; u.ay = u.y; u.moved = false; this.undo = null;
    this.select(u); audio.sfx('back');
  }

  clickTile(tx: number, ty: number) {
    const b = this.b;
    if (this.abil >= 0 && this.sel) {
      const ab = this.ability(this.sel, this.abil)!;
      if (this.aimOf(this.sel, ab, tx, ty) || ab.shape === 'self' || ab.shape === 'ring') { this.hx = tx; this.hy = ty; this.commit(); return; }
      const a = b.unitAt(tx, ty, 0);
      if (a) { this.select(a); return; }
      audio.sfx('deny'); return;
    }
    const a = b.unitAt(tx, ty, 0);
    if (a) { this.select(a); return; }
    if (this.sel && this.reachMap && this.reachMap.has(b.idx(tx, ty)) && !(tx === this.sel.x && ty === this.sel.y)) {
      this.undo = { uid: this.sel.uid, x: this.sel.x, y: this.sel.y };
      b.moveUnit(this.sel, tx, ty); audio.sfx('push');
      this.reachMap = null;
      if (b.result !== 'none') return;
      return;
    }
    this.select(null);
  }

  updateInfo() {
    const b = this.pv || this.b;
    let key = '';
    if (this.hoverBtn >= 0 && this.hoverBtn < 3 && this.sel) key = 'ab' + this.sel.uid + ':' + this.hoverBtn;
    else if (this.abil >= 0 && this.sel) key = 'ab' + this.sel.uid + ':' + this.abil + ':' + this.pvKey;
    else if (this.hx >= 0) key = 't' + this.hx + ',' + this.hy + ':' + (b.unitAt(this.hx, this.hy)?.uid || 0) + ':' + this.b.turn;
    if (key === this.infoKey) return;
    this.infoKey = key;
    const L: string[] = []; this.infoTitle = ''; this.infoCol = COL.hi;
    const push = (s: string) => { for (const l of wrap(s, 86)) L.push(l); };
    if (key.startsWith('ab') && this.sel) {
      const i = this.hoverBtn >= 0 && this.hoverBtn < 3 ? this.hoverBtn : this.abil;
      const ab = this.ability(this.sel, i)!;
      this.infoTitle = ab.name; this.infoCol = ELEM_COLOR[ab.elem];
      push(`${ab.cost} oil. ${ab.desc}`);
      const why = this.b.canUse(this.sel, ab, this.bondFor(this.sel), i);
      if (why) push('(' + why + ')');
      if (this.abil >= 0 && this.pvFx.length) {
        const kills = this.pvFx.filter((f) => f.k === 'kill' || f.k === 'sink').length;
        const dmg = this.pvFx.filter((f) => f.k === 'dmg').reduce((a, f) => a + (f.n || 0), 0);
        const st = this.pvFx.filter((f) => f.k === 'stun').length;
        const pu = this.pvFx.filter((f) => f.k === 'push').length;
        const parts: string[] = [];
        if (dmg) parts.push(`${dmg} dmg`); if (kills) parts.push(`${kills} out`); if (st) parts.push(`${st} stunned`); if (pu) parts.push(`${pu} pushed`);
        if (this.pvFx.some((f) => f.k === 'douse')) parts.push('DOUSED on wet');
        if (this.pvFx.some((f) => f.k === 'relight')) parts.push('relights');
        if (parts.length) push('Preview: ' + parts.join(', ') + '.');
      } else if (this.abil >= 0) push(Board.needsTile(ab) ? 'Pick a highlighted tile.' : 'Point at a direction.');
    } else if (this.hx >= 0) {
      const u = b.unitAt(this.hx, this.hy), i = b.idx(this.hx, this.hy), t = b.t(this.hx, this.hy);
      if (u && u.side === 1) {
        const k = ENEMIES[u.kind];
        this.infoTitle = `${k.name}  ${k.invuln ? '' : u.hp + '/' + u.maxHp}`; this.infoCol = '#ff9aaa';
        push(k.desc);
        const tr: string[] = [];
        if (u.wet) tr.push('WET (fire doused, Static jumps)'); if (u.burn) tr.push('BURNING (1 dmg/turn)'); if (u.stun) tr.push('STUNNED (won\'t attack)');
        if (tr.length) push(tr.join('. ') + '.');
        if (u.intent && !u.stun) push(`Next: strikes the red tiles, ${u.intent.dmg} oil per hit.`);
        else if (!u.intent && !k.spawner) push('Next: no target in reach - it\'s moving closer.');
      } else if (u) {
        if (u.kind === 'courier') { this.infoTitle = 'Wren (courier)'; push('Moves 3. Can Shove, Relight braziers, and pour Oil Flasks. Can\'t cross water.'); }
        else { const w = WICKS[u.kind]; this.infoTitle = `${w.name} - ${w.role}`; this.infoCol = w.color; push(`Moves ${w.mv}${w.fly ? ', flies' : w.swim ? ', swims' : ''}. Bond ${bondOf(u.kind)}.`); push(w.voice); }
        if (u.dim) push('Flickering: was hit, can\'t use lights this turn.');
        if (u.shield) push('Shielded: next hit costs no oil.');
        if (b.dark[i]) push('Standing in darkness: -1 oil at round end.');
      } else {
        if (t === T_BRAZIER) { this.infoTitle = b.lit[i] ? 'Lit brazier' : 'Cold brazier'; push(b.lit[i] ? 'Keeps the dark off the tiles around it. Snuffers want it out.' : 'Relight it with fire, or with the courier\'s Relight.'); }
        else if (t === T_WATER) { this.infoTitle = 'Deep water'; push('Shades that can\'t swim or fly sink if pushed in.'); }
        else if (t === T_WALL) { this.infoTitle = 'Wall'; push('Blocks movement and most light. Shades pushed into it take 1.'); }
        else if (t === T_EXIT) { this.infoTitle = 'Exit'; push('Get the courier here to deliver the parcel.'); }
        else this.infoTitle = 'Boards';
        if (b.ward[i]) push(`Cairn stone (${b.ward[i]} hits left). Blocks movement and darkness.`);
        if (b.moss[i]) push('Glowmoss: the dark can never creep here.');
        if (b.dark[i]) push('DARK: -1 oil for anyone standing here at round end. Shades rise from dark tiles.');
        if (b.creep[i]) push('The dark will creep here next round.');
        if (b.spawns.some((s) => s.x === this.hx && s.y === this.hy)) push('A shade rises here next round. Stand on it to block it (costs 1 oil).');
      }
    }
    this.info = L;
  }

  onEnd() {
    this.endT = 0;
    audio.sfx(this.b.result === 'win' ? 'level' : 'faint');
  }
  finish() {
    scenes.pop(this);
    G.bag.flask = this.b.flasks; if (!G.bag.flask) delete G.bag.flask;
    if (this.b.result === 'win') G.oil = Math.max(1, this.b.oil);
    this.done(this.b.result === 'win' ? 'win' : 'lose');
  }

  // ---------------- render ----------------
  render(ctx: Ctx) {
    const b = this.pv || this.b;
    const th = THEME[this.def.theme] || THEME.docks;
    ctx.fillStyle = th.bg; ctx.fillRect(0, 0, W, H);
    const sx = this.shake ? ((clock.t % 2) * 2 - 1) : 0;
    const ox = this.ox + sx, oy = this.oy;
    ctx.drawImage(this.base[Math.floor(clock.t / 30) % this.base.length], ox, oy);
    const f2 = Math.floor(clock.t / 20) % 2;
    // moss, wards, braziers
    for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) {
      const i = b.idx(x, y), X = ox + x * TS, Y = oy + y * TS;
      if (b.moss[i]) { ctx.fillStyle = 'rgba(110,220,110,0.22)'; ctx.fillRect(X + 1, Y + 1, TS - 2, TS - 2); ctx.fillStyle = '#8fe07a'; ctx.fillRect(X + 4, Y + 14, 2, 1); ctx.fillRect(X + 13, Y + 5, 2, 1); ctx.fillRect(X + 9, Y + 9, 1, 1); }
      if (b.ward[i]) { ctx.fillStyle = '#5a4a3a'; ctx.fillRect(X + 3, Y + 5, 14, 13); ctx.fillStyle = '#8a7a5a'; ctx.fillRect(X + 3, Y + 5, 14, 3); if (b.ward[i] === 1) { ctx.fillStyle = '#2a2018'; ctx.fillRect(X + 9, Y + 6, 1, 10); } }
      if (b.t(x, y) === T_BRAZIER) ctx.drawImage(brazierSprite(!!b.lit[i], f2), X, Y);
    }
    // darkness
    const dt = darkTile(settings.lowFx ? 0 : Math.floor(clock.t / 40) % 2);
    for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) {
      const i = b.idx(x, y), X = ox + x * TS, Y = oy + y * TS;
      if (b.dark[i]) ctx.drawImage(dt, X, Y);
      if (b.creep[i]) {
        ctx.fillStyle = clock.t % 40 < 20 ? '#8a5ad0' : '#5a3a90';
        ctx.fillRect(X + 1, Y + 1, 4, 1); ctx.fillRect(X + 1, Y + 1, 1, 4); ctx.fillRect(X + TS - 5, Y + TS - 2, 4, 1); ctx.fillRect(X + TS - 2, Y + TS - 5, 1, 4);
        ctx.fillRect(X + TS - 5, Y + 1, 4, 1); ctx.fillRect(X + TS - 2, Y + 1, 1, 4); ctx.fillRect(X + 1, Y + TS - 2, 4, 1); ctx.fillRect(X + 1, Y + TS - 5, 1, 4);
      }
    }
    for (const s of b.spawns) {
      const X = ox + s.x * TS, Y = oy + s.y * TS; const r = 3 + ((clock.t / 6) | 0) % 4;
      ctx.fillStyle = 'rgba(120,60,200,0.35)'; ctx.fillRect(X + 10 - r, Y + 10 - r, r * 2, r * 2);
      ctx.fillStyle = '#c08aff'; ctx.fillRect(X + 9, Y + 4, 2, 7); ctx.fillRect(X + 9, Y + 13, 2, 2);
    }
    // move range
    if (this.reachMap && this.sel && this.phase === 'player') {
      for (const [k] of this.reachMap) {
        const x = k % b.w, y = (k / b.w) | 0; if (x === this.sel.x && y === this.sel.y) continue;
        ctx.fillStyle = 'rgba(90,170,255,0.28)'; ctx.fillRect(ox + x * TS + 1, oy + y * TS + 1, TS - 2, TS - 2);
      }
    }
    // targets
    if (this.targetSet) for (const k of this.targetSet) {
      const x = k % b.w, y = (k / b.w) | 0; ctx.fillStyle = 'rgba(255,213,138,0.5)';
      const X = ox + x * TS, Y = oy + y * TS; ctx.fillRect(X + 1, Y + 1, TS - 2, 1); ctx.fillRect(X + 1, Y + TS - 2, TS - 2, 1); ctx.fillRect(X + 1, Y + 1, 1, TS - 2); ctx.fillRect(X + TS - 2, Y + 1, 1, TS - 2);
    }
    // directional hints when aiming cone/line
    if (this.sel && this.abil >= 0 && !this.pv) {
      const ab = this.ability(this.sel, this.abil)!;
      if (Board.needsDir(ab)) for (const [dx, dy] of DIRS) {
        const x = this.sel.x + dx, y = this.sel.y + dy; if (!b.in(x, y)) continue;
        ctx.fillStyle = 'rgba(255,213,138,0.35)'; ctx.fillRect(ox + x * TS + 7, oy + y * TS + 7, 6, 6);
      }
    }
    // preview area
    if (this.pv) for (const f of this.pvFx) if (f.k === 'light') {
      ctx.fillStyle = 'rgba(255,210,120,0.32)'; ctx.fillRect(ox + f.x * TS, oy + f.y * TS, TS, TS);
    }
    // enemy intents (from the preview board if aiming - so pushes show where attacks will land)
    let hovered: Unit | null = null;
    if (this.hx >= 0) { const u = b.unitAt(this.hx, this.hy, 1); if (u) hovered = u; }
    for (const e of b.units) {
      if (e.dead || e.side !== 1 || !e.intent) continue;
      const tiles = b.intentTiles(e);
      const hot = hovered === e;
      for (const [x, y] of tiles) {
        const X = ox + x * TS, Y = oy + y * TS;
        ctx.fillStyle = e.stun ? 'rgba(150,150,170,0.18)' : hot ? 'rgba(255,60,60,0.5)' : 'rgba(255,60,60,0.26)';
        ctx.fillRect(X + 1, Y + 1, TS - 2, TS - 2);
        ctx.fillStyle = e.stun ? '#8a8aa0' : '#ff5a5a';
        ctx.fillRect(X + 1, Y + 1, TS - 2, 1); ctx.fillRect(X + 1, Y + TS - 2, TS - 2, 1); ctx.fillRect(X + 1, Y + 1, 1, TS - 2); ctx.fillRect(X + TS - 2, Y + 1, 1, TS - 2);
        if (e.stun) { ctx.fillStyle = '#8a8aa0'; ctx.fillRect(X + 6, Y + 9, 8, 2); }
      }
      if (!e.intent.abs && tiles.length) { // arrow from foe toward attack
        const [dx, dy] = DIRS[e.intent.dir];
        const X = ox + e.x * TS + 10 + dx * 9, Y = oy + e.y * TS + 10 + dy * 9;
        ctx.fillStyle = e.stun ? '#8a8aa0' : '#ff7a7a'; ctx.fillRect(X - 1, Y - 1, 3, 3);
      }
    }
    // units
    const lights: [number, number, string, number][] = [];
    for (const u of b.units) {
      if (u.dead) continue;
      const fx = u.ax + (u.x - u.ax) * u.at, fy = u.ay + (u.y - u.ay) * u.at;
      const X = Math.round(ox + fx * TS), Y = Math.round(oy + fy * TS);
      const bob = Math.round(Math.sin(clock.t / 16 + u.uid) * 1.5);
      if (u.side === 0) {
        if (u === this.sel) { ctx.fillStyle = COL.hi; ctx.fillRect(X + 2, Y + TS - 3, TS - 4, 2); }
        ctx.globalAlpha = u.acted && this.phase === 'player' ? 0.55 : 1;
        if (u.kind === 'courier') { ctx.drawImage(charSprite('player', 0, 0), X + 2, Y + 1); lights.push([X + 15, Y + 9, '#ffb060', 22]); }
        else { const w = WICKS[u.kind]; ctx.drawImage(monIcon(w.art), X, Y - 3 + bob); lights.push([X + 10, Y + 8, w.color, 18]); }
        ctx.globalAlpha = 1;
        if (u.shield) { ctx.fillStyle = '#9fd8ff'; ctx.fillRect(X + 1, Y + 1, 3, 1); ctx.fillRect(X + 1, Y + 1, 1, 3); ctx.fillRect(X + TS - 4, Y + 1, 3, 1); ctx.fillRect(X + TS - 2, Y + 1, 1, 3); }
        if (u.dim) { ctx.fillStyle = 'rgba(10,10,30,0.5)'; ctx.fillRect(X + 2, Y + 2, TS - 4, TS - 4); }
      } else {
        const k = ENEMIES[u.kind];
        ctx.drawImage(shadeSprite(u.kind), X, Y - 1 + (k.immobile ? 0 : bob));
        if (k.boss) lights.push([X + 10, Y + 10, u.kind === 'heartwick' ? '#ffd06a' : '#9a6aff', 22]);
        if (u.kind === 'gilt') lights.push([X + 10, Y + 10, '#ffd06a', 14]);
        if (!k.invuln) for (let p = 0; p < u.maxHp; p++) { ctx.fillStyle = p < u.hp ? '#ff6a7a' : '#3a2a3a'; ctx.fillRect(X + 2 + (p % 8) * 2, Y + TS - 2 - ((p / 8) | 0) * 2, 1, 1); }
        if (u.wet) { ctx.fillStyle = '#7fc8ff'; ctx.fillRect(X + 16, Y + 2, 2, 3); ctx.fillRect(X + 17, Y + 1, 1, 1); }
        if (u.burn) { ctx.fillStyle = clock.t % 10 < 5 ? '#ffb05a' : '#ff6a2a'; ctx.fillRect(X + 2, Y + 2, 2, 3); ctx.fillRect(X + 3, Y + 1, 1, 1); }
        if (u.stun) { ctx.fillStyle = '#fff27a'; ctx.fillRect(X + 8, Y - 2, 4, 1); ctx.fillRect(X + 10, Y - 1, 1, 1); ctx.fillRect(X + 8, Y, 4, 1); }
      }
    }
    // ghosts: where preview moved units from
    if (this.pv) for (const f of this.pvFx) {
      const X = ox + f.x * TS, Y = oy + f.y * TS;
      if (f.k === 'push') { ctx.fillStyle = '#ffd58a'; const mx = ox + (f.x + f.tx!) * TS / 2 + 9, my = oy + (f.y + f.ty!) * TS / 2 + 9; ctx.fillRect(mx, my, 3, 3); }
      if (f.k === 'dmg') { text(ctx, '-' + f.n, X + 12, Y - 2, COL.hi); }
      if (f.k === 'kill' || f.k === 'sink') { ctx.fillStyle = '#ffffff'; ctx.fillRect(X + 4, Y + 4, 12, 1); ctx.fillRect(X + 4, Y + 15, 12, 1); text(ctx, 'X', X + 7, Y + 5, COL.bad); }
      if (f.k === 'douse') text(ctx, 'doused', X - 2, Y + 11, '#7fc8ff');
      if (f.k === 'stun') text(ctx, 'z', X + 14, Y + 1, '#fff27a');
      if (f.k === 'relight') text(ctx, 'lit', X + 6, Y - 2, '#ffd58a');
      if (f.k === 'ignite') { ctx.fillStyle = '#ff9a4a'; ctx.fillRect(X + 16, Y + 12, 2, 3); }
    }
    // glows
    ctx.globalCompositeOperation = 'lighter';
    for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) if (b.t(x, y) === T_BRAZIER && b.lit[b.idx(x, y)]) lights.push([ox + x * TS + 10, oy + y * TS + 6, '#ff9a4a', settings.lowFx ? 16 : 24]);
    for (const [x, y, c, r] of lights) { const g = glow(r, c, 0.55); ctx.drawImage(g, x - r, y - r); }
    for (const f of this.flashes) { ctx.globalAlpha = Math.min(1, f.t / 10); ctx.fillStyle = f.col; ctx.fillRect(ox + f.x * TS + 1, oy + f.y * TS + 1, TS - 2, TS - 2); }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    // cursor
    if (this.phase === 'player' && this.hx >= 0) {
      const X = ox + this.hx * TS, Y = oy + this.hy * TS; ctx.fillStyle = clock.t % 30 < 15 ? '#ffffff' : COL.hi;
      ctx.fillRect(X, Y, 5, 1); ctx.fillRect(X, Y, 1, 5); ctx.fillRect(X + TS - 5, Y, 5, 1); ctx.fillRect(X + TS - 1, Y, 1, 5);
      ctx.fillRect(X, Y + TS - 1, 5, 1); ctx.fillRect(X, Y + TS - 5, 1, 5); ctx.fillRect(X + TS - 5, Y + TS - 1, 5, 1); ctx.fillRect(X + TS - 1, Y + TS - 5, 1, 5);
    }
    for (const f of this.floaters) { const a = Math.min(1, (50 - f.t) / 15); ctx.globalAlpha = a; textC(ctx, f.s, f.x, f.y - 8 - (f.t >> 2), f.col); ctx.globalAlpha = 1; }

    this.renderPanels(ctx);
    if (this.phase === 'intro') this.renderIntro(ctx);
    if (this.phase === 'enemy') { panel(ctx, this.ox + b.w * TS / 2 - 44, 2, 88, 14, '#ff7a7a'); textC(ctx, 'The dark moves...', this.ox + b.w * TS / 2, 3, '#ffb0b0'); }
    if (this.phase === 'end') this.renderEnd(ctx);
  }

  renderPanels(ctx: Ctx) {
    const b = this.b;
    // title
    if (this.phase !== 'enemy') textC(ctx, this.def.title, LEFT_W + (RIGHT_X - LEFT_W) / 2, 3, COL.hi);
    // left: roster
    panel(ctx, 0, 0, LEFT_W, H);
    text(ctx, 'Your lantern', 6, 4, COL.dim);
    const al = b.allies();
    al.forEach((u, i) => {
      const y = 18 + i * 23, hot = u === this.sel;
      if (hot || this.hoverBtn === 100 + i) { ctx.fillStyle = COL.sel; ctx.fillRect(3, y, LEFT_W - 6, 22); }
      if (u.kind === 'courier') { ctx.drawImage(charSprite('player', 0, 0), 5, y + 3); text(ctx, 'Wren', 25, y + 2, hot ? COL.hi : COL.text); }
      else { const w = WICKS[u.kind]; ctx.drawImage(monIcon(w.art), 3, y + 1); text(ctx, w.name, 25, y + 2, hot ? COL.hi : w.color); }
      const st = u.acted ? 'done' : u.dim ? 'flicker' : u.moved ? 'moved' : 'ready';
      text(ctx, st, 25, y + 11, u.acted ? COL.dim : u.dim ? COL.bad : u.moved ? '#9fd8ff' : COL.good);
    });
    // abilities of selected
    const u = this.sel;
    text(ctx, u ? 'Lights' : 'Select a unit', 6, 104, COL.dim);
    if (u) for (let i = 0; i < 3; i++) {
      const ab = this.ability(u, i); if (!ab) continue;
      const y = 114 + i * 22;
      const why = this.b.canUse(u, ab, this.bondFor(u), i);
      const locked = u.kind !== 'courier' && i + 1 > this.bondFor(u);
      const hot = this.abil === i || this.hoverBtn === i;
      panel(ctx, 2, y, LEFT_W - 4, 21, this.abil === i ? COL.hi : hot ? COL.edge : COL.edgeDim, this.abil === i ? COL.sel : COL.bg);
      text(ctx, `${i + 1}`, 6, y + 2, COL.dim);
      text(ctx, locked ? 'Locked' : ab.name, 14, y + 2, why ? COL.dim : ELEM_COLOR[ab.elem]);
      textR(ctx, ab.flask ? 'x' + this.b.flasks : ab.cost + ' oil', LEFT_W - 6, y + 2, why ? COL.dim : '#ffd58a');
      text(ctx, locked ? `bond ${i + 1}` : ab.shape === 'swap' ? 'swap' : ab.shape, 14, y + 11, COL.dim);
    }
    // right
    panel(ctx, RIGHT_X, 0, W - RIGHT_X, H);
    wrap(b.objectiveText(), W - RIGHT_X - 10).slice(0, 2).forEach((l, i) => text(ctx, l, RIGHT_X + 5, 4 + i * 10, COL.hi));
    text(ctx, `Turn ${b.turn}`, RIGHT_X + 5, 25, COL.dim);
    const oil = (this.pv || b).oil;
    text(ctx, 'Oil', RIGHT_X + 5, 37, '#ffd58a'); textR(ctx, `${oil}/${b.oilMax}`, W - 6, 37, oil <= 4 ? COL.bad : COL.text);
    bar(ctx, RIGHT_X + 6, 49, W - RIGHT_X - 12, 4, oil / b.oilMax, oil <= 4 ? '#ff5a4a' : '#ffb84a');
    if (this.pv && this.pv.oil !== b.oil) { ctx.fillStyle = 'rgba(255,255,255,0.4)'; const w = W - RIGHT_X - 12; ctx.fillRect(RIGHT_X + 6 + Math.ceil(w * oil / b.oilMax), 49, Math.max(1, Math.ceil(w * (b.oil - oil) / b.oilMax)), 4); }
    // info
    if (this.infoTitle) text(ctx, this.infoTitle, RIGHT_X + 5, 59, this.infoCol);
    this.info.slice(0, 11).forEach((l, i) => text(ctx, l, RIGHT_X + 5, 70 + i * 10, COL.text));
    // buttons
    const btn = (lbl: string, x: number, y: number, w: number, id: number) => { const hot = this.hoverBtn === id; panel(ctx, x, y, w, 16, hot ? COL.hi : COL.edgeDim, hot ? COL.sel : COL.bg); textC(ctx, lbl, x + w / 2, y + 3, hot ? COL.hi : COL.text); };
    btn('End Turn [F]', RIGHT_X + 4, H - 40, W - RIGHT_X - 8, 50);
    btn('Undo [Z]', RIGHT_X + 4, H - 22, 42, 51);
    btn('Guide [T]', RIGHT_X + 50, H - 22, W - RIGHT_X - 54, 52);
  }

  renderIntro(ctx: Ctx) {
    const cx = LEFT_W + (RIGHT_X - LEFT_W) / 2;
    const pg = this.pages(); const msg = pg[Math.min(this.tipI, pg.length - 1)] || '';
    const lines = wrap(msg, 176);
    const h = 30 + lines.length * 11;
    panel(ctx, cx - 96, 80 - h / 2, 192, h, COL.hi);
    textC(ctx, this.tipI === 0 ? this.def.title : `How light works (${this.tipI}/${pg.length - 1})`, cx, 80 - h / 2 + 5, COL.hi);
    lines.forEach((l, i) => text(ctx, l, cx - 88, 80 - h / 2 + 18 + i * 11, COL.text));
    textC(ctx, '[E / click]', cx, 80 + h / 2 + 3, COL.dim);
  }
  renderEnd(ctx: Ctx) {
    const cx = LEFT_W + (RIGHT_X - LEFT_W) / 2;
    const win = this.b.result === 'win';
    panel(ctx, cx - 90, 70, 180, 54, win ? COL.hi : COL.bad);
    textC(ctx, win ? 'THE LIGHT HOLDS' : 'YOUR LANTERN GUTTERS', cx, 78, win ? COL.hi : COL.bad);
    textC(ctx, win ? 'The shades sink back into the dark.' : 'You\'ll wake at the last shrine.', cx, 92, COL.text);
    if (this.endT > 40) textC(ctx, '[E / click] continue', cx, 108, COL.dim);
  }
}

// Courier abilities are referenced so tree-shaking keeps the shared list.
void COURIER_ABILITIES; void measure;
