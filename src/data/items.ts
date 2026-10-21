export interface Item { id: string; name: string; price: number; desc: string; kind: 'oil' | 'key' | 'upgrade'; amount?: number; }
const I: Item[] = [
  { id: 'flask', name: 'Oil Flask', price: 60, kind: 'oil', amount: 6, desc: 'Pour into your lantern: +6 oil. Usable in a fight (courier action) or from the Bag.' },
  { id: 'bigflask', name: 'Lamp Oil Jug', price: 150, kind: 'oil', amount: 14, desc: 'A heavy jug of good lamp oil: +14 oil.' },
  { id: 'silkwick', name: 'Silk Wick-Thread', price: 0, kind: 'upgrade', amount: 2, desc: 'Guild silk woven into your lantern. Your oil reservoir holds 2 more.' },
  { id: 'letter', name: 'Sealed Letter', price: 0, kind: 'key', desc: 'Guild wax, addressed to Captain Vale of the Kite Crews.' },
  { id: 'shard', name: 'Ember Shard', price: 0, kind: 'key', desc: 'A sliver of the Heartwick. Warm as a held hand.' },
  { id: 'oil', name: 'Lamp Oil Parcel', price: 0, kind: 'key', desc: 'For Old Brannock at the ferry dock.' },
  { id: 'seeds', name: 'Seed Parcel', price: 0, kind: 'key', desc: 'Moss seeds for Tamsin at the Reedmoss lamp hut.' },
  { id: 'starlantern', name: 'Star Lantern', price: 0, kind: 'key', desc: 'An heirloom of the Tidefolk. It hums on 720.' },
];
export const ITEMS: Record<string, Item> = Object.fromEntries(I.map((i) => [i.id, i]));
export const ITEM_ORDER = I.map((i) => i.id);
/** Old item ids used in story scripts map onto the new economy. */
export const ITEM_ALIAS: Record<string, string> = {
  tonic: 'flask', salve: 'flask', lantern: 'flask', bigtonic: 'bigflask', rekindle: 'bigflask', elixir: 'bigflask', silklantern: 'silkwick',
};
export function itemId(id: string) { return ITEM_ALIAS[id] || id; }
