import { boot } from './lib.mjs';
const T = await boot();
await T.page.goto('http://localhost:4173/gbot/?debug'); await T.sleep(1000);
// roster + bond by chapter (what a typical run has)
const R = { 1: [['cindle', 'ripplet'], 1, 18], 2: [['cindle', 'ripplet', 'pebblit'], 3, 20], 3: [['cindle', 'driftjelly', 'pebblit'], 4, 22], 4: [['cindle', 'driftjelly', 'emberwisp'], 5, 24], 5: [['cindle', 'driftjelly', 'emberwisp'], 7, 26] };
const ch = { drill: 1, ferry: 1, reed1: 1, reed2: 1, fenn: 1, swarm: 1, pike: 2, kite1: 2, jun2: 2, vale: 2, kite2: 2, steps1: 3, steps2: 3, warden: 3, ilse: 3, heights1: 4, heights2: 4, jun3: 4, jun4: 5, fenn5: 5, guard1: 5, guard2: 5, hmfinal: 5, calder: 5, heart: 5 };
for (const id of await T.ev(() => window.__lf.encounters())) {
  const [w, bond, oil] = R[ch[id] || 1];
  const out = [];
  for (const seed of [7, 11, 23]) out.push(await T.ev(([id, w, bond, oil, seed]) => { w.forEach((k) => window.__lf.G.bond[k] = bond); return window.__lf.sim(id, id === 'drill' ? ['cindle'] : w, oil, 2, seed); }, [id, w, bond, oil, seed]));
  console.log(id.padEnd(9), out.map((o) => `${o.result}@t${o.turns} oil${o.oil}`).join('  '));
}
await T.browser.close();
