import { SPECIES, Species } from './data/glimmers';
import { MOVES } from './data/moves';

export type Status = 'scorch' | 'drowse' | null;
export interface Mon {
  uid: number; sp: string; lv: number; xp: number; hp: number;
  moves: string[]; status: Status; statusT: number;
}
export interface GameState {
  map: string; x: number; y: number; dir: number;
  flags: Record<string, number>;
  team: Mon[]; roost: Mon[];
  bag: Record<string, number>;
  glints: number; chapter: number; playtime: number;
  rest: { map: string; x: number; y: number };
  seen: string[]; befriended: string[];
  nextUid: number; version: number; obj: string; done: boolean;
}

export function newState(): GameState {
  return {
    map: 'lowwick', x: 7, y: 7, dir: 1, flags: {}, team: [], roost: [],
    bag: { tonic: 3, lantern: 5 }, glints: 300, chapter: 1, playtime: 0,
    rest: { map: 'lowwick', x: 7, y: 7 }, seen: [], befriended: [], nextUid: 1, version: 1, obj: 'Report to the Courier Post.', done: false,
  };
}

export let G: GameState = newState();
export function setState(s: GameState) { G = s; }

export function xpForLevel(lv: number) { return Math.floor(0.6 * lv * lv * lv); }

export function calcStat(base: number, lv: number, hp = false) {
  return hp ? Math.floor((2 * base * lv) / 100) + lv + 10 : Math.floor((2 * base * lv) / 100) + 5;
}
export function maxHp(m: Mon) { return calcStat(SPECIES[m.sp].hp, m.lv, true); }
export function stat(m: Mon, s: 'atk' | 'def' | 'spd') { return calcStat(SPECIES[m.sp][s], m.lv); }
export function sp(m: Mon): Species { return SPECIES[m.sp]; }

export function movesAt(spId: string, lv: number): string[] {
  const s = SPECIES[spId];
  const known = s.learn.filter(([l]) => l <= lv).map(([, id]) => id);
  return known.slice(-4);
}

export function makeMon(spId: string, lv: number, uid?: number): Mon {
  const m: Mon = { uid: uid ?? G.nextUid++, sp: spId, lv, xp: xpForLevel(lv), hp: 0, moves: movesAt(spId, lv), status: null, statusT: 0 };
  m.hp = maxHp(m);
  for (const id of m.moves) if (!MOVES[id]) throw new Error('bad move ' + id);
  return m;
}

export function healAll() {
  for (const m of G.team) { m.hp = maxHp(m); m.status = null; m.statusT = 0; }
}

export function flag(k: string) { return G.flags[k] || 0; }
export function setFlag(k: string, v = 1) { G.flags[k] = v; }
export function addFlag(k: string, v: number) { G.flags[k] = (G.flags[k] || 0) + v; }

export function giveItem(id: string, n = 1) { G.bag[id] = (G.bag[id] || 0) + n; if (G.bag[id] <= 0) delete G.bag[id]; }

export function addMon(m: Mon): 'team' | 'roost' {
  if (!G.befriended.includes(m.sp)) G.befriended.push(m.sp);
  if (!G.seen.includes(m.sp)) G.seen.push(m.sp);
  if (G.team.length < 4) { G.team.push(m); return 'team'; }
  G.roost.push(m); return 'roost';
}
export function markSeen(spId: string) { if (!G.seen.includes(spId)) G.seen.push(spId); }
export function teamAlive() { return G.team.some((m) => m.hp > 0); }
export function avgLevel() { return G.team.length ? Math.round(G.team.reduce((a, m) => a + m.lv, 0) / G.team.length) : 5; }
