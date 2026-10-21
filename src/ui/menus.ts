import { Ctx, W, H, makeCanvas } from '../engine/canvas';
import { input } from '../engine/input';
import { audio } from '../engine/audio';
import { settings, saveSettings } from '../engine/settings';
import { text, textC, textR, wrap } from '../engine/font';
import { scenes, Scene, fadeOut, fadeIn, clock } from '../game';
import { G, oilMax, addOil, bondOf, LANTERN_SLOTS } from '../state';
import { ITEMS, ITEM_ORDER } from '../data/items';
import { WICKS, BOND_AT, ELEM_COLOR } from '../data/wicks';
import { panel, ListMenu, COL, bar } from './widgets';
import { monIcon, monSprite } from './art';
import { GuideScene } from '../tactics/guide';
import { SLOTS, readMeta, saveTo, loadFrom, fmtTime } from '../engine/save';
import { applyScale } from '../screen';
import type { Overworld } from '../overworld/overworld';
import { walkable } from '../overworld/tiles';
import { SHRINE_NAME } from '../data/shrines';

const dim = (ctx: Ctx, a = 0.55) => { ctx.fillStyle = `rgba(5,7,15,${a})`; ctx.fillRect(0, 0, W, H); };

/** Oil meter used on the HUD and in menus. */
export function oilMeter(ctx: Ctx, x: number, y: number, w: number) {
  const m = oilMax(); const low = G.oil <= Math.max(3, m / 5);
  ctx.fillStyle = '#ffd06a'; ctx.fillRect(x, y + 1, 5, 7); ctx.fillStyle = '#3a2a1a'; ctx.fillRect(x + 1, y, 3, 1); ctx.fillRect(x + 1, y + 8, 3, 1);
  ctx.fillStyle = '#fff4c0'; ctx.fillRect(x + 2, y + 3, 1, 3);
  bar(ctx, x + 9, y + 2, w - 9, 4, G.oil / m, low ? '#ff5a4a' : '#ffb84a');
  return low;
}

// ---------------- Minimap (cached per map) ----------------
const mini: Record<string, HTMLCanvasElement> = {};
function minimap(ow: Overworld): HTMLCanvasElement {
  const key = ow.def.id + (ow.gateOpen ? 'g' : '');
  if (mini[key]) return mini[key];
  const [c, x] = makeCanvas(ow.w * 2, ow.h * 2);
  for (let y = 0; y < ow.h; y++) for (let xx = 0; xx < ow.w; xx++) {
    const t = ow.at(xx, y);
    x.fillStyle = walkable(t, ow.gateOpen) ? (t === ',' || t === ';' ? '#2e4a34' : '#5a4a3a') : t === '~' ? '#0c1a34' : '#24202e';
    x.fillRect(xx * 2, y * 2, 2, 2);
  }
  mini[key] = c; return c;
}
export function shrineInfo(ow: Overworld): { here: boolean; lit: boolean; x: number; y: number; dir: string; dist: number } | null {
  const e = ow.def.ents.find((d) => d.kind === 'rest');
  if (!e) return null;
  const dx = e.x - ow.px, dy = e.y - ow.py;
  const dir = (dy < -2 ? 'N' : dy > 2 ? 'S' : '') + (dx < -2 ? 'W' : dx > 2 ? 'E' : '');
  return { here: true, lit: !!G.flags['shrine_' + ow.def.id], x: e.x, y: e.y, dir: dir || 'here', dist: Math.abs(dx) + Math.abs(dy) };
}

// ---------------- Pause ----------------
export class PauseMenu implements Scene {
  transparent = true; name = 'pause';
  menu = new ListMenu([
    { label: 'Lantern & Wicks' }, { label: 'Bag' }, { label: 'Field Guide' },
    { label: 'Save' }, { label: 'Load' }, { label: 'Settings' }, { label: 'Quit to Title' }, { label: 'Close' },
  ], W - 104, 16, 96, 13);
  constructor(private ow: Overworld) { audio.sfx('select'); }
  update() {
    const r = this.menu.update();
    if (r === -2 || r === 7) { scenes.pop(this); input.consumeAll(); return; }
    switch (r) {
      case 0: scenes.push(new LanternScene(false)); break;
      case 1: scenes.push(new BagScene()); break;
      case 2: scenes.push(new GuideScene()); break;
      case 3: scenes.push(new SaveLoadScene('save', this.ow.def.name)); break;
      case 4: scenes.push(new SaveLoadScene('load', this.ow.def.name)); break;
      case 5: scenes.push(new SettingsScene()); break;
      case 6: scenes.push(new ConfirmScene('Return to the title screen? Unsaved progress since your last autosave will be lost.', async (ok) => {
        if (ok) { await fadeOut(); (window as any).__lfTitle(); await fadeIn(); }
      })); break;
    }
  }
  render(ctx: Ctx) {
    dim(ctx, 0.35);
    panel(ctx, W - 110, 8, 104, 8 * 13 + 14);
    this.menu.render(ctx);
    panel(ctx, 6, 8, 266, 70);
    text(ctx, `Chapter ${G.chapter}`, 14, 12, COL.hi);
    textR(ctx, `${G.glints} glints`, 264, 12, COL.text);
    text(ctx, 'Objective:', 14, 24, COL.dim);
    wrap(G.obj, 246).slice(0, 2).forEach((l, i) => text(ctx, l, 14, 34 + i * 10, COL.text));
    textR(ctx, 'Time ' + fmtTime(G.playtime), 264, 24, COL.dim);
    oilMeter(ctx, 14, 58, 120); text(ctx, `Oil ${G.oil}/${oilMax()}`, 140, 57, COL.text);
    // Lantern
    panel(ctx, 6, 82, 266, 30, COL.edgeDim);
    text(ctx, 'Lantern:', 12, 91, COL.dim);
    G.lantern.forEach((id, i) => { const w = WICKS[id]; ctx.drawImage(monIcon(w.art), 58 + i * 70, 86); text(ctx, w.name, 78 + i * 70, 91, w.color); });
    // Shrine + minimap
    panel(ctx, 6, 116, 266, H - 122, COL.edgeDim);
    const mm = minimap(this.ow);
    const scale = mm.width > 120 || mm.height > 84 ? 1 : 1;
    const mx = 12, my = 122;
    const mw = Math.min(mm.width, 120), mh = Math.min(mm.height, H - 132);
    ctx.drawImage(mm, 0, 0, mw, mh, mx, my, mw * scale, mh * scale);
    const si = shrineInfo(this.ow);
    if (si && si.x * 2 < mw && si.y * 2 < mh) {
      const pulse = clock.t % 40 < 20;
      ctx.fillStyle = si.lit ? (pulse ? '#ffd06a' : '#ff9a4a') : '#8a8aa0'; ctx.fillRect(mx + si.x * 2 - 1, my + si.y * 2 - 1, 4, 4);
    }
    if (this.ow.px * 2 < mw && this.ow.py * 2 < mh) { ctx.fillStyle = clock.t % 20 < 10 ? '#ffffff' : '#9fd8ff'; ctx.fillRect(mx + this.ow.px * 2, my + this.ow.py * 2, 2, 2); }
    const tx = mx + mw + 8;
    text(ctx, 'Nearest shrine', tx, 122, COL.hi);
    const lines: string[] = [];
    if (si) {
      if (si.lit) lines.push(`${SHRINE_NAME[this.ow.def.id] || 'Shrine'} - lit (${si.dir === 'here' ? 'right here' : si.dir + ', ' + si.dist + ' steps'}).`);
      else lines.push(`This area's shrine is cold (${si.dir === 'here' ? 'right here' : si.dir}, grey dot). Relight it to rest here.`);
    } else lines.push('No shrine in this area.');
    lines.push(`Last rested: ${G.rest.name || 'Courier Post shrine'}. You return there if your lantern runs dry.`);
    let yy = 134;
    for (const l of lines) for (const w of wrap(l, 262 - tx)) { text(ctx, w, tx, yy, COL.text); yy += 10; }
  }
}


// ---------------- Lantern & wick roster ----------------
/** The one place to see and swap wicks. Swapping only works at a shrine (or in the first-time tutorial). */
export class LanternScene implements Scene {
  name = 'lantern'; transparent = true;
  row = 0; col = 0; picked: { row: number; col: number } | null = null;
  msg = '';
  constructor(private canSwap: boolean, private done?: () => void, private tutorial = false) {
    this.msg = canSwap ? 'Pick a wick, then the slot to swap it into. Esc when done.' : 'Swap wicks at any lit shrine (Rest and refill > Swap wicks).';
  }
  satchel() { return G.wicks.filter((id) => !G.lantern.includes(id)); }
  cur(): string | null { return this.row === 0 ? G.lantern[this.col] || null : this.satchel()[this.col] || null; }
  update() {
    const sat = this.satchel();
    const n = this.row === 0 ? LANTERN_SLOTS : Math.max(1, sat.length);
    if (input.hit('left')) { this.col = (this.col + n - 1) % n; audio.sfx('blip'); }
    if (input.hit('right')) { this.col = (this.col + 1) % n; audio.sfx('blip'); }
    if (input.hit('up') || input.hit('down')) { this.row = 1 - this.row; this.col = Math.min(this.col, (this.row === 0 ? LANTERN_SLOTS : Math.max(1, sat.length)) - 1); audio.sfx('blip'); }
    let clicked = false;
    if (input.usingMouse) {
      for (let i = 0; i < LANTERN_SLOTS; i++) if (input.inRect(8 + i * 124, 22, 120, 78)) { if (input.mouseMoved) { this.row = 0; this.col = i; } if (input.clicked) { this.row = 0; this.col = i; clicked = true; } }
      sat.forEach((_, i) => { if (input.inRect(8 + i * 62, 116, 58, 34)) { if (input.mouseMoved) { this.row = 1; this.col = i; } if (input.clicked) { this.row = 1; this.col = i; clicked = true; } } });
      if (input.clicked && input.inRect(W - 70, H - 20, 62, 14)) { input.clicked = false; this.close(); return; }
    }
    if (input.hit('confirm') || clicked) { input.clicked = false; this.act(); }
    if (input.hit('back') || input.rclicked) {
      input.rclicked = false;
      if (this.picked) { this.picked = null; audio.sfx('back'); } else this.close();
    }
  }
  act() {
    if (!this.canSwap) { audio.sfx('deny'); this.msg = 'You can only swap wicks at a lit shrine. Look for the big glowing shrine-lantern.'; return; }
    const here = { row: this.row, col: this.col };
    if (this.row === 1 && !this.satchel()[this.col]) { audio.sfx('deny'); return; }
    if (!this.picked) { if (this.row === 0 && !G.lantern[this.col] && !this.satchel().length) { audio.sfx('deny'); return; } this.picked = here; audio.sfx('select'); this.msg = 'Now pick where it goes.'; return; }
    const a = this.picked, b = here; this.picked = null;
    const sat = this.satchel();
    const get = (p: { row: number; col: number }) => (p.row === 0 ? G.lantern[p.col] : sat[p.col]);
    const A = get(a), B = get(b);
    if (a.row === 0 && b.row === 0) { G.lantern[a.col] = B as string; G.lantern[b.col] = A as string; G.lantern = G.lantern.filter(Boolean); }
    else if (a.row !== b.row) {
      const slot = a.row === 0 ? a : b, bagId = a.row === 0 ? B : A;
      if (!bagId) { audio.sfx('deny'); return; }
      if (slot.col < G.lantern.length) G.lantern[slot.col] = bagId; else G.lantern.push(bagId);
    }
    audio.sfx('befriend'); this.msg = 'Swapped. The lantern\'s flame changes colour.';
  }
  close() {
    if (!G.lantern.length) { audio.sfx('deny'); return; }
    audio.sfx('back'); scenes.pop(this); input.consumeAll(); this.done?.();
  }
  card(ctx: Ctx, id: string | null, x: number, y: number, w: number, h: number, hot: boolean, picked: boolean, big: boolean) {
    panel(ctx, x, y, w, h, picked ? '#9fd8ff' : hot ? COL.hi : COL.edgeDim, hot ? COL.sel : COL.bg);
    if (!id) { textC(ctx, big ? 'empty slot' : '', x + w / 2, y + h / 2 - 5, COL.dim); return; }
    const wk = WICKS[id];
    if (big) {
      ctx.drawImage(monSprite(wk.art), x + 2, y + 4, 34, 34);
      text(ctx, wk.name, x + 38, y + 5, wk.color); text(ctx, wk.role, x + 38, y + 15, COL.dim);
      const bl = bondOf(id); text(ctx, `bond ${bl}`, x + 38, y + 25, COL.hi);
      wk.abilities.forEach((ab, i) => text(ctx, (i < bl ? '' : '- ') + ab.name, x + 6, y + 42 + i * 11, i < bl ? ELEM_COLOR[ab.elem] : COL.dim));
    } else {
      ctx.drawImage(monIcon(wk.art), x + 2, y + 6);
      text(ctx, wk.name, x + 22, y + 6, wk.color); text(ctx, wk.role, x + 22, y + 17, COL.dim);
    }
  }
  render(ctx: Ctx) {
    dim(ctx, 0.85);
    text(ctx, `Your lantern (${G.lantern.length}/${LANTERN_SLOTS})`, 10, 8, COL.hi);
    textR(ctx, this.canSwap ? (this.tutorial ? 'Tutorial: swap freely' : 'At a shrine: swapping allowed') : 'View only', W - 10, 8, this.canSwap ? COL.good : COL.dim);
    for (let i = 0; i < LANTERN_SLOTS; i++) this.card(ctx, G.lantern[i] || null, 8 + i * 124, 22, 120, 78, this.row === 0 && this.col === i, !!this.picked && this.picked.row === 0 && this.picked.col === i, true);
    const sat = this.satchel();
    text(ctx, `Satchel (${sat.length}) - riding along, not in the fight`, 10, 104, COL.dim);
    if (!sat.length) text(ctx, 'Nobody in the satchel yet. More glimmers join through deliveries and choices.', 12, 124, COL.dim);
    sat.forEach((id, i) => this.card(ctx, id, 8 + i * 62, 116, 58, 34, this.row === 1 && this.col === i, !!this.picked && this.picked.row === 1 && this.picked.col === i, false));
    // detail
    const id = this.cur();
    panel(ctx, 4, 154, W - 8, 46, COL.edgeDim);
    if (id) {
      const wk = WICKS[id]; const pts = G.bond[id] || 0; const bl = bondOf(id);
      wrap(wk.blurb + ' ' + wk.voice, W - 120).slice(0, 3).forEach((l, i) => text(ctx, l, 10, 158 + i * 10, COL.text));
      text(ctx, 'Bond', W - 104, 158, COL.hi);
      const next = BOND_AT[bl] ?? BOND_AT[2];
      bar(ctx, W - 76, 161, 64, 4, bl >= 3 ? 1 : pts / next, '#ffd06a');
      text(ctx, bl >= 3 ? 'max' : `${pts}/${next}`, W - 104, 170, COL.dim);
      text(ctx, 'Grows from deliveries, fights and story with it lit.', 10, 189, COL.dim);
    }
    panel(ctx, 4, H - 16, W - 80, 14, COL.edgeDim, COL.bg); text(ctx, this.msg, 10, H - 14, this.canSwap ? COL.text : COL.hi);
    panel(ctx, W - 70, H - 20, 62, 16, COL.edge); textC(ctx, 'Done [Esc]', W - 39, H - 17, COL.text);
  }
}

// ---------------- Bag ----------------
export class BagScene implements Scene {
  name = 'bag'; transparent = true;
  menu!: ListMenu; ids: string[] = []; msg = '';
  constructor() { this.build(); }
  build() {
    this.ids = ITEM_ORDER.filter((id) => G.bag[id]);
    const sel = this.menu?.sel || 0;
    this.menu = new ListMenu([...this.ids.map((id) => ({ label: ITEMS[id].name, right: 'x' + G.bag[id] })), { label: 'Close' }], 12, 28, 180, 13, 1, 11);
    this.menu.sel = Math.min(sel, this.ids.length);
  }
  update() {
    const r = this.menu.update();
    if (r === -2 || r === this.ids.length) { scenes.pop(this); input.consumeAll(); return; }
    if (r >= 0) {
      const it = ITEMS[this.ids[r]];
      if (it.kind === 'oil') {
        if (G.oil >= oilMax()) { audio.sfx('deny'); this.msg = 'Your lantern is already full.'; return; }
        addOil(it.amount || 6); G.bag[it.id]--; if (!G.bag[it.id]) delete G.bag[it.id]; audio.sfx('heal'); this.msg = `You pour the ${it.name} in. Oil ${G.oil}/${oilMax()}.`; this.build();
      } else { audio.sfx('deny'); this.msg = it.kind === 'upgrade' ? 'Already woven into your lantern.' : 'Something to deliver, not to use.'; }
    }
  }
  render(ctx: Ctx) {
    dim(ctx, 0.7);
    panel(ctx, 6, 8, 194, 170); text(ctx, 'Bag', 14, 12, COL.hi);
    if (!this.ids.length) text(ctx, 'Empty.', 20, 30, COL.dim);
    this.menu.render(ctx);
    panel(ctx, 206, 8, 172, 120, COL.edgeDim);
    const id = this.ids[this.menu.sel];
    if (id) { text(ctx, ITEMS[id].name, 214, 14, COL.hi); wrap(ITEMS[id].desc, 156).forEach((l, i) => text(ctx, l, 214, 28 + i * 10, COL.text)); }
    oilMeter(ctx, 214, 112, 150);
    if (this.msg) { panel(ctx, 6, 182, W - 12, 18, COL.edgeDim); text(ctx, this.msg, 14, 186, COL.text); }
  }
}

// ---------------- Shrine ----------------
export class ShrineScene implements Scene {
  name = 'shrine'; transparent = true;
  menu = new ListMenu([{ label: 'Swap wicks' }, { label: 'Save to a slot' }, { label: 'Leave' }], W / 2 - 70, 92, 140, 14);
  constructor(private title: string, private mapName: string, private done: () => void) { audio.sfx('heal'); }
  update() {
    const r = this.menu.update();
    if (r === -2 || r === 2) { scenes.pop(this); input.consumeAll(); this.done(); return; }
    if (r === 0) scenes.push(new LanternScene(true));
    if (r === 1) scenes.push(new SaveLoadScene('save', this.mapName));
  }
  render(ctx: Ctx) {
    dim(ctx, 0.45);
    panel(ctx, W / 2 - 100, 30, 200, 112, COL.hi);
    textC(ctx, this.title, W / 2, 36, COL.hi);
    textC(ctx, 'Rest and refill', W / 2, 50, COL.text);
    oilMeter(ctx, W / 2 - 70, 64, 120); text(ctx, `${G.oil}/${oilMax()}`, W / 2 + 56, 63, COL.good);
    textC(ctx, 'Oil refilled. Journey autosaved.', W / 2, 76, COL.dim);
    this.menu.render(ctx);
    panel(ctx, 4, 150, W - 8, 30, COL.edgeDim);
    text(ctx, 'The shrine hums. If your lantern runs dry, this is where you\'ll wake.', 12, 154, COL.text);
    text(ctx, `Lantern: ${G.lantern.map((id) => WICKS[id].name).join(', ')}${G.wicks.length > G.lantern.length ? `   Satchel: ${G.wicks.length - G.lantern.length}` : ''}`, 12, 165, COL.dim);
  }
}
export class ConfirmScene implements Scene {
  name = 'confirm';
  transparent = true;
  menu = new ListMenu([{ label: 'Yes' }, { label: 'No' }], W / 2 - 40, 112, 80, 13);
  constructor(private q: string, private cb: (ok: boolean) => void) { this.menu.sel = 1; }
  update() {
    const r = this.menu.update();
    if (r >= 0 || r === -2) { scenes.pop(this); input.consumeAll(); this.cb(r === 0); }
  }
  render(ctx: Ctx) {
    dim(ctx);
    panel(ctx, 60, 70, W - 120, 76);
    wrap(this.q, W - 140).forEach((l, i) => textC(ctx, l, W / 2, 78 + i * 11, COL.text));
    this.menu.render(ctx);
  }
}


export class SaveLoadScene implements Scene {
  name = 'saveload';
  transparent = true;
  menu: ListMenu;
  constructor(private mode: 'save' | 'load', private mapName: string, private onLoad?: () => void) {
    const slots = mode === 'save' ? SLOTS.filter((s) => s !== 'auto') : SLOTS;
    this.menu = new ListMenu(slots.map((s) => ({ label: this.label(s), enabled: mode === 'save' || !!readMeta(s) })), 40, 50, W - 80, 26, 1, 4);
  }
  slots() { return this.mode === 'save' ? SLOTS.filter((s) => s !== 'auto') : SLOTS; }
  label(s: string) {
    const m = readMeta(s);
    const name = s === 'auto' ? 'Autosave' : 'Slot ' + s;
    return m ? `${name}: Ch.${m.chapter} ${m.map}` : `${name}: - empty -`;
  }
  update() {
    const r = this.menu.update();
    if (r === -2) { scenes.pop(this); input.consumeAll(); return; }
    if (r >= 0) {
      const s = this.slots()[r];
      if (this.mode === 'save') {
        const doit = () => { saveTo(s, this.mapName); audio.sfx('save'); this.menu.items[r].label = this.label(s); };
        if (readMeta(s)) scenes.push(new ConfirmScene('Overwrite this save?', (ok) => { if (ok) doit(); }));
        else doit();
      } else {
        if (loadFrom(s)) {
          scenes.pop(this);
          (window as any).__lfLoaded();
          this.onLoad?.();
        } else audio.sfx('deny');
      }
    }
  }
  render(ctx: Ctx) {
    dim(ctx, 0.75);
    panel(ctx, 30, 24, W - 60, 150);
    text(ctx, this.mode === 'save' ? 'Save your journey' : 'Load a journey', 40, 30, COL.hi);
    this.menu.render(ctx);
    this.slots().forEach((s, i) => {
      const m = readMeta(s);
      if (m) text(ctx, `${m.wicks || 0} wicks   ${fmtTime(m.playtime)}   ${new Date(m.date).toLocaleString()}`, 56, 50 + i * 26 + 13, COL.dim);
    });
  }
}


export class SettingsScene implements Scene {
  name = 'settings';
  transparent = true;
  menu = new ListMenu([], 40, 40, W - 80, 14, 1, 10);
  constructor() { this.build(); }
  build() {
    const pct = (v: number) => Math.round(v * 100) + '%';
    const sel = this.menu.sel;
    this.menu = new ListMenu([
      { label: 'Master volume', right: '< ' + pct(settings.master) + ' >' },
      { label: 'Music volume', right: '< ' + pct(settings.music) + ' >' },
      { label: 'Effects volume', right: '< ' + pct(settings.sfx) + ' >' },
      { label: 'Low effects (faster)', right: settings.lowFx ? 'ON' : 'OFF' },
      { label: 'Screen scale', right: settings.scale === 0 ? 'Auto' : settings.scale + 'x' },
      { label: 'FPS overlay (F3)', right: settings.fps ? 'ON' : 'OFF' },
      { label: 'Text speed', right: ['', 'Slow', 'Normal', 'Fast', '', '', '', '', '', 'Instant'][settings.textSpeed] },
      { label: 'Back' },
    ], 40, 40, W - 80, 14, 1, 10);
    this.menu.sel = sel;
  }
  update() {
    const i = this.menu.sel;
    const dirv = input.hit('left') ? -1 : input.hit('right') ? 1 : 0;
    const r = this.menu.update();
    if (r === -2 || r === 7) { saveSettings(); scenes.pop(this); input.consumeAll(); return; }
    const d = r >= 0 ? 1 : dirv;
    if (!d) return;
    const vol = (v: number) => Math.max(0, Math.min(1, Math.round((v + d * 0.1) * 10) / 10));
    switch (i) {
      case 0: settings.master = vol(settings.master); break;
      case 1: settings.music = vol(settings.music); break;
      case 2: settings.sfx = vol(settings.sfx); break;
      case 3: settings.lowFx = !settings.lowFx; (window as any).__lfRebake?.(); break;
      case 4: settings.scale = (settings.scale + d + 7) % 7; applyScale(); break;
      case 5: settings.fps = !settings.fps; break;
      case 6: { const seq = [1, 2, 3, 9]; let k = seq.indexOf(settings.textSpeed); k = (k + d + 4) % 4; settings.textSpeed = seq[k]; break; }
      default: return;
    }
    audio.applyVolume(); audio.sfx('blip'); saveSettings(); this.build();
  }
  render(ctx: Ctx) {
    dim(ctx, 0.75);
    panel(ctx, 30, 20, W - 60, 160);
    text(ctx, 'Settings', 40, 26, COL.hi);
    this.menu.render(ctx);
    text(ctx, 'Left/Right or click to change. Low effects disables', 40, 156, COL.dim);
    text(ctx, 'particles, water animation and extra glow.', 40, 166, COL.dim);
  }
}


export class ShopScene implements Scene {
  name = 'shop';
  transparent = true;
  menu: ListMenu; qty = 1; buying = -1;
  constructor(private items: string[], private done: () => void) {
    this.menu = new ListMenu([...items.map((id) => ({ label: ITEMS[id].name, right: ITEMS[id].price + 'g' })), { label: 'Done' }], 12, 26, 190, 13, 1, 10);
  }
  update() {
    if (this.buying >= 0) {
      const id = this.items[this.buying]; const price = ITEMS[id].price;
      if (input.hit('up') || input.hit('right') || input.wheel < 0) { this.qty = Math.min(99, this.qty + 1); audio.sfx('blip'); }
      if (input.hit('down') || input.hit('left') || input.wheel > 0) { this.qty = Math.max(1, this.qty - 1); audio.sfx('blip'); }
      if (input.hit('confirm') || input.clicked) {
        if (G.glints >= price * this.qty) { G.glints -= price * this.qty; G.bag[id] = (G.bag[id] || 0) + this.qty; audio.sfx('buy'); }
        else audio.sfx('deny');
        this.buying = -1; input.consumeAll();
      }
      if (input.hit('back') || input.rclicked) { this.buying = -1; audio.sfx('back'); }
      return;
    }
    const r = this.menu.update();
    if (r === -2 || r === this.items.length) { scenes.pop(this); input.consumeAll(); this.done(); return; }
    if (r >= 0) { this.buying = r; this.qty = 1; }
  }
  render(ctx: Ctx) {
    dim(ctx, 0.5);
    panel(ctx, 6, 8, 202, 150);
    text(ctx, 'Wares', 14, 12, COL.hi); textR(ctx, `You have ${G.glints}g`, 200, 12, COL.text);
    this.menu.render(ctx);
    const id = this.items[this.menu.sel];
    panel(ctx, 212, 8, 166, 100, COL.edgeDim);
    if (id) {
      text(ctx, ITEMS[id].name, 220, 14, COL.hi);
      wrap(ITEMS[id].desc, 150).forEach((l, i) => text(ctx, l, 220, 28 + i * 11, COL.text));
      text(ctx, `In bag: ${G.bag[id] || 0}`, 220, 92, COL.dim);
    }
    if (this.buying >= 0) {
      const id2 = this.items[this.buying];
      panel(ctx, 212, 112, 166, 46, COL.hi);
      text(ctx, `Buy how many?  < ${this.qty} >`, 220, 118, COL.text);
      text(ctx, `Total: ${ITEMS[id2].price * this.qty}g`, 220, 132, G.glints >= ITEMS[id2].price * this.qty ? COL.good : COL.bad);
      text(ctx, 'Enter: buy   Esc: cancel', 220, 144, COL.dim);
    }
  }
}

