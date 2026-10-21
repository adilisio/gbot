// Debug-only greedy autoplayer used by the Playwright tests (window.__lf.autoTurn()).
import { Board, Unit, ENEMIES } from './rules';
import type { Ability } from '../data/wicks';
import { bondOf } from '../state';

type Plan = { uid: number; mx: number; my: number; ab: number; dir: number; tx: number; ty: number; score: number };

function score(b: Board): number {
  if (b.result === 'win') return 10000 + b.oil;
  if (b.result === 'lose') return -10000;
  let s = b.oil * 4;
  for (const f of b.foes()) if (!ENEMIES[f.kind].invuln) s -= f.hp * 3 + 2;
  for (const i of b.braziers()) if (b.lit[i]) s += 12;
  const o = b.def.objective;
  if (o.k === 'escort') s -= (Math.abs(b.courier.x - b.exitX) + Math.abs(b.courier.y - b.exitY)) * 6;
  if (o.k === 'survive') s += b.turn * 5;
  return s;
}

function simulate(b: Board): number {
  if (b.result !== 'none') return score(b);
  const c = b.clone();
  for (const st of c.enemySteps()) { st(); if (c.result !== 'none') break; }
  return score(c) * 0.6 + score(b) * 0.4;
}

function aims(b: Board, u: Unit, ab: Ability): [number, number, number][] {
  if (ab.shape === 'self' || ab.shape === 'ring') return [[0, u.x, u.y]];
  if (Board.needsTile(ab)) return b.targets(u, ab).map((i) => [0, i % b.w, Math.floor(i / b.w)]);
  return [0, 1, 2, 3].map((d) => [d, u.x + [0, 0, -1, 1][d], u.y + [1, -1, 0, 0][d]]);
}

export function bestFor(b: Board, u: Unit): Plan | null {
  let best: Plan | null = null;
  const moves: [number, number][] = [[u.x, u.y]];
  if (!u.moved) for (const i of b.reach(u).keys()) moves.push([i % b.w, Math.floor(i / b.w)]);
  const abs = b.abilitiesOf(u);
  const bond = u.kind === 'courier' ? 3 : bondOf(u.kind);
  for (const [mx, my] of moves) {
    const base = b.clone(); const bu = base.units.find((v) => v.uid === u.uid)!;
    if (mx !== u.x || my !== u.y) base.moveUnit(bu, mx, my);
    const s0 = simulate(base);
    if (!best || s0 > best.score) best = { uid: u.uid, mx, my, ab: -1, dir: 0, tx: 0, ty: 0, score: s0 };
    if (u.acted) continue;
    abs.forEach((ab, k) => {
      if (base.canUse(bu, ab, bond, k)) return;
      for (const [dir, tx, ty] of aims(base, bu, ab)) {
        const c = base.clone(); const cu = c.units.find((v) => v.uid === u.uid)!;
        c.cast(cu, ab, dir, tx, ty);
        const sc = simulate(c) - ab.cost * 0.5;
        if (sc > best!.score) best = { uid: u.uid, mx, my, ab: k, dir, tx, ty, score: sc };
      }
    });
  }
  return best;
}

/** Plays one full player turn on a TacticsScene and ends it. */
export function autoTurn(scene: any): string {
  const b: Board = scene.b;
  if (scene.phase !== 'player') return 'phase:' + scene.phase;
  const log: string[] = [];
  for (const u0 of b.allies()) {
    const u = b.units.find((v) => v.uid === u0.uid)!;
    if (u.dead || (u.moved && u.acted) || b.result !== 'none') continue;
    const p = bestFor(b, u); if (!p) continue;
    if (p.mx !== u.x || p.my !== u.y) b.moveUnit(u, p.mx, p.my);
    if (p.ab >= 0) {
      const ab = b.abilitiesOf(u)[p.ab];
      const fx = b.cast(u, ab, p.dir, p.tx, p.ty);
      scene.playFx(fx, ab);
      log.push(`${u.kind}:${ab.id}`);
    } else log.push(`${u.kind}:move`);
  }
  scene.select(null);
  if (b.result === 'none') scene.endTurn();
  return log.join(',');
}
