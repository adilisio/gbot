import { registerMap } from '../overworld/mapdef';
import { flag, G } from '../state';
import type { FoeDef as TrainerDef } from '../overworld/script';
import type { ScriptAPI } from '../overworld/script';
import { juniperStarter } from './ch1';

const vale: TrainerDef = { id: 'vale', name: 'Vale', title: 'Captain', look: 'kite', team: [['kiteling', 13], ['cobblecrab', 12], ['kiteling', 14]], reward: 500, boss: true,
  intro: 'Kite Crews! Hold the courier. Nothing personal - orders are orders.', lose: 'Ha! Cut my string clean. Alright, alright.' };

async function valeTalk(s: ScriptAPI) {
  if (flag('ch2done')) { await s.say('Vale', 'Down the south-east stairs, find Brannock, mind the drowned. And courier - fly true.'); return; }
  await s.say('Vale', 'A courier on my mast! Either you\'re brave or Odile\'s finally lost her marbles. What\'ve you got?');
  if (flag('c2') === 1) {
    await s.say(null, 'You hand Vale the opened letter and tell her what it says.');
    await s.say('Vale', '"...detain the bearer and hold their glimmers for the Binding." Hm. So the Provost wants my crews snatching couriers\' lights.');
    await s.say('Vale', 'And you walked up my mast and showed me. Most couriers would have just... delivered it.');
    await s.say('Vale', 'The Kite Crews owe you, Wren. When you need the sky, call us. Take Gusty here - she\'s been itching to fly with someone with a spine.');
    await s.giveMon('kiteling', 12);
    s.set('valeAlly');
  } else {
    await s.say(null, 'Vale cracks the seal and reads. Her eyebrows climb.');
    await s.say('Vale', '"Detain the bearer and hold their glimmers for the Binding." The bearer. That\'s you, courier.');
    const won = await s.battle(vale);
    if (!won) return;
    await s.say('Vale', 'You\'ve got fire, I\'ll give you that. I\'m not jailing a courier for doing her job. But my crews took Guild coin for this... they won\'t forget you embarrassed their captain.');
  }
  delete G.bag.letter;
  await s.say('Vale', 'Now. Since you\'re going that way anyway. This fell out of the sky three nights ago and burned a hole clean through my best sail.');
  G.bag.shard = 1;
  await s.say(null, 'You received the Ember Shard. It\'s warm, and it pulses, like something sleeping.');
  await s.say('Vale', 'A piece of the Heartwick. It\'s shedding itself, courier. The Guild wants every piece back on the Crown.');
  await s.say('Vale', 'Problem is, they sealed the lifts. The only way UP to the Crown is DOWN - through the Drowned Steps, under old Port Calloway, and up the far side. South-east stairs. Brannock will row you.');
  s.set('ch2done');
  s.objective('Take the Ember Shard to the Crown. The way up is down: south-east stairs to the Drowned Steps.');
}

registerMap({
  id: 'kitefall', name: 'Kitefall Bazaar', music: 'market', chapter: 2, theme: 'market', light: '#ff9a6a', floor: ':',
  tiles: [
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~#############~',
    '~~~~RRRRRR~~~~~~RRRRRRR~~~~~~~#...........#~',
    '~~~~RRRRRR~~~~~~RRRRRRR~~~~~~~#vvvvvvv:vvv#~',
    '~~~~#W##W#~~~~~~#W#W#W#~~~~~~~#v:>>>>>:<<v#~',
    '~~~~T....T~~~~~~T.....T~~~~~~~#v:vvvvvvvvv#~',
    '~~~~......~~~~~~.......~~~~~~~#v:::::vvvvv#~',
    '~~~~......=======.....~~~~~~~~#>>>>>:<<<<<#~',
    '~~~~......~~~~~~.......~~~~~~~######:######~',
    '~~~~.......................T........:...T~~~',
    '~~~~::::::::::::::::::::::::::::::::::::::~~',
    '~~~~:::k:k:k:::::::::::::k:k:k:::::::::::~~~',
    '~~~~:::::::::::::::%%:::::::::::::::::::::~~',
    '~...:::::::T::::::::::::::::::T:::::::::::~~',
    '~...::::::::::::::::::::::::::::::::::::::~~',
    '....::::::::::::::::T:::::::::::::::::::::~~',
    '~...::::::::::::::::::::::::::::::::::::::~~',
    '~~~~:::k:k:k::::::::::::::::k:k:k::::::::~~~',
    '~~~~::::::::::::::::::::::::::::::::::::::~~',
    '~~~~::::::::::::T:::::::::::::::T::::::::::~',
    '~~~~~~~~~~~~..........~~~~~~~~~~~~..........',
    '~~~~~~~~~~~~H~~~~~~~~~~~~~~~~~~~~~~.~~~~~~~~',
    '~~~~~~~~~~,,,,,,,,,~~~~~~~~~~~~~~~~.~~~~~~~~',
    '~~~~~~~~,,,,,,,,,,,,,,~~~~~~~~~~~,,,,,,~~~~~',
    '~~~~~~~~,,,,,,~~,,,,,,,,========,,,,,,,,~~~~',
    '~~~~~~~~,,,,,,~~,,,,,,,,~~~~~~~~,,,,,,,,~~~~',
    '~~~~~~~~~,,,,,,,,,,,,,~~~~~~~~~~,,,,,,,,~~~~',
    '~~~~~~~~~~~,,,,,,,,~~~~~~~~~~~~~~~,,,....~~~',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~..S.~~~',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
  ],
  enc: [['kiteling', 9, 12, 4], ['mothkin', 10, 12, 3], ['emberwisp', 10, 12, 3], ['lampfish', 10, 12, 3], ['cobblecrab', 11, 13, 2], ['pebblit', 10, 12, 2], ['hushling', 11, 12, 1]], rate: 0.11,
  warps: [
    { x: 0, y: 14, to: 'reedmoss', tx: 42, ty: 9, dir: 2 },
    { x: 39, y: 27, to: 'steps', tx: 3, ty: 2, dir: 0, show: () => !!flag('ch2done') },
  ],
  onEnter: async (s) => {
    if (!flag('ch2start')) {
      s.set('ch2start');
      await s.chapter(2, 'Kitefall Bazaar', 'Where the wind sells everything.');
      if (flag('c1') === 2) await s.say('Guild Warden', 'Courier Wren? Collector Fenn sent word ahead. You\'re to be extended every courtesy. Go on through.');
    }
  },
  ents: [
    { id: 'pike', x: 5, y: 13, kind: 'trainer', look: 'guild', dir: 3, sight: 3, show: () => flag('c1') === 1, talk: async (s) => {
      if (flag('beat_pike')) { await s.say('Pike', 'Fenn said you\'d be trouble. Fenn was right.'); return; }
      await s.say('Pike', 'Wren the net-cutter, is it? Fenn sent your description. The Guild doesn\'t forget.');
      await s.battle({ id: 'pike', name: 'Pike', title: 'Guild Warden', look: 'guild', team: [['emberwisp', 10], ['pebblit', 11], ['mothkin', 10]], reward: 260, lose: 'Fine. Pass. This is going in my report.' });
    } },
    { id: 'pikeNice', x: 5, y: 13, kind: 'npc', look: 'guild', dir: 3, show: () => flag('c1') !== 1, talk: async (s) => {
      await s.say('Guild Warden', 'Keep to the lit lanes, courier. Shades are bolder since the Dimming.');
    } },
    { id: 'moth', x: 13, y: 13, kind: 'npc', mon: 'mothkin', glow: '#c9d8ff', show: () => flag('c1') === 1 && !flag('mothGift'), talk: async (s) => {
      await s.say(null, 'A Mothkin flutters down into your lantern-light. There\'s a scorched gold thread still caught on one wing.');
      await s.say(null, 'It\'s the moth from the Reedmoss net! It followed your light all the way to Kitefall.');
      s.set('mothGift');
      await s.giveMon('mothkin', 10);
    } },
    { id: 'kiteVents', x: 14, y: 9, kind: 'shade', look: 'shade', enc: 'kite1', dir: 0, sight: 2, show: () => !flag('beat_kiteVents'), talk: async (s) => {
      await s.say(null, 'Shades pour out of a dark kite stall and turn toward your light.');
      await s.fight('kite1', { flagId: 'beat_kiteVents' });
    } },
    { id: 'kiteStalls', x: 20, y: 16, kind: 'shade', look: 'snuffer', enc: 'kite2', dir: 1, sight: 2, show: () => !flag('beat_kiteStalls'), talk: async (s) => {
      await s.say(null, 'A snuffer squats on the stall roofs, swallowing lamp after lamp.');
      await s.fight('kite2', { flagId: 'beat_kiteStalls' });
    } },
    { id: 'restK', x: 22, y: 12, kind: 'rest', talk: async (s) => { await s.rest(); } },
    { id: 'shopK', x: 8, y: 11, kind: 'npc', look: 'merchant', dir: 0, talk: async (s) => {
      await s.say('Sanna', 'Lamp oil, fresh off the barge! And silk wicks - thread one into your lantern and it holds more oil.');
      await s.shop(['tonic', 'bigtonic', 'salve', 'rekindle', 'lantern', 'silklantern']);
    } },
    { id: 'oona', x: 26, y: 11, kind: 'npc', look: 'kite', dir: 0, talk: async (s) => {
      await s.say('Oona', 'Every kite in this bazaar is lifted by a Gale glimmer\'s breath. The Guild wants to "count" them. Count them! Like coins.');
    } },
    { id: 'sel', x: 30, y: 15, kind: 'npc', look: 'elder', dir: 0, glow: '#b48cff', talk: async (s) => {
      await s.say('Madame Sel', 'I read the light, child. Yours is... complicated. Every choice you make is going to stick.');
      await s.say('Madame Sel', 'A free tip from the cards: water drowns a flame, but wind feeds it. Push the dark into the lake and it will not climb out.');
    } },
    { id: 'ventKid', x: 34, y: 9, kind: 'npc', look: 'kid', dir: 0, talk: async (s) => {
      await s.say('Fen', 'The captain\'s deck is up through the vent yard. The vents shove you around! Arrows show which way. Walk on the plain stones to stop.');
      await s.say('Fen', 'Psst - the long row of right-arrows is a ride, not a trap.');
    } },
    { id: 'jun2', x: 37, y: 8, kind: 'trainer', look: 'juniper', dir: 2, sight: 2, talk: async (s) => {
      if (flag('beat_jun2')) { await s.say('Juniper', 'Go on, then. Deliver your precious letter.'); return; }
      await s.say('Juniper', 'Wren! Guess who beat you to Kitefall? Me. Guess who\'s going to beat you AGAIN?');
      await s.battle({ id: 'jun2', name: 'Juniper', title: 'Courier', look: 'juniper', team: [['kiteling', 11], [juniperStarter(), 13]], reward: 300,
        lose: 'Ugh! You\'ve gotten good. When did you get good?' });
      if (flag('beat_jun2')) await s.say('Juniper', '...Hey. Real talk. The Guild offered me a contract. Steady pay, a lantern that never goes out. Would you take it?');
    } },
    { id: 'letterTrig', x: 36, y: 7, kind: 'trigger', show: () => !flag('c2'), talk: async (s) => {
      await s.say(null, 'At the foot of the vent yard, you notice the letter\'s wax seal has cracked in the damp. A corner of the page peeks out.');
      const c = await s.choose(null, 'A courier carries what she\'s given. But...', ['Read the letter', 'Keep it sealed']);
      if (c === 0) {
        s.set('c2', 1);
        await s.say(null, '"Captain Vale. By order of the Provost: detain the bearer of this letter, and hold their glimmers for the Binding. The Guild will compensate the Crews generously. - A. Calder"');
        await s.say(null, 'The bearer. That\'s you. Your glimmer presses close against your lantern.');
        s.set('knowsBinding');
      } else {
        s.set('c2', 2);
        await s.say(null, 'You smooth the seal back down. What the Guild writes to the Kite Crews is none of a courier\'s business.');
      }
    } },
    { id: 'vale', x: 36, y: 1, kind: 'npc', look: 'kite', dir: 0, glow: '#ff6a6a', talk: valeTalk },
    { id: 'signK', x: 2, y: 12, kind: 'sign', talk: async (s) => { await s.say(null, 'KITEFALL BAZAAR. Captain\'s deck: north-east vent yard. Ropewalk: south. Drowned Steps: south-east (CLOSED by order of the Guild).'); } },
    { id: 'bram', x: 22, y: 23, kind: 'npc', look: 'kite', dir: 2, talk: async (s) => {
      await s.say('Bram', 'Kite-hand Bram! Nobody walks the ropewalk without hearing my advice.');
      await s.say('Bram', 'Wind spreads fire, courier. Put a Gust behind a burning shade and the whole pack goes up.');
    } },
    { id: 'wells', x: 35, y: 24, kind: 'npc', look: 'courier', dir: 1, talk: async (s) => {
      await s.say('Wells', 'Lampfish lures look like lanterns. Don\'t follow them into the water. Learned that the hard way.');
      await s.say('Wells', 'If you\'re low on oil, rest at the bazaar shrine. Running dry out there just means a long walk back from it.');
    } },
    { id: 'chestK', x: 9, y: 25, kind: 'item', obj: 'chest', show: () => !flag('chestK'), talk: async (s) => { s.set('chestK'); await s.give('bigtonic', 2); await s.give('silklantern', 1); } },
    { id: 'chestK2', x: 18, y: 26, kind: 'item', obj: 'parcel', show: () => !flag('chestK2'), talk: async (s) => { s.set('chestK2'); await s.say(null, 'A lost parcel, addressed to nobody. Inside: glints, rattling.'); await s.glints(250); } },
    { id: 'brannock2', x: 40, y: 26, kind: 'npc', look: 'ferry', dir: 2, glow: '#ffd58a', talk: async (s) => {
      if (!flag('ch2done')) { await s.say('Brannock', 'Steps are closed, courier. Guild orders. Unless the Kite Captain says otherwise... she owns these docks.'); return; }
      await s.say('Brannock', 'Told you I\'d take you down one day. Down the stairs, into my boat. Mind your head on the old streetlamps.');
    } },
    { id: 'stairBlock', x: 39, y: 27, kind: 'trigger', show: () => !flag('ch2done'), talk: async (s) => {
      await s.say('Brannock', 'Not yet, courier. Steps are sealed until the Kite Captain says otherwise.');
      await s.movePlayer(1, 1);
    } },
  ],
});
