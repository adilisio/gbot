// Light-and-dark grid tactics: pure rules (no rendering). Small arrays, cloneable for previews.
import { Ability, WICKS, COURIER_ABILITIES, Elem } from '../data/wicks';

export const T_FLOOR = 0, T_WALL = 1, T_WATER = 2, T_BRAZIER = 3, T_EXIT = 4;
export const DIRS: [number, number][] = [[0, 1], [0, -1], [-1, 0], [1, 0]]; // down, up, left, right

export interface EnemyKind {
  id: string; name: string; hp: number; mv: number; dmg: number;
  pattern: [number, number][]; // [forward, side] offsets, rotated by facing
  fly?: boolean; swim?: boolean; wet?: boolean; immobile?: boolean; invuln?: boolean; boss?: boolean;
  prefers?: 'wick' | 'brazier' | 'courier'; spawner?: string; art?: string; desc: string;
}

export const ENEMIES: Record<string, EnemyKind> = {
  shade: { id: 'shade', name: 'Shade', hp: 2, mv: 2, dmg: 2, pattern: [[1, 0]], desc: 'A scrap of living dark. Claws the tile in front of it. Sinks if pushed into water.' },
  moth: { id: 'moth', name: 'Gloom Moth', hp: 1, mv: 3, dmg: 1, pattern: [[1, 0]], fly: true, prefers: 'wick', desc: 'Flies over water, drawn to glimmers. Fragile.' },
  drowned: { id: 'drowned', name: 'Drowned', hp: 3, mv: 1, dmg: 2, pattern: [[1, 0], [2, 0]], swim: true, wet: true, desc: 'A sodden thing from Port Calloway. Always wet: fire is doused on it, Static jumps through it. Swims.' },
  snuffer: { id: 'snuffer', name: 'Snuffer', hp: 2, mv: 2, dmg: 1, pattern: [[1, 0]], prefers: 'brazier', desc: 'Hunts flames. Puts out lit braziers and goes for the courier carrying the parcel.' },
  bell: { id: 'bell', name: 'Bellshade', hp: 4, mv: 1, dmg: 3, pattern: [[1, -1], [1, 0], [1, 1]], desc: 'A heavy, tolling shade. Sweeps three tiles in front of it.' },
  gilt: { id: 'gilt', name: 'Binding Lantern', hp: 3, mv: 0, dmg: 0, pattern: [], immobile: true, spawner: 'shade', desc: 'A Guild lantern strung with gold thread. It pulls a shade out of the dark beside it every turn.' },
  warden: { id: 'warden', name: 'Belfry Warden', hp: 9, mv: 1, dmg: 2, pattern: [[2, 0], [1, -1], [1, 1], [0, -2], [0, 2], [-1, -1], [-1, 1], [-2, 0]], boss: true, art: 'belfrywarden', desc: 'The drowned bell itself. Its toll rings in a diamond two tiles out.' },
  aurelion: { id: 'aurelion', name: 'Aurelion', hp: 10, mv: 2, dmg: 3, pattern: [[1, 0], [2, 0], [1, -1], [1, 1]], boss: true, art: 'aurelion', desc: 'Calder\'s gilded guardian. Strikes in a heavy T. Can\'t be soaked.' },
  hushmother: { id: 'hushmother', name: 'The Hush Mother', hp: 12, mv: 0, dmg: 3, pattern: [[1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0]], immobile: true, boss: true, wet: true, spawner: 'drowned', art: 'hushmother', desc: 'The lake, risen. Her wave runs the full length of a row or column. Always wet.' },
  heartwick: { id: 'heartwick', name: 'The Heartwick', hp: 99, mv: 0, dmg: 2, pattern: [], immobile: true, invuln: true, boss: true, art: 'heartwick', desc: 'The great lantern, panicking. It can\'t be hurt - only calmed. Its flares land on marked tiles.' },
};

export interface Intent { dir: number; abs?: [number, number][]; dmg: number; }
export interface Unit {
  uid: number; side: 0 | 1; kind: string; x: number; y: number;
  hp: number; maxHp: number; mv: number; fly: boolean; swim: boolean;
  moved: boolean; acted: boolean; dim: boolean; shield: boolean;
  wet: boolean; burn: number; stun: boolean; intent: Intent | null; dead: boolean;
  // animation (render only)
  ax: number; ay: number; at: number;
}
export interface Spawn { x: number; y: number; kind: string; }
export type Fx = { k: string; x: number; y: number; n?: number; tx?: number; ty?: number; uid?: number; };

export type Objective = { k: 'survive'; turns: number } | { k: 'escort' } | { k: 'braziers' } | { k: 'rout' };

export interface EncounterDef {
  id: string; title: string; theme: string; objective: Objective;
  map: string[];               // . floor  # wall  ~ water  b brazier  B lit brazier  E exit  C courier  1-3 wicks  enemy letters
  creep: number; spawnEvery: number; spawnCount: number; spawnKinds: string[]; spawnUntil?: number;
  darkDepth?: number; intro?: string; tip?: string; reward?: { glints?: number; flask?: number };
  music?: string; boss?: boolean;
}
const LETTER: Record<string, string> = { s: 'shade', m: 'moth', d: 'drowned', n: 'snuffer', r: 'bell', g: 'gilt', W: 'warden', A: 'aurelion', M: 'hushmother', H: 'heartwick' };

export class Board {
  w = 0; h = 0;
  terr!: Uint8Array; lit!: Uint8Array; dark!: Uint8Array; creep!: Uint8Array; moss!: Uint8Array; ward!: Uint8Array;
  units: Unit[] = []; spawns: Spawn[] = [];
  oil = 0; oilMax = 0; turn = 1; flasks = 0;
  used: string[] = []; // once-per-fight abilities used ("uid:ability")
  result: 'none' | 'win' | 'lose' = 'none';
  rng = 1;
  def!: EncounterDef;
  exitX = -1; exitY = -1;

  static create(def: EncounterDef, wicks: string[], oil: number, oilMax: number, flasks: number, seed = 7): Board {
    const b = new Board();
    b.def = def; b.rng = seed;
    b.h = def.map.length; b.w = def.map[0].length;
    const n = b.w * b.h;
    b.terr = new Uint8Array(n); b.lit = new Uint8Array(n); b.dark = new Uint8Array(n); b.creep = new Uint8Array(n); b.moss = new Uint8Array(n); b.ward = new Uint8Array(n);
    b.oil = oil; b.oilMax = oilMax; b.flasks = flasks;
    let uid = 1;
    const starts: [number, number][] = [];
    for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) {
      const c = def.map[y][x] || '.'; const i = y * b.w + x;
      if (c === '#') b.terr[i] = T_WALL;
      else if (c === '~') b.terr[i] = T_WATER;
      else if (c === 'b' || c === 'B') { b.terr[i] = T_BRAZIER; b.lit[i] = c === 'B' ? 1 : 0; }
      else if (c === 'E') { b.terr[i] = T_EXIT; b.exitX = x; b.exitY = y; }
      if (c === 'C') b.units.push(b.mkAlly(uid++, 'courier', x, y));
      else if (c >= '1' && c <= '3') starts[+c - 1] = [x, y];
      else if (LETTER[c]) b.units.push(b.mkEnemy(uid++, LETTER[c], x, y));
    }
    wicks.forEach((id, k) => { const s = starts[k]; if (s) b.units.push(b.mkAlly(uid++, id, s[0], s[1])); });
    // Initial darkness: the board edges, `darkDepth` deep.
    const dd = def.darkDepth ?? 1;
    for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) {
      const e = Math.min(x, y, b.w - 1 - x, b.h - 1 - y);
      if (e < dd && b.terr[y * b.w + x] !== T_WALL && !b.unitAt(x, y, 0)) b.dark[y * b.w + x] = 1;
    }
    b.protectLight();
    b.plan();
    return b;
  }

  mkAlly(uid: number, kind: string, x: number, y: number): Unit {
    const wk = WICKS[kind];
    return { uid, side: 0, kind, x, y, hp: 1, maxHp: 1, mv: kind === 'courier' ? 3 : wk.mv, fly: !!wk?.fly, swim: !!wk?.swim,
      moved: false, acted: false, dim: false, shield: false, wet: false, burn: 0, stun: false, intent: null, dead: false, ax: x, ay: y, at: 1 };
  }
  mkEnemy(uid: number, kind: string, x: number, y: number): Unit {
    const k = ENEMIES[kind];
    return { uid, side: 1, kind, x, y, hp: k.hp, maxHp: k.hp, mv: k.mv, fly: !!k.fly, swim: !!k.swim,
      moved: false, acted: false, dim: false, shield: false, wet: !!k.wet, burn: 0, stun: false, intent: null, dead: false, ax: x, ay: y, at: 1 };
  }

  clone(): Board {
    const b = new Board();
    b.w = this.w; b.h = this.h; b.def = this.def;
    b.terr = this.terr; // terrain never changes
    b.lit = this.lit.slice(); b.dark = this.dark.slice(); b.creep = this.creep.slice(); b.moss = this.moss.slice(); b.ward = this.ward.slice();
    b.units = this.units.map((u) => ({ ...u, intent: u.intent ? { ...u.intent } : null }));
    b.spawns = this.spawns.map((s) => ({ ...s }));
    b.oil = this.oil; b.oilMax = this.oilMax; b.turn = this.turn; b.flasks = this.flasks; b.used = this.used.slice(); b.result = this.result; b.rng = this.rng;
    b.exitX = this.exitX; b.exitY = this.exitY;
    return b;
  }

  rand() { this.rng = (this.rng * 1103515245 + 12345) & 0x7fffffff; return this.rng / 0x7fffffff; }
  in(x: number, y: number) { return x >= 0 && y >= 0 && x < this.w && y < this.h; }
  idx(x: number, y: number) { return y * this.w + x; }
  t(x: number, y: number) { return this.in(x, y) ? this.terr[y * this.w + x] : T_WALL; }
  unitAt(x: number, y: number, side?: number): Unit | null {
    for (const u of this.units) if (!u.dead && u.x === x && u.y === y && (side === undefined || u.side === side)) return u;
    return null;
  }
  get courier() { return this.units.find((u) => u.kind === 'courier')!; }
  allies() { return this.units.filter((u) => u.side === 0 && !u.dead); }
  foes() { return this.units.filter((u) => u.side === 1 && !u.dead); }
  braziers() { const r: number[] = []; for (let i = 0; i < this.terr.length; i++) if (this.terr[i] === T_BRAZIER) r.push(i); return r; }
  /** Lit braziers keep the tiles around them light; moss is never dark. */
  protectLight() {
    for (let i = 0; i < this.terr.length; i++) {
      if (this.moss[i]) { this.dark[i] = 0; this.creep[i] = 0; }
      if (this.terr[i] === T_BRAZIER && this.lit[i]) {
        const x = i % this.w, y = (i / this.w) | 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (this.in(x + dx, y + dy)) { const j = this.idx(x + dx, y + dy); this.dark[j] = 0; this.creep[j] = 0; }
      }
    }
  }

  passable(u: Unit, x: number, y: number) {
    if (!this.in(x, y)) return false;
    const t = this.t(x, y);
    if (t === T_WALL || t === T_BRAZIER) return false;
    if (t === T_WATER && !u.fly && !u.swim) return false;
    if (this.ward[this.idx(x, y)]) return false;
    return true;
  }
  /** Tiles reachable this turn (BFS). Returns map idx->dist. */
  reach(u: Unit, range?: number): Map<number, number> {
    const mv = range ?? (u.side === 1 && u.wet && !u.swim ? Math.max(1, u.mv - 1) : u.mv);
    const out = new Map<number, number>();
    const q: number[] = [this.idx(u.x, u.y)]; out.set(q[0], 0);
    for (let qi = 0; qi < q.length; qi++) {
      const c = q[qi]; const d = out.get(c)!; if (d >= mv) continue;
      const cx = c % this.w, cy = (c / this.w) | 0;
      for (const [dx, dy] of DIRS) {
        const nx = cx + dx, ny = cy + dy;
        if (!this.passable(u, nx, ny)) continue;
        const o = this.unitAt(nx, ny);
        if (o && o.side !== u.side) continue; // can pass through friends, not foes
        const ni = this.idx(nx, ny);
        if (out.has(ni)) continue;
        out.set(ni, d + 1); q.push(ni);
      }
    }
    // Can't end on an occupied tile
    for (const k of [...out.keys()]) { const x = k % this.w, y = (k / this.w) | 0; const o = this.unitAt(x, y); if (o && o !== u) out.delete(k); }
    return out;
  }

  // ---------------- abilities ----------------
  abilitiesOf(u: Unit): Ability[] {
    if (u.kind === 'courier') return COURIER_ABILITIES;
    return WICKS[u.kind].abilities;
  }
  canUse(u: Unit, ab: Ability, bond: number, slot: number): string | null {
    if (u.kind !== 'courier' && slot + 1 > bond) return `Unlocks at bond ${slot + 1}`;
    if (u.acted) return 'Already acted';
    if (u.dim) return 'Flickering (was hit)';
    if (ab.once && this.used.includes(u.uid + ':' + ab.id)) return 'Used this fight';
    if (ab.flask && this.flasks <= 0) return 'No flasks';
    if (ab.cost > this.oil) return 'Not enough oil';
    return null;
  }
  /** Is this an aim that needs a direction (cone/line/ring use dir; lob/cross need a tile). */
  static needsTile(ab: Ability) { return ab.shape === 'lob' || ab.shape === 'cross' || ab.shape === 'swap' || ab.shape === 'ally'; }
  static needsDir(ab: Ability) { return ab.shape === 'cone' || ab.shape === 'line'; }

  /** Valid target tiles for tile-aimed abilities. */
  targets(u: Unit, ab: Ability): number[] {
    const r: number[] = [];
    const R = ab.range ?? 1;
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      const d = Math.abs(x - u.x) + Math.abs(y - u.y);
      if (d < 1 || d > R) continue;
      const t = this.t(x, y);
      const o = this.unitAt(x, y);
      if (ab.shape === 'swap') { if (o && !o.dead && !ENEMIES[o.kind]?.immobile) r.push(this.idx(x, y)); continue; }
      if (ab.shape === 'ally') { if (o && o.side === 0 && o !== u) r.push(this.idx(x, y)); continue; }
      if (ab.brazierOnly) { if (t === T_BRAZIER && !this.lit[this.idx(x, y)]) r.push(this.idx(x, y)); continue; }
      if (ab.foeOnly) { if (o && o.side === 1) r.push(this.idx(x, y)); continue; }
      if (ab.emptyOnly) { if ((t === T_FLOOR || t === T_EXIT) && !o && !this.ward[this.idx(x, y)]) r.push(this.idx(x, y)); continue; }
      if (t === T_WALL) continue;
      r.push(this.idx(x, y));
    }
    return r;
  }

  /** Tiles affected + push direction per tile. */
  area(u: Unit, ab: Ability, dir: number, tx: number, ty: number): { x: number; y: number; pd: [number, number] }[] {
    const out: { x: number; y: number; pd: [number, number] }[] = [];
    const add = (x: number, y: number, pd: [number, number]) => { if (this.in(x, y)) out.push({ x, y, pd }); };
    const [fx, fy] = DIRS[dir] || [0, 1]; const sx = -fy, sy = fx;
    switch (ab.shape) {
      case 'cone':
        add(u.x + fx, u.y + fy, [fx, fy]);
        for (const s of [-1, 0, 1]) add(u.x + 2 * fx + s * sx, u.y + 2 * fy + s * sy, [fx, fy]);
        break;
      case 'ring':
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (dx || dy) add(u.x + dx, u.y + dy, [dx, dy]);
        if (ab.shield) add(u.x, u.y, [0, 0]);
        break;
      case 'line': {
        const R = ab.range ?? 4;
        for (let i = 1; i <= R; i++) {
          const x = u.x + fx * i, y = u.y + fy * i;
          if (!this.in(x, y) || this.t(x, y) === T_WALL) break;
          add(x, y, [fx, fy]);
          const o = this.unitAt(x, y, 1);
          if (!ab.pierce && (o || this.t(x, y) === T_BRAZIER || this.ward[this.idx(x, y)])) break;
        }
        break;
      }
      case 'lob': case 'swap': case 'ally': {
        const dx = tx - u.x, dy = ty - u.y;
        const pd: [number, number] = Math.abs(dx) >= Math.abs(dy) ? [Math.sign(dx), 0] : [0, Math.sign(dy)];
        add(tx, ty, pd); break;
      }
      case 'cross':
        add(tx, ty, [0, 0]);
        for (const [dx, dy] of DIRS) add(tx + dx, ty + dy, [dx, dy]);
        break;
      case 'self': add(u.x, u.y, [0, 0]); break;
    }
    return out;
  }

  /** Apply an ability. Mutates the board, returns effects for animation / preview. */
  cast(u: Unit, ab: Ability, dir: number, tx: number, ty: number): Fx[] {
    const fx: Fx[] = [];
    this.oil -= ab.cost;
    if (ab.cost) fx.push({ k: 'oil', x: u.x, y: u.y, n: -ab.cost });
    if (ab.once) this.used.push(u.uid + ':' + ab.id);
    u.acted = true; u.moved = true;
    if (ab.flask) { this.flasks--; const n = 6; this.oil = Math.min(this.oilMax, this.oil + n); fx.push({ k: 'oil', x: u.x, y: u.y, n }); fx.push({ k: 'flask', x: u.x, y: u.y }); return fx; }
    if (ab.oil) { this.oil = Math.min(this.oilMax, this.oil + ab.oil); fx.push({ k: 'oil', x: u.x, y: u.y, n: ab.oil }); }
    if (ab.allStun) { for (const e of this.foes()) { e.stun = true; fx.push({ k: 'stun', x: e.x, y: e.y, uid: e.uid }); } return fx; }
    if (ab.shape === 'swap') {
      const o = this.unitAt(tx, ty); if (!o) return fx;
      const ox = o.x, oy = o.y; o.x = u.x; o.y = u.y; u.x = ox; u.y = oy;
      o.ax = ox; o.ay = oy; o.at = 0; u.ax = o.x; u.ay = o.y; u.at = 0;
      fx.push({ k: 'swap', x: u.x, y: u.y, tx: o.x, ty: o.y });
      this.afterMoveChecks(o, fx); this.afterMoveChecks(u, fx);
      return fx;
    }
    if (ab.shape === 'ally') {
      const o = this.unitAt(tx, ty, 0); if (!o) return fx;
      if (ab.reMove) { o.moved = false; fx.push({ k: 'remove', x: o.x, y: o.y }); }
      if (ab.reAct) { o.acted = false; o.moved = true; fx.push({ k: 'react', x: o.x, y: o.y }); }
      return fx;
    }
    const tiles = this.area(u, ab, dir, tx, ty);
    const hitFoes: Unit[] = [];
    for (const t of tiles) {
      const i = this.idx(t.x, t.y);
      fx.push({ k: 'light', x: t.x, y: t.y });
      if (ab.elem !== 'plain' && this.dark[i]) { this.dark[i] = 0; this.creep[i] = 0; fx.push({ k: 'clear', x: t.x, y: t.y }); }
      if (this.creep[i] && ab.elem !== 'plain') this.creep[i] = 0;
      if (this.t(t.x, t.y) === T_BRAZIER && (ab.relight) && !this.lit[i]) { this.lit[i] = 1; fx.push({ k: 'relight', x: t.x, y: t.y }); }
      if (ab.moss && (this.t(t.x, t.y) === T_FLOOR || this.t(t.x, t.y) === T_EXIT)) { this.moss[i] = 1; fx.push({ k: 'moss', x: t.x, y: t.y }); }
      if (ab.ward && !this.unitAt(t.x, t.y) && this.t(t.x, t.y) !== T_WATER) { this.ward[i] = 2; this.dark[i] = 0; fx.push({ k: 'ward', x: t.x, y: t.y }); }
      const o = this.unitAt(t.x, t.y);
      if (!o) continue;
      if (o.side === 0) { if (ab.shield) { o.shield = true; fx.push({ k: 'shield', x: o.x, y: o.y }); } continue; }
      hitFoes.push(o);
      this.hitFoe(o, ab, t.pd, fx);
    }
    if (ab.spawnCancel) {
      const keep: Spawn[] = [];
      for (const s of this.spawns) { if (Math.abs(s.x - u.x) <= 2 && Math.abs(s.y - u.y) <= 2) fx.push({ k: 'unspawn', x: s.x, y: s.y }); else keep.push(s); }
      this.spawns = keep;
    }
    this.protectLight();
    this.checkResult();
    return fx;
  }

  private hitFoe(o: Unit, ab: Ability, pd: [number, number], fx: Fx[]) {
    const kind = ENEMIES[o.kind];
    const doused = ab.elem === 'ember' && o.wet;
    if (doused) fx.push({ k: 'douse', x: o.x, y: o.y });
    if (ab.wet && !kind.invuln) {
      if (o.burn) fx.push({ k: 'quench', x: o.x, y: o.y });
      if (o.kind !== 'aurelion') { o.wet = true; o.burn = 0; fx.push({ k: 'wet', x: o.x, y: o.y }); }
    }
    if (ab.dmg && !doused) {
      this.hurt(o, ab.dmg, fx);
      if (ab.chain && o.wet) this.chain(o, ab.dmg, fx);
    }
    if (ab.ignite && !doused && !o.dead && !kind.invuln) { o.burn = 2; fx.push({ k: 'ignite', x: o.x, y: o.y }); }
    if (ab.stun && !o.dead) { if (o.intent || ENEMIES[o.kind].spawner) { o.stun = true; fx.push({ k: 'stun', x: o.x, y: o.y, uid: o.uid }); } }
    if (ab.fan && o.burn && !o.dead) {
      fx.push({ k: 'fan', x: o.x, y: o.y });
      this.hurt(o, 1, fx);
      for (const n of this.foes()) if (n !== o && Math.abs(n.x - o.x) <= 1 && Math.abs(n.y - o.y) <= 1 && !n.wet && !ENEMIES[n.kind].invuln) { n.burn = 2; fx.push({ k: 'ignite', x: n.x, y: n.y }); }
    }
    if (ab.push && !o.dead && (pd[0] || pd[1])) this.push(o, pd, ab.push, fx);
  }

  private chain(from: Unit, dmg: number, fx: Fx[]) {
    const seen = new Set<number>([from.uid]); const q = [from];
    while (q.length) {
      const c = q.shift()!;
      for (const n of this.foes()) {
        if (seen.has(n.uid) || !n.wet || Math.abs(n.x - c.x) + Math.abs(n.y - c.y) !== 1) continue;
        seen.add(n.uid); fx.push({ k: 'zap', x: c.x, y: c.y, tx: n.x, ty: n.y });
        this.hurt(n, dmg, fx); if (!n.dead) q.push(n);
      }
    }
  }

  hurt(o: Unit, n: number, fx: Fx[]) {
    if (o.dead) return;
    if (ENEMIES[o.kind]?.invuln) { fx.push({ k: 'immune', x: o.x, y: o.y }); return; }
    o.hp -= n; fx.push({ k: 'dmg', x: o.x, y: o.y, n, uid: o.uid });
    if (o.hp <= 0) { o.dead = true; o.intent = null; fx.push({ k: 'kill', x: o.x, y: o.y, uid: o.uid }); }
  }

  push(o: Unit, pd: [number, number], n: number, fx: Fx[]) {
    if (ENEMIES[o.kind]?.immobile) { fx.push({ k: 'anchored', x: o.x, y: o.y }); return; }
    for (let s = 0; s < n; s++) {
      const nx = o.x + pd[0], ny = o.y + pd[1];
      if (!this.in(nx, ny)) { fx.push({ k: 'bump', x: o.x, y: o.y }); this.hurt(o, 1, fx); return; }
      const t = this.t(nx, ny), i = this.idx(nx, ny);
      if (t === T_WALL || t === T_BRAZIER || this.ward[i]) {
        fx.push({ k: 'bump', x: o.x, y: o.y, tx: nx, ty: ny }); this.hurt(o, 1, fx);
        if (this.ward[i]) { this.ward[i]--; if (!this.ward[i]) fx.push({ k: 'wardbreak', x: nx, y: ny }); }
        if (t === T_BRAZIER && this.lit[i] && !o.wet && !o.dead) { o.burn = 2; fx.push({ k: 'ignite', x: o.x, y: o.y }); }
        return;
      }
      const other = this.unitAt(nx, ny);
      if (other) {
        fx.push({ k: 'bump', x: o.x, y: o.y, tx: nx, ty: ny }); this.hurt(o, 1, fx);
        if (other.side === 1) { this.hurt(other, 1, fx); if (o.burn && !other.wet && !other.dead) { other.burn = 2; fx.push({ k: 'ignite', x: other.x, y: other.y }); } }
        else { this.loseOil(other, 1, fx); }
        return;
      }
      fx.push({ k: 'push', x: o.x, y: o.y, tx: nx, ty: ny, uid: o.uid });
      o.ax = o.x; o.ay = o.y; o.at = 0; o.x = nx; o.y = ny;
      if (t === T_WATER && !o.fly && !o.swim) { o.dead = true; o.intent = null; fx.push({ k: 'sink', x: nx, y: ny, uid: o.uid }); return; }
    }
  }

  afterMoveChecks(u: Unit, fx: Fx[]) {
    if (u.side === 1 && this.t(u.x, u.y) === T_WATER && !u.fly && !u.swim) { u.dead = true; u.intent = null; fx.push({ k: 'sink', x: u.x, y: u.y, uid: u.uid }); }
    if (u.side === 0 && this.t(u.x, u.y) === T_WATER && !u.fly && !u.swim) { /* allies never end in water via swap: bounce */ }
  }

  loseOil(a: Unit, n: number, fx: Fx[]) {
    if (a.shield) { a.shield = false; fx.push({ k: 'block', x: a.x, y: a.y }); return; }
    this.oil = Math.max(0, this.oil - n); fx.push({ k: 'oil', x: a.x, y: a.y, n: -n }); fx.push({ k: 'hit', x: a.x, y: a.y, uid: a.uid });
    if (a.kind !== 'courier') a.dim = true;
  }

  moveUnit(u: Unit, x: number, y: number) {
    u.ax = u.x; u.ay = u.y; u.at = 0; u.x = x; u.y = y; u.moved = true;
    this.checkResult();
  }

  checkResult() {
    if (this.result !== 'none') return;
    if (this.oil <= 0) { this.result = 'lose'; return; }
    const o = this.def.objective;
    if (o.k === 'escort' && this.courier.x === this.exitX && this.courier.y === this.exitY) this.result = 'win';
    if (o.k === 'braziers' && this.braziers().every((i) => this.lit[i])) this.result = 'win';
    if (o.k === 'rout' && this.foes().filter((f) => !ENEMIES[f.kind].invuln).length === 0) this.result = 'win';
  }

  // ---------------- enemy phase ----------------
  /** Each step is applied one at a time by the scene so it can animate. */
  enemySteps(): (() => Fx[])[] {
    const steps: (() => Fx[])[] = [];
    steps.push(() => { // burning
      const fx: Fx[] = [];
      this.clearDim();
      for (const e of this.foes()) if (e.burn > 0) { e.burn--; fx.push({ k: 'burn', x: e.x, y: e.y }); this.hurt(e, 1, fx); }
      this.checkResult(); return fx;
    });
    for (const e of this.foes()) {
      steps.push(() => {
        const fx: Fx[] = [];
        if (e.dead) return fx;
        if (e.stun) { fx.push({ k: 'fizzle', x: e.x, y: e.y }); return fx; }
        if (e.intent) this.attack(e, fx);
        this.checkResult(); return fx;
      });
    }
    steps.push(() => { // rising shades
      const fx: Fx[] = []; const keep: Spawn[] = [];
      let uid = Math.max(0, ...this.units.map((u) => u.uid)) + 1;
      for (const s of this.spawns) {
        if (s.x < 0) continue;
        const o = this.unitAt(s.x, s.y);
        if (o && o.side === 0) { fx.push({ k: 'blockspawn', x: s.x, y: s.y }); this.loseOil(o, 1, fx); continue; }
        if (o || this.ward[this.idx(s.x, s.y)]) { fx.push({ k: 'unspawn', x: s.x, y: s.y }); continue; }
        const u = this.mkEnemy(uid++, s.kind, s.x, s.y); u.at = 1; this.units.push(u);
        fx.push({ k: 'spawn', x: s.x, y: s.y, uid: u.uid });
      }
      this.spawns = keep;
      this.checkResult(); return fx;
    });
    steps.push(() => { // darkness creeps; the dark gnaws at anyone standing in it
      const fx: Fx[] = [];
      for (let i = 0; i < this.creep.length; i++) if (this.creep[i]) { this.creep[i] = 0; if (!this.moss[i]) { this.dark[i] = 1; fx.push({ k: 'creep', x: i % this.w, y: (i / this.w) | 0 }); } }
      this.protectLight();
      for (const a of this.allies()) if (this.dark[this.idx(a.x, a.y)]) { fx.push({ k: 'gnaw', x: a.x, y: a.y }); this.loseOil(a, 1, fx); }
      this.checkResult(); return fx;
    });
    steps.push(() => { // end of round
      const fx: Fx[] = [];
      const o = this.def.objective;
      if (this.result === 'none' && o.k === 'survive' && this.turn >= o.turns) this.result = 'win';
      if (this.result === 'none') {
        this.turn++;
        for (const a of this.allies()) { a.moved = false; a.acted = false; }
        this.plan();
      }
      return fx;
    });
    return steps;
  }

  /** Wicks hit last round flicker for one player turn. */
  clearDim() { for (const a of this.allies()) a.dim = false; }

  intentTiles(e: Unit): [number, number][] {
    if (!e.intent) return [];
    if (e.intent.abs) return e.intent.abs;
    const k = ENEMIES[e.kind];
    const [fx, fy] = DIRS[e.intent.dir]; const sx = -fy, sy = fx;
    const out: [number, number][] = [];
    for (const [f, s] of k.pattern) {
      const x = e.x + f * fx + s * sx, y = e.y + f * fy + s * sy;
      if (this.in(x, y)) out.push([x, y]);
    }
    return out;
  }

  attack(e: Unit, fx: Fx[]) {
    const tiles = this.intentTiles(e);
    const dmg = e.intent!.dmg;
    fx.push({ k: 'strike', x: e.x, y: e.y, uid: e.uid });
    for (const [x, y] of tiles) {
      const i = this.idx(x, y);
      fx.push({ k: 'slash', x, y });
      const o = this.unitAt(x, y);
      if (o && o !== e) {
        if (o.side === 0) this.loseOil(o, dmg, fx);
        else this.hurt(o, 1, fx);
      }
      if (this.ward[i]) { this.ward[i]--; fx.push({ k: this.ward[i] ? 'wardhit' : 'wardbreak', x, y }); }
      if (this.t(x, y) === T_BRAZIER && this.lit[i]) { this.lit[i] = 0; fx.push({ k: 'snuff', x, y }); }
    }
  }

  /** Enemies move and choose their next attack; new shades and creeping dark are marked. */
  plan() {
    const allies = this.allies();
    for (const e of this.foes()) {
      e.stun = false;
      const k = ENEMIES[e.kind];
      if (e.kind === 'heartwick') { e.intent = this.planHeart(); continue; }
      if (!k.pattern.length) { e.intent = null; continue; }
      const opts = k.immobile ? new Map([[this.idx(e.x, e.y), 0]]) : this.reach(e);
      let best = -1e9, bx = e.x, by = e.y, bd = -1;
      for (const [ti] of opts) {
        const x = ti % this.w, y = (ti / this.w) | 0;
        let near = 99;
        for (const a of allies) near = Math.min(near, Math.abs(a.x - x) + Math.abs(a.y - y));
        if (k.prefers === 'brazier') for (const bi of this.braziers()) if (this.lit[bi]) near = Math.min(near, Math.abs((bi % this.w) - x) + Math.abs(((bi / this.w) | 0) - y));
        for (let d = 0; d < 4; d++) {
          const [fx, fy] = DIRS[d]; const sx = -fy, sy = fx;
          let sc = -near * 0.6 + (this.dark[ti] ? 0.3 : 0) + this.rand() * 0.2;
          let any = false;
          for (const [f, s] of k.pattern) {
            const ax = x + f * fx + s * sx, ay = y + f * fy + s * sy;
            if (!this.in(ax, ay)) continue;
            const o = this.unitAt(ax, ay);
            if (o && o !== e) {
              if (o.side === 0) {
                any = true;
                if (o.kind === 'courier') sc += k.prefers === 'wick' ? 6 : this.def.objective.k === 'escort' && k.prefers === 'brazier' ? 14 : 10;
                else sc += k.prefers === 'wick' ? 11 : 8;
              } else sc -= 4;
            }
            const ai = this.idx(ax, ay);
            if (this.t(ax, ay) === T_BRAZIER && this.lit[ai]) { any = true; sc += k.prefers === 'brazier' ? 13 : this.def.objective.k === 'braziers' ? 5 : 1; }
            if (this.ward[ai]) sc += 1;
          }
          if (!any) sc -= 5;
          if (sc > best) { best = sc; bx = x; by = y; bd = any ? d : -1; }
        }
      }
      if (bx !== e.x || by !== e.y) { e.ax = e.x; e.ay = e.y; e.at = 0; e.x = bx; e.y = by; }
      if (k.fly === false && this.t(e.x, e.y) === T_WATER && !e.swim) { /* never chosen */ }
      e.intent = bd >= 0 ? { dir: bd, dmg: k.dmg } : null;
    }
    // Spawners (Binding lanterns, the Hush Mother) mark a tile beside them
    for (const e of this.foes()) {
      const k = ENEMIES[e.kind];
      if (!k.spawner || (e.kind === 'hushmother' && this.turn % 2 === 1)) continue;
      const free = DIRS.map(([dx, dy]) => [e.x + dx, e.y + dy]).filter(([x, y]) => this.in(x, y) && this.t(x, y) !== T_WALL && this.t(x, y) !== T_BRAZIER && this.t(x, y) !== T_WATER && !this.unitAt(x, y) && !this.ward[this.idx(x, y)] && !this.spawns.some((s) => s.x === x && s.y === y));
      if (free.length) { const [x, y] = free[(this.rand() * free.length) | 0]; this.spawns.push({ x, y, kind: k.spawner }); }
    }
    // New shades rise on dark tiles at the edge
    const def = this.def;
    if (def.spawnEvery > 0 && (this.turn % def.spawnEvery === 0 || this.turn === 1 && def.spawnEvery === 1) && (!def.spawnUntil || this.turn <= def.spawnUntil)) {
      const cand: number[] = [];
      for (let i = 0; i < this.dark.length; i++) {
        const x = i % this.w, y = (i / this.w) | 0;
        if (!this.dark[i] || this.terr[i] === T_WALL || this.terr[i] === T_BRAZIER || this.ward[i] || this.unitAt(x, y)) continue;
        if (this.terr[i] === T_WATER) continue;
        cand.push(i);
      }
      for (let n = 0; n < def.spawnCount && cand.length; n++) {
        const j = (this.rand() * cand.length) | 0; const i = cand.splice(j, 1)[0];
        this.spawns.push({ x: i % this.w, y: (i / this.w) | 0, kind: def.spawnKinds[(this.rand() * def.spawnKinds.length) | 0] });
      }
    }
    // Darkness creeps from the edges
    const cc: number[] = [];
    for (let i = 0; i < this.dark.length; i++) {
      if (this.dark[i] || this.moss[i] || this.terr[i] === T_WALL) continue;
      const x = i % this.w, y = (i / this.w) | 0;
      if (DIRS.some(([dx, dy]) => this.in(x + dx, y + dy) && this.dark[this.idx(x + dx, y + dy)])) cc.push(i);
    }
    this.creep.fill(0);
    for (let n = 0; n < def.creep && cc.length; n++) { const j = (this.rand() * cc.length) | 0; this.creep[cc.splice(j, 1)[0]] = 1; }
    this.protectLight();
  }

  private planHeart(): Intent {
    // Flares: a plus-shape centred on (or next to) two allies.
    const abs: [number, number][] = [];
    const al = this.allies();
    for (let n = 0; n < 2 && al.length; n++) {
      const a = al[(this.rand() * al.length) | 0];
      const cx = a.x + ((this.rand() * 3) | 0) - 1, cy = a.y + ((this.rand() * 3) | 0) - 1;
      for (const [dx, dy] of [[0, 0], ...DIRS]) { const x = cx + dx, y = cy + dy; if (this.in(x, y) && !abs.some(([p, q]) => p === x && q === y)) abs.push([x, y]); }
    }
    return { dir: 0, abs, dmg: ENEMIES.heartwick.dmg };
  }

  objectiveText(): string {
    const o = this.def.objective;
    if (o.k === 'survive') return `Hold out: ${Math.min(this.turn, o.turns)}/${o.turns} turns`;
    if (o.k === 'escort') return 'Carry the parcel to the exit';
    if (o.k === 'braziers') { const b = this.braziers(); return `Relight the braziers: ${b.filter((i) => this.lit[i]).length}/${b.length}`; }
    return `Drive off the shades: ${this.foes().filter((f) => !ENEMIES[f.kind].invuln).length} left`;
  }
}

export function elemOf(ab: Ability): Elem { return ab.elem; }
