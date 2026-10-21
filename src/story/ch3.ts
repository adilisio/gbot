import { registerMap } from '../overworld/mapdef';
import { flag, G } from '../state';
import type { FoeDef as TrainerDef } from '../overworld/script';
import type { ScriptAPI } from '../overworld/script';

const warden: TrainerDef = { id: 'warden', name: 'Belfry Warden', look: 'ghost', team: [['driftjelly', 18], ['belfrywarden', 21]], reward: 0, boss: true,
  intro: '(The great bell tolls. Something old and heavy answers.)', lose: '(The bell rings once, softly, and goes still.)', bg: 'belfry' };
const ilse: TrainerDef = { id: 'ilse', name: 'Ilse', title: 'Warden-Captain', look: 'guild', team: [['cobblecrab', 19], ['emberwisp', 19], ['lampfish', 20]], reward: 700, boss: true,
  intro: 'You gave a piece of the Heartwick to the LAKE? Do you have any idea what you\'ve done?', lose: 'The Provost will hear about this, courier. Every word.' };

async function bell(s: ScriptAPI) {
  if (flag('c3')) { await s.say(null, 'The Margaret Hale\'s bell hangs silent, green with a lifetime of lake.'); return; }
  await s.say(null, 'An enormous ship\'s bell, green with age. Letters in the bronze: MARGARET HALE - ORE BOAT - PORT CALLOWAY.');
  if (!flag('hmAwake')) {
    const c = await s.choose(null, 'Your Ember Shard is pulsing in time with something deep below.', ['Ring the bell', 'Leave it']);
    if (c === 1) return;
    s.sfx('chime'); s.set('hmAwake');
    await s.wait(40);
    await s.say(null, 'The note rolls out across the drowned town. Every streetlamp in Port Calloway flickers. The water in the hold begins to rise and take a shape.');
  }
  await s.say('The Hush Mother', '...Little courier. You carry my daughter\'s heart in your pocket.');
  await s.say('The Hush Mother', 'When the Long Swell came, I drowned this town. I did not mean to. Lakes do not mean things. But my daughter did.');
  await s.say('The Hush Mother', 'She rose out of me, a spark of the deep, and lifted the survivors on her light. One lifetime, she promised them. The Heartwick, they call her now.');
  await s.say('The Hush Mother', 'Her lifetime is over. She is tired. She is falling apart - that shard is a piece of her. And the Guild means to chain her there forever.');
  await s.say('The Hush Mother', 'The Binding. Every glimmer in the city, bound into her flame to keep her burning. Your little friends too.');
  s.set('knowsBinding');
  await s.say('The Hush Mother', 'Give the shard back to the deep, and let her come home. Or carry it up to them, and help them hold her there. It is your choice. It is always the courier\'s choice.');
  const c = await s.choose('The Hush Mother', 'What will you do with the shard?', ['Return it to the deep', 'Keep it for the Guild']);
  if (c === 0) {
    s.set('c3', 1);
    delete G.bag.shard;
    await s.say(null, 'You lower the Ember Shard into the black water. It sinks slowly, lighting the hold like a sunrise, until it is gone.');
    await s.say('The Hush Mother', 'Thank you. I will remember this when the lights go out. Take this - it belonged to a lighthouse keeper who never stopped looking for the shore.');
    await s.give('starlantern', 1);
    await s.say('The Hush Mother', 'And one of my quiet children wishes to go with you.');
    await s.giveMon('hushling', 18);
    await s.say('The Hush Mother', 'One more thing, little courier. There may be a third way. Listen to the radio. Listen for 1450.');
  } else {
    s.set('c3', 2);
    await s.say('The Hush Mother', 'Then you will hear her bell ring for you, as it rang for the Hale.');
    await s.say(null, 'The water drops away. The bell begins to swing on its own, slowly, impossibly - and the thing inside it wakes.');
    const won = await s.battle(warden, 'belfry');
    if (!won) { s.set('c3', 0); s.set('hmAwake', 1); return; }
    await s.say(null, 'The Belfry Warden settles back into silence. The shard in your pocket burns a little hotter.');
    s.set('ch3done');
    s.objective('Climb out of the Drowned Steps (east stairs) to Static Heights.');
  }
  s.set('hmGone');
  if (flag('c3') === 1) s.objective('Leave the wreck (east exit) and climb to Static Heights.');
}

registerMap({
  id: 'steps', name: 'The Drowned Steps', music: 'belfry', chapter: 3, theme: 'belfry', light: '#7fe0ff', floor: '_',
  tiles: [
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
    '~~~SSS~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
    '~~.....T~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
    '~~........~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
    '~~~~~~S~~~~~~~~~RRRRRR~~~~~~~RRRRRRRR~~~',
    '~~~~~~S~~~~~~~~~RRRRRR~~~~~~~RRRRRRRR~~~',
    '~~____S____~~~~~#W##W#~~~~~~~#W##W##W~~~',
    '~~_;;;___;;;___T______;;;;;___T_______~~',
    '~~_;;;;__;;;;________;;;;;;;__________~~',
    '~~__;;____;;___C____C___;;;___C___C___~~',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~__~~~',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~__~~~',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~;;~~~',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~;;~~~',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~__~~~',
    '~~#W##W#~~~~#W#W##~~~~~RRRRR~~~~~~~__~~~',
    '~~______~~~~______~~~~~#W#W#~~~~~~~__~~~',
    '~~_B______________;;;;;_____;;;;;;;__~~~',
    '~~____x______B__T_;;;;;__T__;;;;;;;__~~~',
    '~~__C_____________;;;;;_____________~~~~',
    '~~________x_C_____~~~~~~~~~~~~~~~~~~~~~~',
    '~~~~~~~~G~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
    '~~~~~~~~_~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
    '~~~~~~~~______~~~~~~~~~~~~~~~~~~~~~~~~~~',
    '~~~~~~~~~~~~_###########~~~~~~~~~~~~~~~~',
    '~~~~~~~~~~~~_#.........#####~~~~~~~~~~~~',
    '~~~~~~~~~~~~_...............___________~',
    '~~~~~~~~~~~~_#.........#####________S__~',
    '~~~~~~~~~~~~~###########~~~~~~~~~~~~~~~~',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
  ],
  gateFlag: 'stepsGate',
  onSolve: async (s) => { await s.say(null, 'Both plates sink. Deep below, chains rattle - and the old harbour gate grinds open.'); },
  enc: [['driftjelly', 15, 18, 4], ['hushling', 15, 18, 3], ['lampfish', 16, 18, 3], ['cobblecrab', 16, 18, 2], ['fernling', 15, 17, 2], ['ripplet', 16, 16, 1], ['pebblit', 16, 18, 1]], rate: 0.1,
  warps: [
    { x: 4, y: 1, to: 'kitefall', tx: 39, ty: 26, dir: 1 },
    { x: 36, y: 27, to: 'heights', tx: 3, ty: 20, dir: 1 },
  ],
  onEnter: async (s) => {
    if (!flag('ch3start')) {
      s.set('ch3start');
      await s.chapter(3, 'The Drowned Steps', 'Forty feet down, the streetlamps are still on.');
      await s.say('Brannock', 'Here we are. Port Calloway. My old town. The Steps go down, through, and up the far side. Watch the water - it listens.');
      s.objective('Cross the drowned town. Find the way to the wreck of the Margaret Hale.');
    }
  },
  ents: [
    { id: 'bran3', x: 4, y: 3, kind: 'npc', look: 'ferry', dir: 0, glow: '#ffd58a', talk: async (s) => {
      await s.say('Brannock', 'See that ore boat down there, past the harbour gate? The Margaret Hale. Went down the night of the Swell with her bell still ringing.');
      await s.say('Brannock', 'Harbour gate needs both plates pressed. Crates were always good for that. Push \'em, don\'t pull \'em.');
    } },
    { id: 'rest3', x: 8, y: 3, kind: 'rest', talk: async (s) => { await s.rest(); } },
    { id: 'ghost1', x: 12, y: 8, kind: 'npc', look: 'ghost', dir: 0, glow: '#bff0ff', talk: async (s) => {
      await s.say('Drowned Deckhand', 'Is it six bells yet? Captain says we make Calloway by six bells. The lake\'s gone so quiet...');
    } },
    { id: 'ghost2', x: 33, y: 8, kind: 'npc', look: 'ghost', dir: 2, glow: '#bff0ff', talk: async (s) => {
      await s.say('Keeper\'s Wife', 'He kept the light burning three days after the water came. Three days. Then he just... went looking for the shore.');
    } },
    { id: 'ghost3', x: 26, y: 18, kind: 'npc', look: 'ghost', dir: 0, glow: '#bff0ff', talk: async (s) => {
      await s.say('Drowned Grocer', 'Up there they think the dark is the end of the world. Down here we know it\'s only the bottom of the lake.');
    } },
    { id: 'maren', x: 20, y: 7, kind: 'npc', look: 'tide', dir: 0, talk: async (s) => {
      await s.say('Maren', 'A surface-walker in the Steps? Mind the water. Drowned shades swim - they rise right out of it.');
      await s.say('Maren', 'Wet things will not burn, but they slow down. Tide first, then something heavy.');
    } },
    { id: 'coll', x: 30, y: 17, kind: 'npc', look: 'tide', dir: 2, talk: async (s) => {
      await s.say('Coll', 'The Hush Mother sings louder every night. Something\'s coming up.');
      await s.say('Coll', 'When she sings, the drowned answer. Stand on the ripples where they rise and they cannot surface.');
    } },
    { id: 'acolyte', x: 36, y: 12, kind: 'npc', look: 'tide', dir: 1, talk: async (s) => {
      await s.say('Acolyte Wen', 'Shhhh. You\'re very loud for someone so small.');
      await s.say('Acolyte Wen', 'Bells in the dark hold the shades together. Ring them out first and the rest scatter.');
    } },
    { id: 'trader', x: 14, y: 16, kind: 'npc', look: 'tide', dir: 0, talk: async (s) => {
      await s.say('Tidefolk Trader', 'Down here we trade in what floats. Oil floats. Coins, sadly, sink - but I accept them.');
      await s.shop(['tonic', 'bigtonic', 'salve', 'rekindle', 'lantern', 'silklantern']);
    } },
    { id: 'stepsDrowned', x: 24, y: 19, kind: 'shade', look: 'drowned', enc: 'steps1', dir: 2, sight: 2, show: () => !flag('beat_stepsDrowned'), talk: async (s) => {
      await s.say(null, 'Drowned shades rise out of the flooded street, dripping and dark.');
      await s.fight('steps1', { flagId: 'beat_stepsDrowned' });
    } },
    { id: 'stepsBells', x: 18, y: 8, kind: 'shade', look: 'bell', enc: 'steps2', dir: 0, sight: 2, show: () => !flag('beat_stepsBells'), talk: async (s) => {
      await s.say(null, 'A drowned bell tolls once. Shades gather to the sound.');
      await s.fight('steps2', { flagId: 'beat_stepsBells' });
    } },
    { id: 'sign3', x: 2, y: 16, kind: 'sign', talk: async (s) => { await s.say(null, 'HARBOUR GATE: both pressure plates must be weighted. (Leave the Steps and return to reset stuck crates.)'); } },
    { id: 'fenn3', x: 24, y: 17, kind: 'npc', look: 'guild', dir: 0, show: () => flag('c1') === 2, talk: async (s) => {
      if (flag('fenn3')) { await s.say('Fenn', 'Go on. The Provost\'s waiting for that shard.'); return; }
      s.set('fenn3');
      await s.say('Fenn', 'Wren! The sensible courier. The Provost sent me to make sure that shard gets up to the Crown in one piece.');
      await s.say('Fenn', 'Here. Guild issue. Don\'t say I never gave you anything.');
      await s.give('elixir', 2);
    } },
    { id: 'chest3', x: 2, y: 9, kind: 'item', obj: 'chest', show: () => !flag('chest3'), talk: async (s) => { s.set('chest3'); await s.give('rekindle', 2); } },
    { id: 'parcel3', x: 20, y: 19, kind: 'item', obj: 'parcel', show: () => !flag('parcel3'), talk: async (s) => { s.set('parcel3'); await s.say(null, 'A waterlogged parcel addressed to "Whoever finds this." Inside: a dry Moon Elixir in a wax jar.'); await s.give('elixir', 1); } },
    { id: 'bell', x: 16, y: 25, kind: 'obj', obj: 'bell', glow: '#b48cff', talk: bell },
    { id: 'hm', x: 19, y: 25, kind: 'obj', mon: 'hushmother', glow: '#7fe0ff', show: () => !!flag('hmAwake') && !flag('hmGone'), talk: bell },
    { id: 'exitTrig', x: 27, y: 26, kind: 'trigger', show: () => !flag('ch3done'), talk: async (s) => {
      if (!flag('c3')) { await s.say(null, 'The shard in your pocket tugs you back toward the bell. Not yet.'); await s.movePlayer(2, 1); return; }
      if (flag('c3') === 1 && !flag('beat_ilse')) {
        s.set('ilseHere');
        await s.say('Ilse', 'Stop right there, courier! Warden-Captain Ilse, Lamplighters\' Guild. We felt the shard go dark from the Crown.');
        const won = await s.battle(ilse, 'belfry');
        s.set('ilseHere', 0);
        if (!won) return;
        await s.say('Ilse', 'You\'ve made an enemy of the Provost tonight.');
        s.set('ch3done');
        s.objective('Climb the east stairs to Static Heights.');
      }
    } },
    { id: 'ilse', x: 29, y: 26, kind: 'npc', look: 'guild', dir: 2, show: () => !!flag('ilseHere') },
  ],
});
