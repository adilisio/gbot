import { G, flag, setFlag, addFlag, giveItem, makeMon, addMon, healAll, sp, maxHp } from '../state';
import { ITEMS } from '../data/items';
import { SPECIES } from '../data/glimmers';
import { say, choose } from '../ui/dialogue';
import { waitFrames, fadeOut, fadeIn, scenes, toast } from '../game';
import { audio } from '../engine/audio';
import { startBattle, trainerTeam } from '../battle/scene';
import { TrainerDef } from '../battle/engine';
import type { Overworld } from './overworld';
import { saveTo } from '../engine/save';
import * as M from '../ui/menus';
import * as X from '../ui/scenes';
import { TypeChartScene } from '../ui/typechart';

export type ScriptAPI = ReturnType<typeof makeAPI>;
const DIRS: [number, number][] = [[0, 1], [0, -1], [-1, 0], [1, 0]];

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
      giveItem(id, n); audio.sfx('buy');
      await say(null, `You received ${n > 1 ? n + ' x ' : 'a '}${ITEMS[id].name}!`);
    },
    async glints(n: number) { G.glints += n; audio.sfx('buy'); await say(null, `You received ${n} glints.`); },
    async giveMon(spId: string, lv: number) {
      const m = makeMon(spId, lv);
      const where = addMon(m);
      audio.sfx('befriend');
      await say(null, `${SPECIES[spId].name} joined you!${where === 'roost' ? ' (Your team is full, so it flew to the Roost.)' : ''}`);
    },
    async heal() { healAll(); audio.sfx('heal'); await waitFrames(30); },
    async fade() { await fadeOut(); },
    async unfade() { await fadeIn(); },
    async warp(map: string, x: number, y: number, dir = 0) {
      audio.sfx('door');
      await fadeOut(12);
      ow.load(map, x, y, dir);
      saveTo('auto', ow.def.name);
      await fadeIn(12);
    },
    /** Trainer / boss battle. Returns true on win. */
    async battle(t: TrainerDef, theme?: string): Promise<boolean> {
      await flash();
      const pr = startBattle('trainer', trainerTeam(t), t, theme || ow.def.theme); fadeIn(10);
      const r = await pr;
      audio.play(ow.def.music);
      if (r === 'win') { setFlag('beat_' + t.id); saveTo('auto', ow.def.name); return true; }
      if (t.noLoss) { healAll(); return false; }
      await lost();
      return false;
    },
    async wild(spId: string, lv: number) {
      await flash();
      const pr = startBattle('wild', [makeMon(spId, lv)], null, ow.def.theme); fadeIn(10);
      const r = await pr;
      audio.play(ow.def.music);
      if (r === 'lose') await lost();
      else saveTo('auto', ow.def.name);
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
    shop: (items: string[]) => new Promise<void>((r) => scenes.push(new M.ShopScene(items, r))),
    async rest() {
      G.rest = { map: ow.def.id, x: ow.px, y: ow.py };
      await new Promise<void>((r) => scenes.push(new M.RestScene(ow.def.name, r)));
    },
    radio: (lines: [string, string][], title = 'WKHV 1450 - Night Owl Hour') => new Promise<void>((r) => scenes.push(new X.RadioScene(title, lines, r))),
    chapter: (n: number, title: string, sub: string) => new Promise<void>((r) => { G.chapter = n; scenes.push(new X.ChapterCard(n, title, sub, r)); }),
    tune: (target: number, label: string) => new Promise<boolean>((r) => scenes.push(new X.TuneScene(target, label, r))),
    ending: (id: string) => new Promise<void>((r) => scenes.push(new X.EndingScene(id, r))),
    starter: () => new Promise<string>((r) => scenes.push(new X.StarterScene(r))),
    pauseMenu() { scenes.push(new M.PauseMenu(ow)); },
    typeChart() { scenes.push(new TypeChartScene(null)); },
    autosave() { saveTo('auto', ow.def.name); },
    refresh() { ow.refreshVisibility(); },
    rebake() { ow.rebake(); },
    lead() { return G.team[0] ? sp(G.team[0]).name : 'your glimmer'; },
    teamHas(spId: string) { return G.team.some((m) => m.sp === spId) || G.roost.some((m) => m.sp === spId); },
    hurtCheck() { return G.team.some((m) => m.hp < maxHp(m)); },
  };

  async function flash() {
    audio.sfx('encounter');
    for (let i = 0; i < 2; i++) { await fadeOut(4, '#fff0c0'); await fadeIn(4); }
    await fadeOut(10);
  }
  async function lost() {
    await fadeOut(30);
    healAll();
    ow.load(G.rest.map, G.rest.x, G.rest.y, 0, false);
    await fadeIn(30);
    await say(null, 'You wake beside a Lantern Rest. Your glimmers flicker back to life, a little embarrassed.');
  }
  return api;
}
