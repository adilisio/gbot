// The lantern's wicks: named glimmers you meet in the story. Each one shapes what your light can do.
// Art comes from the procedural sprite recipes in glimmers.ts (keyed by `art`).

export type Elem = 'ember' | 'tide' | 'bloom' | 'gale' | 'stone' | 'hush' | 'static' | 'plain';
export type Shape = 'cone' | 'ring' | 'line' | 'lob' | 'cross' | 'self' | 'swap' | 'ally';

export interface Ability {
  id: string; name: string; shape: Shape; elem: Elem; cost: number; desc: string;
  range?: number; pierce?: boolean;
  dmg?: number; push?: number; stun?: boolean; ignite?: boolean; wet?: boolean;
  ward?: boolean; moss?: boolean; shield?: boolean; oil?: number; once?: boolean;
  relight?: boolean; fan?: boolean; chain?: boolean; spawnCancel?: boolean;
  reMove?: boolean; reAct?: boolean; allStun?: boolean; flask?: boolean; emptyOnly?: boolean; brazierOnly?: boolean; foeOnly?: boolean;
}

export interface Wick {
  id: string; art: string; name: string; role: string; color: string;
  mv: number; fly?: boolean; swim?: boolean;
  blurb: string; voice: string; join: string; bond: [string, string];
  abilities: [Ability, Ability, Ability];
}

export const ELEM_COLOR: Record<Elem, string> = {
  ember: '#ff9a4a', tide: '#5ab8ff', bloom: '#7fe07a', gale: '#cfe8ff', stone: '#d8b98a', hush: '#b48cff', static: '#fff27a', plain: '#f4e6c8',
};
export const ELEM_NAME: Record<Elem, string> = {
  ember: 'Fire', tide: 'Water', bloom: 'Moss', gale: 'Wind', stone: 'Stone', hush: 'Hush', static: 'Static', plain: 'Lantern',
};

const W: Wick[] = [
  {
    id: 'cindle', art: 'cindle', name: 'Cindle', role: 'Striker', color: '#ffb05a', mv: 3,
    blurb: 'A fox-kit curled around a candle stub. Brash, loud, and quietly terrified of being put out.',
    voice: '"Point me at it. No - closer. CLOSER."',
    join: 'Cindle leaps into your lantern and the flame jumps a full inch. It looks extremely pleased with itself.',
    bond: ['Cindle presses its nose to the glass. "I used to think I had to be the brightest thing in the room. It\'s nicer being bright WITH someone."', 'Cindle\'s tail-flame turns white at the tip. "Hey. Wren. Whatever happens up there - I\'m not going out first."'],
    abilities: [
      { id: 'flare', name: 'Flare', shape: 'cone', elem: 'ember', cost: 2, dmg: 2, relight: true, desc: 'A fan of fire: 2 burn to every shade in the cone. Relights braziers. Wet shades douse it.' },
      { id: 'kindle', name: 'Kindle', shape: 'lob', elem: 'ember', cost: 1, range: 3, ignite: true, relight: true, desc: 'Lob a spark: sets a shade burning (1 per turn, 2 turns). Relights a brazier.' },
      { id: 'bonfire', name: 'Bonfire', shape: 'ring', elem: 'ember', cost: 3, dmg: 1, ignite: true, relight: true, desc: 'Burst into flame: 1 burn and set burning every shade around Cindle.' },
    ],
  },
  {
    id: 'ripplet', art: 'ripplet', name: 'Ripplet', role: 'Pusher', color: '#6ec8ff', mv: 2, swim: true,
    blurb: 'A seal-pup with a lamp for a nose. Apologises to everything, including walls it bumps into.',
    voice: '"Sorry! Sorry. Um. Excuse me, shade, could you - MOVE?"',
    join: 'Ripplet wriggles into your lantern, bumps the glass, and says sorry to it.',
    bond: ['Ripplet floats up to your face. "I\'m going to stop saying sorry so much. ...Sorry. That one doesn\'t count."', 'Ripplet\'s glow goes deep and steady, like the lake on a still night. "The water isn\'t scary when you\'re carrying the light."'],
    abilities: [
      { id: 'undertow', name: 'Undertow', shape: 'line', elem: 'tide', cost: 1, range: 4, push: 2, wet: true, desc: 'A jet of water hits the first shade in line, soaks it and shoves it 2 tiles. Puts out burning.' },
      { id: 'tidepool', name: 'Tidepool', shape: 'ring', elem: 'tide', cost: 2, push: 1, wet: true, desc: 'A swell around Ripplet: soaks and pushes every adjacent shade 1 tile outward.' },
      { id: 'breaker', name: 'Breaker', shape: 'line', elem: 'tide', cost: 2, range: 5, pierce: true, push: 1, dmg: 1, wet: true, desc: 'A wave down the whole line: 1 damage, soak and push 1 to everything in it.' },
    ],
  },
  {
    id: 'sproutwick', art: 'sproutwick', name: 'Sproutwick', role: 'Warden', color: '#8fe07a', mv: 2,
    blurb: 'A fern-candle with the patience of a grandmother and the opinions of two.',
    voice: '"Breathe, dear. Then root them where they stand."',
    join: 'Sproutwick settles into your lantern like it is settling into an armchair. "Lovely. A bit draughty."',
    bond: ['Sproutwick hums. "My roots go further than you\'d think, little courier. All the way down to the old streets."', 'A new leaf unfurls, glowing gold. "There. Something new grows every night, if you let it."'],
    abilities: [
      { id: 'rootlight', name: 'Rootlight', shape: 'ring', elem: 'bloom', cost: 2, stun: true, desc: 'Glowing roots grip every adjacent shade: they lose their next attack.' },
      { id: 'glowmoss', name: 'Glowmoss', shape: 'cross', elem: 'bloom', cost: 1, range: 3, moss: true, desc: 'Plant glowmoss in a cross. Darkness can never creep onto moss.' },
      { id: 'sap', name: 'Sap', shape: 'self', elem: 'bloom', cost: 0, oil: 4, once: true, desc: 'Once per fight: wring sweet sap into the lantern. +4 oil.' },
    ],
  },
  {
    id: 'pebblit', art: 'pebblit', name: 'Cobble', role: 'Wall', color: '#d8b98a', mv: 2,
    blurb: 'A pebble-glimmer who lived forty years in Brannock\'s boat lamp. Gruff. Stubborn. Loyal as a mooring post.',
    voice: '"Hmph. Stand behind me."',
    join: 'Cobble rolls into your lantern with a clunk. "Brannock said you need looking after. Hmph."',
    bond: ['Cobble grinds against the glass, which you are fairly sure is a hug. "You\'re all right, courier."', 'Cobble glows like a hearthstone. "Forty years in a boat lamp. Should\'ve left sooner. Hmph."'],
    abilities: [
      { id: 'cairn', name: 'Cairn', shape: 'lob', elem: 'stone', cost: 1, range: 2, ward: true, emptyOnly: true, desc: 'Raise a stone on an empty tile. It blocks movement and darkness, and soaks two hits.' },
      { id: 'rockfall', name: 'Rockfall', shape: 'lob', elem: 'stone', cost: 2, range: 3, dmg: 2, desc: 'Drop a stone on one tile: 2 damage.' },
      { id: 'landslide', name: 'Landslide', shape: 'line', elem: 'stone', cost: 2, range: 3, pierce: true, dmg: 1, push: 1, desc: 'Roll down a line: 1 damage and push 1 to everything in it.' },
    ],
  },
  {
    id: 'mothkin', art: 'mothkin', name: 'Flit', role: 'Mover', color: '#c9d8ff', mv: 4, fly: true,
    blurb: 'The moth you cut free from Fenn\'s net. Speaks mostly in half-finished poems.',
    voice: '"The dark is only a door, and I am - oh! a light!"',
    join: 'Flit spirals down and folds itself into your lantern, a scorched gold thread still on one wing. "You opened the net. I remember. I remember everything bright."',
    bond: ['Flit traces a loop of light on the glass. "A poem: courier, lantern, me. ...It\'s not finished. Neither are we."', 'Flit\'s wings glitter like frost on a window. "I flew into a net once because it shone. Now I know which lights are kind."'],
    abilities: [
      { id: 'flutter', name: 'Flutter', shape: 'swap', elem: 'gale', cost: 1, range: 3, desc: 'Swap places with any unit within 3 - friend or shade. A shade\'s attack moves with it.' },
      { id: 'dust', name: 'Moondust', shape: 'cone', elem: 'hush', cost: 2, stun: true, desc: 'Shimmering dust in a cone: every shade in it loses its next attack.' },
      { id: 'secondwind', name: 'Second Wind', shape: 'ally', elem: 'gale', cost: 2, range: 4, reAct: true, once: true, desc: 'Once per fight: an ally who already acted may act again.' },
    ],
  },
  {
    id: 'driftjelly', art: 'driftjelly', name: 'Mira', role: 'Soother', color: '#8fd0ff', mv: 2, swim: true,
    blurb: 'A jellyfish of lamp-light from the Kitefall shrine pool. Dreamy. Hums tunes nobody else remembers.',
    voice: '"Mm. Float with me a moment. There."',
    join: 'Mira drifts up out of the shrine pool and into your lantern, humming. The oil in the reservoir goes still and clear.',
    bond: ['Mira hums the tune Marlow plays at the end of every show. "He learned it from the lake. The lake learned it from us."', 'Mira\'s glow spreads out like a calm tide. "I remember Port Calloway when it was dry. It was loud. I like you better."'],
    abilities: [
      { id: 'glow', name: 'Soft Glow', shape: 'ring', elem: 'tide', cost: 1, shield: true, desc: 'Allies around Mira (and Mira) are shielded: the next hit on them costs no oil.' },
      { id: 'brine', name: 'Brine', shape: 'line', elem: 'tide', cost: 1, range: 4, pierce: true, wet: true, desc: 'Soak every shade in a line. Wet shades can\'t burn, move slower, and conduct Static.' },
      { id: 'stilloil', name: 'Still Oil', shape: 'self', elem: 'tide', cost: 0, oil: 5, once: true, desc: 'Once per fight: Mira clears the reservoir. +5 oil.' },
    ],
  },
  {
    id: 'kiteling', art: 'kiteling', name: 'Tack', role: 'Wind', color: '#e0f0ff', mv: 3, fly: true,
    blurb: 'A kite-glimmer from Vale\'s crews. Shouts everything. Has never once been told to quiet down successfully.',
    voice: '"WIND\'S UP! HOLD ON TO SOMETHING!"',
    join: 'Tack slams into your lantern like a gust through a window. "CAPTAIN SAYS I\'M YOURS NOW! HI!"',
    bond: ['Tack lowers its voice, which is still loud. "Captain Vale says the best kite is the one that knows which way home is. I THINK IT\'S YOU."', 'Tack\'s tail streams out in a long ribbon of light. "I can feel every rooftop wind in the city tonight! THEY\'RE ALL BLOWING TOWARD THE CROWN!"'],
    abilities: [
      { id: 'gust', name: 'Gust', shape: 'line', elem: 'gale', cost: 1, range: 5, pierce: true, push: 1, fan: true, desc: 'Wind down a line: push everything 1. Fans flames - burning shades spread fire to their neighbours.' },
      { id: 'tailwind', name: 'Tailwind', shape: 'ally', elem: 'gale', cost: 1, range: 4, reMove: true, desc: 'An ally within 4 may move again this turn.' },
      { id: 'squall', name: 'Squall', shape: 'ring', elem: 'gale', cost: 2, push: 1, fan: true, desc: 'A whirlwind: push every adjacent shade 1 outward and fan their flames.' },
    ],
  },
  {
    id: 'emberwisp', art: 'emberwisp', name: 'Wisp', role: 'Artillery', color: '#ff8a4a', mv: 2, fly: true,
    blurb: 'An old flame that burned alone in a drowned streetlamp for a hundred years. Grumpy. Very good aim.',
    voice: '"Hundred years underwater. You think a little shade scares me?"',
    join: 'Wisp climbs out of the drowned lamp, coughs a little smoke, and settles into your lantern. "Fine. One more delivery. Then I\'m retiring."',
    bond: ['Wisp grumbles. "Used to light the corner of Fourth and Water. Kids played under me. ...Don\'t tell anyone I said that."', 'Wisp flares bright and steady. "Retiring\'s off. Somebody\'s got to keep you lot lit."'],
    abilities: [
      { id: 'spark', name: 'Spark', shape: 'cross', elem: 'ember', cost: 2, range: 4, dmg: 1, ignite: true, relight: true, desc: 'Lob a firebomb: 1 burn and set burning in a cross. Relights braziers.' },
      { id: 'beacon', name: 'Beacon', shape: 'lob', elem: 'ember', cost: 1, range: 5, relight: true, ignite: true, desc: 'A long, careful shot: relight a far brazier, or set one shade burning.' },
      { id: 'starfall', name: 'Starfall', shape: 'cross', elem: 'ember', cost: 3, range: 4, dmg: 2, relight: true, desc: 'The old streetlamp\'s full glare: 2 burn in a cross.' },
    ],
  },
  {
    id: 'hushling', art: 'hushling', name: 'Hollow', role: 'Silencer', color: '#b48cff', mv: 2,
    blurb: 'A small, quiet child of the lake who rose when you gave the shard back. Speaks only in whispers.',
    voice: '"...shh. listen. they\'re afraid too."',
    join: 'Hollow rises from the water in silence and curls inside your lantern. The flame goes lavender and very calm.',
    bond: ['Hollow whispers, "mother says you are the first light that ever gave something back."', 'Hollow\'s glow ripples. "...when the end comes, i will sing. you will hear it."'],
    abilities: [
      { id: 'lull', name: 'Lull', shape: 'line', elem: 'hush', cost: 1, range: 4, pierce: true, stun: true, desc: 'A whisper down a line: every shade in it loses its next attack.' },
      { id: 'still', name: 'Stillness', shape: 'ring', elem: 'hush', cost: 2, stun: true, spawnCancel: true, desc: 'Silence nearby: adjacent shades lose their attack, and rising shades within 2 sink back.' },
      { id: 'deephush', name: 'Deep Hush', shape: 'self', elem: 'hush', cost: 3, allStun: true, once: true, desc: 'Once per fight: the whole board holds its breath. No shade attacks this round.' },
    ],
  },
  {
    id: 'staticat', art: 'staticat', name: 'Static', role: 'Chain', color: '#fff27a', mv: 3,
    blurb: 'A radio-cat who lived in the WKHV transmitter. Talks like a late-night DJ, constantly.',
    voice: '"You\'re tuned to Static, baby. Let\'s make some noise."',
    join: 'Static pours out of the transmitter in a crackle and lands in your lantern. "Heard your broadcast, kid. That was the realest thing on the air in ten years. I\'m in."',
    bond: ['Static purrs in perfect stereo. "Every lantern in this town is a little radio, you know. They\'re all listening to you."', 'Static\'s fur stands up in a halo of sparks. "Final segment, baby. Let\'s give \'em a show."'],
    abilities: [
      { id: 'crackle', name: 'Crackle', shape: 'line', elem: 'static', cost: 2, range: 5, dmg: 2, chain: true, desc: 'Lightning hits the first shade in line for 2, and jumps between touching wet shades.' },
      { id: 'jam', name: 'Jam', shape: 'lob', elem: 'static', cost: 1, range: 5, stun: true, foeOnly: true, desc: 'Jam one shade\'s signal anywhere within 5: it loses its next attack.' },
      { id: 'feedback', name: 'Feedback', shape: 'ring', elem: 'static', cost: 2, dmg: 1, chain: true, desc: '1 damage to every adjacent shade, jumping through wet ones.' },
    ],
  },
];

export const WICKS: Record<string, Wick> = Object.fromEntries(W.map((w) => [w.id, w]));
export const WICK_ORDER = W.map((w) => w.id);

/** Courier's own actions (always available). */
export const COURIER_ABILITIES: Ability[] = [
  { id: 'relight', name: 'Relight', shape: 'lob', elem: 'plain', cost: 1, range: 1, relight: true, brazierOnly: true, desc: 'Light an adjacent brazier with your courier\'s match.' },
  { id: 'shove', name: 'Shove', shape: 'lob', elem: 'plain', cost: 0, range: 1, push: 1, foeOnly: true, desc: 'Shove an adjacent shade 1 tile away. Free. Into water, it sinks.' },
  { id: 'flask', name: 'Oil Flask', shape: 'self', elem: 'plain', cost: 0, flask: true, desc: 'Pour an oil flask from your bag into the lantern.' },
];

export const BOND_AT = [0, 3, 7]; // bond points needed for ability 1, 2, 3
export function bondLevel(points: number) { return points >= BOND_AT[2] ? 3 : points >= BOND_AT[1] ? 2 : 1; }
