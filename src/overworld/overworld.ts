import { Ctx, W, H, glow, makeCanvas } from '../engine/canvas';
import { input } from '../engine/input';
import { audio } from '../engine/audio';
import { settings } from '../engine/settings';
import { text, measure } from '../engine/font';
import { scenes, Scene, clock, toasts } from '../game';
import { G, flag } from '../state';
import { getMap, MapDef, EntDef, Script } from './mapdef';
import { TS, bakeMap, walkable, VENT, TileMapView } from './tiles';
import { charSprite, objSprite, monIcon } from '../ui/art';
import { panel, COL } from '../ui/widgets';
import { makeAPI, ScriptAPI } from './script';
import { saveTo } from '../engine/save';
import { shadeSprite } from '../tactics/scene';
import { ENEMIES } from '../tactics/rules';
import { oilMeter, shrineInfo } from '../ui/menus';

export interface Ent { def: EntDef; x: number; y: number; dir: number; fx: number; fy: number; t: number; hidden: boolean; bang: number; frame: number; }
interface Crate { x: number; y: number; fx: number; fy: number; t: number; }

const DIRS: [number, number][] = [[0, 1], [0, -1], [-1, 0], [1, 0]];

let vignette: HTMLCanvasElement | null = null;
function getVignette() {
  if (vignette) return vignette;
  const [c, ctx] = makeCanvas(W, H);
  const g = ctx.createRadialGradient(W / 2, H / 2, 60, W / 2, H / 2, 240);
  g.addColorStop(0, 'rgba(4,6,20,0)'); g.addColorStop(1, 'rgba(4,6,20,0.65)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const id = ctx.getImageData(0, 0, W, H); const d = id.data;
  for (let i = 3; i < d.length; i += 4) d[i] = Math.round(d[i] / 20) * 20;
  ctx.putImageData(id, 0, 0);
  vignette = c; return c;
}

export class Overworld implements Scene, TileMapView {
  name = 'overworld';
  def!: MapDef; grid: string[][] = []; w = 0; h = 0; floor = '.'; light = '#ffb060'; seed = 1;
  layers: HTMLCanvasElement[] = [];
  ents: Ent[] = []; crates: Crate[] = []; plates: [number, number][] = [];
  px = 0; py = 0; dir = 0; moving = false; fx = 0; fy = 0; mt = 0; frame = 0; forced = false; stepFrames = 8;
  path: [number, number][] = []; pathTarget: Ent | null = null;
  busy = 0; camX = 0; camY = 0; steps = 0; bumpT = 0;
  banner = ''; bannerT = 0;
  api: ScriptAPI;
  motes: { x: number; y: number; vy: number; ph: number; col: string }[] = [];
  draw: (Ent | Crate | null)[] = [];
  playerFrameT = 0;

  constructor() { this.api = makeAPI(this); }

  get gateOpen() { return !!(this.def.gateFlag && flag(this.def.gateFlag)); }
  at(x: number, y: number): string { return x < 0 || y < 0 || x >= this.w || y >= this.h ? '' : this.grid[y][x]; }

  load(id: string, x: number, y: number, dir = 0, runEnter = true) {
    this.def = getMap(id);
    G.map = id; G.x = x; G.y = y; G.dir = dir;
    this.grid = this.def.tiles.map((r) => r.split(''));
    this.h = this.grid.length; this.w = this.grid[0].length;
    this.floor = this.def.floor || '.'; this.light = this.def.light || '#ffb060';
    this.seed = id.length * 31 + id.charCodeAt(0);
    this.crates = []; this.plates = [];
    for (let yy = 0; yy < this.h; yy++) for (let xx = 0; xx < this.w; xx++) {
      const c = this.grid[yy][xx];
      if (c === 'B') this.crates.push({ x: xx, y: yy, fx: xx, fy: yy, t: 1 });
      if (c === 'x') this.plates.push([xx, yy]);
    }
    if (this.gateOpen) { // puzzle solved earlier: crates rest on the plates
      this.crates = this.plates.map(([a, b]) => ({ x: a, y: b, fx: a, fy: b, t: 1 }));
    }
    this.ents = this.def.ents.map((d) => ({ def: d, x: d.x, y: d.y, dir: d.dir ?? 0, fx: d.x, fy: d.y, t: 1, hidden: false, bang: 0, frame: 0 }));
    this.refreshVisibility();
    this.px = x; this.py = y; this.dir = dir; this.moving = false; this.path = []; this.forced = false;
    this.rebake();
    this.snapCam();
    audio.play(this.def.music);
    this.banner = this.def.name; this.bannerT = 180;
    this.motes = [];
    if (runEnter && this.def.onEnter) this.run(this.def.onEnter);
  }

  rebake() {
    const frames = settings.lowFx ? 1 : 3;
    this.layers = [];
    for (let f = 0; f < frames; f++) this.layers.push(bakeMap(this, f, settings.lowFx));
  }

  refreshVisibility() { for (const e of this.ents) e.hidden = e.def.show ? !e.def.show() : false; }

  run(s: Script) {
    this.busy++;
    this.path = [];
    s(this.api).catch((err) => console.error(err)).finally(() => { this.busy--; this.refreshVisibility(); });
  }

  autosave() { if (!G.done || true) saveTo('auto', this.def.name); }

  entAt(x: number, y: number): Ent | null {
    for (const e of this.ents) if (!e.hidden && e.def.kind !== 'trigger' && e.x === x && e.y === y) return e;
    return null;
  }
  crateAt(x: number, y: number) { return this.crates.find((c) => c.x === x && c.y === y) || null; }
  free(x: number, y: number) {
    if (!walkable(this.at(x, y), this.gateOpen)) return false;
    const e = this.entAt(x, y); if (e && e.def.solid !== false) return false;
    if (this.crateAt(x, y)) return false;
    return true;
  }

  snapCam() {
    const mw = this.w * TS, mh = this.h * TS;
    const cx = (this.moving ? this.fx + (this.px - this.fx) * this.mt : this.px) * TS + 8;
    const cy = (this.moving ? this.fy + (this.py - this.fy) * this.mt : this.py) * TS + 8;
    this.camX = mw <= W ? -Math.floor((W - mw) / 2) : Math.max(0, Math.min(mw - W, Math.round(cx - W / 2)));
    this.camY = mh <= H ? -Math.floor((H - mh) / 2) : Math.max(0, Math.min(mh - H, Math.round(cy - H / 2)));
  }

  // ---------------- update ----------------
  update() {
    G.playtime += 1 / 60;
    if (this.bannerT > 0) this.bannerT--;
    if (this.bumpT > 0) this.bumpT--;
    for (const e of this.ents) {
      if (e.bang > 0) e.bang--;
      if (e.t < 1) { e.t = Math.min(1, e.t + 1 / 8); e.frame = e.t < 0.5 ? 1 : 0; }
    }
    for (const c of this.crates) if (c.t < 1) c.t = Math.min(1, c.t + 1 / 8);
    this.updateMotes();
    if (this.moving) { this.advanceMove(); this.snapCam(); return; }
    if (this.busy) { this.snapCam(); return; }

    if (input.hit('back')) { this.api.pauseMenu(); return; }
    if (input.hit('chart')) { this.api.typeChart(); return; }
    if (input.hit('confirm')) { this.path = []; this.interact(); return; }
    if (input.clicked) { this.handleClick(); }

    let d = -1;
    if (input.held('up')) d = 1; else if (input.held('down')) d = 0; else if (input.held('left')) d = 2; else if (input.held('right')) d = 3;
    if (d >= 0) this.path = [];
    if (d < 0 && this.path.length) {
      const [nx, ny] = this.path[0];
      d = DIRS.findIndex(([dx, dy]) => this.px + dx === nx && this.py + dy === ny);
      if (d < 0 || !this.free(nx, ny)) { this.path = []; d = -1; }
      else this.path.shift();
      if (!this.path.length && this.pathTarget && d < 0) { /* noop */ }
    }
    if (d < 0 && !this.path.length && this.pathTarget) {
      const e = this.pathTarget; this.pathTarget = null;
      const fd = DIRS.findIndex(([dx, dy]) => this.px + dx === e.x && this.py + dy === e.y);
      if (fd >= 0) { this.dir = fd; this.interact(); }
      return;
    }
    if (d >= 0) this.tryMove(d, input.held('run'));
    this.snapCam();
  }

  handleClick() {
    const tx = Math.floor((input.mx + this.camX) / TS), ty = Math.floor((input.my + this.camY) / TS);
    if (tx < 0 || ty < 0 || tx >= this.w || ty >= this.h) return;
    input.clicked = false;
    const e = this.entAt(tx, ty);
    if (e) {
      const dist = Math.abs(tx - this.px) + Math.abs(ty - this.py);
      if (dist === 1) { this.dir = DIRS.findIndex(([dx, dy]) => this.px + dx === tx && this.py + dy === ty); this.interact(); return; }
      // Path to a free neighbour
      let best: [number, number][] | null = null;
      for (const [dx, dy] of DIRS) { const p = this.findPath(tx + dx, ty + dy); if (p && (!best || p.length < best.length)) best = p; }
      if (best) { this.path = best; this.pathTarget = e; }
      return;
    }
    const p = this.findPath(tx, ty);
    if (p) { this.path = p; this.pathTarget = null; }
  }

  findPath(tx: number, ty: number): [number, number][] | null {
    if (!this.free(tx, ty) && !(tx === this.px && ty === this.py)) return null;
    if (tx === this.px && ty === this.py) return [];
    const W2 = this.w, prev = new Int32Array(this.w * this.h).fill(-1);
    const q = [this.py * W2 + this.px]; prev[q[0]] = q[0];
    let qi = 0;
    while (qi < q.length && qi < 4000) {
      const cur = q[qi++]; const cx = cur % W2, cy = (cur / W2) | 0;
      if (cx === tx && cy === ty) break;
      for (const [dx, dy] of DIRS) {
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= this.w || ny >= this.h) continue;
        const ni = ny * W2 + nx;
        if (prev[ni] >= 0 || !this.free(nx, ny) || VENT[this.at(nx, ny)]) continue;
        prev[ni] = cur; q.push(ni);
      }
    }
    const ti = ty * W2 + tx;
    if (prev[ti] < 0) return null;
    const path: [number, number][] = [];
    let c = ti;
    while (c !== this.py * W2 + this.px) { path.unshift([c % W2, (c / W2) | 0]); c = prev[c]; }
    return path;
  }

  tryMove(d: number, run: boolean) {
    this.dir = d;
    const [dx, dy] = DIRS[d];
    const nx = this.px + dx, ny = this.py + dy;
    const crate = this.crateAt(nx, ny);
    if (crate) {
      const bx = nx + dx, by = ny + dy;
      if (walkable(this.at(bx, by), this.gateOpen) && !this.entAt(bx, by) && !this.crateAt(bx, by) && !VENT[this.at(bx, by)] && this.at(bx, by) !== 'G') {
        crate.fx = crate.x; crate.fy = crate.y; crate.x = bx; crate.y = by; crate.t = 0;
        audio.sfx('push');
        this.startMove(nx, ny, 10);
        this.checkPlates();
      } else this.bump();
      return;
    }
    if (!this.free(nx, ny)) { this.bump(); return; }
    this.startMove(nx, ny, run ? 5 : 8);
  }
  bump() { if (this.bumpT <= 0) { audio.sfx('bump'); this.bumpT = 18; } }
  startMove(nx: number, ny: number, frames: number) {
    this.fx = this.px; this.fy = this.py; this.px = nx; this.py = ny; this.mt = 0; this.moving = true; this.stepFrames = frames;
  }
  advanceMove() {
    this.mt += 1 / this.stepFrames;
    this.playerFrameT++;
    if (this.mt >= 1) { this.mt = 1; this.moving = false; G.x = this.px; G.y = this.py; G.dir = this.dir; this.onStep(); }
  }

  checkPlates() {
    if (!this.plates.length || this.gateOpen || !this.def.gateFlag) return;
    if (this.plates.every(([x, y]) => this.crateAt(x, y))) {
      G.flags[this.def.gateFlag] = 1;
      audio.sfx('puzzle');
      this.rebake();
      if (this.def.onSolve) this.run(this.def.onSolve);
    }
  }

  onStep() {
    // Warps
    for (const w of this.def.warps) {
      if (w.x === this.px && w.y === this.py && (!w.show || w.show())) {
        this.path = [];
        this.run(async (s) => { await s.warp(w.to, w.tx, w.ty, w.dir ?? this.dir); });
        return;
      }
    }
    // Triggers
    for (const e of this.ents) {
      if (e.hidden || e.def.kind !== 'trigger') continue;
      const ww = e.def.w || 1, hh = e.def.h || 1;
      if (this.px >= e.x && this.px < e.x + ww && this.py >= e.y && this.py < e.y + hh && e.def.talk) { this.path = []; this.run(e.def.talk); return; }
    }
    // Vents push the courier along
    const v = VENT[this.at(this.px, this.py)];
    if (v) {
      const nx = this.px + v[0], ny = this.py + v[1];
      if (this.free(nx, ny)) { if (clock.t % 2 === 0) audio.sfx('gust'); this.startMove(nx, ny, 4); this.forced = true; return; }
    }
    this.forced = false;
    // Trainers
    if (this.checkTrainers()) return;
  }

  checkTrainers(): boolean {
    for (const e of this.ents) {
      if (e.hidden || (e.def.kind !== 'trainer' && e.def.kind !== 'shade') || !e.def.talk) continue;
      if (flag('beat_' + e.def.id)) continue;
      const [dx, dy] = DIRS[e.dir];
      const range = e.def.sight ?? 4;
      for (let i = 1; i <= range; i++) {
        const x = e.x + dx * i, y = e.y + dy * i;
        if (x === this.px && y === this.py) {
          e.bang = 40; audio.sfx('encounter'); this.path = [];
          const talk = e.def.talk;
          this.run(async (s) => { await s.wait(40); this.dir = [1, 0, 3, 2][e.dir]; await talk(s); });
          return true;
        }
        if (!walkable(this.at(x, y), this.gateOpen) || this.entAt(x, y)) break;
      }
    }
    return false;
  }

  interact() {
    const [dx, dy] = DIRS[this.dir];
    const e = this.entAt(this.px + dx, this.py + dy);
    if (e && e.def.talk) {
      if (e.def.kind === 'npc' || e.def.kind === 'trainer' || e.def.kind === 'shade') e.dir = [1, 0, 3, 2][this.dir];
      audio.sfx('blip');
      this.run(e.def.talk);
    }
  }

  updateMotes() {
    if (settings.lowFx) { this.motes.length = 0; return; }
    while (this.motes.length < 16) {
      this.motes.push({ x: this.camX + Math.random() * W, y: this.camY + H + Math.random() * 40, vy: 0.15 + Math.random() * 0.3, ph: Math.random() * 6, col: Math.random() < 0.7 ? '#ffb060' : '#9fffc0' });
    }
    for (const m of this.motes) {
      m.y -= m.vy; m.ph += 0.03;
      if (m.y < this.camY - 10 || m.x < this.camX - 20 || m.x > this.camX + W + 20) { m.y = this.camY + H + 5; m.x = this.camX + Math.random() * W; }
    }
  }

  // ---------------- render ----------------
  render(ctx: Ctx) {
    ctx.fillStyle = '#05070f'; ctx.fillRect(0, 0, W, H);
    const layer = this.layers[Math.floor(clock.t / 24) % this.layers.length];
    const sx = Math.max(0, this.camX), sy = Math.max(0, this.camY);
    const dx = Math.max(0, -this.camX), dy = Math.max(0, -this.camY);
    const ww = Math.min(W - dx, layer.width - sx), hh = Math.min(H - dy, layer.height - sy);
    if (ww > 0 && hh > 0) ctx.drawImage(layer, sx, sy, ww, hh, dx, dy, ww, hh);

    // Shade drifts show how far they can see, so you can sneak around them
    for (const e of this.ents) {
      if (e.hidden || e.def.kind !== 'shade' || flag('beat_' + e.def.id)) continue;
      const [ddx, ddy] = DIRS[e.dir];
      for (let i = 1; i <= (e.def.sight ?? 2); i++) {
        const x = e.x + ddx * i, y = e.y + ddy * i;
        if (!walkable(this.at(x, y), this.gateOpen)) break;
        ctx.fillStyle = i === 1 ? 'rgba(140,60,200,0.32)' : 'rgba(140,60,200,0.18)';
        ctx.fillRect(x * TS - this.camX, y * TS - this.camY, TS, TS);
      }
    }
    // Collect drawables (reuse array)
    const D = this.draw; D.length = 0;
    for (const e of this.ents) if (!e.hidden && e.def.kind !== 'trigger') D.push(e);
    for (const c of this.crates) D.push(c);
    D.push(null); // player
    const yOf = (o: Ent | Crate | null) => (o === null ? (this.moving ? this.fy + (this.py - this.fy) * this.mt : this.py) : o.fy + (o.y - o.fy) * o.t);
    D.sort((a, b) => yOf(a) - yOf(b));
    const lights: [number, number, string, number][] = [];
    for (const o of D) {
      if (o === null) { this.drawPlayer(ctx, lights); continue; }
      const X = Math.round((o.fx + (o.x - o.fx) * o.t) * TS - this.camX), Y = Math.round((o.fy + (o.y - o.fy) * o.t) * TS - this.camY);
      if (X < -32 || Y < -32 || X > W + 16 || Y > H + 16) continue;
      if ('def' in o) this.drawEnt(ctx, o, X, Y, lights);
      else ctx.drawImage(objSprite('crate'), X, Y);
    }
    // Additive lights
    ctx.globalCompositeOperation = 'lighter';
    for (const [x, y, c, r] of lights) { const g = glow(r, c, 0.9); ctx.drawImage(g, x - r, y - r); }
    if (!settings.lowFx) {
      for (const m of this.motes) {
        const x = Math.round(m.x - this.camX + Math.sin(m.ph) * 4), y = Math.round(m.y - this.camY);
        const g = glow(4, m.col, 0.8); ctx.drawImage(g, x - 4, y - 4);
      }
    }
    ctx.globalCompositeOperation = 'source-over';
    if (!settings.lowFx) for (const m of this.motes) { ctx.fillStyle = m.col; ctx.fillRect(Math.round(m.x - this.camX + Math.sin(m.ph) * 4), Math.round(m.y - this.camY), 1, 1); }
    ctx.drawImage(getVignette(), 0, 0);
    // Bangs
    for (const e of this.ents) if (e.bang > 0 && !e.hidden) {
      const X = e.x * TS - this.camX, Y = e.y * TS - this.camY - 14;
      panel(ctx, X + 4, Y, 9, 12, COL.hi); text(ctx, '!', X + 7, Y + 1, COL.hi);
    }
    this.drawHud(ctx);
  }

  drawEnt(ctx: Ctx, e: Ent, X: number, Y: number, lights: [number, number, string, number][]) {
    const d = e.def;
    if (d.kind === 'npc' || d.kind === 'trainer') {
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(X + 3, Y + 14, 10, 2);
      ctx.drawImage(charSprite(d.look || 'courier', e.dir, e.frame), X, Y - 2);
      if (d.glow) lights.push([X + 8, Y + 6, d.glow, 16]);
    } else if (d.kind === 'shade') {
      const bob = Math.round(Math.sin(clock.t / 14 + e.x) * 1.5);
      ctx.drawImage(shadeSprite(d.look && ENEMIES[d.look] ? d.look : 'shade'), X - 2, Y - 6 + bob);
    } else if (d.mon) {
      const bob = Math.round(Math.sin(clock.t / 18 + e.x) * 2);
      ctx.drawImage(monIcon(d.mon), X - 2, Y - 6 + bob);
      lights.push([X + 8, Y + 4 + bob, d.glow || '#ffffff', 14]);
    } else {
      const k = d.obj || (d.kind === 'rest' ? 'rest' : d.kind === 'sign' ? 'sign' : d.kind === 'item' ? 'parcel' : 'chest');
      ctx.drawImage(objSprite(k), X, Y);
      if (d.kind === 'rest') {
        const lit = !!flag('shrine_' + this.def.id);
        if (lit) { const p = Math.round(Math.sin(clock.t / 20) * 2); lights.push([X + 8, Y + 6, '#ffcf7a', 52 + p]); lights.push([X + 8, Y + 6, '#fff0c0', 18]);
          ctx.fillStyle = '#ffd58a'; ctx.fillRect(X + 7, Y - 9 + p, 2, 4); ctx.fillRect(X + 5, Y - 7 + p, 6, 1); }
        else { ctx.fillStyle = 'rgba(10,10,22,0.65)'; ctx.fillRect(X + 4, Y + 3, 8, 10); lights.push([X + 8, Y + 7, '#6a6a9a', 12]); }
      }
      else if (d.glow) lights.push([X + 8, Y + 8, d.glow, 18]);
      else if (d.kind === 'item' && Math.floor(clock.t / 30) % 2 === 0) { ctx.fillStyle = '#fff6d0'; ctx.fillRect(X + 12, Y + 4, 1, 1); }
    }
  }

  drawPlayer(ctx: Ctx, lights: [number, number, string, number][]) {
    const fx = this.moving ? this.fx + (this.px - this.fx) * this.mt : this.px;
    const fy = this.moving ? this.fy + (this.py - this.fy) * this.mt : this.py;
    const X = Math.round(fx * TS - this.camX), Y = Math.round(fy * TS - this.camY);
    const fr = this.moving && !this.forced ? (this.mt > 0.25 && this.mt < 0.75 ? 1 : 0) : 0;
    const bob = fr ? -1 : 0;
    ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(X + 3, Y + 14, 10, 2);
    ctx.drawImage(charSprite('player', this.dir, fr), X, Y - 2 + bob);
    // Courier's lantern on a short pole
    const side = this.dir === 2 ? -1 : 1;
    const lx = this.dir === 1 ? X + 13 : this.dir === 0 ? X + 13 : X + 8 + side * 7;
    const sw = Math.round(Math.sin(clock.t / 10) * (this.moving ? 1.5 : 0.5));
    const ly = Y + 6 + bob;
    if (this.dir !== 1) {
      ctx.fillStyle = '#0a0a16'; ctx.fillRect(lx - 1 + sw, ly, 4, 5);
      ctx.fillStyle = '#ffcf7a'; ctx.fillRect(lx + sw, ly + 1, 2, 3);
    }
    lights.push([lx + 1 + sw, ly + 2, '#ffb060', settings.lowFx ? 26 : 34]);
  }

  drawHud(ctx: Ctx) {
    // Oil meter (always visible) and the way to the nearest shrine
    panel(ctx, 4, H - 18, 96, 14, COL.edgeDim);
    const low = oilMeter(ctx, 8, H - 15, 88);
    if (low && clock.t % 60 < 30) text(ctx, 'Low oil - find a shrine', 104, H - 16, COL.bad);
    const si = shrineInfo(this);
    if (si && si.lit) {
      const sx = si.x * TS - this.camX + 8, sy = si.y * TS - this.camY + 8;
      if (sx < 0 || sy < 0 || sx > W || sy > H) {
        const cx = Math.max(10, Math.min(W - 10, sx)), cy = Math.max(30, Math.min(H - 28, sy));
        ctx.fillStyle = '#ffd06a'; ctx.fillRect(cx - 2, cy - 2, 5, 5); ctx.fillStyle = '#fff4c0'; ctx.fillRect(cx - 1, cy - 1, 3, 3);
        text(ctx, 'shrine', Math.max(2, Math.min(W - 34, cx - 14)), cy + (cy > H / 2 ? -12 : 4), '#ffd58a');
      }
    }
    if (!this.busy && !this.moving) {
      const [dx, dy] = DIRS[this.dir];
      const e = this.entAt(this.px + dx, this.py + dy);
      if (e && e.def.kind === 'rest') {
        const lbl = flag('shrine_' + this.def.id) ? '[E] Rest and refill' : '[E] Relight shrine';
        const w = measure(lbl) + 10; const X = e.x * TS - this.camX + 8 - w / 2, Y = e.y * TS - this.camY - 24;
        panel(ctx, X, Y, w, 13, COL.hi); text(ctx, lbl, X + 5, Y + 1, COL.hi);
      }
    }
    if (this.bannerT > 0) {
      const a = Math.min(1, this.bannerT / 30, (180 - this.bannerT) / 20);
      ctx.globalAlpha = Math.max(0, a);
      const w = measure(this.banner) + 20;
      panel(ctx, 6, 6, w, 16);
      text(ctx, this.banner, 16, 9, COL.hi);
      ctx.globalAlpha = 1;
    }
    let y = 26;
    for (let i = toasts.length - 1; i >= 0; i--) {
      const t = toasts[i]; t.t--;
      if (t.t <= 0) { toasts.splice(i, 1); continue; }
    }
    for (const t of toasts) {
      ctx.globalAlpha = Math.min(1, t.t / 20);
      const w = measure(t.text) + 16;
      panel(ctx, W - w - 6, y, w, 15, COL.edgeDim);
      text(ctx, t.text, W - w + 2, y + 2, COL.text);
      ctx.globalAlpha = 1; y += 18;
    }
  }
}

export const world = new Overworld();
