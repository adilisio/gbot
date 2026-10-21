import { boot, SHOTS } from './lib.mjs';
const T = await boot();
await T.newGame(); await T.advance(100);
await T.ev(() => { const l = window.__lf; l.addWick('cindle'); l.flag('shrine_lowwick'); l.G.oil = 9; l.warp('lowwick', 12, 6); });
await T.sleep(5500); await T.ev(() => { window.__lf.world.dir = 1; window.__lf.G.dir = 1; }); await T.sleep(500);
await T.page.locator('#screen').screenshot({ path: SHOTS + '02-overworld-shrine.png' });
console.log(T.errors); await T.browser.close();
