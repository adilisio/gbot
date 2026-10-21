import { G, GameState, setState, SAVE_VERSION } from '../state';
import { WICKS } from '../data/wicks';

const PREFIX = 'lanternfall2.save.'; // v2 (lantern & wicks) - v1 saves are not compatible
export const SLOTS = ['auto', '1', '2', '3'];

export interface SaveMeta { slot: string; chapter: number; playtime: number; lead: string; wicks: number; map: string; date: number; }

export function saveTo(slot: string, mapName: string) {
  try {
    const data = { state: G, meta: { slot, chapter: G.chapter, playtime: G.playtime, lead: G.lantern[0] ? WICKS[G.lantern[0]].art : '', wicks: G.wicks.length, map: mapName, date: Date.now() } };
    localStorage.setItem(PREFIX + slot, JSON.stringify(data));
    return true;
  } catch { return false; }
}
export function readMeta(slot: string): SaveMeta | null {
  try {
    const raw = localStorage.getItem(PREFIX + slot);
    if (!raw) return null;
    return JSON.parse(raw).meta as SaveMeta;
  } catch { return null; }
}
export function loadFrom(slot: string): boolean {
  try {
    const raw = localStorage.getItem(PREFIX + slot);
    if (!raw) return false;
    const st = JSON.parse(raw).state as GameState;
    if (!st || st.version !== SAVE_VERSION || !st.lantern) return false;
    setState(st);
    return true;
  } catch { return false; }
}
export function anySave(): string | null {
  let best: SaveMeta | null = null;
  for (const s of SLOTS) { const m = readMeta(s); if (m && (!best || m.date > best.date)) best = m; }
  return best ? best.slot : null;
}
export function fmtTime(sec: number) {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60);
  return `${h}:${m.toString().padStart(2, '0')}`;
}
