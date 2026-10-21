import { chromium } from 'playwright';
const URL = 'http://localhost:4173/gbot/';
const SHOTS = process.env.SHOTS || './shots/';
const errors = [];
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
const sleep = (ms) => page.waitForTimeout(ms);
const top = () => page.evaluate(() => window.__lf.top());
const stack = () => page.evaluate(() => window.__lf.stack());
const press = async (a, ms = 60) => { await page.evaluate((a) => window.__lf.press(a), a); await sleep(ms); };
const log = (...a) => console.log(...a);
const shot = async (n) => { await page.locator('#screen').screenshot({ path: SHOTS + n + '.png' }); log('shot', n); };
// advance dialogue-like scenes until overworld is top & idle (no script)
async function advance(max = 400, until = null) {
  for (let i = 0; i < max; i++) {
    const t = await top();
    if (until && (await until(t))) return t;
    if (t === 'overworld') { const busy = await page.evaluate(() => !!window.__lf.world.busy); if (!busy) { await sleep(150); if ((await top()) === 'overworld' && !(await page.evaluate(() => !!window.__lf.world.busy))) return t; } }
    await press('confirm', 90);
  }
  return await top();
}
async function measure(label, secs) {
  await page.evaluate(() => window.__lf.rec.start());
  await sleep(secs * 1000);
  const r = await page.evaluate(() => window.__lf.rec.stop());
  log(`PERF ${label}: frames=${r.frames} avg=${r.avg.toFixed(2)}ms p99=${r.p99.toFixed(2)}ms worst=${r.worst.toFixed(2)}ms over20=${r.over20} cpuAvg=${r.workAvg.toFixed(3)}ms cpuWorst=${r.workWorst.toFixed(2)}ms`);
  return r;
}

await page.goto(URL);
await page.evaluate(() => localStorage.clear());
await page.reload();
await sleep(1500);
log('boot top:', await top());
await shot('01-title');
// New Journey: cursor starts on first enabled entry
await press('confirm', 1500);
log('after new:', await stack());
// radio interlude
await sleep(1500);
for (let i = 0; i < 3; i++) await press('confirm', 400);
if ((await top()) === 'radio') await shot('02-radio');
const t1 = await advance(200);
log('intro done:', t1, await page.evaluate(() => [window.__lf.G.map, window.__lf.G.x, window.__lf.G.y, window.__lf.G.obj]));
await shot('03-overworld');
// Walk
const p0 = await page.evaluate(() => [window.__lf.G.x, window.__lf.G.y]);
await page.evaluate(() => window.__lf.hold('right')); await sleep(700); await page.evaluate(() => window.__lf.release('right'));
await page.evaluate(() => window.__lf.hold('left')); await sleep(700); await page.evaluate(() => window.__lf.release('left'));
await sleep(300);
const p1 = await page.evaluate(() => [window.__lf.G.x, window.__lf.G.y]);
log('walk', p0, '->', p1);
// Find Odile and talk
const od = await page.evaluate(() => { const e = window.__lf.world.def.ents.find((e) => e.id === 'odile'); return e && [e.x, e.y]; });
log('odile at', od);
await page.evaluate(([x, y]) => { const G = window.__lf.G; window.__lf.world.load('lowwick', x, y + 1, 1, false); }, od);
await sleep(400);
await press('confirm', 400);
let sawDialogue = false;
for (let i = 0; i < 300; i++) {
  const t = await top();
  if (t === 'dialogue' && !sawDialogue) { sawDialogue = true; await sleep(900); await shot('04-dialogue'); }
  if (t === 'starter') { await sleep(500); await shot('05-starter'); await press('confirm', 300); await press('confirm', 400); continue; }
  if (t === 'battle') break;
  if (t === 'overworld' && i > 5 && !(await page.evaluate(() => !!window.__lf.world.busy))) break;
  await press('confirm', 90);
}
log('team', await page.evaluate(() => window.__lf.G.team.map((m) => m.sp + ' L' + m.lv)), 'top', await stack());
// Battle
if ((await top()) !== 'battle') {
  log('no auto battle; starting wild via debug');
}
await sleep(1500);
if ((await top()) === 'battle') {
  await shot('06-battle');
  await measure('battle-idle', 30);
  // fight through
  let res;
  for (let i = 0; i < 600; i++) { if ((await top()) !== 'battle') break; await press('confirm', 110); }
  log('after battle stack', await stack(), 'flags', await page.evaluate(() => JSON.stringify(window.__lf.G.flags)));
}
await advance(300);
// Type chart
await press('chart', 500);
log('chart top', await top());
await shot('07-typechart');
await press('back', 400);
// Overworld walking perf: walk back & forth for 30s
await page.evaluate(() => window.__lf.rec.start());
const t0 = Date.now();
let dir = 0;
while (Date.now() - t0 < 30000) {
  const d = ['left', 'right'][dir++ % 2];
  await page.evaluate((d) => window.__lf.hold(d), d); await sleep(1200); await page.evaluate((d) => window.__lf.release(d), d);
  if ((await top()) !== 'overworld') { await advance(100); }
}
const ow = await page.evaluate(() => window.__lf.rec.stop());
log(`PERF overworld-walk: frames=${ow.frames} avg=${ow.avg.toFixed(2)}ms p99=${ow.p99.toFixed(2)}ms worst=${ow.worst.toFixed(2)}ms over20=${ow.over20} cpuAvg=${ow.workAvg.toFixed(3)}ms cpuWorst=${ow.workWorst.toFixed(2)}ms`);
// Save / load
const before = await page.evaluate(() => { const G = window.__lf.G; return { map: G.map, x: G.x, y: G.y, team: G.team.length, glints: G.glints }; });
// Use the pause menu UI: Esc -> find "Save"
await press('back', 400);
log('pause top', await top());
await shot('08-pause');
const saved = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('lanternfall.save.')));
log('save keys now', saved, before);
await press('back', 300);
await browser.close();
log('ERRORS', errors.length, errors.slice(0, 10));
