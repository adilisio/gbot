import { Ctx } from '../engine/canvas';
import { Mon, maxHp, stat, sp } from '../state';
import { MOVES } from '../data/moves';
import { PASSIVES } from '../data/glimmers';
import { TYPE_COLOR } from '../data/types';
import { panel, bar, text, textR, typeBadge, COL, measure } from './widgets';
import { monIcon, monSprite } from './art';
import { xpFrac } from '../battle/engine';
import { wrap } from '../engine/font';

export function monRow(ctx: Ctx, m: Mon, x: number, y: number, w: number, sel: boolean, active = false) {
  panel(ctx, x, y, w, 26, sel ? COL.hi : active ? COL.edge : COL.edgeDim, sel ? COL.sel : COL.bg);
  ctx.drawImage(monIcon(m.sp), x + 3, y + 3);
  const s = sp(m);
  text(ctx, s.name, x + 26, y + 3, m.hp > 0 ? COL.text : COL.dim);
  textR(ctx, 'Lv' + m.lv, x + w - 6, y + 3, COL.dim);
  bar(ctx, x + 26, y + 17, w - 70, 3, m.hp / maxHp(m));
  textR(ctx, `${m.hp}/${maxHp(m)}`, x + w - 6, y + 13, COL.dim);
  if (m.status) text(ctx, m.status === 'scorch' ? 'SCR' : 'DRW', x + w - 72, y + 3, m.status === 'scorch' ? '#ff9a3c' : '#b48cff');
  if (m.hp <= 0) text(ctx, 'OUT', x + w - 72, y + 3, COL.bad);
}

export function monDetail(ctx: Ctx, m: Mon, x: number, y: number, w: number, h: number) {
  panel(ctx, x, y, w, h);
  const s = sp(m);
  ctx.drawImage(monSprite(m.sp), x + 6, y + 6, 40, 40);
  text(ctx, s.name, x + 52, y + 6, COL.hi);
  typeBadge(ctx, s.type, x + 52, y + 19);
  text(ctx, 'Lv ' + m.lv, x + 88, y + 18, COL.text);
  bar(ctx, x + 52, y + 33, w - 60, 3, m.hp / maxHp(m));
  bar(ctx, x + 52, y + 40, w - 60, 2, xpFrac(m), '#6ab8ff');
  let yy = y + 50;
  text(ctx, `HP ${m.hp}/${maxHp(m)}  ATK ${stat(m, 'atk')}  DEF ${stat(m, 'def')}  SPD ${stat(m, 'spd')}`, x + 6, yy, COL.text); yy += 13;
  const [pn, pd] = PASSIVES[s.passive];
  text(ctx, pn + ':', x + 6, yy, COL.hi);
  const lines = wrap(pd, w - 16 - measure(pn + ': '));
  text(ctx, lines[0], x + 10 + measure(pn + ':'), yy, COL.dim);
  for (let i = 1; i < lines.length; i++) text(ctx, lines[i], x + 10, yy + 11 * i, COL.dim);
  yy += 11 * lines.length + 3;
  for (const id of m.moves) {
    const mv = MOVES[id];
    ctx.fillStyle = TYPE_COLOR[mv.type]; ctx.fillRect(x + 6, yy + 3, 3, 3);
    text(ctx, mv.name, x + 12, yy, COL.text);
    textR(ctx, mv.kind === 'hit' ? `${mv.power} / ${mv.acc}%` : mv.kind, x + w - 8, yy, COL.dim);
    yy += 11;
  }
  if (s.evo) text(ctx, `Grows into ??? at Lv ${s.evo.lv}`, x + 6, Math.min(yy + 2, y + h - 13), COL.dim);
}
