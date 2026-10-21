import { ElemType } from './types';

export type MoveKind = 'hit' | 'status' | 'buff' | 'heal';
export interface Move {
  id: string; name: string; type: ElemType | 'plain'; kind: MoveKind;
  power: number; acc: number; desc: string;
  // effects
  chance?: number; inflict?: 'scorch' | 'drowse';
  selfStat?: [Stat, number]; foeStat?: [Stat, number];
  heal?: number; drain?: number; recoil?: number; prio?: number; crit?: boolean;
}
export type Stat = 'atk' | 'def' | 'spd';

const M: Move[] = [
  // Plain
  { id: 'flicker', name: 'Flicker', type: 'plain', kind: 'hit', power: 40, acc: 100, desc: 'A quick flash of light.' },
  { id: 'bump', name: 'Paper Bump', type: 'plain', kind: 'hit', power: 50, acc: 95, desc: 'A papery shoulder-check.' },
  { id: 'brighten', name: 'Brighten', type: 'plain', kind: 'buff', power: 0, acc: 100, selfStat: ['atk', 1], desc: 'Burn brighter. Raises Attack.' },
  { id: 'fold', name: 'Fold', type: 'plain', kind: 'buff', power: 0, acc: 100, selfStat: ['def', 1], desc: 'Fold up tight. Raises Defense.' },
  { id: 'glare', name: 'Glare', type: 'plain', kind: 'status', power: 0, acc: 100, foeStat: ['def', -1], desc: 'Dazzle the foe. Lowers its Defense.' },
  { id: 'lanternbeam', name: 'Lantern Beam', type: 'plain', kind: 'hit', power: 85, acc: 90, desc: 'A focused beam of lantern-light.' },
  // Ember
  { id: 'spark', name: 'Spark', type: 'ember', kind: 'hit', power: 40, acc: 100, chance: 0.1, inflict: 'scorch', desc: 'May Scorch (10%).' },
  { id: 'kindle', name: 'Kindle', type: 'ember', kind: 'hit', power: 65, acc: 100, desc: 'A steady lick of flame.' },
  { id: 'wildfire', name: 'Wildfire', type: 'ember', kind: 'hit', power: 95, acc: 85, chance: 0.2, inflict: 'scorch', desc: 'Raging fire. May Scorch (20%).' },
  { id: 'scorchmark', name: 'Scorch Mark', type: 'ember', kind: 'status', power: 0, acc: 90, inflict: 'scorch', chance: 1, desc: 'Brands the foe with Scorch.' },
  { id: 'warmth', name: 'Hearthwarm', type: 'ember', kind: 'heal', power: 0, acc: 100, heal: 0.4, desc: 'Restores 40% HP.' },
  { id: 'cinderdash', name: 'Cinder Dash', type: 'ember', kind: 'hit', power: 45, acc: 100, prio: 1, desc: 'Strikes first.' },
  // Tide
  { id: 'splash', name: 'Splash Jet', type: 'tide', kind: 'hit', power: 40, acc: 100, desc: 'A jet of lake-water.' },
  { id: 'undertow', name: 'Undertow', type: 'tide', kind: 'hit', power: 60, acc: 100, chance: 1, foeStat: ['spd', -1], desc: 'Drags the foe. Lowers Speed.' },
  { id: 'riptide', name: 'Riptide', type: 'tide', kind: 'hit', power: 95, acc: 85, desc: 'The whole lake, at once.' },
  { id: 'mistveil', name: 'Mist Veil', type: 'tide', kind: 'buff', power: 0, acc: 100, selfStat: ['def', 2], desc: 'Sharply raises Defense.' },
  { id: 'tidalmend', name: 'Tidal Mend', type: 'tide', kind: 'heal', power: 0, acc: 100, heal: 0.5, desc: 'Restores 50% HP.' },
  // Bloom
  { id: 'seedshot', name: 'Seed Shot', type: 'bloom', kind: 'hit', power: 40, acc: 100, desc: 'Flings glowing seeds.' },
  { id: 'thornlash', name: 'Thornlash', type: 'bloom', kind: 'hit', power: 65, acc: 100, desc: 'A whip of thorny vine.' },
  { id: 'bloomburst', name: 'Bloomburst', type: 'bloom', kind: 'hit', power: 95, acc: 85, desc: 'Petals explode in light.' },
  { id: 'pollen', name: 'Drowse Pollen', type: 'bloom', kind: 'status', power: 0, acc: 85, inflict: 'drowse', chance: 1, desc: 'Puts the foe into a Drowse.' },
  { id: 'sapdrink', name: 'Sap Drink', type: 'bloom', kind: 'hit', power: 55, acc: 100, drain: 0.5, desc: 'Heals half the damage dealt.' },
  { id: 'photosynth', name: 'Moonsynth', type: 'bloom', kind: 'heal', power: 0, acc: 100, heal: 0.5, desc: 'Restores 50% HP.' },
  // Gale
  { id: 'gust', name: 'Gust', type: 'gale', kind: 'hit', power: 40, acc: 100, desc: 'A sharp breeze.' },
  { id: 'updraft', name: 'Updraft', type: 'gale', kind: 'buff', power: 0, acc: 100, selfStat: ['spd', 2], desc: 'Sharply raises Speed.' },
  { id: 'kitecut', name: 'Kite Cut', type: 'gale', kind: 'hit', power: 60, acc: 100, crit: true, desc: 'High critical-hit ratio.' },
  { id: 'tempest', name: 'Tempest', type: 'gale', kind: 'hit', power: 95, acc: 85, desc: 'A storm wrapped in paper.' },
  { id: 'tailwind', name: 'Quickwind', type: 'gale', kind: 'hit', power: 45, acc: 100, prio: 1, desc: 'Strikes first.' },
  // Stone
  { id: 'pebble', name: 'Pebble Toss', type: 'stone', kind: 'hit', power: 40, acc: 100, desc: 'Lobs a sunken pebble.' },
  { id: 'brickbash', name: 'Brick Bash', type: 'stone', kind: 'hit', power: 70, acc: 90, desc: 'Old brick, new bruise.' },
  { id: 'landslide', name: 'Landslide', type: 'stone', kind: 'hit', power: 100, acc: 80, desc: 'Brings the shore down.' },
  { id: 'harden', name: 'Bedrock', type: 'stone', kind: 'buff', power: 0, acc: 100, selfStat: ['def', 2], desc: 'Sharply raises Defense.' },
  { id: 'rubble', name: 'Rubble', type: 'stone', kind: 'hit', power: 55, acc: 95, chance: 1, foeStat: ['spd', -1], desc: 'Lowers foe Speed.' },
  // Hush
  { id: 'murmur', name: 'Murmur', type: 'hush', kind: 'hit', power: 40, acc: 100, desc: 'A whisper that stings.' },
  { id: 'hollowcall', name: 'Hollow Call', type: 'hush', kind: 'hit', power: 60, acc: 100, chance: 1, foeStat: ['atk', -1], desc: 'Lowers foe Attack.' },
  { id: 'lullaby', name: 'Lullaby', type: 'hush', kind: 'status', power: 0, acc: 80, inflict: 'drowse', chance: 1, desc: 'Sings the foe into a Drowse.' },
  { id: 'eclipse', name: 'Eclipse', type: 'hush', kind: 'hit', power: 95, acc: 85, desc: 'Swallows the light.' },
  { id: 'quietdrain', name: 'Quiet Drain', type: 'hush', kind: 'hit', power: 55, acc: 100, drain: 0.5, desc: 'Heals half the damage dealt.' },
  { id: 'deadair', name: 'Dead Air', type: 'hush', kind: 'status', power: 0, acc: 95, foeStat: ['atk', -2], desc: 'Sharply lowers foe Attack.' },
  // Boss signature
  { id: 'heartflare', name: 'Heartflare', type: 'ember', kind: 'hit', power: 110, acc: 90, desc: 'The city\'s last fire.' },
  { id: 'deeptoll', name: 'Deep Toll', type: 'hush', kind: 'hit', power: 100, acc: 90, chance: 0.3, inflict: 'drowse', desc: 'A drowned bell rings.' },
  { id: 'binding', name: 'Binding Light', type: 'plain', kind: 'hit', power: 90, acc: 95, chance: 1, foeStat: ['spd', -1], desc: 'Chains of gold light.' },
];
export const MOVES: Record<string, Move> = Object.fromEntries(M.map((m) => [m.id, m]));
