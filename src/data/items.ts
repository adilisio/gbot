export interface Item { id: string; name: string; price: number; desc: string; kind: 'heal' | 'cure' | 'revive' | 'lantern' | 'key'; amount?: number; power?: number; }
const I: Item[] = [
  { id: 'tonic', name: 'Wick Tonic', price: 60, kind: 'heal', amount: 30, desc: 'Restores 30 HP to one glimmer.' },
  { id: 'bigtonic', name: 'Lamp Oil', price: 180, kind: 'heal', amount: 90, desc: 'Restores 90 HP to one glimmer.' },
  { id: 'elixir', name: 'Moon Elixir', price: 450, kind: 'heal', amount: 9999, desc: 'Fully restores one glimmer.' },
  { id: 'salve', name: 'Cool Salve', price: 50, kind: 'cure', desc: 'Cures Scorch and Drowse.' },
  { id: 'rekindle', name: 'Rekindle', price: 300, kind: 'revive', desc: 'Relights a faded glimmer at half HP.' },
  { id: 'lantern', name: 'Paper Lantern', price: 100, kind: 'lantern', power: 1, desc: 'Offer it to a wild glimmer to befriend it.' },
  { id: 'silklantern', name: 'Silk Lantern', price: 320, kind: 'lantern', power: 1.8, desc: 'A finer lantern. Much better odds.' },
  { id: 'letter', name: 'Sealed Letter', price: 0, kind: 'key', desc: 'Guild wax, addressed to Captain Vale of the Kite Crews.' },
  { id: 'shard', name: 'Ember Shard', price: 0, kind: 'key', desc: 'A sliver of the Heartwick. Warm as a held hand.' },
  { id: 'oil', name: 'Lamp Oil Parcel', price: 0, kind: 'key', desc: 'For Old Brannock at the ferry dock.' },
  { id: 'seeds', name: 'Seed Parcel', price: 0, kind: 'key', desc: 'Moss seeds for Tamsin at the Reedmoss lamp hut.' },
  { id: 'starlantern', name: 'Star Lantern', price: 0, kind: 'lantern', power: 99, desc: 'An heirloom. Any wild glimmer will accept it.' },
];
export const ITEMS: Record<string, Item> = Object.fromEntries(I.map((i) => [i.id, i]));
export const ITEM_ORDER = I.map((i) => i.id);
