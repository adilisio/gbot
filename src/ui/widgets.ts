import { Ctx, W } from '../engine/canvas';
import { text, textC, textR, measure } from '../engine/font';
import { input } from '../engine/input';
import { audio } from '../engine/audio';
import { TYPE_COLOR, TYPE_DARK, TYPE_NAME, ElemType } from '../data/types';
import { clock } from '../game';

export const COL = {
  bg: '#0d1226', bg2: '#151c38', edge: '#e8a55a', edgeDim: '#6a4a3a', text: '#f4e6c8', dim: '#8f8aa8', hi: '#ffd58a',
  good: '#8fe39a', bad: '#ff7a6a', sel: '#2a2f5a', shadow: '#05070f',
};

export function panel(ctx: Ctx, x: number, y: number, w: number, h: number, edge = COL.edge, fill = COL.bg) {
  x |= 0; y |= 0; w |= 0; h |= 0;
  ctx.fillStyle = COL.shadow; ctx.fillRect(x + 1, y + 1, w, h);
  ctx.fillStyle = fill; ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
  ctx.fillStyle = edge;
  ctx.fillRect(x + 2, y, w - 4, 1); ctx.fillRect(x + 2, y + h - 1, w - 4, 1);
  ctx.fillRect(x, y + 2, 1, h - 4); ctx.fillRect(x + w - 1, y + 2, 1, h - 4);
  ctx.fillRect(x + 1, y + 1, 1, 1); ctx.fillRect(x + w - 2, y + 1, 1, 1); ctx.fillRect(x + 1, y + h - 2, 1, 1); ctx.fillRect(x + w - 2, y + h - 2, 1, 1);
  ctx.fillStyle = COL.bg2; ctx.fillRect(x + 2, y + 2, w - 4, 1);
}

export function bar(ctx: Ctx, x: number, y: number, w: number, h: number, frac: number, col?: string) {
  frac = Math.max(0, Math.min(1, frac));
  ctx.fillStyle = '#05070f'; ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
  ctx.fillStyle = '#262a44'; ctx.fillRect(x, y, w, h);
  const c = col || (frac > 0.5 ? '#7fe08a' : frac > 0.2 ? '#ffd34a' : '#ff5a4a');
  ctx.fillStyle = c; ctx.fillRect(x, y, Math.ceil(w * frac), h);
  ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(x, y, Math.ceil(w * frac), 1);
}

export function typeBadge(ctx: Ctx, t: ElemType | 'plain', x: number, y: number, w = 30) {
  ctx.fillStyle = TYPE_DARK[t]; ctx.fillRect(x, y, w, 9);
  ctx.fillStyle = TYPE_COLOR[t]; ctx.fillRect(x, y, w, 1); ctx.fillRect(x, y, 1, 9);
  textC(ctx, TYPE_NAME[t], x + w / 2, y - 1, TYPE_COLOR[t], null);
}

export function cursor(ctx: Ctx, x: number, y: number) {
  const o = Math.floor(clock.t / 15) % 2;
  ctx.fillStyle = COL.hi;
  ctx.fillRect(x + o, y, 1, 5); ctx.fillRect(x + 1 + o, y + 1, 1, 3); ctx.fillRect(x + 2 + o, y + 2, 1, 1);
}

export interface MenuItem { label: string; enabled?: boolean; right?: string; color?: string; }

/** Keyboard + mouse list/grid menu. update() returns index chosen, -1 nothing, -2 cancelled. */
export class ListMenu {
  sel = 0; scroll = 0;
  constructor(public items: MenuItem[], public x: number, public y: number, public w: number,
    public rowH = 12, public cols = 1, public maxRows = 99, public cancellable = true) {}
  get rows() { return Math.ceil(this.items.length / this.cols); }
  cellW() { return Math.floor(this.w / this.cols); }
  height() { return Math.min(this.rows, this.maxRows) * this.rowH; }
  hoverIndex(): number {
    if (!input.usingMouse) return -1;
    const cw = this.cellW();
    for (let i = 0; i < this.items.length; i++) {
      const r = Math.floor(i / this.cols) - this.scroll, c = i % this.cols;
      if (r < 0 || r >= this.maxRows) continue;
      if (input.inRect(this.x + c * cw, this.y + r * this.rowH, cw, this.rowH)) return i;
    }
    return -1;
  }
  update(): number {
    const n = this.items.length;
    if (n === 0) { if (this.cancellable && input.hit('back')) { audio.sfx('back'); return -2; } return -1; }
    const prev = this.sel;
    if (input.hit('down')) this.sel = this.sel + this.cols < n ? this.sel + this.cols : this.sel % this.cols;
    if (input.hit('up')) { const t = this.sel - this.cols; this.sel = t >= 0 ? t : Math.min(n - 1, (this.rows - 1) * this.cols + (this.sel % this.cols)); if (this.sel >= n) this.sel = n - 1; }
    if (this.cols > 1) {
      if (input.hit('right') && this.sel % this.cols < this.cols - 1 && this.sel + 1 < n) this.sel++;
      if (input.hit('left') && this.sel % this.cols > 0) this.sel--;
    }
    if (input.wheel && this.cols === 1) this.sel = Math.max(0, Math.min(n - 1, this.sel + input.wheel));
    const h = this.hoverIndex();
    if (input.mouseMoved && h >= 0) this.sel = h;
    if (this.sel !== prev) audio.sfx('blip');
    const row = Math.floor(this.sel / this.cols);
    if (row < this.scroll) this.scroll = row;
    if (row >= this.scroll + this.maxRows) this.scroll = row - this.maxRows + 1;
    if (input.hit('confirm') || (input.clicked && h >= 0 && h === this.sel)) {
      const it = this.items[this.sel];
      if (it.enabled === false) { audio.sfx('deny'); return -1; }
      audio.sfx('select'); input.clicked = false; return this.sel;
    }
    if (this.cancellable && (input.hit('back') || input.rclicked)) { audio.sfx('back'); return -2; }
    return -1;
  }
  render(ctx: Ctx, showCursor = true) {
    const cw = this.cellW();
    for (let i = 0; i < this.items.length; i++) {
      const r = Math.floor(i / this.cols) - this.scroll, c = i % this.cols;
      if (r < 0 || r >= this.maxRows) continue;
      const it = this.items[i];
      const x = this.x + c * cw, y = this.y + r * this.rowH;
      if (i === this.sel && showCursor) {
        ctx.fillStyle = COL.sel; ctx.fillRect(x, y, cw - 2, this.rowH - 1);
        cursor(ctx, x + 2, y + Math.floor(this.rowH / 2) - 2);
      }
      const col = it.enabled === false ? COL.dim : it.color || (i === this.sel ? COL.hi : COL.text);
      text(ctx, it.label, x + 8, y + Math.floor((this.rowH - 10) / 2), col);
      if (it.right) textR(ctx, it.right, x + cw - 6, y + Math.floor((this.rowH - 10) / 2), it.enabled === false ? COL.dim : COL.dim);
    }
    if (this.scroll > 0) textR(ctx, '^', this.x + this.w - 2, this.y - 9, COL.dim);
    if (this.scroll + this.maxRows < this.rows) textR(ctx, 'v', this.x + this.w - 2, this.y + this.maxRows * this.rowH - 2, COL.dim);
  }
}

export function button(ctx: Ctx, label: string, x: number, y: number, w: number, h: number, hot: boolean) {
  panel(ctx, x, y, w, h, hot ? COL.hi : COL.edgeDim, hot ? COL.sel : COL.bg);
  textC(ctx, label, x + w / 2, y + Math.floor((h - 10) / 2), hot ? COL.hi : COL.text);
}
export function hitButton(x: number, y: number, w: number, h: number) { return input.clicked && input.inRect(x, y, w, h); }

export { text, textC, textR, measure, W };
