import { W, H } from './engine/canvas';
import { input } from './engine/input';
import { audio } from './engine/audio';
import { settings } from './engine/settings';
import { startLoop, Stats, Recorder } from './engine/loop';
import { text } from './engine/font';
import { scenes, fader, clock, tickWaiters, fadeOut, fadeIn } from './game';
import { G, newState, setState, setFlag, addWick, refill } from './state';
import { world } from './overworld/overworld';
import { TitleScene } from './ui/scenes';
import { SaveLoadScene, SettingsScene } from './ui/menus';
import { anySave, loadFrom } from './engine/save';
import { applyScale } from './screen';
import { registerStory, newGameIntro } from './story';

const canvas = document.getElementById('screen') as HTMLCanvasElement;
const ctx = canvas.getContext('2d', { alpha: false })!;
ctx.imageSmoothingEnabled = false;
canvas.width = W; canvas.height = H;
input.attach(canvas);
canvas.focus();
applyScale();
window.addEventListener('resize', applyScale);
registerStory();

const stats = new Stats();
const rec = new Recorder();

function toTitle() {
  scenes.replaceAll(new TitleScene(!!anySave(), {
    cont: async () => { const s = anySave(); if (s && loadFrom(s)) { await fadeOut(); enterLoaded(); await fadeIn(); } },
    newGame: async () => {
      await fadeOut(20);
      setState(newState());
      scenes.replaceAll(world);
      world.load('lowwick', 7, 7, 1, false);
      fadeIn(30);
      world.run(newGameIntro);
    },
    load: () => scenes.push(new SaveLoadScene('load', '')),
    settings: () => scenes.push(new SettingsScene()),
  }));
  audio.play('title');
}
function enterLoaded() {
  scenes.replaceAll(world);
  world.load(G.map, G.x, G.y, G.dir, false);
}
(window as any).__lfTitle = toTitle;
(window as any).__lfLoaded = async () => { await fadeOut(10); enterLoaded(); await fadeIn(10); };
(window as any).__lfRebake = () => { if (world.def) world.rebake(); };

toTitle();

// ---------- Loop ----------
let fpsOverlay = settings.fps;
function update() {
  input.beginStep();
  if (input.hit('debug')) { settings.fps = !settings.fps; }
  clock.t++;
  tickWaiters();
  scenes.update();
  fader.update();
  audio.update();
}
function render() {
  scenes.render(ctx);
  fader.render(ctx);
  if (settings.fps) drawStats();
}
function drawStats() {
  const s = stats.summary(60);
  ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(W - 112, H - 36, 110, 34);
  text(ctx, `FPS ${(1000 / Math.max(1, s.avg)).toFixed(0)}  frame ${s.avg.toFixed(1)}ms`, W - 108, H - 34, '#9fffd0', null);
  text(ctx, `worst ${s.worst.toFixed(1)}ms`, W - 108, H - 24, s.worst > 20 ? '#ff7a6a' : '#9fffd0', null);
  text(ctx, `cpu ${s.workAvg.toFixed(2)} / ${s.workWorst.toFixed(2)}ms`, W - 108, H - 14, '#9fffd0', null);
}
void fpsOverlay;
const loop = startLoop(update, render, stats, rec);

// Pause when hidden (saves battery and keeps the GPU cool).
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { loop.pause(); audio.suspend(); }
  else { loop.resume(); audio.resume(); }
});
// Resume audio on first gesture anywhere.
window.addEventListener('pointerdown', () => audio.init(), { once: true });
window.addEventListener('keydown', () => audio.init(), { once: true });

import { autoTurn } from './tactics/autoplay';
// ---------- Debug / test harness hooks (only with ?debug in the URL) ----------
if (new URLSearchParams(location.search).has('debug')) {
  (window as any).__lf = {
    get G() { return G; }, world, scenes, input, stats, rec,
    top: () => scenes.top()?.name || '?',
    stack: () => scenes.stack.map((s) => s.name || '?').join('>'),
    warp: (m: string, x: number, y: number) => { world.load(m, x, y, 0); },
    flag: (k: string, v = 1) => setFlag(k, v),
    addWick: (id: string) => addWick(id),
    refill: () => refill(),
    fight: (id: string) => world.run(async (s) => { await s.fight(id); }),
    board: () => (scenes.top() as any)?.b || null,
    autoTurn: () => autoTurn(scenes.top()),
    talk: (id: string) => { const e = world.def?.ents.find((e) => e.id === id); if (e?.talk) world.run(e.talk); return !!e?.talk; },
    press: (a: any) => input.inject(a),
    hold: (a: any) => input.inject(a, true),
    release: (a: any) => input.release(a),
  };
}
