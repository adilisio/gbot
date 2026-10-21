import { G, flag, setFlag, addFlag, giveItem, addWick, hasWick, refill, oilMax, bondLantern, leadName, addOil } from '../state';
import { ITEMS, itemId } from '../data/items';
import { WICKS } from '../data/wicks';
import { say, choose } from '../ui/dialogue';
import { waitFrames, fadeOut, fadeIn, scenes, toast } from '../game';
import { audio } from '../engine/audio';
import type { Overworld } from './overworld';
import { saveTo } from '../engine/save';
import * as M from '../ui/menus';
import * as X from '../ui/scenes';
import { GuideScene } from '../tactics/guide';
import { TacticsScene, FightResult } from '../tactics/scene';
import { ENCOUNTERS } from '../tactics/encounters';
import { SHRINE_NAME } from '../data/shrines';

export type ScriptAPI = ReturnType<typeof makeAPI>;
const DIRS: [number, number][] = [[0, 1], [0, -1], [-1, 0], [1, 0]];

/** Story fights keep their TrainerDef shape; only id/name/intro/lose/noLoss matter now. */
export interface FoeDef { id: string; name: string; title?: string; look?: string; intro?: string; lose?: string; win?: string; noLoss?: boolean; [k: string]: unknown; }
/** Which board each story confrontation uses. */
const FIGHT_FOR: Record<string, string> = {
  jun1: 'drill', fenn: 'fenn', swarm: 'swarm', pike: 'pike', jun2: 'jun2', vale: 'vale',
  warden: 'warden', ilse: 'ilse', jun3: 'jun3', jun4: 'jun4', fenn5: 'fenn5', guard1: 'guard1', guard2: 'guard2',
  hmfinal: 'hmfinal', calder: 'calder', heart: 'heart',
};
const SHRINE_JOIN: Record<string, string> = { kitefall: 'driftjelly', steps: 'emberwisp' };

export function makeAPI(ow: Overworld) {
  const api = {
    ow,
    say, choose,
    wait: (f: number) => waitFrames(f),
    flag, set: (k: string, v = 1) => { setFlag(k, v); ow.refreshVisibility(); }, add: addFlag,
    sfx: (n: string) => audio.sfx(n),
    music: (n: string) => audio.play(n),
    objective(t: string) { if (G.obj !== t) { G.obj = t; toast('New objective: ' + t); } },
    async give(id: string, n = 1) {
      id = itemId(id);
      if (id === 'silkwick') n = 1;
      giveItem(id, n); audio.sfx('buy');
      await say(null, `You received ${n > 1 ? n + ' x ' : 'a '}${ITEMS[id].name}!${id === 'silkwick' ? ' (Max oil +2.)' : ''}`);
    },
    /** Glint rewards mark a finished delivery: wicks in the lantern share the moment. */
    async glints(n: number) { G.glints += n; audio.sfx('buy'); await say(null, `You received ${n} glints.`); await api.bond(1, 'delivery'); },
    async bond(n: number, why = '') {
      const up = bondLantern(n);
      void why;
      for (const id of up) {
        const w = WICKS[id]; const lv = Math.min(3, (G.bond[id] >= 7 ? 3 : 2));
        audio.sfx('level');
        await say(null, w.bond[lv - 2]);
        await say(null, `Bond with ${w.name} deepened (bond ${lv}). New light: ${w.abilities[lv - 1].name} - ${w.abilities[lv - 1].desc}`);
      }
    },
    async joinWick(id: string) {
      const w = WICKS[id]; if (!w || hasWick(id)) return;
      const where = addWick(id);
      audio.sfx('befriend');
      await say(null, w.join);
      await say(null, `${w.name} (${w.role}) joined you!${where === 'satchel' ? ' Your lantern is full, so ' + w.name + ' rides in your satchel for now.' : ''}`);
      if (G.wicks.length > 3 && !flag('swapTut')) {
        setFlag('swapTut');
        await say('Odile (memory)', '"A lantern only holds three wicks, Wren. The rest ride in your satchel. Any lit shrine will let you swap them - choose who carries the light."');
        await say(null, 'Let\'s set your lantern now. Pick a wick in the satchel, then the lantern slot to put it in. (Normally you can only swap at a lit shrine.)');
        await new Promise<void>((r) => scenes.push(new M.LanternScene(true, r, true)));
      }
    },
    async giveMon(spId: string, _lv?: number) { await api.joinWick(spId); },
    async heal() { refill(); audio.sfx('heal'); await waitFrames(30); },
    async fade() { await fadeOut(); },
    async unfade() { await fadeIn(); },
    async warp(map: string, x: number, y: number, dir = 0) {
      audio.sfx('door');
      await fadeOut(12);
      ow.load(map, x, y, dir);
      saveTo('auto', ow.def.name);
      await fadeIn(12);
    },
    /** Run a tactical encounter by id. Returns true on win. */
    async fight(encId: string, opts: { noLoss?: boolean; flagId?: string; lose?: string } = {}): Promise<boolean> {
      const def = ENCOUNTERS[encId];
      if (!def) { console.warn('no encounter', encId); return true; }
      await flash();
      const r = await new Promise<FightResult>((res) => { scenes.push(new TacticsScene(def, res)); fadeIn(10); });
      audio.play(ow.def.music);
      if (r === 'win') {
        if (opts.flagId) setFlag(opts.flagId);
        setFlag('won_' + encId);
        ow.refreshVisibility();
        const rw = def.reward || {};
        if (rw.glints) G.glints += rw.glints;
        if (rw.flask) giveItem('flask', rw.flask);
        if (rw.glints || rw.flask) toast(`+${rw.glints || 0} glints${rw.flask ? ', +' + rw.flask + ' Oil Flask' : ''}`);
        await api.bond(1, 'fight');
        saveTo('auto', ow.def.name);
        return true;
      }
      if (opts.noLoss) { addOil(Math.ceil(oilMax() / 2)); if (G.oil < 4) G.oil = 4; return false; }
      await lost();
      return false;
    },
    async battle(t: FoeDef, _theme?: string): Promise<boolean> {
      const enc = FIGHT_FOR[t.id] || t.id;
      const won = await api.fight(enc, { noLoss: t.noLoss, flagId: 'beat_' + t.id });
      return won;
    },
    face(id: string, dir: number) { const e = ow.ents.find((e) => e.def.id === id); if (e) e.dir = dir; },
    facePlayer(dir: number) { ow.dir = dir; },
    async move(id: string, dir: number, n: number) {
      const e = ow.ents.find((e) => e.def.id === id); if (!e) return;
      e.dir = dir;
      for (let i = 0; i < n; i++) {
        e.fx = e.x; e.fy = e.y; e.x += DIRS[dir][0]; e.y += DIRS[dir][1]; e.t = 0;
        await waitFrames(8);
      }
    },
    async movePlayer(dir: number, n: number) {
      for (let i = 0; i < n; i++) {
        ow.dir = dir;
        ow.startMove(ow.px + DIRS[dir][0], ow.py + DIRS[dir][1], 8);
        ow.forced = false;
        while (ow.moving) await waitFrames(1);
      }
    },
    shop: (items: string[]) => {
      const ids = [...new Set(items.map(itemId).filter((i) => ITEMS[i].price > 0))];
      return new Promise<void>((r) => scenes.push(new M.ShopScene(ids, r)));
    },
    /** Shrines: relight once, then Rest and refill (+autosave, return point, wick swap). */
    async rest() {
      const key = 'shrine_' + ow.def.id;
      const name = SHRINE_NAME[ow.def.id] || 'Shrine';
      if (!flag(key)) {
        await say(null, `A cold shrine-lantern, taller than you, its glass furred with soot. Your courier\'s flame would catch in it.`);
        const c = await choose(null, 'Relight the shrine?', ['Relight it', 'Not now']);
        if (c !== 0) return;
        setFlag(key); audio.sfx('puzzle'); ow.rebake();
        await say(null, `The ${name} roars back to life. Warm light spills across the boards. (Shrines refill your oil, save your journey and let you swap wicks. Max oil +2.)`);
        const j = SHRINE_JOIN[ow.def.id];
        if (j && !hasWick(j)) await api.joinWick(j);
      }
      G.rest = { map: ow.def.id, x: ow.px, y: ow.py, name };
      refill(); audio.sfx('heal');
      saveTo('auto', ow.def.name);
      await new Promise<void>((r) => scenes.push(new M.ShrineScene(name, ow.def.name, r)));
    },
    radio: (lines: [string, string][], title = 'WKHV 1450 - Night Owl Hour') => new Promise<void>((r) => scenes.push(new X.RadioScene(title, lines, r))),
    chapter: async (n: number, title: string, sub: string) => {
      await new Promise<void>((r) => { G.chapter = n; scenes.push(new X.ChapterCard(n, title, sub, r)); });
      if (n > 1) await api.bond(1, 'chapter');
    },
    tune: (target: number, label: string) => new Promise<boolean>((r) => scenes.push(new X.TuneScene(target, label, r))),
    ending: (id: string) => new Promise<void>((r) => scenes.push(new X.EndingScene(id, r))),
    starter: () => new Promise<string>((r) => scenes.push(new X.StarterScene(r))),
    pauseMenu() { scenes.push(new M.PauseMenu(ow)); },
    typeChart() { scenes.push(new GuideScene()); },
    autosave() { saveTo('auto', ow.def.name); },
    refresh() { ow.refreshVisibility(); },
    rebake() { ow.rebake(); },
    lead() { return leadName(); },
    teamHas(id: string) { return hasWick(id); },
    hurtCheck() { return G.oil < oilMax(); },
  };

  async function flash() {
    audio.sfx('encounter');
    for (let i = 0; i < 2; i++) { await fadeOut(4, '#2a1050'); await fadeIn(4); }
    await fadeOut(10);
  }
  async function lost() {
    await fadeOut(30);
    refill();
    ow.load(G.rest.map, G.rest.x, G.rest.y, 0, false);
    await fadeIn(30);
    await say(null, `Your lantern guttered out. You wake beside the ${G.rest.name || 'shrine'}, lantern refilled, glimmers huddled close. The shades are still out there.`);
  }
  return api;
}
