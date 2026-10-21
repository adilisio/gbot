import { chromium } from 'playwright';
const URL = 'http://localhost:4173/gbot/';
const SHOTS = process.env.SHOTS || './shots/';
const errors = [];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
const sleep = (ms) => page.waitForTimeout(ms);
const top = () => page.evaluate(() => window.__lf.top());
const ev = (f, a) => page.evaluate(f, a);
const press = async (a, ms = 70) => { await ev((a) => window.__lf.press(a), a); await sleep(ms); };
const log = (...a) => console.log(...a);
const idle = () => ev(() => window.__lf.top() === 'overworld' && !window.__lf.world.busy);
async function advance(max = 400) {
  for (let i = 0; i < max; i++) { if (await idle()) { await sleep(200); if (await idle()) return; } await press('confirm', 90); }
}
async function newGame() {
  await page.goto(URL); await ev(() => localStorage.clear()); await page.reload(); await sleep(1200);
  await press('confirm', 300); await press('confirm', 1500);
  await advance(200);
  await ev(() => { const l = window.__lf; l.addMon('pyrelynx', 60); l.addMon('floodmaw', 60); l.addMon('lotuskeep', 60); });
}
if (process.env.SKIPSAVE) {} else {
// ---- save / load ----
await newGame();
log('busy?', await ev(() => window.__lf.world.busy), await ev(() => window.__lf.stack()));
const pos0 = await ev(() => [window.__lf.G.x, window.__lf.G.y]);
await press('back', 300);
for (let i = 0; i < 4; i++) await press('down', 80);
await press('confirm', 300); log('top', await top());
await press('confirm', 300); // slot 1
await press('back', 200); await press('back', 300);
log('saved keys', await ev(() => Object.keys(localStorage).filter((k) => k.includes('save'))));
await ev(() => window.__lf.hold('down')); await sleep(800); await ev(() => window.__lf.release('down')); await sleep(300);
const pos1 = await ev(() => [window.__lf.G.x, window.__lf.G.y]);
await press('back', 300);
for (let i = 0; i < 5; i++) await press('down', 80);
await press('confirm', 300); await press('down', 100); await press('confirm', 900);
const pos2 = await ev(() => [window.__lf.G.map, window.__lf.G.x, window.__lf.G.y, window.__lf.G.team.length]);
log('SAVELOAD saved at', pos0, 'moved to', pos1, 'loaded ->', pos2, pos2[1] === pos0[0] && pos2[2] === pos0[1] ? 'OK' : 'MISMATCH');
}
// ---- endings ----
const plans = [
  { id: 'relay', flags: { c1: 1, c2: 1, c3: 1, c4: 1 }, pick: 2 },
  { id: 'lowtide', flags: { c1: 2, c2: 2, c3: 2, c4: 2 }, pick: 1 },
  { id: 'gilded', flags: { c1: 2, c2: 1, c3: 2, c4: 3 }, pick: 0 },
];
for (const p of plans) {
  await newGame();
  await ev((f) => { for (const k in f) window.__lf.flag(k, f[k]); for (const k of ['ch1done', 'ch2done', 'ch3done', 'ch4done', 'crownGate', 'finSeen']) window.__lf.flag(k); window.__lf.G.chapter = 5; window.__lf.warp('crown', 17, 5); }, p.flags);
  await sleep(1200);
  await ev(() => { window.__lf.G.dir = 1; window.__lf.world.p && (window.__lf.world.p.dir = 1); });
  await advance(100);
  log('  at', await ev(() => [window.__lf.G.map, window.__lf.G.x, window.__lf.G.y]), 'talk', await ev(() => window.__lf.talk('calder')));
  let idleN = 0;
  let ended = false, battled = false, shotE = false;
  for (let i = 0; i < 1500; i++) {
    const t = await top();
    if (t === 'dialogue') {
      const hasOpts = await ev(() => { const s = window.__lf.scenes.top(); return s.menu ? s.menu.items.length : 0; });
      if (hasOpts >= 2) { const pk = hasOpts >= 3 || p.pick < 2 ? p.pick : 0; log('  choice', hasOpts, 'pick', pk); for (let k = 0; k < pk; k++) await press('down', 120); await press('confirm', 200); continue; }
      if (await ev(() => !!window.__lf.scenes.top().options)) { await press('confirm', 150); continue; }
    }
    if (t === 'battle') { battled = true; await ev(() => { const b = window.__lf.scenes.top().b; const f = b.mon(1); if (f.hp > 1) f.hp = 1; }); await ev(() => window.__lf.aim()); }
    if (t === 'ending') { ended = true; if (!shotE) { await sleep(1500); await page.locator('#screen').screenshot({ path: SHOTS + `09-ending-${p.id}.png` }); shotE = true; } }
    if (ended && t === 'title') break;
    if (await idle()) { if (++idleN > 15) break; } else idleN = 0;
    await press('confirm', 100);
  }
  const fl = await ev(() => window.__lf.G.flags);
  log(`ENDING ${p.id}: reached=${ended} battled=${battled} endingFlag=${fl.ending} finalDone=${fl.finalDone} done=${await ev(() => window.__lf.G.done)} top=${await top()}`);
}
await browser.close();
log('ERRORS', errors.length, errors.slice(0, 10));
