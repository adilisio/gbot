import { Ctx, W, H } from '../engine/canvas';
import { input } from '../engine/input';
import { audio } from '../engine/audio';
import { text, textC, wrap } from '../engine/font';
import { scenes, Scene } from '../game';
import { panel, COL } from '../ui/widgets';
import { ENEMIES } from './rules';
import { shadeSprite } from './scene';

const PAGES: { title: string; body: [string, string][] }[] = [
  { title: 'Light and dark', body: [
    ['#ff7a7a', 'RED tiles: where each shade will strike when you end your turn. Move out of them, push the shade so its strike lands elsewhere, or stun it.'],
    ['#b48cff', 'DARK tiles: -1 oil for anyone standing in them at the end of a round. New shades rise from dark tiles. Purple brackets show where the dark creeps next.'],
    ['#ffd58a', 'LIGHT: every glimmer light clears the dark from the tiles it touches. Lit braziers keep the tiles around them clear.'],
    ['#ffb84a', 'OIL: lights cost oil, and hits drain it. Run dry and you wake at your last shrine. Rest at shrines to refill. Oil Flasks top it up.'],
    ['#9fd8ff', 'Each unit can move once, then use one light. Using a light ends its turn. Z undoes a move. F ends your turn.'],
  ] },
  { title: 'How lights interact', body: [
    ['#ff9a4a', 'FIRE burns and can set shades BURNING (1 damage at the start of each of the next 2 rounds). Fire relights braziers.'],
    ['#7fc8ff', 'WATER soaks shades: WET shades can\'t burn (fire is doused), move 1 slower, and put out any burning.'],
    ['#fff27a', 'STATIC jumps between touching WET shades, hitting each one.'],
    ['#cfe8ff', 'WIND pushes. It FANS flames: a burning shade hit by wind takes 1 and spreads fire to every shade beside it.'],
    ['#d8b98a', 'PUSHING a shade into a wall, stone, brazier or another unit does 1 damage. Into deep water, it SINKS - unless it swims or flies.'],
    ['#b48cff', 'HUSH and moss lights STUN: a stunned shade loses its next attack. Its red tiles turn grey.'],
  ] },
  { title: 'Shades', body: [] },
];

export class GuideScene implements Scene {
  name = 'guide'; transparent = true; page = 0;
  update() {
    if (input.hit('left')) { this.page = (this.page + PAGES.length - 1) % PAGES.length; audio.sfx('blip'); }
    if (input.hit('right') || input.hit('confirm') || (input.clicked && input.my < H - 20)) { input.clicked = false; this.page = (this.page + 1) % PAGES.length; audio.sfx('blip'); }
    if (input.hit('back') || input.hit('chart') || input.rclicked || (input.clicked && input.my >= H - 20)) { input.consumeAll(); scenes.pop(this); audio.sfx('back'); }
  }
  render(ctx: Ctx) {
    ctx.fillStyle = 'rgba(5,7,15,0.85)'; ctx.fillRect(0, 0, W, H);
    panel(ctx, 10, 6, W - 20, H - 12);
    const p = PAGES[this.page];
    textC(ctx, `FIELD GUIDE - ${p.title}  (${this.page + 1}/${PAGES.length})`, W / 2, 11, COL.hi);
    let y = 26;
    if (p.body.length) {
      for (const [col, s] of p.body) {
        ctx.fillStyle = col; ctx.fillRect(20, y + 3, 4, 4);
        for (const l of wrap(s, W - 60)) { text(ctx, l, 30, y, COL.text); y += 10; }
        y += 4;
      }
    } else {
      const ks = ['shade', 'moth', 'drowned', 'snuffer', 'bell', 'gilt'];
      ks.forEach((k, i) => {
        const e = ENEMIES[k]; const yy = 26 + i * 26;
        ctx.drawImage(shadeSprite(k), 18, yy);
        text(ctx, `${e.name}  (${e.hp} hp${e.mv ? ', moves ' + e.mv : ''})`, 44, yy, '#ff9aaa');
        wrap(e.desc, W - 80).slice(0, 2).forEach((l, j) => text(ctx, l, 44, yy + 10 + j * 9, COL.text));
      });
    }
    textC(ctx, 'Left/Right or click: page    Esc / T: close', W / 2, H - 20, COL.dim);
  }
}
