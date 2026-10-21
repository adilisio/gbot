import { registerMap } from '../overworld/mapdef';
import { flag, G } from '../state';
import type { ScriptAPI } from '../overworld/script';
import { juniperStarter } from './ch1';

const EVO: Record<string, string> = { cindle: 'wickfox', ripplet: 'brinewhisk', sproutwick: 'lumibloom' };
export const relaysDone = () => !!(flag('relayW') && flag('relayM') && flag('relayE'));

function pedestal(key: string, freq: number, name: string, plate: string) {
  return async (s: ScriptAPI) => {
    if (flag(key)) { await s.say(null, `The ${name} relay hums, locked and steady.`); return; }
    await s.say(null, `A relay pedestal with a brass dial. The plate reads: "${plate}"`);
    const ok = await s.tune(freq, `${name} RELAY`);
    if (ok) {
      s.set(key);
      await s.say(null, `The ${name} relay locks on. The tower above you crackles and lights up, red and steady.`);
      if (relaysDone()) { s.sfx('chime'); await s.say(null, 'All three relays are live! Down the hill, a radio somewhere starts playing music for the first time in years.'); s.objective('Go to the WKHV booth and find Marlow.'); }
    } else await s.say(null, 'You step back from the dial. You can try again whenever you like.');
  };
}

async function marlow(s: ScriptAPI) {
  if (flag('c4')) { await s.say('Marlow', 'Lift to the Crown is open, kid. Go. I\'ll keep the lights on - the radio ones, at least.'); return; }
  if (!relaysDone()) {
    await s.say('Marlow', 'Well, if it isn\'t a real live listener. Marlow, WKHV, 1450 on your dial. Or it would be, if my relays weren\'t dead.');
    await s.say('Marlow', 'Three relay towers out on the Heights. Tune each to its own channel and I can reach every radio in Wickhaven.');
    await s.say('Marlow', 'The east one\'s mine - 1450, naturally. The middle one carries the Kite Crews\' channel. The west one... the old-timers say it was tuned to "the drowned choir". Ask around.');
    s.objective('Tune the three relay towers (west, middle, east) on Static Heights.');
    return;
  }
  await s.say('Marlow', 'Listen to that. Every relay live. First time in twenty years I can reach the whole city.');
  await s.say('Marlow', 'And look what the Guild sent up an hour ago. A script. "Remain calm. The Provost has the Dimming in hand. Bring your glimmers to the Crown for safekeeping."');
  if (flag('knowsBinding')) await s.say('Marlow', 'Safekeeping. You and I both know what happens to glimmers on the Crown. You\'ve been down the Steps, I can tell. You\'ve got lake in your eyes.');
  await s.say('Marlow', 'Here\'s a secret, courier. Old Calloway built these relays to carry lighthouse light along the shore, not just voices. They could carry light again. But only if people trust whoever\'s asking. Glimmers too.');
  await s.say('Marlow', 'So. You\'ve got the mic. What goes out on the air tonight?');
  const c = await s.choose('Marlow', 'The red ON AIR lamp is glowing.', ['Tell the city the truth', 'Read the Guild\'s script', 'Leave the air to static']);
  if (c === 0) {
    s.set('c4', 1);
    await s.radio([
      ['MARLOW', 'This is Marlow on WKHV, 1450. Tonight, we\'ve got a courier on the line. She\'s been places you and I haven\'t. Go ahead, kid.'],
      ['WREN', 'The Heartwick is tired. It was only ever supposed to carry us for one lifetime. The Guild wants to keep it burning by binding every glimmer in the city into its flame.'],
      ['WREN', 'Your glimmers. Your kids\' glimmers. That\'s what "safekeeping" means. Don\'t bring them to the Crown.'],
      ['WREN', 'But don\'t give up, either. If everyone lights their own lantern tonight - just a little - maybe we can carry the city together.'],
      ['MARLOW', 'You heard her, Wickhaven. Light a lantern. Leave it in the window. And stay tuned to 1450.'],
    ]);
    await s.say('Marlow', 'Look out the window, kid. Look at that.');
    await s.say(null, 'Across the dark city, one by one, windows begin to glow.');
  } else if (c === 1) {
    s.set('c4', 2);
    await s.radio([
      ['MARLOW', '...This is WKHV, 1450, with a message from the Lamplighters\' Guild.'],
      ['WREN', '"Remain calm. The Provost has the Dimming in hand. Bring your glimmers to the Crown for safekeeping. A bright city is a safe city."'],
      ['MARLOW', 'That\'s the news. Here\'s some music.'],
    ]);
    await s.say('Marlow', 'Well. You\'re the courier. You carried what you were given. Doesn\'t mean I have to like it.');
  } else {
    s.set('c4', 3);
    await s.radio([['MARLOW', '...'], ['STATIC', '(Soft hiss. Under it, very faintly, something like the lake breathing.)'], ['MARLOW', '...Sometimes the quiet says it best.']]);
  }
  await s.say('Marlow', 'The Crown lift is east of here. I unlocked it from the booth. Whatever happens up there, kid - I\'ll be listening.');
  s.set('ch4done');
  s.objective('Ride the lift (north-east) to the Heartwick Crown.');
}

registerMap({
  id: 'heights', name: 'Static Heights', music: 'heights', chapter: 4, theme: 'heights', light: '#ff6a5a', floor: ':',
  tiles: [
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
    '~~~~~~~~~~~~~RRRRRRRRRRRRRR~~~~~~~~~~SS~',
    '~~~~~~~~~~~~~#W##W#KK#W##W#~~~~~~~~~~::~',
    '~~~~~~~~~~~~~KLLLLLLLLLLLLK~~~~~~~~~~::~',
    '~~~~~~~~~~~~~KLLLLLLLLLLLLK~~~~~~~~~~::~',
    '~~~~~~~~~~~~~LLLLLLLLLLLLLL~~~~~~~~~~::~',
    '~~~~~~~~~~~~~~~~~~LL~~~~~~~~~~~~~~~~~::~',
    '~~~AA~~~~~~~~~~~~~::~~~~~~~~~~~~~~AA::~~',
    '~~~AA~~~~~~~~~~~AA::AA~~~~~~~~~~~~AA::~~',
    '~~::::::::::::::::::::::::::::::::::::~~',
    '~~:,,,,::::T:::::::::::::::::T::::,,,,:~',
    '~~:,,,,:::::::::,,,,,,::::::::::::,,,,:~',
    '~~:::::::::::::::,,,,::::::::::::::::::~',
    '~~~~~~~~~~~::~~~~~~~~~~~~~::~~~~~~~~~~~~',
    '~~~~~~~~~~~HH~~~~~~~~~~~~~HH~~~~~~~~~~~~',
    '~~~~~~~~~~~HH~~~~~~~~~~~~~HH~~~~~~~~~~~~',
    '~~~~~~~~~~~::~~~~~~~~~~~~~::~~~~~~~~~~~~',
    '~~::::::::::::::::::::::::::::::::::::~~',
    '~~:,,,,,::::T::::,,,,,,,,::::T:::,,,,:~~',
    '~~:,,,,,:::::::::,,,,,,,,:::::::::,,,,:~',
    '~~:::::::::::::::::::::::::::::::::::::~',
    '~~S:::~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
  ],
  enc: [['staticat', 21, 24, 4], ['kiteling', 21, 23, 3], ['hushling', 21, 23, 2], ['emberwisp', 21, 24, 3], ['papermoth', 23, 24, 1], ['cindle', 20, 21, 1], ['cairnback', 23, 24, 1]], rate: 0.1,
  warps: [
    { x: 2, y: 21, to: 'steps', tx: 35, ty: 27, dir: 2 },
    { x: 37, y: 1, to: 'crown', tx: 17, ty: 26, dir: 1, show: () => !!flag('ch4done') },
    { x: 38, y: 1, to: 'crown', tx: 17, ty: 26, dir: 1, show: () => !!flag('ch4done') },
  ],
  onEnter: async (s) => {
    if (!flag('ch4start')) {
      s.set('ch4start');
      await s.chapter(4, 'Static Heights', 'Every voice in the city, passing overhead.');
      await s.radio([
        ['MARLOW', '...is this thing on? This is WKHV, 1450 - or what\'s left of it. Relays are down, so if you can hear me, you\'re standing right under my antenna.'],
        ['MARLOW', 'Whoever just climbed out of the Steps: come up to the booth. I\'ve got a job for a courier.'],
      ]);
      s.objective('Find Marlow at the WKHV booth (north).');
    }
  },
  ents: [
    { id: 'rest4', x: 6, y: 20, kind: 'rest', talk: async (s) => { await s.rest(); } },
    { id: 'shop4', x: 9, y: 20, kind: 'npc', look: 'radio', dir: 0, talk: async (s) => {
      await s.say('Tube Seller', 'Vacuum tubes, tonics, lanterns. Everything glows if you wire it right.');
      await s.shop(['bigtonic', 'elixir', 'salve', 'rekindle', 'silklantern']);
    } },
    { id: 'pedW', x: 3, y: 9, kind: 'obj', obj: 'pedestal', show: () => !flag('relayW'), talk: pedestal('relayW', 720, 'TIDE LINE', 'Tuned to the drowned choir.') },
    { id: 'pedW2', x: 3, y: 9, kind: 'obj', obj: 'pedestal', glow: '#9fffd0', show: () => !!flag('relayW'), talk: pedestal('relayW', 720, 'TIDE LINE', '') },
    { id: 'pedM', x: 16, y: 9, kind: 'obj', obj: 'pedestal', show: () => !flag('relayM'), talk: pedestal('relayM', 1130, 'SKY LINE', 'Kite Crews\' channel.') },
    { id: 'pedM2', x: 16, y: 9, kind: 'obj', obj: 'pedestal', glow: '#9fffd0', show: () => !!flag('relayM'), talk: pedestal('relayM', 1130, 'SKY LINE', '') },
    { id: 'pedE', x: 35, y: 9, kind: 'obj', obj: 'pedestal', show: () => !flag('relayE'), talk: pedestal('relayE', 1450, 'CITY LINE', 'WKHV. You know the number.') },
    { id: 'pedE2', x: 35, y: 9, kind: 'obj', obj: 'pedestal', glow: '#9fffd0', show: () => !!flag('relayE'), talk: pedestal('relayE', 1450, 'CITY LINE', '') },
    { id: 'rigger', x: 24, y: 18, kind: 'npc', look: 'kite', dir: 2, show: () => !!flag('valeAlly'), talk: async (s) => {
      await s.say('Rigger Hale', 'Courier Wren! Captain Vale says you\'re crew now. Our channel\'s 1130 on the dial - the Sky Line relay. Don\'t tell the Guild.');
      if (!flag('riggerGift')) { s.set('riggerGift'); await s.give('elixir', 1); }
    } },
    { id: 'riggerT', x: 24, y: 18, kind: 'trainer', look: 'kite', dir: 2, sight: 4, show: () => !flag('valeAlly'), talk: async (s) => {
      if (flag('beat_rigger')) { await s.say('Rigger Hale', 'Fine. Our channel\'s 1130. Not that it\'ll help you. Captain still hasn\'t forgiven you.'); return; }
      await s.say('Rigger Hale', 'You\'re the courier who made a fool of the Captain! The Crews remember.');
      await s.battle({ id: 'rigger', name: 'Hale', title: 'Kite Rigger', look: 'kite', team: [['kiteling', 22], ['stormkite', 23]], reward: 600, lose: 'Ugh. Fine! The Crews\' channel is 1130. Happy?' });
    } },
    { id: 'listener', x: 33, y: 19, kind: 'npc', look: 'tide', dir: 2, talk: async (s) => {
      if (flag('c3') === 1) {
        await s.say('Tidefolk Listener', 'You gave the shard back to the deep. The whole lake felt it. The drowned choir sings on 720 - go and listen. They\'ll be singing for you.');
        if (!flag('listenerGift')) { s.set('listenerGift'); await s.give('silklantern', 2); }
      } else {
        await s.say('Tidefolk Listener', '...You still carry her heart to the Guild. I can hear it burning in your pocket.');
        await s.say('Tidefolk Listener', 'The drowned choir sings on 720. Not that you\'ll understand the song.');
      }
    } },
    { id: 'pell', x: 30, y: 11, kind: 'trainer', look: 'radio', dir: 2, sight: 4, talk: async (s) => {
      if (flag('beat_pell')) { await s.say('Pell', 'Staticats purr at 1450. All of them. It\'s eerie.'); return; }
      await s.say('Pell', 'Radio engineer Pell! These towers are delicate. So is my temper.');
      await s.battle({ id: 'pell', name: 'Pell', title: 'Engineer', look: 'radio', team: [['staticat', 22], ['staticat', 23]], reward: 520, lose: 'Signal lost.' });
    } },
    { id: 'ames', x: 12, y: 11, kind: 'trainer', look: 'courier', dir: 3, sight: 4, talk: async (s) => {
      if (flag('beat_ames')) { await s.say('Ames', 'Up here you can see the whole city. Half of it\'s dark now.'); return; }
      await s.say('Ames', 'Heights route\'s mine, rookie!');
      await s.battle({ id: 'ames', name: 'Ames', title: 'Courier', look: 'courier', team: [['papermoth', 22], ['cobblecrab', 22], ['emberwisp', 23]], reward: 540, lose: 'Rookie my foot.' });
    } },
    { id: 'kidH', x: 20, y: 12, kind: 'npc', look: 'kid', dir: 0, talk: async (s) => {
      await s.say('Rosalind', 'My grandpa built the west tower. He said the drowned folk used to sing on it, back when Calloway still had a lighthouse. Seven-twenty, he said.');
    } },
    { id: 'chest4', x: 37, y: 11, kind: 'item', obj: 'chest', show: () => !flag('chest4'), talk: async (s) => { s.set('chest4'); await s.give('elixir', 1); await s.give('silklantern', 1); } },
    { id: 'jun3', x: 21, y: 9, kind: 'npc', look: 'juniper', dir: 2, show: () => !flag('beat_jun3') && relaysDone() },
    { id: 'jun3T', x: 18, y: 8, w: 2, h: 1, kind: 'trigger', show: () => !flag('beat_jun3') && relaysDone(), talk: async (s) => {
      await s.say('Juniper', 'Wren. Wait.');
      await s.say('Juniper', 'I took the Guild contract. Steady pay, a lantern that never goes out. They told me to stop anyone climbing to the Crown with a "stolen shard".');
      if (flag('knowsBinding')) await s.say('Juniper', 'And you\'re going to tell me the Guild\'s lying. Everyone up here says it. I don\'t know who to believe anymore.');
      await s.say('Juniper', 'So we do what couriers do. Lights up.');
      await s.battle({ id: 'jun3', name: 'Juniper', title: 'Guild Courier', look: 'juniper', team: [['stormkite', 23], ['staticat', 23], [EVO[juniperStarter()], 25]], reward: 800, noLoss: true,
        lose: 'You\'re really going up there. Okay.' });
      s.set('beat_jun3');
      await s.say('Juniper', 'I\'ll be listening to Marlow\'s show tonight. Make it worth listening to.');
    } },
    { id: 'boothBlock', x: 18, y: 7, w: 2, h: 1, kind: 'trigger', show: () => !relaysDone() && !!flag('metMarlow'), talk: async (s) => {
      await s.say(null, 'The booth hums with dead air. Marlow needs those three relays tuned first.'); await s.movePlayer(0, 1);
    } },
    { id: 'marlow', x: 19, y: 3, kind: 'npc', look: 'radio', dir: 0, glow: '#9fffd0', talk: async (s) => { s.set('metMarlow'); await marlow(s); } },
    { id: 'poster', x: 13, y: 5, kind: 'sign', talk: async (s) => { await s.say(null, 'A faded poster: "WKHV 1450 - THE NIGHT OWL HOUR with MARLOW. Music for people who are still awake."'); } },
    { id: 'liftBlock', x: 37, y: 2, w: 2, h: 1, kind: 'trigger', show: () => !flag('ch4done'), talk: async (s) => {
      await s.say(null, 'The Crown lift is locked from the WKHV booth.'); await s.movePlayer(0, 1);
    } },
  ],
});
