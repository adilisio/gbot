import { registerMap } from '../overworld/mapdef';
import { flag, G } from '../state';
import type { FoeDef as TrainerDef } from '../overworld/script';
import type { ScriptAPI } from '../overworld/script';
import { juniperStarter } from './ch1';
const FINAL: Record<string, string> = { cindle: 'pyrelynx', ripplet: 'floodmaw', sproutwick: 'lotuskeep' };

export const trust = () => (flag('c1') === 1 ? 1 : 0) + (flag('c2') === 1 ? 1 : 0) + (flag('c3') === 1 ? 1 : 0);
export const relayOK = () => flag('c4') === 1 && trust() >= 2;
const guildFavor = () => (flag('c1') === 2 ? 1 : 0) + (flag('c2') === 2 ? 1 : 0) + (flag('c3') === 2 ? 1 : 0) + (flag('c4') === 2 ? 1 : 0);

const calder: TrainerDef = { id: 'calder', name: 'Calder', title: 'Provost', look: 'provost', team: [['candelabrat', 31], ['stormkite', 31], ['cairnback', 32], ['aurelion', 34]], reward: 0, boss: true, music: 'boss',
  intro: 'Then I will keep this city alight with my own two hands!', lose: '...So that is what it feels like. Letting go.' };
const hushMother: TrainerDef = { id: 'hmfinal', name: 'The Hush Mother', look: 'ghost', team: [['abyssbell', 31], ['floodmaw', 32], ['hushmother', 34]], reward: 0, boss: true, music: 'boss',
  intro: 'You would chain my daughter forever? Then come down to the bottom with me!', lose: 'Then burn, little city. Burn as long as you can.' };
const heart: TrainerDef = { id: 'heart', name: 'The Heartwick', look: 'courier', team: [['candelabrat', 31], ['pyrelynx', 32], ['heartwick', 34]], reward: 0, boss: true, music: 'boss',
  intro: '(The Heartwick flares, frightened. It has carried this city alone for so long it does not know how to let anyone help.)', lose: '(The great light softens. For the first time in a lifetime, it rests - and the city does not fall.)' };

const ORDER = ['ember', 'tide', 'bloom', 'gale'];
function brazier(i: number) {
  return async (s: ScriptAPI) => {
    if (flag('crownGate')) { await s.say(null, 'The brazier burns steadily.'); return; }
    const lit = flag('brz');
    if (lit & (1 << i)) { await s.say(null, 'This brazier is already lit.'); return; }
    const c = await s.choose(null, `An unlit ${['EMBER', 'TIDE', 'BLOOM', 'GALE'][i]} brazier, carved with its glimmer-sign.`, ['Light it', 'Leave it']);
    if (c === 1) return;
    const count = [0, 1, 2, 3].filter((k) => lit & (1 << k)).length;
    if (ORDER[count] !== ORDER[i]) {
      s.set('brz', 0); s.sfx('fail');
      await s.say(null, 'The flame gutters and every brazier goes dark at once. Wrong order.');
      return;
    }
    s.set('brz', lit | (1 << i)); s.sfx('chime');
    if (count === 3) {
      s.set('crownGate'); s.sfx('puzzle'); s.rebake();
      await s.say(null, 'All four braziers roar together. The great gate to the Heartwick swings open.');
      s.objective('Enter the Heartwick sanctum.');
    }
  };
}

async function finale(s: ScriptAPI) {
  if (flag('finalDone')) return;
  const lead = s.lead();
  await s.say('Calder', 'Courier Wren. The one who carries everything to everyone. Come and look at her.');
  await s.say(null, 'The Heartwick hangs over the Crown like a paper sun, enormous and frail. Cracks of dark run all through it. It is breathing, slowly, like someone very old.');
  await s.say('Calder', 'Aurelia Calder. Provost. I have kept her lit for thirty years. I have watched her die for ten.');
  if (flag('c3') === 2) await s.say('Calder', 'You brought the shard. Thank you. It buys her a week. Perhaps two.');
  else if (flag('c3') === 1) await s.say('Calder', 'You gave her shard to the lake. Ilse told me. Do you hate this city so much?');
  if (flag('c4') === 1) await s.say('Calder', 'And I heard your broadcast. Everyone did. Look at them down there - every window lit. Do you know what you\'ve started?');
  else if (flag('c4') === 2) await s.say('Calder', 'I heard you read my script. Thank you for that. It kept the panic down.');
  await s.say('Calder', 'Here is the truth. Without the Heartwick, Wickhaven falls into the lake by morning. The Binding will keep her burning. Forever. It will cost every glimmer in the city.');
  await s.say('Calder', 'I hate it. I will do it anyway. Unless you have a better idea, courier, step aside.');
  if (flag('c4') === 1 && !relayOK()) {
    await s.say('Marlow (radio)', '...kid, the relays are open, but nobody\'s answering on the other end. Not enough people trust the call. Not enough glimmers. I\'m sorry.');
  }
  if (relayOK()) {
    await s.say('Marlow (radio)', 'Kid! Can you hear me? The relays are singing. Kite crews strung lines across every roof. The lake\'s humming on 720. Every lantern in the city is pointed at the Crown!');
    await s.say('Marlow (radio)', 'They\'re asking - all of them - can they help carry her? Just a little each?');
  }
  const opts = ['Bind the glimmers (the Guild\'s way)', 'Let the Heartwick rest (the lake\'s way)'];
  if (relayOK()) opts.push('Open the relays (share the light)');
  const c = await s.choose(null, `${lead} presses against your lantern. This is the last delivery.`, opts);
  if (c === 0) {
    await s.say(null, 'You step back. Calder nods once, and raises her hands. Gold threads of light begin to rise from every glimmer on the Crown - and from your lantern.');
    await s.say(null, 'The Crown\'s old well erupts. Black water climbs into the sky in the shape of a woman.');
    const won = await s.battle(hushMother, 'void');
    if (!won) return;
    s.set('finalDone'); s.set('ending', 1);
    await s.ending('gilded');
  } else if (c === 1) {
    await s.say(null, 'You step between Calder and the Heartwick, and you open your lantern, and you tell the great light that it can rest now.');
    await s.say('Calder', 'No. No! I will not let this city drown!');
    const won = await s.battle(calder, 'heart');
    if (!won) return;
    s.set('finalDone'); s.set('ending', 2);
    await s.ending('lowtide');
  } else {
    await s.say(null, 'You lift your lantern toward the relay mast on the Crown, and you call into the night on 1450: "Help me carry her."');
    await s.say(null, 'The answer comes back from every window at once. But the Heartwick, after a lifetime alone, does not know how to be helped. It flares in panic.');
    await s.say('Calder', 'Courier - calm her! I\'ll hold the Binding back. Go!');
    const won = await s.battle(heart, 'heart');
    if (!won) return;
    s.set('finalDone'); s.set('ending', 3);
    await s.ending('relay');
  }
  (window as any).__lfTitle();
}

registerMap({
  id: 'crown', name: 'The Heartwick Crown', music: 'heartwick', chapter: 5, theme: 'heart', light: '#ffd06a', floor: ':',
  tiles: [
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
    '~~~~~~~~~~~~~C:::::::C~~~~~~~~~~~~~~',
    '~~~~~~~~~~~C:::::::::::C~~~~~~~~~~~~',
    '~~~~~~~~~~T:::::::::::::T~~~~~~~~~~~',
    '~~~~~~~~~~:::::::::::::::~~~~~~~~~~~',
    '~~~~~~~~~~C:::::::::::::C~~~~~~~~~~~',
    '~~~~~~~~~~~C:::::::::::C~~~~~~~~~~~~',
    '~~~~~~~~~~~~#####G#####~~~~~~~~~~~~~',
    '~~~~~~~~~~~~:::::::::::~~~~~~~~~~~~~',
    '~~~~~~~~~~~T:::::::::::T~~~~~~~~~~~~',
    '~~~~~~~~~~~:::::::::::::~~~~~~~~~~~~',
    '~~~~~~~~~~~:::::::::::::~~~~~~~~~~~~',
    '~~~~~~~~~~~:::::::::::::~~~~~~~~~~~~',
    '~~~~~~~~~~~T:::::::::::T~~~~~~~~~~~~',
    '~~~~~~~~~~~~RRRR:::RRRR~~~~~~~~~~~~~',
    '~~~~~~~~~~~~#WW#:::#WW#~~~~~~~~~~~~~',
    '~~~,,,,,,::::::::::::::::::,,,,,,~~~',
    '~~,,,,,,,,:::::::::::::::::,,,,,,,~~',
    '~~,,,,%%,,::::T:::::T::::::,,%%,,,~~',
    '~~~,,,,,,,::::::::::::::::::,,,,,~~~',
    '~~~~~,,,,::::::::::::::::::::,,,~~~~',
    '~~~~~~~~~~~~~::::::::::~~~~~~~~~~~~~',
    '~~~~~~~~~~~~~*:::::::*~~~~~~~~~~~~~~',
    '~~~~~~~~~~~~~::::::::::~~~~~~~~~~~~~',
    '~~~~~~~~~~~~~~T::::::T~~~~~~~~~~~~~~',
    '~~~~~~~~~~~~~~~::::::~~~~~~~~~~~~~~~',
    '~~~~~~~~~~~~~~~::::::~~~~~~~~~~~~~~~',
    '~~~~~~~~~~~~~~~~SS~~~~~~~~~~~~~~~~~~',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
  ],
  gateFlag: 'crownGate',
  enc: [['candelabrat', 27, 30, 3], ['abyssbell', 27, 29, 2], ['stormkite', 27, 29, 3], ['murmurowl', 27, 29, 3], ['mossback', 28, 30, 2], ['cairnback', 28, 30, 2], ['sproutwick', 26, 26, 1], ['floodmaw', 30, 30, 1]], rate: 0.1,
  warps: [{ x: 16, y: 27, to: 'heights', tx: 37, ty: 3, dir: 0 }, { x: 17, y: 27, to: 'heights', tx: 38, ty: 3, dir: 0 }],
  onEnter: async (s) => {
    if (!flag('ch5start')) {
      s.set('ch5start');
      await s.chapter(5, 'The Heartwick Crown', 'The last delivery.');
      if (flag('c4') === 1) await s.say(null, 'Behind you, the whole city is glowing. Every window has a lantern in it.');
      else await s.say(null, 'Behind you, the city is dark. Only the Crown burns, gold and failing, overhead.');
      s.objective('Reach the Heartwick at the top of the Crown.');
    }
  },
  ents: [
    { id: 'rest5', x: 20, y: 23, kind: 'rest', talk: async (s) => { await s.rest(); } },
    { id: 'shop5', x: 14, y: 23, kind: 'npc', look: 'merchant', dir: 0, talk: async (s) => {
      await s.say('Last Merchant', 'End of the world prices! Which is to say, normal prices. I\'m sentimental.');
      await s.shop(['bigtonic', 'elixir', 'salve', 'rekindle', 'silklantern']);
    } },
    { id: 'junAlly', x: 12, y: 19, kind: 'npc', look: 'juniper', dir: 3, show: () => flag('c4') === 1, talk: async (s) => {
      if (flag('junAlly')) { await s.say('Juniper', 'I tore up my Guild contract. Felt amazing. Go on, slowpoke - I\'ve got your back.'); return; }
      s.set('junAlly');
      await s.say('Juniper', 'I heard you on the radio. Every word. I tore up my contract on the lift up here.');
      await s.say('Juniper', 'I was always so scared of the dark, you know? That\'s why I wanted the lantern that never goes out. But you made the dark sound... survivable.');
      await s.say('Juniper', 'Take these. And Wren - I\'m faster, but you\'re braver. Don\'t tell anyone I said that.');
      await s.give('elixir', 2); await s.give('rekindle', 2);
    } },
    { id: 'junFoe', x: 17, y: 19, kind: 'trainer', look: 'juniper', dir: 0, sight: 3, show: () => flag('c4') !== 1, talk: async (s) => {
      if (flag('beat_jun4')) { await s.say('Juniper', 'Go. Before I change my mind.'); return; }
      await s.say('Juniper', 'Last route, Wren. The Guild says nobody gets to the Heartwick tonight. One last race?');
      const won = await s.battle({ id: 'jun4', name: 'Juniper', title: 'Rival', look: 'juniper', team: [['stormkite', 29], ['staticat', 29], ['abyssbell', 29], [FINAL[juniperStarter()], 31]], reward: 1200,
        lose: 'Huh. You win. You always win when it matters.' });
      if (won) await s.say('Juniper', 'Whatever you do up there... I hope it\'s the right thing. I really do.');
    } },
    { id: 'fennAlly', x: 22, y: 17, kind: 'npc', look: 'guild', dir: 2, show: () => flag('c1') === 2, talk: async (s) => {
      if (flag('fennAlly')) { await s.say('Fenn', 'Braziers: Ember, Tide, Bloom, Gale. You didn\'t hear it from me.'); return; }
      s.set('fennAlly');
      await s.say('Fenn', 'The sensible courier, at the end of the world. I put in a word with the guards. They\'ll let you pass.');
      await s.say('Fenn', 'The sanctum gate opens to the braziers. The poem\'s on the plinth. And between you and me... I don\'t want to see that moth bound either. Not really.');
      await s.give('elixir', 1);
    } },
    { id: 'fennFoe', x: 22, y: 17, kind: 'trainer', look: 'guild', dir: 2, sight: 4, show: () => flag('c1') !== 2, talk: async (s) => {
      if (flag('beat_fenn5')) { await s.say('Fenn', 'Go on, net-cutter. Finish it.'); return; }
      await s.say('Fenn', 'The net-cutter! Of course it\'s you. Of course.');
      await s.battle({ id: 'fenn5', name: 'Fenn', title: 'Senior Collector', look: 'guild', team: [['cairnback', 28], ['candelabrat', 28], ['papermoth', 29]], reward: 900, lose: 'Fine. I never liked the nets either.' });
    } },
    { id: 'junGate', x: 16, y: 16, w: 3, h: 1, kind: 'trigger', show: () => flag('c4') !== 1 && !flag('beat_jun4'), talk: async (s) => {
      await s.say('Juniper', 'Wren! Not so fast.');
      const e = s.ow.def?.ents.find((x: any) => x.id === 'junFoe'); if (e?.talk) await e.talk(s);
      if (!flag('beat_jun4')) await s.movePlayer(0, 1);
    } },
    { id: 'guard1', x: 16, y: 15, kind: 'trainer', look: 'guild', dir: 3, sight: 1, show: () => guildFavor() < 2 && !flag('fennAlly'), talk: async (s) => {
      if (flag('beat_guard1')) { await s.say('Crown Guard', 'Pass. Please. I have a family.'); return; }
      await s.say('Crown Guard', 'Halt! No one approaches the Heartwick tonight!');
      await s.battle({ id: 'guard1', name: 'Crown Guard', look: 'guild', team: [['candelabrat', 28], ['cairnback', 28]], reward: 700, lose: 'You may... pass.' });
    } },
    { id: 'guard2', x: 18, y: 14, kind: 'trainer', look: 'guild', dir: 2, sight: 1, show: () => guildFavor() < 2 && !flag('fennAlly'), talk: async (s) => {
      if (flag('beat_guard2')) { await s.say('Crown Guard', 'I didn\'t see anything.'); return; }
      if (flag('beat_guard1')) { await s.say(null, 'The second guard looks at his partner, then at your lantern, and steps aside.'); s.set('beat_guard2'); return; }
      await s.say('Crown Guard', 'By order of the Provost!');
      await s.battle({ id: 'guard2', name: 'Crown Guard', look: 'guild', team: [['murmurowl', 28], ['stormkite', 28]], reward: 700, lose: 'The Provost won\'t like this.' });
    } },
    { id: 'guardNice', x: 15, y: 16, kind: 'npc', look: 'guild', dir: 0, show: () => guildFavor() >= 2 || !!flag('fennAlly'), talk: async (s) => {
      await s.say('Crown Guard', 'The Provost said to expect you, courier. Go on up.');
    } },
    { id: 'poem', x: 17, y: 13, kind: 'sign', talk: async (s) => {
      await s.say(null, 'Carved on the plinth: "First the flame that wakes, then the tide that takes, then the bloom that breaks, then the wind that shakes."');
    } },
    { id: 'b0', x: 12, y: 10, kind: 'obj', obj: 'brazier', show: () => !(flag('brz') & 1) && !flag('crownGate'), talk: brazier(0) },
    { id: 'b0l', x: 12, y: 10, kind: 'obj', obj: 'brazier', glow: '#ff9a3c', show: () => !!(flag('brz') & 1) || !!flag('crownGate'), talk: brazier(0) },
    { id: 'b1', x: 22, y: 12, kind: 'obj', obj: 'brazier', show: () => !(flag('brz') & 2) && !flag('crownGate'), talk: brazier(1) },
    { id: 'b1l', x: 22, y: 12, kind: 'obj', obj: 'brazier', glow: '#4fb3ff', show: () => !!(flag('brz') & 2) || !!flag('crownGate'), talk: brazier(1) },
    { id: 'b2', x: 22, y: 10, kind: 'obj', obj: 'brazier', show: () => !(flag('brz') & 4) && !flag('crownGate'), talk: brazier(2) },
    { id: 'b2l', x: 22, y: 10, kind: 'obj', obj: 'brazier', glow: '#7fe07a', show: () => !!(flag('brz') & 4) || !!flag('crownGate'), talk: brazier(2) },
    { id: 'b3', x: 12, y: 12, kind: 'obj', obj: 'brazier', show: () => !(flag('brz') & 8) && !flag('crownGate'), talk: brazier(3) },
    { id: 'b3l', x: 12, y: 12, kind: 'obj', obj: 'brazier', glow: '#c9d8ff', show: () => !!(flag('brz') & 8) || !!flag('crownGate'), talk: brazier(3) },
    { id: 'heartwick', x: 17, y: 2, kind: 'obj', mon: 'heartwick', glow: '#ffe7a0', talk: finale },
    { id: 'calder', x: 17, y: 4, kind: 'npc', look: 'provost', dir: 0, glow: '#ffffff', show: () => !flag('finalDone'), talk: finale },
    { id: 'finTrig', x: 12, y: 5, w: 11, h: 1, kind: 'trigger', show: () => !flag('finalDone') && !flag('finSeen'), talk: async (s) => { s.set('finSeen'); await finale(s); } },
  ],
});
