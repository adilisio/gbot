import { Ctx, W, H } from '../engine/canvas';
import { input } from '../engine/input';
import { audio } from '../engine/audio';
import { scenes, Scene } from '../game';
import { TYPES, TYPE_COLOR, TYPE_NAME, typeMult, TYPE_BLURB, BEATS, ElemType } from '../data/types';
import { panel, text, textC, COL } from './widgets';

export class TypeChartScene implements Scene {
  transparent = true; name = 'chart';
  hx = -1; hy = -1;
  constructor(private highlight: ElemType | null = null, private onClose?: () => void) {}
  update() {
    const ox = 112, oy = 46, c = 26;
    this.hx = -1; this.hy = -1;
    if (input.inRect(ox, oy, c * 6, 16 * 6)) { this.hx = Math.floor((input.mx - ox) / c); this.hy = Math.floor((input.my - oy) / 16); }
    if (input.hit('back') || input.hit('chart') || input.hit('confirm') || input.clicked || input.rclicked) {
      audio.sfx('back'); scenes.pop(this); input.consumeAll(); this.onClose?.();
    }
  }
  render(ctx: Ctx) {
    ctx.fillStyle = 'rgba(5,7,15,0.7)'; ctx.fillRect(0, 0, W, H);
    panel(ctx, 20, 8, 344, 200);
    textC(ctx, 'GLIMMER AFFINITIES', W / 2, 13, COL.hi);
    text(ctx, 'Attacker', 26, 34, COL.dim);
    textC(ctx, 'Defender', 190, 22, COL.dim);
    const ox = 112, oy = 46, c = 26;
    TYPES.forEach((t, i) => {
      textC(ctx, TYPE_NAME[t], ox + i * c + c / 2, oy - 12, TYPE_COLOR[t]);
      text(ctx, TYPE_NAME[t], 70, oy + i * 16 + 3, TYPE_COLOR[t]);
    });
    for (let a = 0; a < 6; a++) for (let d = 0; d < 6; d++) {
      const m = typeMult(TYPES[a], TYPES[d]);
      const x = ox + d * c, y = oy + a * 16;
      const hot = a === this.hy || d === this.hx || (this.highlight && TYPES[a] === this.highlight);
      ctx.fillStyle = m > 1 ? '#1f5a34' : m < 1 ? '#4a1e26' : '#1a1f3a';
      ctx.fillRect(x + 1, y + 1, c - 2, 14);
      if (hot) { ctx.fillStyle = 'rgba(255,213,138,0.18)'; ctx.fillRect(x + 1, y + 1, c - 2, 14); }
      textC(ctx, m > 1 ? 'x2' : m < 1 ? '1/2' : '-', x + c / 2, y + 3, m > 1 ? COL.good : m < 1 ? COL.bad : COL.dim);
    }
    const sel = this.hy >= 0 ? TYPES[this.hy] : this.highlight || null;
    const y0 = 148;
    if (sel) {
      text(ctx, TYPE_NAME[sel] + ':', 30, y0, TYPE_COLOR[sel]);
      text(ctx, TYPE_BLURB[sel], 80, y0, COL.text);
      const weak = TYPES.filter((t) => BEATS[t].includes(sel)).map((t) => TYPE_NAME[t]).join(', ');
      text(ctx, 'Strong vs ' + BEATS[sel].map((t) => TYPE_NAME[t]).join(', ') + '.   Weak to ' + weak + '.', 30, y0 + 13, COL.dim);
    } else {
      text(ctx, 'Each type is brilliant (x2) against two others, and resisted (1/2)', 30, y0, COL.text);
      text(ctx, 'by two others and itself. Plain moves are always neutral.', 30, y0 + 12, COL.text);
    }
    text(ctx, 'Same-type moves deal +25%.  Hover a row for details.', 30, y0 + 28, COL.dim);
    textC(ctx, '[Esc / T / click] close', W / 2, 193, COL.dim);
  }
}
