export type ElemType = 'ember' | 'tide' | 'bloom' | 'gale' | 'stone' | 'hush';
export const TYPES: ElemType[] = ['ember', 'tide', 'bloom', 'gale', 'stone', 'hush'];
export const TYPE_NAME: Record<ElemType | 'plain', string> = {
  ember: 'Ember', tide: 'Tide', bloom: 'Bloom', gale: 'Gale', stone: 'Stone', hush: 'Hush', plain: 'Plain',
};
export const TYPE_COLOR: Record<ElemType | 'plain', string> = {
  ember: '#ff9a3c', tide: '#4fb3ff', bloom: '#7fe07a', gale: '#c9d8ff', stone: '#c8a37a', hush: '#b48cff', plain: '#e8dcc0',
};
export const TYPE_DARK: Record<ElemType | 'plain', string> = {
  ember: '#8a3414', tide: '#163f7a', bloom: '#1f6a34', gale: '#4c5a8c', stone: '#5e4632', hush: '#3e2470', plain: '#6a6050',
};
// Each type is strong (x2) against two others. Defender strong against attacker, or same type => x0.5.
export const BEATS: Record<ElemType, ElemType[]> = {
  ember: ['bloom', 'hush'],   // light pierces the quiet; fire eats leaves
  tide: ['ember', 'stone'],   // water douses, erodes
  bloom: ['tide', 'stone'],   // roots drink water, split rock
  gale: ['bloom', 'ember'],   // wind scatters petals, snuffs flame
  stone: ['gale', 'hush'],    // walls break wind; stone remembers
  hush: ['tide', 'gale'],     // silence stills waves and wind
};
export function typeMult(atk: ElemType | 'plain', def: ElemType): number {
  if (atk === 'plain') return 1;
  if (BEATS[atk].includes(def)) return 2;
  if (atk === def || BEATS[def].includes(atk)) return 0.5;
  return 1;
}
export const TYPE_BLURB: Record<ElemType, string> = {
  ember: 'Lamp-flame and candle-wick. Hot tempered, quick to burn.',
  tide: 'The drowned lake below. Patient, heavy, cold.',
  bloom: 'Moss and lotus that grow on lantern-paper.',
  gale: 'Night winds that carry the city aloft.',
  stone: 'Old foundations of the sunken shore.',
  hush: 'The quiet between radio stations.',
};
