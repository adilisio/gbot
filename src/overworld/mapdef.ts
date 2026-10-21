import type { ScriptAPI } from './script';

export type Script = (s: ScriptAPI) => Promise<void>;
export interface EntDef {
  id: string; x: number; y: number;
  kind: 'npc' | 'sign' | 'rest' | 'item' | 'trainer' | 'obj' | 'trigger';
  look?: string; dir?: number; obj?: string; mon?: string;
  w?: number; h?: number;
  talk?: Script; show?: () => boolean; sight?: number; solid?: boolean; glow?: string; wander?: boolean;
}
export interface Warp { x: number; y: number; to: string; tx: number; ty: number; dir?: number; show?: () => boolean; }
export interface MapDef {
  id: string; name: string; music: string; chapter: number; theme: string;
  tiles: string[]; floor?: string; light?: string;
  enc?: [string, number, number, number][]; rate?: number;
  ents: EntDef[]; warps: Warp[];
  onEnter?: Script; gateFlag?: string; onSolve?: Script;
}
const MAPS: Record<string, MapDef> = {};
export function registerMap(m: MapDef) {
  const w = Math.max(...m.tiles.map((r) => r.length));
  m.tiles = m.tiles.map((r) => r.padEnd(w, '~'));
  MAPS[m.id] = m;
}
export function getMap(id: string): MapDef {
  const m = MAPS[id];
  if (!m) throw new Error('Unknown map ' + id);
  return m;
}
export function allMaps() { return MAPS; }
