import { Ctx, W, H } from '../engine/canvas';
import { input } from '../engine/input';
import { audio } from '../engine/audio';
import { settings, saveSettings } from '../engine/settings';
import { text, textC, textR, wrap } from '../engine/font';
import { scenes, Scene, fadeOut, fadeIn } from '../game';
import { G, maxHp, sp, Mon } from '../state';
import { ITEMS, ITEM_ORDER } from '../data/items';
import { SPECIES, BEFRIENDABLE } from '../data/glimmers';
import { TYPE_COLOR, TYPE_NAME } from '../data/types';
import { panel, ListMenu, COL, bar, typeBadge } from './widgets';
import { monRow, monDetail } from './monview';
import { monSprite } from './art';
import { TypeChartScene } from './typechart';
import { SLOTS, readMeta, saveTo, loadFrom, fmtTime } from '../engine/save';
import { applyScale } from '../screen';
import type { Overworld } from '../overworld/overworld';

const dim = (ctx: Ctx, a = 0.55) => { ctx.fillStyle = `rgba(5,7,15,${a})`; ctx.fillRect(0, 0, W, H); };

// ---------------- Pause ----------------
export class PauseMenu implements Scene {
  transparent = true; name = 'pause';
  menu = new ListMenu([
    { label: 'Team' }, { label: 'Bag' }, { label: 'Lantern Log' }, { label: 'Type Chart' },
    { label: 'Save' }, { label: 'Load' }, { label: 'Settings' }, { label: 'Quit to Title' }, { label: 'Close' },
  ], W - 104, 16, 96, 13);
  constructor(private ow: Overworld) { audio.sfx('select'); }
  update() {
    const r = this.menu.update();
    if (r === -2 || r === 8) { scenes.pop(this); input.consumeAll(); return; }
    switch (r) {
      case 0: scenes.push(new TeamScene()); break;
      case 1: scenes.push(new BagScene()); break;
      case 2: scenes.push(new DexScene()); break;
      case 3: scenes.push(new TypeChartScene(null)); break;
      case 4: scenes.push(new SaveLoadScene('save', this.ow.def.name)); break;
      case 5: scenes.push(new SaveLoadScene('load', this.ow.def.name)); break;
      case 6: scenes.push(new SettingsScene()); break;
      case 7: scenes.push(new ConfirmScene('Return to the title screen? Unsaved progress since your last autosave will be lost.', async (ok) => {
        if (ok) { await fadeOut(); (window as any).__lfTitle(); await fadeIn(); }
      })); break;
    }
  }
  render(ctx: Ctx) {
    dim(ctx, 0.35);
    panel(ctx, W - 110, 8, 104, 9 * 13 + 14);
    this.menu.render(ctx);
    panel(ctx, 6, 8, 230, 58);
    text(ctx, `Chapter ${G.chapter}`, 14, 12, COL.hi);
    textR(ctx, `${G.glints} glints`, 228, 12, COL.text);
    text(ctx, 'Objective:', 14, 25, COL.dim);
    wrap(G.obj, 210).slice(0, 2).forEach((l, i) => text(ctx, l, 14, 36 + i * 11, COL.text));
    textR(ctx, 'Time ' + fmtTime(G.playtime), 228, 25, COL.dim);
    G.team.forEach((m, i) => {
      const x = 6 + i * 58;
      panel(ctx, x, 70, 56, 30, COL.edgeDim);
      ctx.drawImage(monSprite(m.sp), x + 2, 72, 26, 26);
      text(ctx, 'Lv' + m.lv, x + 29, 74, COL.text);
      bar(ctx, x + 29, 88, 23, 3, m.hp / maxHp(m));
    });
    text(ctx, 'WASD/arrows + Enter, or the mouse. Esc closes.', 8, H - 14, COL.dim);
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

// ---------------- Team (view + reorder) ----------------
export class TeamScene implements Scene {
  name = 'team';
  transparent = true;
  menu = new ListMenu(G.team.map((m) => ({ label: sp(m).name })), 8, 22, 160, 30, 1, 4);
  pick = -1;
  update() {
    const r = this.menu.update();
    if (r === -2) { if (this.pick >= 0) { this.pick = -1; return; } scenes.pop(this); input.consumeAll(); return; }
    if (r >= 0) {
      if (this.pick < 0) this.pick = r;
      else { const t = G.team[r]; G.team[r] = G.team[this.pick]; G.team[this.pick] = t; this.pick = -1; audio.sfx('select'); }
    }
  }
  render(ctx: Ctx) {
    dim(ctx, 0.7);
    panel(ctx, 4, 4, 170, 150);
    text(ctx, this.pick >= 0 ? 'Swap with...?' : 'Team (select two to reorder)', 10, 8, COL.hi);
    G.team.forEach((m, i) => monRow(ctx, m, 8, 22 + i * 30, 162, i === this.menu.sel || i === this.pick, i === 0));
    if (G.team[this.menu.sel]) monDetail(ctx, G.team[this.menu.sel], 178, 4, 202, 150);
    text(ctx, 'The first glimmer leads in battle.  Esc: back', 8, 160, COL.dim);
  }
}

// ---------------- Bag ----------------
export class BagScene implements Scene {
  name = 'bag';
  transparent = true;
  ids: string[] = []; menu!: ListMenu; target: ListMenu | null = null;
  constructor() { this.build(); }
  build() {
    this.ids = ITEM_ORDER.filter((id) => (G.bag[id] || 0) > 0);
    const sel = this.menu ? this.menu.sel : 0;
    this.menu = new ListMenu(this.ids.map((id) => ({ label: ITEMS[id].name, right: 'x' + G.bag[id] })), 10, 22, 180, 12, 1, 10);
    this.menu.sel = Math.min(sel, Math.max(0, this.ids.length - 1));
  }
  update() {
    if (this.target) {
      const r = this.target.update();
      if (r === -2) { this.target = null; return; }
      if (r >= 0) {
        const id = this.ids[this.menu.sel]; const it = ITEMS[id]; const m = G.team[r];
        let ok = false;
        if (it.kind === 'heal' && m.hp > 0 && m.hp < maxHp(m)) { m.hp = Math.min(maxHp(m), m.hp + (it.amount || 0)); ok = true; }
        if (it.kind === 'revive' && m.hp <= 0) { m.hp = Math.floor(maxHp(m) / 2); ok = true; }
        if (!ok) { audio.sfx('deny'); return; }
        audio.sfx('heal'); G.bag[id]--; if (G.bag[id] <= 0) delete G.bag[id];
        this.target = null; this.build();
      }
      return;
    }
    const r = this.menu.update();
    if (r === -2) { scenes.pop(this); input.consumeAll(); return; }
    if (r >= 0) {
      const it = ITEMS[this.ids[r]];
      if (it.kind === 'heal' || it.kind === 'revive') this.target = new ListMenu(G.team.map((m) => ({ label: sp(m).name })), 200, 22, 176, 30, 1, 4);
      else audio.sfx('deny');
    }
  }
  render(ctx: Ctx) {
    dim(ctx, 0.7);
    panel(ctx, 4, 4, 192, 150);
    text(ctx, 'Bag', 10, 8, COL.hi); textR(ctx, `${G.glints} glints`, 190, 8, COL.text);
    if (!this.ids.length) text(ctx, 'Empty.', 14, 24, COL.dim);
    this.menu.render(ctx, !this.target);
    const id = this.ids[this.menu.sel];
    if (id) { panel(ctx, 4, 158, W - 8, 30, COL.edgeDim); wrap(ITEMS[id].desc + (ITEMS[id].kind === 'lantern' ? ' (Use in battle.)' : ''), W - 24).forEach((l, i) => text(ctx, l, 12, 163 + i * 11, COL.text)); }
    if (this.target) {
      panel(ctx, 198, 4, 182, 150);
      G.team.forEach((m, i) => monRow(ctx, m, 200, 22 + i * 30, 176, i === this.target!.sel));
      text(ctx, 'Use on whom?', 204, 8, COL.hi);
    }
  }
}

// ---------------- Lantern Log (dex) ----------------
export class DexScene implements Scene {
  name = 'dex';
  transparent = true;
  menu = new ListMenu(BEFRIENDABLE.map((s, i) => ({ label: G.seen.includes(s.id) ? s.name : '???', right: String(i + 1).padStart(2, '0') })), 8, 22, 140, 12, 1, 14);
  update() { const r = this.menu.update(); if (r === -2) { scenes.pop(this); input.consumeAll(); } }
  render(ctx: Ctx) {
    dim(ctx, 0.75);
    panel(ctx, 4, 4, 150, 208);
    text(ctx, `Lantern Log  ${G.befriended.filter((id) => !SPECIES[id].boss).length}/${BEFRIENDABLE.length}`, 10, 8, COL.hi);
    this.menu.render(ctx);
    const s = BEFRIENDABLE[this.menu.sel];
    panel(ctx, 158, 4, 222, 208);
    const seen = G.seen.includes(s.id), friend = G.befriended.includes(s.id);
    ctx.drawImage(monSprite(s.id, false, !seen), 168, 14, 80, 80);
    if (seen) {
      text(ctx, s.name, 256, 16, COL.hi); typeBadge(ctx, s.type, 256, 30, 34);
      text(ctx, friend ? 'Befriended' : 'Seen', 256, 44, friend ? COL.good : COL.dim);
      text(ctx, `HP ${s.hp} ATK ${s.atk}`, 256, 60, COL.text); text(ctx, `DEF ${s.def} SPD ${s.spd}`, 256, 71, COL.text);
      wrap(s.desc, 200).forEach((l, i) => text(ctx, l, 168, 100 + i * 11, COL.text));
      if (s.evo) text(ctx, `Grows at Lv ${s.evo.lv}${G.seen.includes(s.evo.to) ? ' into ' + SPECIES[s.evo.to].name : ''}.`, 168, 150, COL.dim);
      const from = BEFRIENDABLE.find((x) => x.evo?.to === s.id);
      if (from) text(ctx, `Grows from ${G.seen.includes(from.id) ? from.name : '???'}.`, 168, 162, COL.dim);
    } else text(ctx, 'Not yet seen.', 256, 16, COL.dim);
  }
}

// ---------------- Save / Load ----------------
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
      if (m) text(ctx, `Lv${m.lv} ${m.lead ? SPECIES[m.lead]?.name || '' : ''}   ${fmtTime(m.playtime)}   ${new Date(m.date).toLocaleString()}`, 56, 50 + i * 26 + 13, COL.dim);
    });
  }
}

// ---------------- Settings ----------------
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

// ---------------- Shop ----------------
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

// ---------------- Lantern Rest ----------------
export class RestScene implements Scene {
  name = 'rest';
  transparent = true;
  menu = new ListMenu([{ label: 'Rest (heal team)' }, { label: 'Roost (swap glimmers)' }, { label: 'Save journey' }, { label: 'Leave' }], W / 2 - 80, 70, 160, 14);
  msg = 'The Lantern Rest hums. Its light feels like a hand on your shoulder.';
  constructor(private mapName: string, private done: () => void) {}
  update() {
    const r = this.menu.update();
    if (r === -2 || r === 3) { scenes.pop(this); input.consumeAll(); this.done(); return; }
    if (r === 0) { for (const m of G.team) { m.hp = maxHp(m); m.status = null; } audio.sfx('heal'); this.msg = 'Your glimmers are fully rekindled. (Spot saved as your return point.)'; }
    if (r === 1) scenes.push(new RoostScene());
    if (r === 2) scenes.push(new SaveLoadScene('save', this.mapName));
  }
  render(ctx: Ctx) {
    dim(ctx, 0.45);
    panel(ctx, W / 2 - 90, 40, 180, 96);
    textC(ctx, 'Lantern Rest', W / 2, 46, COL.hi);
    this.menu.render(ctx);
    panel(ctx, 4, 150, W - 8, 30, COL.edgeDim);
    wrap(this.msg, W - 24).forEach((l, i) => text(ctx, l, 12, 155 + i * 11, COL.text));
  }
}

// ---------------- Roost (team <-> storage) ----------------
export class RoostScene implements Scene {
  name = 'roost';
  transparent = true;
  side = 0; sel = [0, 0]; scroll = 0;
  update() {
    const lists: Mon[][] = [G.team, G.roost];
    const L = lists[this.side];
    if (input.hit('left') || input.hit('right')) { this.side = 1 - this.side; audio.sfx('blip'); this.clamp(); }
    if (input.hit('up')) { this.sel[this.side] = Math.max(0, this.sel[this.side] - 1); audio.sfx('blip'); }
    if (input.hit('down')) { this.sel[this.side] = Math.min(Math.max(0, L.length - 1), this.sel[this.side] + 1); audio.sfx('blip'); }
    // Mouse
    if (input.usingMouse) {
      for (let i = 0; i < G.team.length; i++) if (input.inRect(8, 24 + i * 30, 166, 28)) { if (input.mouseMoved) { this.side = 0; this.sel[0] = i; } }
      for (let i = 0; i < Math.min(9, G.roost.length - this.scroll); i++) if (input.inRect(200, 24 + i * 14, 176, 14)) { if (input.mouseMoved) { this.side = 1; this.sel[1] = i + this.scroll; } }
      if (input.wheel) { this.sel[1] = Math.max(0, Math.min(G.roost.length - 1, this.sel[1] + input.wheel)); this.side = 1; }
    }
    if (this.sel[1] < this.scroll) this.scroll = this.sel[1];
    if (this.sel[1] >= this.scroll + 9) this.scroll = this.sel[1] - 8;
    if (input.hit('confirm') || (input.clicked && (input.mx < 380))) {
      input.clicked = false;
      if (this.side === 0) {
        if (G.team.length <= 1) { audio.sfx('deny'); return; }
        const m = G.team.splice(this.sel[0], 1)[0]; G.roost.push(m); audio.sfx('select');
      } else {
        if (!G.roost.length) return;
        if (G.team.length >= 4) { audio.sfx('deny'); return; }
        const m = G.roost.splice(this.sel[1], 1)[0]; m.hp = maxHp(m); m.status = null; G.team.push(m); audio.sfx('select');
      }
      this.clamp();
    }
    if (input.hit('back') || input.rclicked) { audio.sfx('back'); scenes.pop(this); input.consumeAll(); }
  }
  clamp() { this.sel[0] = Math.min(this.sel[0], Math.max(0, G.team.length - 1)); this.sel[1] = Math.min(this.sel[1], Math.max(0, G.roost.length - 1)); }
  render(ctx: Ctx) {
    dim(ctx, 0.8);
    panel(ctx, 4, 4, 174, 150, this.side === 0 ? COL.hi : COL.edgeDim);
    text(ctx, `Team ${G.team.length}/4`, 10, 9, COL.hi);
    G.team.forEach((m, i) => monRow(ctx, m, 8, 24 + i * 30, 166, this.side === 0 && i === this.sel[0], false));
    panel(ctx, 196, 4, 184, 150, this.side === 1 ? COL.hi : COL.edgeDim);
    text(ctx, `Roost (${G.roost.length})`, 202, 9, COL.hi);
    if (!G.roost.length) text(ctx, 'No glimmers resting here.', 204, 26, COL.dim);
    for (let i = 0; i < Math.min(9, G.roost.length - this.scroll); i++) {
      const m = G.roost[i + this.scroll]; const s = this.side === 1 && i + this.scroll === this.sel[1];
      if (s) { ctx.fillStyle = COL.sel; ctx.fillRect(200, 24 + i * 14, 176, 13); }
      ctx.fillStyle = TYPE_COLOR[SPECIES[m.sp].type]; ctx.fillRect(204, 29 + i * 14, 3, 3);
      text(ctx, sp(m).name, 210, 25 + i * 14, s ? COL.hi : COL.text);
      textR(ctx, 'Lv' + m.lv, 372, 25 + i * 14, COL.dim);
    }
    panel(ctx, 4, 158, W - 8, 54, COL.edgeDim);
    const cur = this.side === 0 ? G.team[this.sel[0]] : G.roost[this.sel[1]];
    if (cur) {
      const s = sp(cur);
      text(ctx, `${s.name}  Lv${cur.lv}  ${TYPE_NAME[s.type]}`, 12, 162, TYPE_COLOR[s.type]);
      text(ctx, cur.moves.map((id) => id && (window as any).__lfMoveName(id)).join(', '), 12, 174, COL.text);
    }
    text(ctx, 'Enter/click: move between Team and Roost.  Left/Right: switch side.  Esc: done', 12, 196, COL.dim);
  }
}
