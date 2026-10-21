import { Ctx, W, H, makeCanvas, glow, mulberry, mix } from '../engine/canvas';
import { input } from '../engine/input';
import { audio } from '../engine/audio';
import { text, textC, textR, wrap, measure } from '../engine/font';
import { scenes, Scene, clock } from '../game';
import { G } from '../state';
import { WICKS, ELEM_COLOR } from '../data/wicks';
import { panel, ListMenu, COL } from './widgets';
import { monSprite, monIcon } from './art';
import { endingPages } from '../story/endings';
import { saveTo } from '../engine/save';
import { settings } from '../engine/settings';

// ---------- Shared night-sky backdrop ----------
let sky: HTMLCanvasElement | null = null;
export function skyBg(): HTMLCanvasElement {
  if (sky) return sky;
  const [c, ctx] = makeCanvas(W, H);
  for (let y = 0; y < H; y++) { ctx.fillStyle = mix('#04060f', '#1a1c44', Math.pow(y / H, 1.6)); ctx.fillRect(0, y, W, 1); }
  const r = mulberry(42);
  for (let i = 0; i < 90; i++) { ctx.fillStyle = r() < 0.15 ? '#ffffff' : '#7a86b8'; ctx.fillRect(Math.floor(r() * W), Math.floor(r() * 140), 1, 1); }
  // Water + drowned towers
  for (let y = 160; y < H; y++) { ctx.fillStyle = mix('#0b1838', '#03050c', (y - 160) / 56); ctx.fillRect(0, y, W, 1); }
  ctx.fillStyle = '#0f1a3a';
  for (let i = 0; i < 12; i++) { const x = Math.floor(r() * W), w = 6 + Math.floor(r() * 14), h = 8 + Math.floor(r() * 30); ctx.fillRect(x, 160 - h * 0.2, w, h); }
  ctx.fillStyle = '#18264e'; for (let i = 0; i < 50; i++) ctx.fillRect(Math.floor(r() * W), 162 + Math.floor(r() * 54), 4 + Math.floor(r() * 8), 1);
  // Distant city of lanterns
  ctx.fillStyle = '#080a1c';
  for (let x = 0; x < W; x += 5) { const h = 6 + Math.floor(r() * 16 + Math.sin(x / 40) * 6); ctx.fillRect(x, 160 - h, 5, h); }
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 40; i++) { const x = r() * W, y = 130 + r() * 30, g = glow(5, '#ffb060', 0.7); ctx.drawImage(g, x - 5, y - 5); }
  ctx.globalCompositeOperation = 'source-over';
  sky = c; return c;
}

class Lanterns {
  l: { x: number; y: number; vy: number; s: number; ph: number }[] = [];
  constructor(n: number) { const r = mulberry(9); for (let i = 0; i < n; i++) this.l.push({ x: r() * W, y: r() * H, vy: 0.1 + r() * 0.25, s: r() < 0.3 ? 2 : 1, ph: r() * 6 }); }
  update() { for (const a of this.l) { a.y -= a.vy; a.ph += 0.02; if (a.y < -10) { a.y = H + 10; a.x = Math.random() * W; } } }
  render(ctx: Ctx) {
    if (settings.lowFx) return;
    ctx.globalCompositeOperation = 'lighter';
    for (const a of this.l) { const g = glow(a.s === 2 ? 12 : 7, '#ffa050', 0.9); ctx.drawImage(g, Math.round(a.x + Math.sin(a.ph) * 3) - g.width / 2, Math.round(a.y) - g.height / 2); }
    ctx.globalCompositeOperation = 'source-over';
    for (const a of this.l) {
      const x = Math.round(a.x + Math.sin(a.ph) * 3), y = Math.round(a.y);
      ctx.fillStyle = '#c84a2a'; ctx.fillRect(x - a.s, y - a.s - 1, a.s * 2 + 1, a.s * 2 + 2);
      ctx.fillStyle = '#ffd58a'; ctx.fillRect(x - a.s + 1, y - a.s, a.s * 2 - 1, a.s * 2);
    }
  }
}

// Big title text rendered via the bitmap font at 3x.
let titleCv: HTMLCanvasElement | null = null;
function titleArt() {
  if (titleCv) return titleCv;
  const s = 'LANTERNFALL';
  const w = measure(s) + 2;
  const [c, ctx] = makeCanvas(w, 12);
  text(ctx, s, 0, 0, '#ffd58a', '#8a3414');
  titleCv = c; return c;
}

// ---------------- Title ----------------
export class TitleScene implements Scene {
  name = 'title';
  lant = new Lanterns(26);
  menu: ListMenu | null = null;
  started = false;
  constructor(private hasSave: boolean, private actions: { cont: () => void; newGame: () => void; load: () => void; settings: () => void; }) {}
  build() {
    const items = [] as { label: string; enabled?: boolean }[];
    items.push({ label: 'Continue', enabled: this.hasSave }, { label: 'New Journey' }, { label: 'Load' }, { label: 'Settings' });
    this.menu = new ListMenu(items, W / 2 - 50, 120, 100, 13, 1, 9, false);
    if (!this.hasSave) this.menu.sel = 1;
  }
  update() {
    this.lant.update();
    if (!this.started) {
      if (input.anyKey || input.clicked) { this.started = true; audio.init(); audio.play('title'); input.consumeAll(); this.build(); }
      return;
    }
    const r = this.menu!.update();
    if (r === 0) this.actions.cont(); else if (r === 1) this.actions.newGame(); else if (r === 2) this.actions.load(); else if (r === 3) this.actions.settings();
  }
  render(ctx: Ctx) {
    ctx.drawImage(skyBg(), 0, 0);
    this.lant.render(ctx);
    const t = titleArt();
    const tw = t.width * 3;
    ctx.globalCompositeOperation = 'lighter';
    const g = glow(80, '#ff9a4a', 0.5); ctx.drawImage(g, W / 2 - 80, 50 - 80);
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(t, Math.floor(W / 2 - tw / 2), 34, tw, 36);
    textC(ctx, 'a night-courier story of lights and the drowned', W / 2, 78, COL.text);
    if (!this.started) {
      if (Math.floor(clock.t / 30) % 2 === 0) textC(ctx, 'Press any key or click', W / 2, 136, COL.hi);
    } else {
      panel(ctx, W / 2 - 56, 114, 112, 60);
      this.menu!.render(ctx);
    }
    textC(ctx, 'WASD / arrows or mouse  -  E / Space: interact  -  Esc: menu  -  F3: FPS', W / 2, 192, COL.dim);
    textR(ctx, 'v1.0', W - 4, H - 12, '#4a4a6a');
  }
}

// ---------------- Chapter card ----------------
export class ChapterCard implements Scene {
  name = 'chaptercard';
  t = 0;
  constructor(private n: number, private title: string, private sub: string, private done: () => void) { audio.sfx('chime'); }
  update() {
    this.t++;
    if (this.t > 260 || (this.t > 40 && (input.hit('confirm') || input.clicked))) { scenes.pop(this); input.consumeAll(); this.done(); }
  }
  render(ctx: Ctx) {
    ctx.fillStyle = '#04060f'; ctx.fillRect(0, 0, W, H);
    const a = Math.min(1, this.t / 40, (260 - this.t) / 30);
    ctx.globalAlpha = Math.max(0, a);
    ctx.globalCompositeOperation = 'lighter';
    const g = glow(60, '#ffb060', 0.6); ctx.drawImage(g, W / 2 - 60, 90 - 60);
    ctx.globalCompositeOperation = 'source-over';
    textC(ctx, this.n > 0 ? `CHAPTER ${this.n}` : 'EPILOGUE', W / 2, 70, COL.dim);
    textC(ctx, this.title, W / 2, 88, COL.hi);
    textC(ctx, this.sub, W / 2, 108, COL.text);
    ctx.globalAlpha = 1;
  }
}

// ---------------- Radio interlude ----------------
export class RadioScene implements Scene {
  name = 'radio';
  i = 0; shown = 0; t = 0; noise: number[] = [];
  constructor(private title: string, private lines: [string, string][], private done: () => void) {
    audio.play('radio'); audio.sfx('static');
    for (let k = 0; k < 64; k++) this.noise.push(Math.random());
  }
  update() {
    this.t++;
    const [, line] = this.lines[this.i];
    if (this.shown < line.length) { this.shown += 1; if (this.shown % 4 === 0) audio.sfx('text'); if (input.hit('confirm') || input.clicked) this.shown = line.length; return; }
    if (input.hit('confirm') || input.clicked) {
      this.i++; this.shown = 0; audio.sfx('blip');
      if (this.i >= this.lines.length) { scenes.pop(this); input.consumeAll(); audio.sfx('static'); this.done(); }
    }
    if (this.t % 3 === 0) for (let k = 0; k < this.noise.length; k++) this.noise[k] = Math.random();
  }
  render(ctx: Ctx) {
    ctx.fillStyle = '#06060c'; ctx.fillRect(0, 0, W, H);
    // Radio cabinet
    panel(ctx, 60, 14, 264, 92, '#8a5a2a', '#2a1a12');
    ctx.fillStyle = '#1a0e0a'; ctx.fillRect(70, 24, 120, 72);
    for (let y = 26; y < 94; y += 4) { ctx.fillStyle = '#3a2418'; ctx.fillRect(72, y, 116, 2); }
    ctx.fillStyle = '#0a0806'; ctx.fillRect(198, 24, 116, 30);
    ctx.globalCompositeOperation = 'lighter';
    const g = glow(30, '#ffb060', 0.7); ctx.drawImage(g, 256 - 30, 39 - 30);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#c89a5a'; for (let k = 0; k < 11; k++) ctx.fillRect(204 + k * 10, 44, 1, k % 2 ? 3 : 6);
    textC(ctx, '5   7   9  11  13  15', 256, 28, '#8a6a3a', null);
    const nx = 204 + ((1450 - 530) / 1170) * 104 + Math.sin(this.t / 30) * 1.5;
    ctx.fillStyle = '#ff5a3a'; ctx.fillRect(Math.round(nx), 32, 1, 20);
    // Waveform (talking)
    ctx.fillStyle = '#9fffd0';
    const talking = this.shown < this.lines[this.i][1].length;
    for (let k = 0; k < 56; k++) {
      const v = Math.sin(k / 3 + this.t / 4) * (talking ? 6 : 1) * this.noise[k] + (this.noise[(k + 7) % 64] - 0.5) * 3;
      ctx.fillRect(202 + k * 2, 80 + Math.round(v), 1, 1);
    }
    ctx.fillStyle = '#4a3020'; ctx.beginPath(); ctx.arc(226, 74, 0, 0, 0); ctx.fill();
    textC(ctx, this.title, W / 2, 112, COL.dim);
    const [who, line] = this.lines[this.i];
    panel(ctx, 20, 128, W - 40, 80, '#9fffd0', '#0a1214');
    text(ctx, who, 30, 133, '#9fffd0');
    let left = this.shown;
    wrap(line, W - 64).forEach((l, k) => { if (left > 0) text(ctx, l, 30, 147 + k * 12, COL.text, '#05070f', left); left -= l.length; });
    if (this.shown >= line.length && Math.floor(clock.t / 20) % 2 === 0) textR(ctx, 'v', W - 30, 196, '#9fffd0');
  }
}

// ---------------- Radio tuning puzzle ----------------
export interface Station { f: number; label: string; correct?: boolean; }
const DECOYS: Station[] = [
  { f: 610, label: 'WLKR 610: "...and the lake rose another inch today, folks..."' },
  { f: 880, label: 'WPAP 880: an accordion polka, slightly flooded.' },
  { f: 1060, label: 'WGLD 1060: "The Guild reminds you: a bright city is a safe city."' },
  { f: 1290, label: 'KDRN 1290: a numbers station. Seven. Seven. Four.' },
  { f: 1620, label: 'WSTR 1620: someone humming, very far away.' },
];
export class TuneScene implements Scene {
  name = 'tune';
  transparent = true;
  f = 900; hold = 0; msg = 'Sweep the dial. Hold steady on a clear signal to lock it.'; t = 0; dragging = false;
  stations: Station[];
  constructor(target: number, private label: string, private done: (ok: boolean) => void) {
    this.stations = [...DECOYS.filter((d) => Math.abs(d.f - target) > 60), { f: target, label: 'Relay carrier found!', correct: true }];
    audio.sfx('static');
  }
  clarity() {
    let best = 0;
    for (const s of this.stations) best = Math.max(best, Math.max(0, 1 - Math.abs(s.f - this.f) / 25));
    return best;
  }
  nearest() { return this.stations.reduce((a, b) => (Math.abs(b.f - this.f) < Math.abs(a.f - this.f) ? b : a)); }
  update() {
    this.t++;
    const prev = this.f;
    const sp = input.held('run') ? 10 : 2;
    if (input.held('left')) this.f -= sp;
    if (input.held('right')) this.f += sp;
    if (input.wheel) this.f -= input.wheel * 10;
    // Mouse: drag on the dial strip
    if (input.clicked && input.inRect(40, 70, W - 80, 30)) this.dragging = true;
    if (this.dragging) { if (input.usingMouse && input.inRect(0, 0, W, H)) this.f = 530 + ((input.mx - 48) / (W - 96)) * 1170; if (!input.mouseMoved && !input.clicked && this.t % 30 === 0) this.dragging = false; }
    this.f = Math.max(530, Math.min(1700, Math.round(this.f)));
    if (prev !== this.f && this.t % 5 === 0 && this.clarity() < 0.5) audio.sfx('static');
    const c = this.clarity();
    if (c > 0.82) {
      this.hold++;
      if (this.hold === 50) {
        const n = this.nearest();
        this.msg = n.label;
        if (n.correct) { audio.sfx('puzzle'); setTimeout(() => { }, 0); this.finish(true); return; }
        audio.sfx('deny');
      }
    } else this.hold = 0;
    if (input.hit('back') || input.rclicked) { this.finish(false); }
  }
  finish(ok: boolean) { scenes.pop(this); input.consumeAll(); this.done(ok); }
  render(ctx: Ctx) {
    ctx.fillStyle = 'rgba(5,7,15,0.8)'; ctx.fillRect(0, 0, W, H);
    panel(ctx, 20, 14, W - 40, 180, '#9fffd0', '#0a1214');
    textC(ctx, this.label, W / 2, 20, '#9fffd0');
    // dial strip
    ctx.fillStyle = '#1a0e0a'; ctx.fillRect(40, 70, W - 80, 30);
    for (let k = 530; k <= 1700; k += 10) {
      const x = Math.round(48 + ((k - 530) / 1170) * (W - 96));
      ctx.fillStyle = k % 100 === 0 ? '#c89a5a' : '#5a4020'; ctx.fillRect(x, 72, 1, k % 100 === 0 ? 8 : 4);
      if (k % 200 === 0) textC(ctx, String(k / 10), x, 84, '#8a6a3a', null);
    }
    const nx = Math.round(48 + ((this.f - 530) / 1170) * (W - 96));
    ctx.fillStyle = '#ff5a3a'; ctx.fillRect(nx, 68, 1, 34);
    textC(ctx, `${this.f} kc`, W / 2, 106, COL.hi);
    // waveform
    const c = this.clarity();
    ctx.fillStyle = mix('#3a5a50', '#9fffd0', c);
    for (let k = 0; k < 140; k++) {
      const clean = Math.sin(k / 4 + this.t / 5) * 8 * c;
      const noise = (Math.random() - 0.5) * 22 * (1 - c);
      ctx.fillRect(52 + k * 2, 140 + Math.round(clean + noise), 2, 1);
    }
    ctx.fillStyle = '#05070f'; ctx.fillRect(52, 160, 280, 4);
    ctx.fillStyle = c > 0.82 ? '#9fffd0' : '#3a7a6a'; ctx.fillRect(52, 160, Math.round(280 * c), 4);
    if (this.hold > 0 && c > 0.82) { ctx.fillStyle = '#ffd58a'; ctx.fillRect(52, 165, Math.round(280 * Math.min(1, this.hold / 50)), 1); }
    wrap(this.msg, W - 70).forEach((l, i) => text(ctx, l, 32, 30 + i * 11, COL.text));
    textC(ctx, 'Left/Right tune (Shift: fast), wheel or drag the dial. Esc: give up', W / 2, 178, COL.dim);
  }
}

// ---------------- Starter choice ----------------
export class StarterScene implements Scene {
  name = 'starter';
  sel = 0; t = 0; confirm: ListMenu | null = null;
  ids = ['cindle', 'ripplet', 'sproutwick'];
  constructor(private done: (id: string) => void) {}
  update() {
    this.t++;
    if (this.confirm) {
      const r = this.confirm.update();
      if (r === 0) { scenes.pop(this); input.consumeAll(); audio.sfx('befriend'); this.done(this.ids[this.sel]); }
      else if (r === 1 || r === -2) this.confirm = null;
      return;
    }
    const prev = this.sel;
    if (input.hit('left')) this.sel = (this.sel + 2) % 3;
    if (input.hit('right')) this.sel = (this.sel + 1) % 3;
    for (let i = 0; i < 3; i++) if (input.usingMouse && input.inRect(30 + i * 112, 30, 100, 100)) { if (input.mouseMoved) this.sel = i; if (input.clicked) { this.sel = i; this.ask(); return; } }
    if (prev !== this.sel) audio.sfx('blip');
    if (input.hit('confirm')) this.ask();
  }
  ask() { input.consumeAll(); audio.sfx('select'); this.confirm = new ListMenu([{ label: 'Yes, this one' }, { label: 'Let me look again' }], W / 2 - 60, 178, 120, 12); }
  render(ctx: Ctx) {
    ctx.drawImage(skyBg(), 0, 0);
    ctx.fillStyle = 'rgba(5,7,15,0.4)'; ctx.fillRect(0, 0, W, H);
    textC(ctx, 'Three glimmers drift close to your lantern. One of them chooses you back.', W / 2, 10, COL.text);
    for (let i = 0; i < 3; i++) {
      const id = this.ids[i], s = WICKS[id];
      const x = 30 + i * 112, hot = i === this.sel;
      panel(ctx, x, 26, 100, 112, hot ? COL.hi : COL.edgeDim, hot ? '#1a1f3a' : COL.bg);
      ctx.globalCompositeOperation = 'lighter';
      const g = glow(36, s.color, 0.9); ctx.drawImage(g, x + 50 - g.width / 2, 66 - g.height / 2);
      ctx.globalCompositeOperation = 'source-over';
      const bob = hot ? Math.round(Math.sin(this.t / 12) * 2) : 0;
      ctx.drawImage(monSprite(id), x + 10, 30 + bob, 80, 80);
      textC(ctx, s.name, x + 50, 112, hot ? COL.hi : COL.text);
      textC(ctx, s.role, x + 50, 124, s.color);
    }
    const s = WICKS[this.ids[this.sel]];
    panel(ctx, 20, 140, W - 40, 36, COL.edgeDim);
    wrap(s.blurb, W - 60).slice(0, 2).forEach((l, i) => text(ctx, l, 28, 143 + i * 10, COL.text));
    const ab = s.abilities[0];
    text(ctx, `${ab.name} (${ab.shape}): ${ab.desc}`.slice(0, 74), 28, 164, ELEM_COLOR[ab.elem]);
    if (this.confirm) { panel(ctx, W / 2 - 64, 176, 128, 30); this.confirm.render(ctx); }
    else textC(ctx, 'Left/Right to look, Enter or click to choose.', W / 2, 190, COL.dim);
  }
}

// ---------------- Ending ----------------
export class EndingScene implements Scene {
  name = 'ending';
  pages: { title: string; body: string; mon?: string; tint: string }[];
  i = 0; t = 0; credits = false; ct = 0; lant = new Lanterns(30);
  constructor(private id: string, private done: () => void) {
    this.pages = endingPages(id);
    audio.play(id === 'gilded' ? 'sad' : 'ending');
  }
  update() {
    this.t++; this.lant.update();
    if (this.credits) {
      this.ct++;
      if (this.ct > 60 && (input.hit('confirm') || input.clicked || input.hit('back')) || this.ct > 1900) {
        G.done = true; saveTo('auto', 'Epilogue');
        scenes.pop(this); input.consumeAll(); this.done();
      }
      return;
    }
    if (this.t > 30 && (input.hit('confirm') || input.clicked)) {
      audio.sfx('blip'); this.i++; this.t = 0;
      if (this.i >= this.pages.length) { this.credits = true; this.ct = 0; }
    }
  }
  render(ctx: Ctx) {
    ctx.drawImage(skyBg(), 0, 0);
    if (this.id !== 'lowtide') this.lant.render(ctx);
    if (this.credits) { this.renderCredits(ctx); return; }
    const p = this.pages[this.i];
    ctx.fillStyle = 'rgba(4,6,15,0.55)'; ctx.fillRect(0, 0, W, H);
    const a = Math.min(1, this.t / 30);
    ctx.globalAlpha = a;
    textC(ctx, p.title, W / 2, 16, p.tint);
    if (p.mon) {
      ctx.globalCompositeOperation = 'lighter'; const g = glow(36, p.tint, 0.9); ctx.drawImage(g, W / 2 - g.width / 2, 62 - g.height / 2); ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(monSprite(p.mon), W / 2 - 30, 32, 60, 60);
    }
    const y0 = p.mon ? 100 : 40;
    wrap(p.body, W - 60).forEach((l, k) => text(ctx, l, 30, y0 + k * 12, COL.text));
    ctx.globalAlpha = 1;
    if (this.t > 30 && Math.floor(clock.t / 20) % 2 === 0) textR(ctx, 'continue >', W - 12, H - 14, COL.dim);
  }
  renderCredits(ctx: Ctx) {
    ctx.fillStyle = 'rgba(4,6,15,0.6)'; ctx.fillRect(0, 0, W, H);
    const lines = [
      'LANTERNFALL', '', 'A night-courier story', '', 'Design, code, art and music', 'generated procedurally, by hand, in TypeScript', '',
      'Canvas 2D  -  Web Audio  -  no engine', '', 'Font: glyphs rasterised from Pixelify Sans (SIL OFL)', '',
      'Wicks who joined you: ' + G.wicks.length + ' of 10', 'Time: ' + Math.floor(G.playtime / 60) + ' minutes', '',
      'Thank you for carrying the light.', '', 'WKHV 1450, signing off.', '', '', 'THE END',
    ];
    const y0 = H - this.ct * 0.35;
    lines.forEach((l, k) => { const y = y0 + k * 14; if (y > -12 && y < H) textC(ctx, l, W / 2, Math.round(y), k === 0 || l === 'THE END' ? COL.hi : COL.text); });
  }
}
