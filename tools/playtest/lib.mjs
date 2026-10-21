import { chromium } from 'playwright';
export const URL = 'http://localhost:4173/gbot/?debug';
export const SHOTS = '/workspace/lanternfall-shots/';
export async function boot() {
  const errors = [];
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
  const sleep = (ms) => page.waitForTimeout(ms);
  const ev = (f, a) => page.evaluate(f, a);
  const top = () => ev(() => window.__lf.top());
  const press = async (a, ms = 70) => { await ev((a) => window.__lf.press(a), a); await sleep(ms); };
  const idle = () => ev(() => window.__lf.top() === 'overworld' && !window.__lf.world.busy);
  // Advance dialogue; auto-play any tactics fight; stop when overworld is idle.
  async function advance(max = 600, opts = {}) {
    for (let i = 0; i < max; i++) {
      const t = await top();
      if (t === 'overworld' && await idle()) { await sleep(250); if (await idle()) return 'idle'; continue; }
      if (t === 'tactics') {
        const ph = await ev(() => { const s = window.__lf.scenes.top(); return s.phase; });
        if (ph === 'player') { if (opts.onFight) await opts.onFight(); const r = await ev(() => window.__lf.autoTurn()); if (opts.log) console.log('   turn', r); await sleep(150); continue; }
        if (ph === 'enemy') { await sleep(120); continue; }
      }
      if (t === 'starter') { await press('confirm', 200); await press('confirm', 400); continue; }
      if (t === 'lantern') { await press('back', 200); continue; }
      if (t === 'shrine') { await press('back', 200); continue; }
      await press('confirm', 90);
    }
    return 'timeout:' + await ev(() => window.__lf.stack());
  }
  async function newGame() {
    await page.goto(URL); await ev(() => localStorage.clear()); await page.reload(); await sleep(1200);
    await press('confirm', 300); await press('confirm', 1500);
  }
  return { browser, page, errors, sleep, ev, top, press, idle, advance, newGame };
}
