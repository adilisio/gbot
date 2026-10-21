import { Mon, maxHp, stat, sp, G, xpForLevel, markSeen, addMon } from '../state';
import { MOVES, Move, Stat } from '../data/moves';
import { SPECIES } from '../data/glimmers';
import { typeMult, ElemType } from '../data/types';
import { ITEMS } from '../data/items';

export interface TrainerDef {
  id: string; name: string; title?: string; look?: string;
  team: [string, number][]; reward: number; boss?: boolean;
  intro?: string; lose?: string; win?: string; music?: string; bg?: string; noLoss?: boolean;
}

export type BEvent =
  | { k: 'msg'; t: string }
  | { k: 'anim'; side: number; type: ElemType | 'plain'; kind: string }
  | { k: 'hp'; side: number; hp: number; eff?: number; crit?: boolean }
  | { k: 'faint'; side: number }
  | { k: 'switch'; side: number; mon: Mon }
  | { k: 'recall'; side: number }
  | { k: 'stat'; side: number; up: boolean }
  | { k: 'status'; side: number }
  | { k: 'xp'; mon: Mon; frac: number }
  | { k: 'level'; mon: Mon }
  | { k: 'learn'; mon: Mon; move: string }
  | { k: 'lantern'; shakes: number; ok: boolean }
  | { k: 'sfx'; n: string };

export type PAction =
  | { k: 'move'; i: number } | { k: 'switch'; idx: number } | { k: 'item'; id: string; target: number }
  | { k: 'lantern'; id: string } | { k: 'run' };

interface Side { mons: Mon[]; act: number; st: Record<Stat, number>; firstHit: boolean; sturdy: Set<number>; }

const stageMul = (s: number) => (s >= 0 ? (2 + s) / 2 : 2 / (2 - s));

export class Battle {
  sides: Side[];
  ev: BEvent[] = [];
  result: 'none' | 'win' | 'lose' | 'run' | 'caught' = 'none';
  needSwitch = false;
  participants = new Set<number>();
  runTries = 0; turnNo = 0;
  caughtMon: Mon | null = null;
  constructor(public kind: 'wild' | 'trainer', foes: Mon[], public trainer: TrainerDef | null) {
    const lead = Math.max(0, G.team.findIndex((m) => m.hp > 0));
    this.sides = [
      { mons: G.team, act: lead, st: { atk: 0, def: 0, spd: 0 }, firstHit: false, sturdy: new Set() },
      { mons: foes, act: 0, st: { atk: 0, def: 0, spd: 0 }, firstHit: false, sturdy: new Set() },
    ];
    this.participants.add(G.team[lead].uid);
    for (const f of foes) markSeen(f.sp);
  }
  get boss() { return !!this.trainer?.boss; }
  mon(side: number) { const s = this.sides[side]; return s.mons[s.act]; }
  name(side: number) { const m = this.mon(side); return (side === 1 ? (this.kind === 'wild' ? 'Wild ' : 'Foe ') : '') + sp(m).name; }
  push(e: BEvent) { this.ev.push(e); }
  msg(t: string) { this.ev.push({ k: 'msg', t }); }

  effSpd(side: number) {
    const m = this.mon(side);
    let s = stat(m, 'spd') * stageMul(this.sides[side].st.spd);
    if (sp(m).passive === 'swiftpaper') s *= 1.25;
    return s;
  }

  // ---- AI ----
  aiMove(side: number): number {
    const me = this.mon(side), foe = this.mon(1 - side);
    const ms = me.moves.map((id) => MOVES[id]);
    if (this.kind === 'wild' && Math.random() < 0.45) return Math.floor(Math.random() * ms.length);
    let best = 0, bv = -1;
    ms.forEach((m, i) => {
      let v = 0;
      const ft = sp(foe).type;
      if (m.kind === 'hit') {
        v = m.power * typeMult(m.type, ft) * (m.type === sp(me).type ? 1.25 : 1) * (m.acc / 100);
        if (m.drain && me.hp < maxHp(me) * 0.6) v *= 1.3;
        if (m.prio && foe.hp < maxHp(foe) * 0.25) v *= 1.5;
      } else if (m.kind === 'status') {
        if (m.inflict) v = foe.status ? 0 : m.inflict === 'drowse' ? 60 : 50;
        if (m.foeStat) v = this.sides[1 - side].st[m.foeStat[0]] > -2 ? 35 : 0;
      } else if (m.kind === 'buff' && m.selfStat) {
        v = this.sides[side].st[m.selfStat[0]] < 2 ? 40 - this.turnNo * 3 : 0;
      } else if (m.kind === 'heal') {
        v = me.hp < maxHp(me) * 0.4 ? 110 : 0;
      }
      v *= 0.8 + Math.random() * 0.4;
      if (v > bv) { bv = v; best = i; }
    });
    return best;
  }

  // ---- Turn ----
  turn(pa: PAction) {
    this.ev = [];
    this.turnNo++;
    const foeMove = this.aiMove(1);
    // Non-move actions first
    if (pa.k === 'run') {
      this.runTries++;
      const chance = this.kind === 'wild' ? Math.min(1, 0.45 + 0.25 * (this.effSpd(0) / this.effSpd(1)) + this.runTries * 0.15) : 0;
      if (Math.random() < chance) { this.msg('You slipped away into the dark.'); this.result = 'run'; return this.ev; }
      this.msg('Couldn\'t get away!');
      this.useMove(1, foeMove);
    } else if (pa.k === 'switch') {
      this.doSwitch(0, pa.idx, true);
      this.useMove(1, foeMove);
    } else if (pa.k === 'item') {
      this.useItem(pa.id, pa.target);
      this.useMove(1, foeMove);
    } else if (pa.k === 'lantern') {
      this.throwLantern(pa.id);
      if (this.result !== 'none') return this.ev;
      this.useMove(1, foeMove);
    } else {
      const pm = MOVES[this.mon(0).moves[pa.i]], fm = MOVES[this.mon(1).moves[foeMove]];
      const pp = pm.prio || 0, fp = fm.prio || 0;
      let first = 0;
      if (pp !== fp) first = pp > fp ? 0 : 1;
      else { const a = this.effSpd(0), b = this.effSpd(1); first = a === b ? (Math.random() < 0.5 ? 0 : 1) : a > b ? 0 : 1; }
      const order = first === 0 ? [[0, pa.i], [1, foeMove]] : [[1, foeMove], [0, pa.i]];
      for (const [s, i] of order) {
        if (this.result !== 'none' || this.needSwitch) break;
        if (this.mon(s).hp <= 0) continue;
        this.useMove(s, i);
        if (this.checkFaints()) break;
      }
    }
    if (this.result === 'none' && !this.needSwitch) this.checkFaints();
    if (this.result === 'none' && !this.needSwitch) this.endOfTurn();
    return this.ev;
  }

  private endOfTurn() {
    for (const s of [0, 1]) {
      const m = this.mon(s);
      if (m.hp <= 0) continue;
      if (m.status === 'scorch') {
        const d = Math.max(1, Math.floor(maxHp(m) / 10));
        m.hp = Math.max(0, m.hp - d);
        this.msg(`${this.name(s)} is hurt by its Scorch!`);
        this.push({ k: 'hp', side: s, hp: m.hp });
        m.statusT--; if (m.statusT <= 0 && m.hp > 0) { m.status = null; this.msg(`${this.name(s)}'s Scorch cooled.`); this.push({ k: 'status', side: s }); }
      }
      if (sp(m).passive === 'riverborn' && m.hp > 0 && m.hp < maxHp(m)) {
        m.hp = Math.min(maxHp(m), m.hp + Math.max(1, Math.floor(maxHp(m) / 16)));
        this.push({ k: 'hp', side: s, hp: m.hp });
      }
    }
    this.checkFaints();
  }

  /** Returns true if battle flow should stop for this turn. */
  private checkFaints(): boolean {
    let stop = false;
    const f = this.mon(1);
    if (f.hp <= 0 && !(f as any)._fainted) {
      (f as any)._fainted = true;
      this.msg(`${this.name(1)} flickered out!`);
      this.push({ k: 'faint', side: 1 });
      this.giveXp(f);
      const p = this.mon(0);
      if (p.hp > 0 && sp(p).passive === 'moxie' && this.sides[0].st.atk < 4) { this.sides[0].st.atk++; this.msg(`${this.name(0)}'s Wick burns hotter!`); }
      const next = this.sides[1].mons.findIndex((m) => m.hp > 0);
      if (next < 0) { this.result = 'win'; return true; }
      this.doSwitch(1, next, false);
      stop = true;
    }
    const p = this.mon(0);
    if (p.hp <= 0 && !(p as any)._fainted) {
      (p as any)._fainted = true;
      this.msg(`${sp(p).name} flickered out!`);
      this.push({ k: 'faint', side: 0 });
      if (!G.team.some((m) => m.hp > 0)) { this.result = 'lose'; return true; }
      this.needSwitch = true; stop = true;
    }
    return stop;
  }

  forceSwitch(idx: number) {
    this.ev = [];
    this.needSwitch = false;
    this.doSwitch(0, idx, false);
    return this.ev;
  }

  doSwitch(side: number, idx: number, voluntary: boolean) {
    const s = this.sides[side];
    const old = s.mons[s.act];
    if (voluntary && old.hp > 0 && sp(old).passive === 'restful') old.hp = Math.min(maxHp(old), old.hp + Math.floor(maxHp(old) / 6));
    if (side === 0 && old.hp > 0) { this.msg(`Come back, ${sp(old).name}!`); this.push({ k: 'recall', side }); }
    s.act = idx; s.st = { atk: 0, def: 0, spd: 0 };
    const m = s.mons[idx];
    delete (m as any)._fainted;
    this.push({ k: 'switch', side, mon: m });
    if (side === 0) { this.participants.add(m.uid); this.msg(`Go, ${sp(m).name}!`); }
    else this.msg(`${this.trainer?.name || 'The foe'} sends out ${sp(m).name}!`);
  }

  private useItem(id: string, target: number) {
    const it = ITEMS[id];
    const m = G.team[target];
    G.bag[id]--; if (G.bag[id] <= 0) delete G.bag[id];
    this.msg(`You used a ${it.name}.`);
    if (it.kind === 'heal') {
      m.hp = Math.min(maxHp(m), m.hp + (it.amount || 0));
      if (target === this.sides[0].act) this.push({ k: 'hp', side: 0, hp: m.hp });
      this.push({ k: 'sfx', n: 'heal' });
      this.msg(`${sp(m).name} glows warmly.`);
    } else if (it.kind === 'cure') {
      m.status = null; this.push({ k: 'status', side: 0 }); this.msg(`${sp(m).name} feels clear-headed.`);
    } else if (it.kind === 'revive') {
      m.hp = Math.floor(maxHp(m) / 2); delete (m as any)._fainted; this.push({ k: 'sfx', n: 'heal' }); this.msg(`${sp(m).name} was relit!`);
    }
  }

  befriendChance(id: string) {
    const f = this.mon(1); const s = sp(f);
    const pw = ITEMS[id].power || 1;
    if (pw >= 99) return 1;
    const hpF = f.hp / maxHp(f);
    let c = s.rate * pw * (1 - 0.7 * hpF) + 0.05 * pw;
    if (f.status) c *= 1.4;
    return Math.max(0.03, Math.min(0.97, c));
  }

  private throwLantern(id: string) {
    G.bag[id]--; if (G.bag[id] <= 0) delete G.bag[id];
    const f = this.mon(1);
    this.msg(`You offer the ${ITEMS[id].name} to ${sp(f).name}...`);
    const c = this.befriendChance(id);
    const ok = Math.random() < c;
    const shakes = ok ? 3 : Math.floor(Math.random() * 3 * c + Math.random());
    this.push({ k: 'lantern', shakes: Math.min(2, shakes), ok });
    if (ok) {
      f.status = null; delete (f as any)._fainted;
      const where = addMon(f);
      this.caughtMon = f;
      this.msg(`${sp(f).name} settled into the lantern! It's your friend now.`);
      if (where === 'roost') this.msg(`Your team is full, so ${sp(f).name} flew to the Roost.`);
      this.result = 'caught';
    } else {
      this.msg(['It turned away from the light.', 'Almost! It flickered back out.', 'It hesitated... but no.'][Math.min(2, shakes)]);
    }
  }

  private useMove(side: number, idx: number) {
    const me = this.mon(side), foe = this.mon(1 - side);
    if (me.hp <= 0) return;
    const mv = MOVES[me.moves[idx]];
    if (me.status === 'drowse') {
      me.statusT--;
      if (me.statusT <= 0) { me.status = null; this.msg(`${this.name(side)} woke up!`); this.push({ k: 'status', side }); }
      else { this.msg(`${this.name(side)} is drowsing...`); return; }
    }
    this.msg(`${this.name(side)} used ${mv.name}!`);
    this.push({ k: 'anim', side, type: mv.type, kind: mv.kind });
    const echo = sp(me).passive === 'echo' && mv.kind === 'status';
    if (mv.kind === 'hit' || mv.kind === 'status') {
      if (!echo && Math.random() * 100 >= mv.acc) { this.msg('But it missed!'); this.push({ k: 'sfx', n: 'miss' }); return; }
    }
    if (mv.kind === 'hit') this.doHit(side, mv);
    else if (mv.kind === 'status') {
      if (mv.inflict) this.tryInflict(1 - side, mv.inflict, true);
      if (mv.foeStat) this.changeStat(1 - side, mv.foeStat[0], mv.foeStat[1], true);
    } else if (mv.kind === 'buff' && mv.selfStat) this.changeStat(side, mv.selfStat[0], mv.selfStat[1], false);
    else if (mv.kind === 'heal') {
      const mh = maxHp(me);
      if (me.hp >= mh) { this.msg('But it\'s already at full light.'); return; }
      me.hp = Math.min(mh, me.hp + Math.floor(mh * (mv.heal || 0)));
      this.push({ k: 'hp', side, hp: me.hp }); this.push({ k: 'sfx', n: 'heal' });
      this.msg(`${this.name(side)} restored its light.`);
    }
    void foe;
  }

  previewMult(i: number) {
    const mv = MOVES[this.mon(0).moves[i]];
    if (mv.kind !== 'hit') return -1;
    return typeMult(mv.type, sp(this.mon(1)).type);
  }

  private doHit(side: number, mv: Move) {
    const me = this.mon(side), foe = this.mon(1 - side);
    const S = this.sides[side], T = this.sides[1 - side];
    const ms = sp(me), fs = sp(foe);
    const atk = stat(me, 'atk') * stageMul(S.st.atk);
    const def = stat(foe, 'def') * stageMul(T.st.def);
    let dmg = (((2 * me.lv) / 5 + 2) * mv.power * (atk / def)) / 50 + 2;
    const eff = typeMult(mv.type, fs.type);
    dmg *= eff;
    if (mv.type === ms.type) dmg *= 1.25;
    const low = me.hp <= maxHp(me) / 3;
    if (ms.passive === 'kindling' && mv.type === 'ember' && low) dmg *= 1.3;
    if (ms.passive === 'overgrowth' && mv.type === 'bloom' && low) dmg *= 1.3;
    if (ms.passive === 'radiant' && mv.type === 'plain') dmg *= 1.3;
    if (ms.passive === 'ambush' && !S.firstHit) dmg *= 1.4;
    S.firstHit = true;
    if (me.status === 'scorch') dmg *= 0.85;
    const crit = Math.random() < (mv.crit ? 0.25 : 1 / 16);
    if (crit) dmg *= 1.5;
    dmg *= 0.85 + Math.random() * 0.15;
    let d = Math.max(1, Math.floor(dmg));
    const mh = maxHp(foe);
    if (d >= foe.hp && foe.hp === mh && fs.passive === 'sturdy' && !T.sturdy.has(foe.uid)) {
      d = foe.hp - 1; T.sturdy.add(foe.uid);
      this.msg(`${this.name(1 - side)} held on with Bedrock!`);
    }
    foe.hp = Math.max(0, foe.hp - d);
    this.push({ k: 'hp', side: 1 - side, hp: foe.hp, eff, crit });
    if (crit) this.msg('A critical glint!');
    if (eff > 1) this.msg('It\'s brilliant against it!');
    else if (eff < 1) this.msg('It barely flickers...');
    if (mv.drain && me.hp > 0) {
      me.hp = Math.min(maxHp(me), me.hp + Math.max(1, Math.floor(d * mv.drain)));
      this.push({ k: 'hp', side, hp: me.hp }); this.msg(`${this.name(side)} drank in the light.`);
    }
    if (foe.hp > 0) {
      if (mv.inflict && Math.random() < (mv.chance || 0)) this.tryInflict(1 - side, mv.inflict, false);
      if (mv.foeStat && Math.random() < (mv.chance || 0)) this.changeStat(1 - side, mv.foeStat[0], mv.foeStat[1], true);
    }
    if (fs.passive === 'thorny' && me.hp > 0) {
      me.hp = Math.max(0, me.hp - Math.max(1, Math.floor(maxHp(me) / 12)));
      this.push({ k: 'hp', side, hp: me.hp }); this.msg(`${this.name(side)} is pricked by thorns!`);
    }
    if (fs.passive === 'brimstone' && me.hp > 0 && !me.status && Math.random() < 0.3) this.tryInflict(side, 'scorch', false);
  }

  private tryInflict(side: number, st: 'scorch' | 'drowse', loud: boolean) {
    const m = this.mon(side), p = sp(m).passive;
    if (m.status) { if (loud) this.msg(`${this.name(side)} is already afflicted.`); return; }
    if (st === 'drowse' && p === 'insomniac') { if (loud) this.msg(`${this.name(side)} is a Night Owl. It won't sleep!`); return; }
    if (st === 'scorch' && (p === 'radiant' || sp(m).type === 'ember')) { if (loud) this.msg(`${this.name(side)} can't be Scorched.`); return; }
    m.status = st;
    const bossSide = side === 1 && this.boss;
    m.statusT = st === 'drowse' ? (bossSide ? 2 : 2 + Math.floor(Math.random() * 2)) : 5;
    this.push({ k: 'status', side });
    this.msg(st === 'scorch' ? `${this.name(side)} was Scorched!` : `${this.name(side)} fell into a Drowse!`);
  }

  private changeStat(side: number, s: Stat, n: number, byFoe: boolean) {
    const m = this.mon(side);
    if (byFoe && n < 0 && sp(m).passive === 'stillwater') { this.msg(`${this.name(side)}'s Stillwater holds firm!`); return; }
    const st = this.sides[side].st;
    const before = st[s];
    st[s] = Math.max(-4, Math.min(4, st[s] + n));
    const nm = { atk: 'Attack', def: 'Defense', spd: 'Speed' }[s];
    if (st[s] === before) { this.msg(`${this.name(side)}'s ${nm} won't go any ${n > 0 ? 'higher' : 'lower'}.`); return; }
    this.push({ k: 'stat', side, up: n > 0 });
    this.msg(`${this.name(side)}'s ${nm} ${n > 0 ? (n > 1 ? 'rose sharply' : 'rose') : n < -1 ? 'fell sharply' : 'fell'}!`);
  }

  private giveXp(foe: Mon) {
    const base = SPECIES[foe.sp].yield * foe.lv / 5 * (this.kind === 'trainer' ? 1.4 : 1);
    for (const m of G.team) {
      if (m.hp <= 0) continue;
      let amt = base * (this.participants.has(m.uid) ? 1 : 0.5);
      const diff = foe.lv - m.lv;
      if (diff > 0) amt *= Math.min(2, 1 + 0.15 * diff);
      else if (diff < -5) amt *= 0.5;
      amt = Math.max(1, Math.floor(amt));
      if (m.lv >= 50) continue;
      m.xp += amt;
      if (m === this.mon(0)) this.msg(`${sp(m).name} gained ${amt} light.`);
      while (m.lv < 50 && m.xp >= xpForLevel(m.lv + 1)) {
        const oldMax = maxHp(m);
        m.lv++;
        m.hp += maxHp(m) - oldMax;
        this.push({ k: 'level', mon: m });
        this.msg(`${sp(m).name} grew to level ${m.lv}!`);
        for (const [l, id] of sp(m).learn) {
          if (l !== m.lv || m.moves.includes(id)) continue;
          if (m.moves.length < 4) { m.moves.push(id); this.msg(`${sp(m).name} learned ${MOVES[id].name}!`); }
          else this.push({ k: 'learn', mon: m, move: id });
        }
      }
      if (m === this.mon(0)) this.push({ k: 'xp', mon: m, frac: xpFrac(m) });
    }
    if (G.team.filter((m) => !this.participants.has(m.uid) && m.hp > 0).length) this.msg('The rest of your team shared the light.');
  }

  /** After battle: statuses fade, stat stages reset. */
  cleanup() {
    for (const m of G.team) { m.status = null; m.statusT = 0; delete (m as any)._fainted; }
  }
}

export function xpFrac(m: Mon) {
  const a = xpForLevel(m.lv), b = xpForLevel(m.lv + 1);
  return Math.max(0, Math.min(1, (m.xp - a) / (b - a)));
}
