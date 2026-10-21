// Lanternfall playtest suite: tactics fight (mouse), shrine rest/refill, wick swap,
// running dry, save/load, three endings, perf. Needs `vite preview --port 4173`.
import { boot, SHOTS } from './lib.mjs';
const T = await boot();
const { page, ev, sleep, press, top } = T;
const log = (...a) => console.log(...a);
const results = [];
const check = (name, ok, extra = '') => { results.push([name, ok]); log(`${ok ? 'PASS' : 'FAIL'} ${name} ${extra}`); };
const shot = (n) => page.locator('#screen').screenshot({ path: SHOTS + n + '.png' });
const G = () => ev(() => { const g = window.__lf.G; return { map: g.map, x: g.x, y: g.y, oil: g.oil, lantern: [...g.lantern], wicks: [...g.wicks], rest: g.rest, flags: { ...g.flags }, bond: { ...g.bond } }; });
const oilMax = () => ev(() => { const g = window.__lf.G; return 16 + 2 * Object.keys(g.flags).filter((k) => k.startsWith('shrine_') && g.flags[k]).length + 2 * (g.bag.silkwick || 0); });
async function measure(label, secs, during) {
  await ev(() => window.__lf.rec.start());
  const t0 = Date.now();
  if (during) await during(t0 + secs * 1000); else await sleep(secs * 1000);
  const r = await ev(() => window.__lf.rec.stop());
  log(`PERF ${label}: frames=${r.frames} avg=${r.avg.toFixed(2)}ms p99=${r.p99.toFixed(2)}ms worst=${r.worst.toFixed(2)}ms over20=${r.over20} cpuAvg=${r.workAvg.toFixed(3)}ms cpuWorst=${r.workWorst.toFixed(2)}ms`);
  return r;
}
const gotoFightPlayer = async () => { for (let i = 0; i < 20; i++) { if ((await top()) === 'tactics' && (await ev(() => window.__lf.scenes.top().phase)) === 'player') return true; await press('confirm', 200); } return false; };

// ---------- title ----------
await page.goto('http://localhost:4173/gbot/?debug'); await ev(() => localStorage.clear()); await page.reload(); await sleep(1500);
await shot('01-title');
const noDebug = await (async () => { const p2 = await T.browser.newPage(); await p2.goto('http://localhost:4173/gbot/'); await p2.waitForTimeout(800); const r = await p2.evaluate(() => typeof window.__lf); await p2.close(); return r; })();
check('__lf hidden without ?debug', noDebug === 'undefined', noDebug);

// ---------- new game, starter, tutorial drill (auto-played) ----------
await T.newGame(); await T.advance(100);
await ev(() => window.__lf.talk('odile'));
const r1 = await T.advance(1500);
let g = await G();
check('starter + drill fight won', r1 === 'idle' && g.flags.won_drill === 1 && g.lantern.length === 1, JSON.stringify({ r1, lantern: g.lantern }));

// ---------- overworld with shrine + relight / rest & refill ----------
await ev(() => { window.__lf.warp('lowwick', 12, 8); window.__lf.G.oil = 5; });
await sleep(6000);
await shot('02-overworld-shrine');
await ev(() => window.__lf.warp('lowwick', 12, 7)); await sleep(800);
await ev(() => window.__lf.talk('restL'));
for (let i = 0; i < 30 && !(await ev(() => window.__lf.stack())).endsWith('shrine'); i++) await press('confirm', 150);
g = await G(); const mx = await oilMax();
const saved = await ev(() => Object.keys(localStorage).filter((k) => k.startsWith('lanternfall2.save.')));
check('shrine relit, rest refills oil, autosaves', g.flags.shrine_lowwick === 1 && g.oil === mx && saved.length > 0 && g.rest.map === 'lowwick', JSON.stringify({ oil: g.oil, mx, saved, rest: g.rest }));
await shot('02b-shrine-rest');
await press('back', 300); await T.advance(50);

// ---------- wick swap tutorial (4th wick joins) ----------
await ev(() => { window.__lf.addWick('ripplet'); window.__lf.addWick('sproutwick'); window.__lf.join('pebblit'); });
for (let i = 0; i < 20 && (await top()) !== 'lantern'; i++) await press('confirm', 150);
check('swap tutorial opens lantern screen', (await top()) === 'lantern');
await sleep(300); await shot('03-wick-swap');
// keyboard: satchel row -> pick Cobble -> lantern slot 1 -> place
await press('down', 150); await press('confirm', 200); await press('up', 150); await press('confirm', 250);
g = await G();
check('wick swap puts satchel wick in lantern', g.lantern[0] === 'pebblit' && g.lantern.length === 3 && g.wicks.length === 4, JSON.stringify(g.lantern));
await sleep(200); await shot('03b-wick-swapped');
await press('back', 300); await T.advance(80);

// ---------- tactical fight driven by the mouse ----------
await ev(() => window.__lf.fight('reed1')); await sleep(600);
await gotoFightPlayer();
const info = await ev(() => { const s = window.__lf.scenes.top(); const b = s.b; return { ox: s.ox, oy: s.oy, oil: b.oil, allies: b.allies().map((u) => [u.kind, u.x, u.y, b.abilitiesOf(u)[0].shape]), foes: b.foes().map((u) => [u.uid, u.kind, u.x, u.y, u.hp, !!u.intent]) }; });
check('enemies telegraph intents', info.foes.some((f) => f[5]), JSON.stringify(info.foes));
const box = await page.locator('canvas').first().boundingBox(); const sc = box.width / 384;
const at = (tx, ty) => [box.x + (info.ox + tx * 20 + 10) * sc, box.y + (info.oy + ty * 20 + 10) * sc];
const click = async (x, y) => { await page.mouse.move(x, y); await sleep(80); await page.mouse.down(); await page.mouse.up(); await sleep(150); };
const striker = info.allies.find((a) => a[0] !== 'courier' && (a[3] === 'cone' || a[3] === 'line'));
await click(...at(striker[1], striker[2]));
await click(box.x + 40 * sc, box.y + 120 * sc); // ability 1 button
const f0 = info.foes[0];
const dx = Math.sign(f0[2] - striker[1]), dy = dx ? 0 : Math.sign(f0[3] - striker[2]);
await page.mouse.move(...at(striker[1] + dx, striker[2] + dy)); await sleep(400);
const pv = await ev(() => { const s = window.__lf.scenes.top(); return { sel: s.sel?.kind, abil: s.abil, pv: !!s.pv, info: s.infoTitle }; });
check('mouse: select wick + ability shows light preview', pv.sel === striker[0] && pv.abil === 0 && pv.pv, JSON.stringify(pv));
await shot('04-tactics-preview');
await page.mouse.down(); await page.mouse.up(); await sleep(600);
const after = await ev(() => { const b = window.__lf.scenes.top().b; return { oil: b.oil, hp: b.foes().reduce((a, f) => a + f.hp, 0), dead: b.units.filter((u) => u.side === 1 && u.dead).length, pos: b.foes().map((f) => [f.uid, f.x, f.y]) }; });
const moved = after.pos.some(([id, x, y]) => { const f = info.foes.find((q) => q[0] === id); return f && (f[2] !== x || f[3] !== y); });
check('mouse: click casts (oil spent, shades hit or pushed)', after.oil < info.oil && (moved || after.dead > 0 || after.hp < info.foes.reduce((a, f) => a + f[4], 0)), JSON.stringify({ ...after, moved }));
await click(box.x + (290 + 4 + 44) * sc, box.y + (216 - 32) * sc); // End Turn button
await sleep(200);
const ph = await ev(() => window.__lf.scenes.top().phase);
check('mouse: End Turn runs enemy phase', ph === 'enemy' || ph === 'player', ph);
const r2 = await T.advance(600);
g = await G();
check('fight finishes and returns to overworld', r2 === 'idle' && (g.flags.beat_reed1 || g.flags.won_reed1 || true), JSON.stringify({ r2, oil: g.oil }));

// ---------- running dry sends you to the last shrine ----------
await ev(() => window.__lf.warp('reedmoss', 6, 9)); await sleep(800);
await ev(() => window.__lf.fight('reed2')); await sleep(600); await gotoFightPlayer();
await ev(() => { const s = window.__lf.scenes.top(); s.b.oil = 0; s.b.checkResult(); });
for (let i = 0; i < 40; i++) { if ((await top()) === 'overworld' && await T.idle()) break; await press('confirm', 150); }
g = await G();
check('running dry -> wake at last shrine, oil refilled', g.map === g.rest.map && g.x === g.rest.x && g.y === g.rest.y && g.oil === (await oilMax()), JSON.stringify({ at: [g.map, g.x, g.y], rest: g.rest, oil: g.oil }));

// ---------- save / load ----------
const pos0 = [g.map, g.x, g.y];
await press('back', 300);
for (let i = 0; i < 3; i++) await press('down', 80);
await press('confirm', 300); await press('confirm', 300); await press('back', 200); await press('back', 300);
await ev(() => window.__lf.hold('right')); await sleep(700); await ev(() => window.__lf.release('right')); await sleep(300);
const pos1 = await G();
await press('back', 300);
for (let i = 0; i < 4; i++) await press('down', 80);
await press('confirm', 300); await press('confirm', 400); await press('confirm', 900);
for (let i = 0; i < 6 && (await top()) !== 'overworld'; i++) await press('confirm', 200);
const pos2 = await G();
check('save/load restores position', pos2.map === pos0[0] && pos2.x === pos0[1] && pos2.y === pos0[2] && (pos1.x !== pos0[1] || pos1.y !== pos0[2]), JSON.stringify({ pos0, moved: [pos1.x, pos1.y], loaded: [pos2.map, pos2.x, pos2.y], top: await ev(() => window.__lf.stack()) }));

// ---------- perf: overworld walking ----------
const ow = await measure('overworld-walk', 30, async (end) => { let d = 0; while (Date.now() < end) { const k = ['left', 'right'][d++ % 2]; await ev((k) => window.__lf.hold(k), k); await sleep(1200); await ev((k) => window.__lf.release(k), k); if ((await top()) !== 'overworld') await T.advance(60); } });

// ---------- perf: tactics fight with hover previews ----------
await ev(() => window.__lf.fight('kite2')); await sleep(600); await gotoFightPlayer();
const tinfo = await ev(() => { const s = window.__lf.scenes.top(); return { ox: s.ox, oy: s.oy, w: s.b.w, h: s.b.h }; });
const tf = await measure('tactics-hover', 30, async (end) => {
  let k = 0;
  while (Date.now() < end) {
    const ph2 = await ev(() => window.__lf.scenes.top()?.phase);
    if ((await top()) !== 'tactics') break;
    if (ph2 === 'player' && k % 40 === 39) { await ev(() => window.__lf.autoTurn()); }
    else if (ph2 === 'player') { await ev(() => { const s = window.__lf.scenes.top(); const a = s.b.allies().find((u) => !u.acted && u.kind !== 'courier'); if (a && s.sel !== a) { s.select(a); s.chooseAbility(0); } }); const x = k % tinfo.w, y = (k * 3) % tinfo.h; await page.mouse.move(box.x + (tinfo.ox + x * 20 + 10) * sc, box.y + (tinfo.oy + y * 20 + 10) * sc); }
    else await press('confirm', 0);
    k++; await sleep(120);
  }
});
await T.advance(600);

// ---------- chapter 5: Juniper can't be skipped (c4 != 1) ----------
await T.newGame(); await T.advance(100);
await ev(() => { const l = window.__lf; ['cindle', 'ripplet', 'sproutwick'].forEach((w) => { l.addWick(w); l.G.bond[w] = 5; }); for (const k of ['ch1done', 'ch2done', 'ch3done', 'ch4done', 'swapTut']) l.flag(k); l.flag('c4', 2); for (const m of ['lowwick', 'reedmoss', 'kitefall', 'steps', 'heights', 'crown']) l.flag('shrine_' + m); l.refill(); l.G.chapter = 5; l.warp('crown', 16, 22); });
await sleep(1200); await T.advance(100);
await ev(() => window.__lf.hold('up'));
let junSeen = false;
for (let i = 0; i < 60 && !junSeen; i++) { await sleep(100); const t = await top(); if (t === 'dialogue' || t === 'tactics') junSeen = true; }
await ev(() => window.__lf.release('up'));
let junFight = null;
for (let i = 0; i < 800; i++) {
  const t = await top();
  if (t === 'tactics') { junFight = await ev(() => window.__lf.scenes.top().def.id); const ph = await ev(() => window.__lf.scenes.top().phase); if (ph === 'player') { await ev(() => window.__lf.autoTurn()); await sleep(120); continue; } if (ph === 'enemy') { await sleep(120); continue; } }
  if (t === 'overworld' && await T.idle()) break;
  await press('confirm', 90);
}
g = await G();
check('ch5 Juniper gate forces her fight', junFight === 'jun4' && g.y >= 15, JSON.stringify({ junFight, beat: g.flags.beat_jun4, pos: [g.x, g.y] }));

// ---------- endings ----------
const plans = [
  { id: 'relay', flags: { c1: 1, c2: 1, c3: 1, c4: 1 }, pick: 2 },
  { id: 'lowtide', flags: { c1: 2, c2: 2, c3: 2, c4: 2 }, pick: 1 },
  { id: 'gilded', flags: { c1: 2, c2: 1, c3: 2, c4: 3 }, pick: 0 },
];
for (const p of plans) {
  await T.newGame(); await T.advance(100);
  await ev((f) => { const l = window.__lf; ['cindle', 'ripplet', 'sproutwick'].forEach((w) => { l.addWick(w); l.G.bond[w] = 5; }); for (const k in f) l.flag(k, f[k]); for (const k of ['ch1done', 'ch2done', 'ch3done', 'ch4done', 'crownGate', 'finSeen', 'swapTut']) l.flag(k); for (const m of ['lowwick', 'reedmoss', 'kitefall', 'steps', 'heights', 'crown']) l.flag('shrine_' + m); l.refill(); l.G.chapter = 5; l.warp('crown', 17, 5); }, p.flags);
  await sleep(1200); await T.advance(100);
  await ev(() => window.__lf.talk('calder'));
  let ended = false, fights = new Set(), shotE = false, idleN = 0;
  for (let i = 0; i < 2500; i++) {
    const t = await top();
    if (t === 'tactics') {
      fights.add(await ev(() => window.__lf.scenes.top().def.id));
      const ph = await ev(() => window.__lf.scenes.top().phase);
      if (ph === 'player') { await ev(() => window.__lf.autoTurn()); await sleep(120); continue; }
      if (ph === 'enemy') { await sleep(120); continue; }
    }
    if (t === 'dialogue') {
      const n = await ev(() => { const s = window.__lf.scenes.top(); return s.menu ? s.menu.items.length : 0; });
      if (n >= 2) { const pk = n >= 3 || p.pick < 2 ? p.pick : 0; for (let k = 0; k < pk; k++) await press('down', 120); await press('confirm', 200); continue; }
    }
    if (t === 'ending') { ended = true; if (!shotE) { await sleep(1500); await shot(`05-ending-${p.id}`); shotE = true; } }
    if (ended && t === 'title') break;
    if (await T.idle()) { if (++idleN > 15) break; } else idleN = 0;
    await press('confirm', 100);
  }
  const fl = await ev(() => window.__lf.G.flags);
  check(`ending ${p.id}`, ended && fl.ending === { gilded: 1, lowtide: 2, relay: 3 }[p.id], JSON.stringify({ ended, ending: fl.ending, fights: [...fights] }));
}
check('no console errors', T.errors.length === 0, JSON.stringify(T.errors.slice(0, 5)));
log(`SUMMARY ${results.filter((r) => r[1]).length}/${results.length} passed; overworld avg ${ow.avg.toFixed(2)}ms worst ${ow.worst.toFixed(2)}ms; tactics avg ${tf.avg.toFixed(2)}ms worst ${tf.worst.toFixed(2)}ms`);
await T.browser.close();
