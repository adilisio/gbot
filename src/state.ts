import { ITEMS, itemId } from './data/items';
import { WICKS, bondLevel } from './data/wicks';

export interface GameState {
  map: string; x: number; y: number; dir: number;
  flags: Record<string, number>;
  wicks: string[];          // every glimmer who has joined you
  lantern: string[];        // up to 3 active wicks
  bond: Record<string, number>;
  oil: number;
  bag: Record<string, number>;
  glints: number; chapter: number; playtime: number;
  rest: { map: string; x: number; y: number; name: string };
  version: number; obj: string; done: boolean;
}
export const SAVE_VERSION = 2;
export const LANTERN_SLOTS = 3;
export const BASE_OIL = 16;

export function newState(): GameState {
  return {
    map: 'lowwick', x: 7, y: 7, dir: 1, flags: {}, wicks: [], lantern: [], bond: {}, oil: BASE_OIL,
    bag: { flask: 2 }, glints: 200, chapter: 1, playtime: 0,
    rest: { map: 'lowwick', x: 12, y: 6, name: 'Courier Post shrine' }, version: SAVE_VERSION, obj: 'Report to the Courier Post.', done: false,
  };
}

export let G: GameState = newState();
export function setState(s: GameState) { G = s; }

export function flag(k: string) { return G.flags[k] || 0; }
export function setFlag(k: string, v = 1) { G.flags[k] = v; }
export function addFlag(k: string, v: number) { G.flags[k] = (G.flags[k] || 0) + v; }

export function giveItem(id: string, n = 1) { id = itemId(id); G.bag[id] = (G.bag[id] || 0) + n; if (G.bag[id] <= 0) delete G.bag[id]; }

/** Oil capacity grows with every shrine you relight and with silk wick-thread. */
export function oilMax() {
  const shrines = Object.keys(G.flags).filter((k) => k.startsWith('shrine_') && G.flags[k]).length;
  return BASE_OIL + 2 * shrines + (G.bag.silkwick || 0) * (ITEMS.silkwick.amount || 2);
}
export function refill() { G.oil = oilMax(); }
export function addOil(n: number) { G.oil = Math.max(0, Math.min(oilMax(), G.oil + n)); }

export function hasWick(id: string) { return G.wicks.includes(id); }
/** Returns 'lantern' if it went straight into the lantern, else 'satchel'. */
export function addWick(id: string): 'lantern' | 'satchel' {
  if (!WICKS[id]) throw new Error('bad wick ' + id);
  if (!G.wicks.includes(id)) G.wicks.push(id);
  if (G.bond[id] === undefined) G.bond[id] = 0;
  if (G.lantern.includes(id)) return 'lantern';
  if (G.lantern.length < LANTERN_SLOTS) { G.lantern.push(id); return 'lantern'; }
  return 'satchel';
}
export function bondOf(id: string) { return bondLevel(G.bond[id] || 0); }
/** Add bond points to every wick in the lantern. Returns the wicks that reached a new bond level. */
export function bondLantern(n = 1): string[] {
  const up: string[] = [];
  for (const id of G.lantern) {
    const before = bondOf(id);
    G.bond[id] = (G.bond[id] || 0) + n;
    if (bondOf(id) > before) up.push(id);
  }
  return up;
}
export function leadName() { return G.lantern[0] ? WICKS[G.lantern[0]].name : 'your glimmer'; }
