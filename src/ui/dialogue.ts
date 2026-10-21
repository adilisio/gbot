import { Ctx } from '../engine/canvas';
import { text, wrap, measure } from '../engine/font';
import { input } from '../engine/input';
import { audio } from '../engine/audio';
import { settings } from '../engine/settings';
import { scenes, Scene, clock } from '../game';
import { panel, ListMenu, COL } from './widgets';

const BX = 4, BY = 150, BW = 376, BH = 62, LINES = 4;

class DialogueScene implements Scene {
  transparent = true; name = 'dialogue';
  pages: string[][] = []; page = 0; shown = 0; total = 0;
  menu: ListMenu | null = null;
  constructor(public speaker: string | null, txt: string, public options: string[] | null, public cancelIdx: number,
    private done: (v: number) => void) {
    const lines = wrap(txt, BW - 20);
    for (let i = 0; i < lines.length; i += LINES) this.pages.push(lines.slice(i, i + LINES));
    this.startPage();
  }
  startPage() {
    this.total = this.pages[this.page].reduce((a, l) => a + l.length, 0);
    this.shown = settings.textSpeed >= 9 ? this.total : 0;
    this.menu = null;
  }
  get lastPage() { return this.page === this.pages.length - 1; }
  update() {
    const adv = input.hit('confirm') || input.clicked;
    if (this.shown < this.total) {
      const sp = settings.textSpeed;
      const prev = this.shown;
      this.shown = Math.min(this.total, this.shown + (sp <= 1 ? (clock.t % 2 === 0 ? 1 : 0) : sp === 2 ? 1 : 3));
      if (Math.floor(prev / 3) !== Math.floor(this.shown / 3)) audio.sfx('text');
      if (adv || input.held('run')) { this.shown = this.total; input.consume('confirm'); input.clicked = false; }
      return;
    }
    if (this.lastPage && this.options) {
      if (!this.menu) {
        const w = Math.max(70, ...this.options.map((o) => measure(o) + 22));
        const h = this.options.length * 12;
        this.menu = new ListMenu(this.options.map((o) => ({ label: o })), BX + BW - w - 4, BY - h - 8, w, 12, 1, 99, this.cancelIdx >= 0);
      }
      const r = this.menu.update();
      if (r >= 0) this.finish(r);
      else if (r === -2 && this.cancelIdx >= 0) this.finish(this.cancelIdx);
      return;
    }
    if (adv) {
      audio.sfx('blip');
      if (this.lastPage) this.finish(0);
      else { this.page++; this.startPage(); }
    }
  }
  finish(v: number) { scenes.pop(this); input.consumeAll(); this.done(v); }
  render(ctx: Ctx) {
    panel(ctx, BX, BY, BW, BH);
    if (this.speaker) {
      const w = measure(this.speaker) + 14;
      panel(ctx, BX + 6, BY - 12, w, 14, COL.edge, '#1c1430');
      text(ctx, this.speaker, BX + 13, BY - 10, COL.hi);
    }
    let left = this.shown;
    const lines = this.pages[this.page];
    for (let i = 0; i < lines.length; i++) {
      if (left <= 0) break;
      text(ctx, lines[i], BX + 10, BY + 7 + i * 12, COL.text, '#05070f', left);
      left -= lines[i].length;
    }
    if (this.shown >= this.total && !(this.lastPage && this.options)) {
      if (Math.floor(clock.t / 20) % 2 === 0) { ctx.fillStyle = COL.hi; ctx.fillRect(BX + BW - 14, BY + BH - 9, 5, 1); ctx.fillRect(BX + BW - 13, BY + BH - 8, 3, 1); ctx.fillRect(BX + BW - 12, BY + BH - 7, 1, 1); }
    }
    if (this.menu) {
      const m = this.menu;
      panel(ctx, m.x - 4, m.y - 4, m.w + 8, m.height() + 8);
      m.render(ctx);
    }
  }
}

export function say(speaker: string | null, txt: string): Promise<void> {
  return new Promise((r) => { input.consumeAll(); scenes.push(new DialogueScene(speaker, txt, null, -1, () => r())); });
}
export function choose(speaker: string | null, txt: string, options: string[], cancelIdx = -1): Promise<number> {
  return new Promise((r) => { input.consumeAll(); scenes.push(new DialogueScene(speaker, txt, options, cancelIdx, r)); });
}
