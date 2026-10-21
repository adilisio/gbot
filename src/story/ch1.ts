import { registerMap } from '../overworld/mapdef';
import { flag, G } from '../state';
import { TrainerDef } from '../battle/engine';
import type { ScriptAPI } from '../overworld/script';

const COUNTER: Record<string, string> = { cindle: 'ripplet', ripplet: 'sproutwick', sproutwick: 'cindle' };
export function juniperStarter() { return COUNTER[(G.flags.starterIdx ? ['cindle', 'ripplet', 'sproutwick'][G.flags.starterIdx - 1] : 'cindle')]; }

export const SHOP1 = ['tonic', 'salve', 'lantern'];

async function odile(s: ScriptAPI) {
  if (!flag('starter')) {
    await s.say('Odile', 'Wren. You\'re late, and the lights are going out, and I\'ve got parcels stacked to the rafters.');
    await s.say('Odile', 'I know. Since your old glimmer faded last winter, you\'ve been running routes in the dark. No more of that.');
    await s.say('Odile', 'Three strays have been circling the Post all week. Glimmers choose couriers, not the other way round. Go on - see which one chooses you.');
    const id = await s.starter();
    s.set('starterIdx', ['cindle', 'ripplet', 'sproutwick'].indexOf(id) + 1);
    s.set('starter');
    await s.giveMon(id, 5);
    await s.say('Odile', 'There. Look at that glow. You\'ll be fine.');
    s.set('juniperHere');
    await s.say('Juniper', 'Fine? Odile, you gave the slowpoke a glimmer before ME?');
    await s.say('Odile', 'Juniper. You had your pick yesterday and you know it.');
    await s.say('Juniper', 'Whatever. Wren - first route of the night goes to whoever wins. Lights up!');
    const won = await s.battle({ id: 'jun1', name: 'Juniper', title: 'Courier', look: 'juniper', team: [[juniperStarter(), 4]], reward: 60, noLoss: true,
      lose: 'Huh. Your glimmer actually likes you.', intro: 'Don\'t cry when you lose!' }, 'docks');
    if (won) await s.say('Juniper', 'Okay. Okay! Beginner\'s luck. I\'m taking the Kitefall run anyway.');
    else await s.say('Juniper', 'Ha! Don\'t sulk. You\'ll get the hang of it. Probably.');
    await s.say('Juniper', 'See you out there, slowpoke. Try not to get eaten by the dark.');
    s.set('juniperHere', 0); s.set('juniperGone');
    await s.say('Odile', 'Ignore her. Now: three deliveries. Lamp oil for Old Brannock down at the ferry dock. Moss seeds for Tamsin at the Reedmoss lamp hut, east over the bridge.');
    await s.say('Odile', 'And this letter for Mrs. Ashgrove - she lives by the moss patch on the west side. Take some tonics and lanterns too. If a wild glimmer likes you, weaken it a little and offer a lantern.');
    G.bag.oil = 1; G.bag.seeds = 1; s.set('letterAsh');
    await s.give('tonic', 3);
    await s.say(null, 'Tip: press Esc for your menu, T for the type chart. Lantern Rests heal your team and save your journey.');
    s.objective('Deliver lamp oil (ferry dock), seeds (Reedmoss) and a letter (west moss).');
    return;
  }
  if (flag('c1') && !flag('gotLetter')) {
    await s.say('Odile', 'You\'re back. And by your face, it wasn\'t a quiet night in the reeds.');
    if (flag('c1') === 1) await s.say('Odile', 'You cut a Guild net. Good. Foolish, but good. The Guild will remember, mind.');
    else await s.say('Odile', 'You handed a wild glimmer to the Guild. I understand why. I don\'t have to like it.');
    await s.say('Odile', 'Listen. Half the lanterns over Low Wick went dark this week. The Heartwick up on the Crown is failing, and the Guild is sending letters everywhere.');
    await s.say('Odile', 'This one came for us: Guild wax, for Captain Vale of the Kite Crews in Kitefall Bazaar. A courier carries what she\'s given. That\'s the job.');
    G.bag.letter = 1; s.set('gotLetter');
    await s.say(null, 'You received the Sealed Letter.');
    await s.glints(200);
    await s.say('Odile', 'The kite-gate is at the far east end of the Reedmoss Floats. Go carefully, Wren.');
    s.objective('Carry the Sealed Letter to Captain Vale in Kitefall Bazaar (east through Reedmoss).');
    return;
  }
  if (flag('gotLetter')) { await s.say('Odile', 'Kitefall is east, past the reeds. And Wren - whatever\'s in that letter, keep your own light lit.'); return; }
  const left = ['oil', 'seeds'].filter((k) => G.bag[k]).length + (flag('letterAsh') && !flag('ashDone') ? 1 : 0);
  if (left) await s.say('Odile', `Still ${left} deliver${left > 1 ? 'ies' : 'y'} in your bag. The night isn't getting any younger.`);
  else await s.say('Odile', 'All delivered? Then go see what Tamsin was fretting about. Something in the eastern reeds.');
}

registerMap({
  id: 'lowwick', name: 'Low Wick Docks', music: 'town', chapter: 1, theme: 'docks', light: '#ffb060',
  tiles: [
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
    '~~~RRRRRRRR~~~RRRRRR~~~~~RRRRRRRRR~~~~~~',
    '~~~RRRRRRRR~~~RRRRRR~~~~~RRRRRRRRR~~~~~~',
    '~~~#W#DD#W#~~~#W##W#~~~~~#W##D##W#~~~~~~',
    '~~~T......T~~~......~~~~~T.......T~~~~~~',
    '~~~...........................:::..~~~~~',
    '~~~...*..*......k.k.k.....:::::::::.~~~~',
    '~~~.................................~~~~',
    '~~~~~....T...........T...........T..~~~~',
    '~~~~~...............................====',
    '~~~,,,,,.................o+.........~~~~',
    '~~,,,,,,,..........%%.....+.........~~~~',
    '~~,,,,,,,...........................~~~~',
    '~~~,,,,,~~~~~.......T........~~~~~~~~~~~',
    '~~~~~~~~~~~~~...............~~~~~~~~~~~~',
    '~~~~~~~~~~~~~~~~~~~~H~~~~~~~~~~~~~~~~~~~',
    '~~~~~~~~~~~~~~~~~~~~H~~~~~~~~~~~~~~~~~~~',
    '~~~~~~~~~~~~~~~~~...........~~~~~~~~~~~~',
    '~~~~~~~~~~~~~~~~~.....T.....~~~~~~~~~~~~',
    '~~~~~~~~~~~~~~~~~...........~~~~~~~~~~~~',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
  ],
  enc: [['mothkin', 2, 4, 4], ['pebblit', 2, 4, 3], ['fernling', 3, 4, 2]], rate: 0.12,
  warps: [{ x: 39, y: 9, to: 'reedmoss', tx: 1, ty: 9, dir: 3 }],
  ents: [
    { id: 'odile', x: 7, y: 4, kind: 'npc', look: 'elder', dir: 0, glow: '#b48cff', talk: odile },
    { id: 'juniper', x: 7, y: 6, kind: 'npc', look: 'juniper', dir: 1, show: () => !!flag('juniperHere') },
    { id: 'restL', x: 12, y: 5, kind: 'rest', talk: async (s) => { await s.rest(); } },
    { id: 'signPost', x: 4, y: 5, kind: 'sign', talk: async (s) => { await s.say(null, 'WICKHAVEN COURIER POST - Low Wick Branch. "Through fog, flood and the Long Dark."'); } },
    { id: 'signGuild', x: 24, y: 5, kind: 'sign', talk: async (s) => { await s.say(null, 'LAMPLIGHTERS\' GUILD - Low Wick Office. "A bright city is a safe city."'); } },
    { id: 'shop1', x: 18, y: 7, kind: 'npc', look: 'merchant', dir: 0, talk: async (s) => {
      await s.say('Merrit', 'Tonics, salves, lanterns! Prices are up - the dark\'s bad for business, but good for selling light.');
      await s.shop(SHOP1);
    } },
    { id: 'clerk', x: 30, y: 4, kind: 'npc', look: 'guild', dir: 0, talk: async (s) => {
      if (flag('c1') === 2) await s.say('Guild Clerk', 'Collector Fenn says you\'re a sensible sort. The Guild has a long memory for sensible sorts.');
      else if (flag('c1') === 1) await s.say('Guild Clerk', 'Cutting Guild nets is a crime, courier. Lucky for you we\'re short on jail lanterns.');
      else await s.say('Guild Clerk', 'The Provost assures everyone the Dimming is temporary. Please remain calm and keep your lantern trimmed.');
    } },
    { id: 'pip', x: 9, y: 12, kind: 'npc', look: 'kid', dir: 2, talk: async (s) => {
      if (flag('sprigFound') && !flag('sprigReturned')) {
        s.set('sprigReturned');
        await s.say('Pip', 'SPRIG! You found him! Oh, you dumb little fern, don\'t ever do that again!');
        await s.say('Pip', 'Mum said to give you these. For couriers who go the long way round.');
        await s.give('lantern', 3); await s.give('bigtonic', 1);
        return;
      }
      if (flag('sprigReturned')) { await s.say('Pip', 'Sprig says thank you. He says it in fern, so you have to imagine it.'); return; }
      await s.say('Pip', '*sniff* My glimmer Sprig ran off into the Reedmoss when the big lantern over our house went out. He hates the dark.');
      await s.say('Pip', 'He\'s a little fern with a curl on top. If you see him... tell him I\'m not mad.');
      s.set('sprigQuest');
    } },
    { id: 'ash', x: 4, y: 7, kind: 'npc', look: 'dock', dir: 3, talk: async (s) => {
      if (flag('letterAsh') && !flag('ashDone')) {
        s.set('ashDone');
        await s.say('Mrs. Ashgrove', 'A letter? From my son on the Heights! Oh, bless you, courier.');
        await s.say('Mrs. Ashgrove', '"Mum - the radio men up here say the Guild is planning something for the Heartwick. Keep your lantern close." ...Well. That\'s cheerful.');
        await s.glints(80);
        return;
      }
      await s.say('Mrs. Ashgrove', 'My Pip\'s been crying all night over that fern of hers. Kids and glimmers. You never stop worrying.');
    } },
    { id: 'fisher', x: 26, y: 12, kind: 'npc', look: 'dock', dir: 0, talk: async (s) => {
      await s.say('Fisher Hob', 'You can see the old town down there on clear nights. Port Calloway. Streetlamps still on, under forty feet of lake.');
      await s.say('Fisher Hob', 'My granddad said the Long Swell came in one night and just... never went back out.');
    } },
    { id: 'kidT', x: 16, y: 10, kind: 'npc', look: 'kid', dir: 0, talk: async (s) => {
      await s.say('Tully', 'Did you know every type is strong against two others? Ember burns Bloom AND Hush. My big sister told me. Press T to see it all!');
    } },
    { id: 'dockhand', x: 33, y: 7, kind: 'trainer', look: 'dock', dir: 2, sight: 3, talk: async (s) => {
      if (flag('beat_rook')) { await s.say('Rook', 'Good arm on you, courier. Your glimmer\'s got a good arm too.'); return; }
      await s.say('Rook', 'Oi! New courier? Let\'s see what that glimmer of yours can do!');
      await s.battle({ id: 'rook', name: 'Rook', title: 'Dockhand', look: 'dock', team: [['pebblit', 4], ['mothkin', 4]], reward: 90, lose: 'Ow. Fair enough.' });
    } },
    { id: 'brannock', x: 22, y: 17, kind: 'npc', look: 'ferry', dir: 0, glow: '#ffd58a', talk: async (s) => {
      if (G.bag.oil) {
        delete G.bag.oil;
        await s.say('Brannock', 'Lamp oil! Odile remembered. Forty years I kept the Calloway light, and now I can barely keep my own boat lamp lit.');
        await s.say('Brannock', 'Here. Something for the road. And if you ever need to go DOWN, courier - really down - you find old Brannock.');
        await s.give('tonic', 2); await s.glints(60);
        return;
      }
      await s.say('Brannock', 'The lake\'s been singing lately. Low, under the waves. Haven\'t heard her sing like that since the Swell.');
    } },
    { id: 'boat', x: 23, y: 19, kind: 'obj', obj: 'boat' },
  ],
});

// ---------------------------------------------------------------- Reedmoss
const fenn: TrainerDef = { id: 'fenn', name: 'Fenn', title: 'Collector', look: 'guild', team: [['pebblit', 6], ['emberwisp', 7]], reward: 220, boss: true,
  intro: 'You cut my net. Do you know what that moth\'s light was worth?', lose: 'Fine. FINE. Keep your moth. The Guild will keep a note.' };
const swarm: TrainerDef = { id: 'swarm', name: 'Moth Swarm', look: 'courier', team: [['mothkin', 6], ['mothkin', 7]], reward: 0, boss: true,
  intro: '(The netted moth\'s flock dives at your lantern!)', lose: '(The moths scatter into the reeds, chittering sadly.)' };

async function fennScene(s: ScriptAPI) {
  if (flag('c1')) return;
  await s.say('Fenn', 'Evening, courier. Mind the net. Guild business.');
  await s.say(null, 'A small Mothkin thrashes in a net of gold thread. Its light is going grey at the edges.');
  await s.say('Fenn', 'Collector Fenn, Lamplighters\' Guild. The Provost wants every wild glimmer counted and kept. For the Heartwick. For everybody.');
  await s.say('Fenn', 'This one\'s a runner. Tell you what - you help me get it to the Guild office, there\'s a bounty in it. Glints. A Silk Lantern or two.');
  const c = await s.choose(null, 'The Mothkin looks at your lantern. Then at you.', ['Cut the net', 'Help Fenn carry it in']);
  if (c === 0) {
    s.set('c1', 1);
    await s.say(null, 'You slice the gold thread with your courier\'s knife. The Mothkin bursts free in a spray of light and vanishes over the reeds.');
    await s.say('Fenn', 'You... absolute... Right. Let\'s settle this the courier way.');
    await s.battle(fenn);
    if (!flag('beat_fenn')) { s.set('c1', 1); return; }
    await s.say('Fenn', 'You think you saved it. You don\'t know what\'s coming for this city.');
  } else {
    s.set('c1', 2);
    await s.say('Fenn', 'Sensible. I like sensible. Here - for your trouble.');
    await s.give('silklantern', 2); await s.glints(300);
    await s.say(null, 'As Fenn hauls the net away, the reeds explode with angry wings!');
    await s.battle(swarm);
    await s.say('Fenn', '...They\'ll calm down. Probably. Off you go, courier. I\'ll remember the favor.');
  }
  s.set('fennGone');
  s.objective('Return to Odile at the Courier Post in Low Wick.');
}

registerMap({
  id: 'reedmoss', name: 'Reedmoss Floats', music: 'route', chapter: 1, theme: 'docks', light: '#ffc070',
  tiles: [
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~RRRRR~~~~~~~~~~~~~',
    '~~~~,,,,,,~~~~~~~~~~~~~~~~#W#W#~~~~~~~~~~~~~',
    '~~~,,,,,,,,~~~~~~~~~~~~~~T.....T~~~~~~~~~~~~',
    '~~~,,,..,,,~~~~,,,,,,~~~~.......~~~~~~,,,~~~',
    '~~~~,,..,,~~~~,,,,,,,,~~~...,,,..~~~~,,,,,~~',
    '~~~~~~..~~~~~~,,,..,,,=====,,,,..====,,,,,~~',
    '~~~~~~..~~~~~~~,,..,,~~~~..,,,,..~~~~,,,,,~~',
    '~~.~~T..~~~~~~~~~..~T~~~~~.......~~~~T~.~~~~',
    '.............=====..........................',
    '~~~~~~~~~~~~~~~~~..~~~~~~~~~~~~~~~~~~~~...~~',
    '~~~~~~~~~~~~~~~~~..~~~~~~~~~~~~~~~~~~~~...~~',
    '~~~~~~~~~~,,,,,,,..,,,,,,,~~~~~~~~~~~~~.~~~~',
    '~~~~~~~~~,,,,,,,,..,,,,,,,,~~~~~~~~~~~~.~~~~',
    '~~~~~~~~~,,,,~~~~..~~~~,,,,~~~~~~~~~~~~.~~~~',
    '~~~~~~~~~,,,,~~~~..~~~~,,,,=====..........~~',
    '~~~~~~~~~~,,,~~~~..~~~~~,,~~~~~~..B...x...~~',
    '~~~~~~~~~~~~~~~~~..~~~~~~~~~~~~~..........~~',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~#####G####~~',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~#.#~~~~~',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~###~~~~~',
  ],
  gateFlag: 'reedGate',
  onSolve: async (s) => { await s.say(null, 'Click. Somewhere below the boards, an old counterweight drops, and the little gate swings open.'); },
  enc: [['mothkin', 3, 6, 4], ['pebblit', 4, 6, 3], ['fernling', 4, 6, 3], ['emberwisp', 4, 6, 3], ['driftjelly', 4, 6, 2], ['hushling', 5, 6, 1]], rate: 0.11,
  warps: [
    { x: 0, y: 9, to: 'lowwick', tx: 38, ty: 9, dir: 2 },
    { x: 43, y: 9, to: 'kitefall', tx: 1, ty: 14, dir: 3, show: () => !!flag('gotLetter') },
  ],
  ents: [
    { id: 'tamsin', x: 28, y: 4, kind: 'npc', look: 'guild', dir: 0, glow: '#ffd58a', talk: async (s) => {
      if (G.bag.seeds) {
        delete G.bag.seeds;
        await s.say('Tamsin', 'My moss seeds! Glowmoss is the only thing that still lights these floats when the lanterns fail.');
        await s.say('Tamsin', 'I used to be Guild, you know. Lamplighter, third rank. I quit when they started talking about "harvests".');
        await s.say('Tamsin', 'There\'s a Collector setting nets in the eastern reeds right now. Fenn. He\'s not cruel, just... obedient. Be careful.');
        await s.give('salve', 2);
        s.objective('Investigate the Guild collector in the eastern reeds.');
        return;
      }
      await s.say('Tamsin', 'Every glimmer in the reeds is skittish tonight. Something\'s hunting them.');
    } },
    { id: 'restR', x: 30, y: 8, kind: 'rest', talk: async (s) => { await s.rest(); } },
    { id: 'sign1', x: 2, y: 8, kind: 'sign', talk: async (s) => { await s.say(null, 'REEDMOSS FLOATS. Wild glimmers nest in the glowmoss. Kite-gate to Kitefall: far east.'); } },
    { id: 'dace', x: 17, y: 8, kind: 'trainer', look: 'courier', dir: 0, sight: 1, talk: async (s) => {
      if (flag('beat_dace')) { await s.say('Dace', 'Thirty routes a night, and I lose to a rookie. Sigh.'); return; }
      await s.say('Dace', 'Courier code: two couriers meet on a bridge, they trade lights!');
      await s.battle({ id: 'dace', name: 'Dace', title: 'Courier', look: 'courier', team: [['mothkin', 4], ['pebblit', 5]], reward: 120, lose: 'Fast feet, faster glimmer.' });
    } },
    { id: 'ines', x: 39, y: 10, kind: 'trainer', look: 'guild', dir: 1, sight: 1, talk: async (s) => {
      if (flag('beat_ines')) { await s.say('Ines', 'The Guild pays me to light lamps, not to lose. Don\'t tell anyone.'); return; }
      await s.say('Ines', 'Lamplighter on patrol! Let me check your lantern... with violence!');
      await s.battle({ id: 'ines', name: 'Ines', title: 'Lamplighter', look: 'guild', team: [['emberwisp', 5], ['fernling', 6]], reward: 140, lose: 'Your lantern is... very much in order.' });
    } },
    { id: 'sprig', x: 10, y: 15, kind: 'npc', mon: 'fernling', glow: '#7fe07a', show: () => !flag('sprigFound'), talk: async (s) => {
      if (!flag('sprigQuest')) { await s.say(null, 'A tiny fern-glimmer with a curl on top, shivering in the moss. It doesn\'t seem wild - it\'s wearing a ribbon.'); return; }
      await s.say(null, 'The little fern with the curl! "Sprig?" It perks up at the name and hops into your lantern-light.');
      s.set('sprigFound');
      await s.say(null, 'You should take Sprig home to Pip in Low Wick.');
    } },
    { id: 'chestR', x: 37, y: 19, kind: 'item', obj: 'chest', show: () => !flag('chestR'), talk: async (s) => { s.set('chestR'); await s.give('silklantern', 1); await s.give('rekindle', 1); } },
    { id: 'hintR', x: 33, y: 17, kind: 'sign', talk: async (s) => { await s.say(null, 'Scratched into the post: "Crate on the plate opens the gate. Push from the far side."'); } },
    { id: 'fenn', x: 40, y: 5, kind: 'npc', look: 'guild', dir: 0, show: () => !flag('fennGone'), talk: fennScene },
    { id: 'netmoth', x: 40, y: 4, kind: 'obj', mon: 'mothkin', glow: '#c9d8ff', show: () => !flag('c1') },
    { id: 'fennTrig', x: 37, y: 6, w: 5, h: 2, kind: 'trigger', show: () => !flag('c1'), talk: async (s) => {
      if (G.bag.seeds) { await s.say(null, 'Someone up ahead is busy with a big gold net. Maybe deliver Tamsin\'s seeds first - her lamp hut is just west of here.'); await s.movePlayer([1, 0, 3, 2][s.ow.dir], 1); return; }
      await fennScene(s);
    } },
    { id: 'gateGuard', x: 41, y: 10, kind: 'npc', look: 'kite', dir: 1, show: () => !flag('gotLetter'), talk: async (s) => {
      await s.say('Kite-gate Keeper', 'Kitefall\'s closed to anyone without proper post. Guild orders, since the Dimming. Come back with a letter, courier.');
    } },
    { id: 'gateBlock', x: 43, y: 9, kind: 'trigger', show: () => !flag('gotLetter'), talk: async (s) => {
      await s.say('Kite-gate Keeper', 'Oi! Not without post. Back you go.');
      await s.movePlayer(2, 1);
    } },
  ],
});
