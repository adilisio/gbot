import { Ctx, W, H, makeCanvas, glow, mulberry, mix } from '../engine/canvas';
import { input } from '../engine/input';
import { audio } from '../engine/audio';
import { settings } from '../engine/settings';
import { text, textC, textR, wrap } from '../engine/font';
import { scenes, Scene, clock } from '../game';
import { Battle, BEvent, PAction, TrainerDef, xpFrac } from './engine';
import { G, Mon, maxHp, sp, makeMon } from '../state';
import { MOVES } from '../data/moves';
import { SPECIES } from '../data/glimmers';
import { ITEMS, ITEM_ORDER } from '../data/items';
import { TYPE_COLOR, TYPE_NAME, ElemType } from '../data/types';
import { panel, bar, ListMenu, COL, typeBadge, button } from '../ui/widgets';
import { monSprite, monGlow, charSprite } from '../ui/art';
import { TypeChartScene } from '../ui/typechart';
import { monRow, monDetail } from '../ui/monview';

export type BattleResult = 'win' | 'lose' | 'run' | 'caught';

// ---------- Backgrounds (pre-rendered once per theme) ----------
const BG_THEMES: Record<string, [string, string, string, string]> = {
  docks: ['#070b1e', '#1a1f4a', '#0b1838', '#ffb060'],
  market: ['#0f0a22', '#3a1f4a', '#1a1238', '#ff8a6a'],
  belfry: ['#03060f', '#0b2238', '#06182a', '#7fe0ff'],
  heights: ['#050812', '#1a2a3a', '#0a1420', '#9fffd0'],
  heart: ['#120608', '#4a1a1a', '#200c10', '#ffd06a'],
  void: ['#020208', '#14102a', '#06061a', '#b48cff'],
};
const bgCache = new Map<string, HTMLCanvasElement>();
function battleBg(theme: string): HTMLCanvasElement {
  let c = bgCache.get(theme);
  if (c) return c;
  const [top, mid, water, light] = BG_THEMES[theme] || BG_THEMES.docks;
  const [cv, ctx] = makeCanvas(W, H);
  for (let y = 0; y < 110; y++) { ctx.fillStyle = mix(top, mid, Math.pow(y / 110, 1.4)); ctx.fillRect(0, y, W, 1); }
  const r = mulberry(theme.length * 99 + 7);
  for (let i = 0; i < 60; i++) { ctx.fillStyle = r() < 0.2 ? '#ffffff' : '#8a9ac8'; ctx.fillRect(Math.floor(r() * W), Math.floor(r() * 80), 1, 1); }
  // Distant lantern city silhouette
  ctx.fillStyle = mix(top, '#000000', 0.3);
  for (let x = 0; x < W; x += 6) { const h = 8 + Math.floor(r() * 18); ctx.fillRect(x, 110 - h, 6, h); }
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 26; i++) {
    const x = r() * W, y = 30 + r() * 75, g = glow(6 + Math.floor(r() * 6), light, 0.8);
    ctx.drawImage(g, x - g.width / 2, y - g.height / 2);
    ctx.fillStyle = light; ctx.fillRect(Math.floor(x), Math.floor(y), 1, 2);
  }
  ctx.globalCompositeOperation = 'source-over';
  for (let y = 110; y < H; y++) { ctx.fillStyle = mix(water, '#000000', (y - 110) / 140); ctx.fillRect(0, y, W, 1); }
  ctx.fillStyle = mix(water, '#ffffff', 0.12);
  for (let i = 0; i < 70; i++) { const y = 112 + Math.floor(r() * 100); ctx.fillRect(Math.floor(r() * W), y, 3 + Math.floor(r() * 10), 1); }
  // Platforms
  const plat = (cx: number, cy: number, rx: number) => {
    ctx.fillStyle = '#05070f'; ctx.beginPath(); ctx.ellipse(cx, cy + 3, rx + 2, 10, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#3a2a2a'; ctx.beginPath(); ctx.ellipse(cx, cy, rx, 9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#5a4030'; ctx.beginPath(); ctx.ellipse(cx, cy - 1, rx - 4, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = mix('#5a4030', light, 0.2); ctx.fillRect(cx - rx + 10, cy - 5, rx * 2 - 20, 1);
  };
  plat(290, 98, 56); plat(100, 146, 64);
  bgCache.set(theme, cv);
  return cv;
}

interface Shown { mon: Mon | null; hp: number; tgt: number; alpha: number; dx: number; flash: number; shake: number; sink: number; }

const FOE_X = 290, FOE_Y = 98, PL_X = 100, PL_Y = 146;

type Mode = 'intro' | 'events' | 'cmd' | 'fight' | 'team' | 'bag' | 'bagTarget' | 'force' | 'learn' | 'evolve' | 'done';

class BattleScene implements Scene {
  name = 'battle';
  b: Battle;
  mode: Mode = 'intro';
  q: BEvent[] = [];
  ev: BEvent | null = null; et = 0;
  msg = ''; msgShown = 0; msgHold = 0;
  shown: Shown[] = [
    { mon: null, hp: 0, tgt: 0, alpha: 0, dx: -200, flash: 0, shake: 0, sink: 0 },
    { mon: null, hp: 0, tgt: 0, alpha: 0, dx: 200, flash: 0, shake: 0, sink: 0 },
  ];
  xpShown = 0; xpTgt = 0;
  cmd = new ListMenu([{ label: 'Fight' }, { label: 'Team' }, { label: 'Bag' }, { label: 'Run' }], 232, 162, 146, 22, 2, 2, false);
  fight!: ListMenu; team!: ListMenu; bag!: ListMenu; target!: ListMenu; learnMenu!: ListMenu;
  bagItem = ''; learnQ: { mon: Mon; move: string }[] = []; evoQ: Mon[] = []; evoT = 0; evoMon: Mon | null = null; evoTo = '';
  anim: { side: number; type: ElemType | 'plain'; kind: string; t: number } | null = null;
  lantern: { t: number; shakes: number; ok: boolean } | null = null;
  parts: { x: number; y: number; vx: number; vy: number; life: number; col: string }[] = [];
  introT = 0; endHandled = false;
  bg: HTMLCanvasElement;
  motes: { x: number; y: number; s: number }[] = [];

  constructor(kind: 'wild' | 'trainer', foes: Mon[], public trainer: TrainerDef | null, theme: string, private done: (r: BattleResult) => void) {
    this.b = new Battle(kind, foes, trainer);
    this.bg = battleBg(theme);
    const r = mulberry(5);
    for (let i = 0; i < 14; i++) this.motes.push({ x: r() * W, y: r() * 150, s: 0.1 + r() * 0.25 });
    const p = this.b.mon(0), f = this.b.mon(1);
    this.shown[0].mon = p; this.shown[0].hp = this.shown[0].tgt = p.hp;
    this.shown[1].mon = f; this.shown[1].hp = this.shown[1].tgt = f.hp;
    this.xpShown = this.xpTgt = xpFrac(p);
    audio.play(trainer?.music || (trainer?.boss ? 'boss' : 'battle'));
    audio.sfx('encounter');
    const intro = kind === 'wild' ? `A wild ${sp(f).name} drifts out of the dark!` : `${trainer!.title ? trainer!.title + ' ' : ''}${trainer!.name} wants to trade lights!`;
    this.q.push({ k: 'msg', t: intro });
    if (kind === 'trainer' && trainer?.intro) this.q.push({ k: 'msg', t: `${trainer.name}: "${trainer.intro}"` });
    if (kind === 'trainer') this.q.push({ k: 'msg', t: `${trainer!.name} sends out ${sp(f).name}!` });
    this.q.push({ k: 'msg', t: `Go, ${sp(p).name}!` });
  }

  // ---------------- update ----------------
  update() {
    for (const s of this.shown) {
      if (s.flash > 0) s.flash--; if (s.shake > 0) s.shake--;
      if (s.hp !== s.tgt) {
        const step = Math.max(1, Math.ceil((s.mon ? maxHp(s.mon) : 50) / 45));
        s.hp = s.hp < s.tgt ? Math.min(s.tgt, s.hp + step) : Math.max(s.tgt, s.hp - step);
      }
    }
    if (this.xpShown < this.xpTgt) this.xpShown = Math.min(this.xpTgt, this.xpShown + 0.02);
    else this.xpShown = this.xpTgt;
    this.updateParts();
    if (input.hit('chart') && this.mode !== 'intro') { scenes.push(new TypeChartScene(this.shown[1].mon ? sp(this.shown[1].mon).type : null)); return; }
    if (input.clicked && input.inRect(W - 22, 2, 20, 12) && this.mode !== 'intro') { input.clicked = false; scenes.push(new TypeChartScene(this.shown[1].mon ? sp(this.shown[1].mon).type : null)); return; }

    switch (this.mode) {
      case 'intro': {
        this.introT++;
        const k = Math.min(1, this.introT / 30);
        this.shown[1].dx = Math.round(200 * (1 - k) * (1 - k)); this.shown[0].dx = -Math.round(200 * (1 - k) * (1 - k));
        this.shown[0].alpha = this.shown[1].alpha = 1;
        if (this.introT >= 30) this.mode = 'events';
        break;
      }
      case 'events': this.stepEvents(); break;
      case 'cmd': {
        const r = this.cmd.update();
        if (r === 0) { this.openFight(); }
        else if (r === 1) this.openTeam(false);
        else if (r === 2) this.openBag();
        else if (r === 3) {
          if (this.b.kind === 'trainer') { audio.sfx('deny'); this.queueMsgs(['There\'s no slipping away from a courier\'s challenge!']); }
          else this.act({ k: 'run' });
        }
        break;
      }
      case 'fight': {
        const r = this.fight.update();
        if (r >= 0) this.act({ k: 'move', i: r });
        else if (r === -2) this.mode = 'cmd';
        break;
      }
      case 'team': case 'force': {
        const r = this.team.update();
        if (r >= 0) {
          const m = G.team[r];
          if (m.hp <= 0) { audio.sfx('deny'); }
          else if (r === this.b.sides[0].act && this.mode === 'team') { audio.sfx('deny'); }
          else if (this.mode === 'force') { this.enqueue(this.b.forceSwitch(r)); this.mode = 'events'; }
          else this.act({ k: 'switch', idx: r });
        } else if (r === -2 && this.mode === 'team') this.mode = 'cmd';
        break;
      }
      case 'bag': {
        const r = this.bag.update();
        if (r === -2) { this.mode = 'cmd'; break; }
        if (r >= 0) {
          const id = this.bagIds[r]; const it = ITEMS[id];
          if (it.kind === 'lantern') {
            if (this.b.kind !== 'wild') { audio.sfx('deny'); this.queueMsgs(['You can\'t befriend another courier\'s glimmer!']); }
            else this.act({ k: 'lantern', id });
          } else { this.bagItem = id; this.openTarget(); }
        }
        break;
      }
      case 'bagTarget': {
        const r = this.target.update();
        if (r === -2) { this.mode = 'bag'; break; }
        if (r >= 0) {
          const m = G.team[r], it = ITEMS[this.bagItem];
          const ok = it.kind === 'heal' ? m.hp > 0 && m.hp < maxHp(m) : it.kind === 'cure' ? !!m.status && m.hp > 0 : it.kind === 'revive' ? m.hp <= 0 : false;
          if (!ok) { audio.sfx('deny'); break; }
          this.act({ k: 'item', id: this.bagItem, target: r });
        }
        break;
      }
      case 'learn': {
        const r = this.learnMenu.update();
        if (r >= 0 || r === -2) {
          const L = this.learnQ.shift()!;
          if (r >= 0 && r < 4) {
            const old = MOVES[L.mon.moves[r]].name;
            L.mon.moves[r] = L.move;
            this.queueMsgs([`${sp(L.mon).name} forgot ${old} and learned ${MOVES[L.move].name}!`]);
          } else this.queueMsgs([`${sp(L.mon).name} did not learn ${MOVES[L.move].name}.`]);
          this.mode = 'events';
        }
        break;
      }
      case 'evolve': this.updateEvolve(); break;
      case 'done': break;
    }
  }

  bagIds: string[] = [];
  openFight() {
    const m = this.b.mon(0);
    this.fight = new ListMenu(m.moves.map((id) => ({ label: MOVES[id].name, color: TYPE_COLOR[MOVES[id].type] })), 6, 160, 240, 24, 2, 2, true);
    this.mode = 'fight';
  }
  openTeam(force: boolean) {
    this.team = new ListMenu(G.team.map((m) => ({ label: sp(m).name, enabled: m.hp > 0 })), 12, 18, 150, 30, 1, 4, !force);
    this.team.sel = Math.max(0, G.team.findIndex((m, i) => m.hp > 0 && i !== this.b.sides[0].act));
    this.mode = force ? 'force' : 'team';
  }
  openBag() {
    this.bagIds = ITEM_ORDER.filter((id) => (G.bag[id] || 0) > 0 && ITEMS[id].kind !== 'key');
    this.bag = new ListMenu(this.bagIds.map((id) => ({ label: ITEMS[id].name, right: 'x' + G.bag[id], enabled: !(ITEMS[id].kind === 'lantern' && this.b.kind !== 'wild') })), 12, 24, 190, 12, 1, 9, true);
    this.mode = 'bag';
  }
  openTarget() {
    this.target = new ListMenu(G.team.map((m) => ({ label: sp(m).name })), 12, 18, 150, 30, 1, 4, true);
    this.mode = 'bagTarget';
  }

  act(a: PAction) {
    input.consumeAll();
    this.enqueue(this.b.turn(a));
    this.mode = 'events';
  }
  enqueue(evs: BEvent[]) { for (const e of evs) this.q.push(e); }
  queueMsgs(m: string[]) { for (const t of m) this.q.push({ k: 'msg', t }); this.mode = 'events'; }

  stepEvents() {
    if (this.ev) { if (!this.runEvent(this.ev)) return; this.ev = null; }
    while (!this.ev && this.q.length) {
      this.ev = this.q.shift()!; this.et = 0;
      if (!this.startEvent(this.ev)) return;
      this.ev = null;
    }
    if (this.ev) return;
    // Queue drained
    if (this.learnQ.length) { this.openLearn(); return; }
    if (this.b.result !== 'none') { this.finishBattle(); return; }
    if (this.b.needSwitch) { this.queueMsgsSilently(); this.openTeam(true); return; }
    this.cmd.sel = 0; this.mode = 'cmd';
  }
  queueMsgsSilently() { /* placeholder for clarity */ }

  /** returns true if event is instantaneous */
  startEvent(e: BEvent): boolean {
    switch (e.k) {
      case 'msg': this.msg = e.t; this.msgShown = 0; this.msgHold = 0; return false;
      case 'anim': this.anim = { side: e.side, type: e.type, kind: e.kind, t: 0 }; return false;
      case 'hp': {
        const s = this.shown[e.side];
        if (s.tgt > e.hp) {
          s.flash = 18; s.shake = 12;
          audio.sfx(e.eff && e.eff > 1 ? 'hitSuper' : e.eff && e.eff < 1 ? 'hitWeak' : 'hit');
          if (!settings.lowFx) this.burst(e.side === 1 ? FOE_X : PL_X, (e.side === 1 ? FOE_Y : PL_Y) - 30, '#fff0c0', e.eff && e.eff > 1 ? 16 : 8);
        } else audio.sfx('heal');
        s.tgt = e.hp; return false;
      }
      case 'faint': audio.sfx('faint'); return false;
      case 'switch': {
        const s = this.shown[e.side];
        s.mon = e.mon; s.hp = s.tgt = e.mon.hp; s.alpha = 1; s.sink = 0; s.dx = e.side === 0 ? -120 : 120;
        if (e.side === 0) this.xpShown = this.xpTgt = xpFrac(e.mon);
        audio.sfx('select'); return false;
      }
      case 'recall': return false;
      case 'stat': audio.sfx(e.up ? 'buff' : 'debuff'); if (!settings.lowFx) this.burst(e.side === 1 ? FOE_X : PL_X, (e.side === 1 ? FOE_Y : PL_Y) - 30, e.up ? '#8fe39a' : '#ff7a6a', 8, e.up ? -1 : 1); return true;
      case 'status': audio.sfx('status'); return true;
      case 'xp': this.xpTgt = e.frac; return true;
      case 'level': audio.sfx('level'); if (e.mon === this.shown[0].mon) { this.xpShown = 0; this.shown[0].tgt = e.mon.hp; this.shown[0].hp = Math.min(this.shown[0].hp, e.mon.hp); } return true;
      case 'learn': this.learnQ.push({ mon: e.mon, move: e.move }); return true;
      case 'lantern': this.lantern = { t: 0, shakes: e.shakes, ok: e.ok }; return false;
      case 'sfx': audio.sfx(e.n); return true;
    }
    return true;
  }

  runEvent(e: BEvent): boolean {
    this.et++;
    const fast = input.hit('confirm') || input.clicked;
    switch (e.k) {
      case 'msg': {
        if (this.msgShown < this.msg.length) { this.msgShown += settings.textSpeed >= 3 ? 4 : 2; if (fast) this.msgShown = this.msg.length; return false; }
        this.msgHold++;
        const hpBusy = this.shown[0].hp !== this.shown[0].tgt || this.shown[1].hp !== this.shown[1].tgt;
        if (hpBusy) return false;
        return fast || this.msgHold > (input.held('run') ? 4 : 50);
      }
      case 'anim': {
        this.anim!.t++;
        if (this.anim!.t >= 26) { this.anim = null; return true; }
        return false;
      }
      case 'hp': { const s = this.shown[e.side]; return s.hp === s.tgt && this.et > 10; }
      case 'faint': {
        const s = this.shown[e.side]; s.sink = Math.min(1, this.et / 24); s.alpha = 1 - s.sink;
        return this.et >= 28;
      }
      case 'switch': { const s = this.shown[e.side]; s.dx = Math.trunc(s.dx * 0.75); if (Math.abs(s.dx) <= 1) { s.dx = 0; return true; } return false; }
      case 'recall': { const s = this.shown[e.side]; s.alpha = Math.max(0, 1 - this.et / 12); return this.et >= 14; }
      case 'lantern': {
        const L = this.lantern!; L.t++;
        const total = 40 + L.shakes * 26 + 30;
        if (L.t > 40 && (L.t - 40) % 26 === 0 && (L.t - 40) / 26 <= L.shakes) audio.sfx('shake');
        if (L.t === total - 20) { if (L.ok) { audio.sfx('befriend'); this.burst(FOE_X, FOE_Y - 24, '#ffe7a0', 24); } else audio.sfx('fail'); }
        if (L.t >= total) { if (!L.ok) this.lantern = null; return true; }
        return false;
      }
    }
    return true;
  }

  openLearn() {
    const L = this.learnQ[0];
    this.msg = `${sp(L.mon).name} wants to learn ${MOVES[L.move].name}. Forget which move?`; this.msgShown = 999;
    this.learnMenu = new ListMenu([...L.mon.moves.map((id) => ({ label: MOVES[id].name, color: TYPE_COLOR[MOVES[id].type] })), { label: 'Don\'t learn ' + MOVES[L.move].name }], 200, 30, 170, 13, 1, 5, true);
    this.mode = 'learn';
  }

  finishBattle() {
    if (this.endHandled) {
      if (this.evoQ.length) { this.startEvolve(this.evoQ.shift()!); return; }
      this.close(); return;
    }
    this.endHandled = true;
    const r = this.b.result;
    const msgs: string[] = [];
    if (r === 'win' && this.trainer) {
      if (this.trainer.lose) msgs.push(`${this.trainer.name}: "${this.trainer.lose}"`);
      if (this.trainer.reward) { G.glints += this.trainer.reward; msgs.push(`You received ${this.trainer.reward} glints.`); }
      audio.play('');
      audio.sfx('victory');
    } else if (r === 'win') { const g = 8 + this.b.mon(1).lv * 3; G.glints += g; msgs.push(`You found ${g} glints in the afterglow.`); audio.play(''); audio.sfx('victory'); }
    else if (r === 'lose') {
      if (this.trainer?.noLoss) msgs.push('Your lights went dim... but the story isn\'t over.');
      else { const lost = Math.floor(G.glints * 0.1); G.glints -= lost; msgs.push('Your last light went dim...'); if (lost) msgs.push(`You dropped ${lost} glints in the dark.`); }
    }
    if (r !== 'lose') {
      for (const m of G.team) { const s = SPECIES[m.sp]; if (s.evo && m.lv >= s.evo.lv && m.hp > 0) this.evoQ.push(m); }
    }
    this.b.cleanup();
    this.queueMsgs(msgs);
    if (!msgs.length) this.finishBattle();
  }

  startEvolve(m: Mon) {
    this.evoMon = m; this.evoTo = SPECIES[m.sp].evo!.to; this.evoT = 0; this.mode = 'evolve';
    audio.play('ending');
    this.msg = `What? ${sp(m).name} is glowing brighter...`; this.msgShown = 999;
  }
  updateEvolve() {
    this.evoT++;
    if (this.evoT % 12 === 0 && this.evoT < 150) audio.sfx('blip');
    if (this.evoT === 150) {
      const m = this.evoMon!; const old = sp(m).name; const ratio = m.hp / maxHp(m);
      m.sp = this.evoTo; m.hp = Math.max(1, Math.round(maxHp(m) * ratio));
      if (!G.befriended.includes(m.sp)) G.befriended.push(m.sp);
      if (!G.seen.includes(m.sp)) G.seen.push(m.sp);
      audio.sfx('evolve'); this.burst(W / 2, 80, '#fff0c0', 30);
      this.msg = `${old} became ${sp(m).name}!`; this.msgShown = 999;
    }
    if (this.evoT > 240 || (this.evoT > 170 && (input.hit('confirm') || input.clicked))) {
      if (this.evoQ.length) this.startEvolve(this.evoQ.shift()!);
      else this.close();
    }
  }

  close() {
    if (this.mode === 'done') return;
    this.mode = 'done';
    scenes.pop(this);
    input.consumeAll();
    this.done(this.b.result as BattleResult);
  }

  burst(x: number, y: number, col: string, n: number, vyBias = 0) {
    for (let i = 0; i < n; i++) {
      if (this.parts.length > 80) break;
      const a = Math.random() * Math.PI * 2, s = 0.5 + Math.random() * 1.8;
      this.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s + vyBias, life: 20 + Math.random() * 20, col });
    }
  }
  updateParts() {
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i]; p.x += p.vx; p.y += p.vy; p.vy += 0.03; p.life--;
      if (p.life <= 0) { this.parts[i] = this.parts[this.parts.length - 1]; this.parts.pop(); }
    }
    for (const m of this.motes) { m.y -= m.s; if (m.y < -4) { m.y = 150; m.x = Math.random() * W; } }
  }

  // ---------------- render ----------------
  render(ctx: Ctx) {
    ctx.drawImage(this.bg, 0, 0);
    if (!settings.lowFx) {
      ctx.globalCompositeOperation = 'lighter';
      const g = glow(5, '#ffb060', 0.7);
      for (const m of this.motes) ctx.drawImage(g, Math.round(m.x) - 5, Math.round(m.y) - 5);
      ctx.globalCompositeOperation = 'source-over';
    }
    if (this.mode === 'evolve') { this.renderEvolve(ctx); return; }
    this.drawMon(ctx, 1, FOE_X, FOE_Y);
    this.drawMon(ctx, 0, PL_X, PL_Y);
    if (this.trainer && this.mode === 'intro') {
      const s = charSprite(this.trainer.look || 'courier', 0, 0);
      ctx.drawImage(s, FOE_X + 40 + this.shown[1].dx, FOE_Y - 34, 32, 32);
    }
    this.drawAnim(ctx);
    this.drawLantern(ctx);
    for (const p of this.parts) { ctx.fillStyle = p.col; ctx.fillRect(Math.round(p.x), Math.round(p.y), 2, 2); }
    this.drawHud(ctx);
    this.drawPanel(ctx);
  }

  drawMon(ctx: Ctx, side: number, x: number, y: number) {
    const s = this.shown[side];
    if (!s.mon || s.alpha <= 0) return;
    const bob = Math.round(Math.sin((clock.t + side * 30) / 22) * 2);
    let sx = x - 40 + s.dx + (s.shake ? (s.shake % 4 < 2 ? 2 : -2) : 0);
    if (this.anim && this.anim.side === side && this.anim.kind === 'hit') {
      const t = this.anim.t; const lunge = t < 8 ? t : t < 14 ? 14 - t : 0;
      sx += (side === 0 ? 1 : -1) * lunge * 2;
    }
    const sy = y - 76 + bob + Math.round(s.sink * 30);
    if (this.lantern && side === 1) {
      const L = this.lantern;
      if (L.t > 30 && (L.ok || L.t < 40 + L.shakes * 26 + 10)) return;
    }
    ctx.globalAlpha = s.alpha;
    if (!settings.lowFx) {
      ctx.globalCompositeOperation = 'lighter';
      const g = monGlow(s.mon.sp); ctx.drawImage(g, sx + 40 - g.width / 2, sy + 40 - g.height / 2);
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(x - 22 + s.dx, y - 4, 44, 3);
    if (s.flash > 0 && Math.floor(s.flash / 3) % 2 === 0) ctx.globalAlpha = s.alpha * 0.3;
    ctx.drawImage(monSprite(s.mon.sp, side === 0), sx, sy, 80, 80);
    ctx.globalAlpha = 1;
  }

  drawAnim(ctx: Ctx) {
    const a = this.anim; if (!a || a.t < 6) return;
    const col = TYPE_COLOR[a.type];
    const from = a.side === 0 ? [PL_X + 20, PL_Y - 40] : [FOE_X - 20, FOE_Y - 40];
    const to = a.side === 0 ? [FOE_X, FOE_Y - 36] : [PL_X, PL_Y - 36];
    if (a.kind === 'hit') {
      const k = Math.min(1, (a.t - 6) / 14);
      const x = from[0] + (to[0] - from[0]) * k, y = from[1] + (to[1] - from[1]) * k - Math.sin(k * Math.PI) * 16;
      ctx.globalCompositeOperation = 'lighter';
      const g = glow(14, col, 1); ctx.drawImage(g, Math.round(x - 14), Math.round(y - 14));
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 3, 3);
    } else {
      const c = a.side === 0 ? [PL_X, PL_Y - 36] : [FOE_X, FOE_Y - 36];
      const target = a.kind === 'status' ? to : c;
      const r = 10 + (a.t - 6);
      ctx.strokeStyle = col; ctx.globalAlpha = Math.max(0, 1 - (a.t - 6) / 20);
      ctx.strokeRect(target[0] - r, target[1] - r * 0.6, r * 2, r * 1.2);
      ctx.globalAlpha = 1;
    }
  }

  drawLantern(ctx: Ctx) {
    const L = this.lantern; if (!L) return;
    let x: number, y: number;
    if (L.t < 30) { const k = L.t / 30; x = PL_X + (FOE_X - PL_X) * k; y = PL_Y - 40 + (FOE_Y - 30 - (PL_Y - 40)) * k - Math.sin(k * Math.PI) * 40; }
    else { x = FOE_X; y = FOE_Y - 20; const ph = (L.t - 40) % 26; if (L.t > 40 && ph < 10 && (L.t - 40) / 26 < L.shakes) x += ph % 4 < 2 ? 2 : -2; }
    x = Math.round(x); y = Math.round(y);
    ctx.globalCompositeOperation = 'lighter';
    const g = glow(18, '#ffc070', 1); ctx.drawImage(g, x - 18, y - 18);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#0a0a16'; ctx.fillRect(x - 5, y - 7, 10, 13);
    ctx.fillStyle = '#ffcf7a'; ctx.fillRect(x - 4, y - 6, 8, 11);
    ctx.fillStyle = '#c84a2a'; ctx.fillRect(x - 4, y - 6, 8, 2); ctx.fillRect(x - 4, y + 3, 8, 2);
    ctx.fillStyle = '#fff0c0'; ctx.fillRect(x - 2, y - 3, 4, 5);
  }

  drawHud(ctx: Ctx) {
    const f = this.shown[1], p = this.shown[0];
    if (f.mon && f.alpha > 0) {
      panel(ctx, 6, 8, 152, 34);
      text(ctx, sp(f.mon).name, 12, 11, COL.text);
      textR(ctx, 'Lv' + f.mon.lv, 150, 11, COL.dim);
      typeBadge(ctx, sp(f.mon).type, 12, 24, 30);
      bar(ctx, 48, 27, 102, 4, f.hp / maxHp(f.mon));
      if (f.mon.status) text(ctx, f.mon.status === 'scorch' ? 'SCORCH' : 'DROWSE', 48, 31, f.mon.status === 'scorch' ? '#ff9a3c' : '#b48cff');
      if (this.b.kind === 'wild' && G.befriended.includes(f.mon.sp)) { ctx.fillStyle = COL.hi; ctx.fillRect(144, 33, 4, 4); }
      if (this.trainer) {
        const n = this.b.sides[1].mons.length;
        for (let i = 0; i < n; i++) { ctx.fillStyle = this.b.sides[1].mons[i].hp > 0 ? '#ffb060' : '#3a3a5a'; ctx.fillRect(12 + i * 7, 44, 5, 5); }
      }
    }
    if (p.mon && p.alpha > 0) {
      panel(ctx, 226, 104, 152, 42);
      text(ctx, sp(p.mon).name, 232, 107, COL.text);
      textR(ctx, 'Lv' + p.mon.lv, 370, 107, COL.dim);
      typeBadge(ctx, sp(p.mon).type, 232, 120, 30);
      bar(ctx, 268, 122, 102, 4, p.hp / maxHp(p.mon));
      textR(ctx, `${p.hp}/${maxHp(p.mon)}`, 370, 127, COL.text);
      if (p.mon.status) text(ctx, p.mon.status === 'scorch' ? 'SCORCH' : 'DROWSE', 232, 131, p.mon.status === 'scorch' ? '#ff9a3c' : '#b48cff');
      bar(ctx, 268, 141, 102, 1, this.xpShown, '#6ab8ff');
      for (let i = 0; i < G.team.length; i++) { ctx.fillStyle = G.team[i].hp > 0 ? '#7fe08a' : '#3a3a5a'; ctx.fillRect(232 + i * 7, 96, 5, 5); }
    }
    button(ctx, '?', W - 22, 2, 20, 12, input.inRect(W - 22, 2, 20, 12));
  }

  drawPanel(ctx: Ctx) {
    panel(ctx, 0, 152, W, 64);
    const mode = this.mode;
    if (mode === 'cmd') {
      const m = this.b.mon(0);
      text(ctx, `What will ${sp(m).name} do?`, 10, 160, COL.text);
      text(ctx, 'T: type chart   Shift: fast text', 10, 196, COL.dim);
      this.cmd.items[3].enabled = this.b.kind === 'wild';
      this.cmd.render(ctx);
      return;
    }
    if (mode === 'fight') {
      const m = this.b.mon(0);
      const fm = this.fight;
      fm.render(ctx);
      for (let i = 0; i < m.moves.length; i++) {
        const r = Math.floor(i / 2), c = i % 2;
        const x = fm.x + c * fm.cellW(), y = fm.y + r * fm.rowH;
        const mult = this.b.previewMult(i);
        const mv = MOVES[m.moves[i]];
        const tag = mult < 0 ? (mv.kind === 'heal' ? 'heal' : mv.kind === 'buff' ? 'boost' : 'effect') : mult > 1 ? 'BRILLIANT' : mult < 1 ? 'weak' : 'neutral';
        const tc = mult > 1 ? COL.good : mult > 0 && mult < 1 ? COL.bad : COL.dim;
        text(ctx, tag, x + 8, y + 12, tc);
        text(ctx, TYPE_NAME[mv.type], x + 70, y + 12, TYPE_COLOR[mv.type]);
      }
      const mv = MOVES[m.moves[fm.sel]];
      panel(ctx, 250, 156, 130, 56, COL.edgeDim);
      text(ctx, mv.kind === 'hit' ? `Power ${mv.power}  Acc ${mv.acc}` : `Acc ${mv.acc}`, 256, 160, COL.text);
      const lines = wrap(mv.desc + (mv.prio ? '' : ''), 118);
      lines.slice(0, 3).forEach((l, i) => text(ctx, l, 256, 172 + i * 11, COL.dim));
      return;
    }
    if (mode === 'team' || mode === 'force' || mode === 'bagTarget') {
      const menu = mode === 'bagTarget' ? this.target : this.team;
      ctx.fillStyle = 'rgba(5,7,15,0.6)'; ctx.fillRect(0, 0, W, 152);
      panel(ctx, 6, 4, 162, 140);
      text(ctx, mode === 'force' ? 'Choose who goes next' : mode === 'bagTarget' ? 'Use on whom?' : 'Team', 12, 6, COL.hi);
      G.team.forEach((m, i) => monRow(ctx, m, 10, 18 + i * 30, 154, i === menu.sel, i === this.b.sides[0].act));
      monDetail(ctx, G.team[menu.sel], 174, 4, 204, 140);
      text(ctx, mode === 'force' ? 'Pick a glimmer to send out.' : 'Enter/click: select   Esc: back', 10, 160, COL.text);
      return;
    }
    if (mode === 'bag') {
      ctx.fillStyle = 'rgba(5,7,15,0.6)'; ctx.fillRect(0, 0, W, 152);
      panel(ctx, 6, 8, 202, 136);
      text(ctx, 'Bag', 12, 11, COL.hi);
      if (!this.bagIds.length) text(ctx, 'Nothing useful...', 20, 30, COL.dim);
      this.bag.render(ctx);
      const id = this.bagIds[this.bag.sel];
      if (id) {
        text(ctx, ITEMS[id].desc, 10, 160, COL.text);
        if (ITEMS[id].kind === 'lantern' && this.b.kind === 'wild') {
          const c = Math.round(this.b.befriendChance(id) * 100);
          text(ctx, `Befriend odds: about ${c}%  (weaken it first!)`, 10, 174, COL.hi);
        }
      }
      return;
    }
    if (mode === 'learn') {
      ctx.fillStyle = 'rgba(5,7,15,0.6)'; ctx.fillRect(0, 0, W, 152);
      panel(ctx, 196, 26, 178, 72);
      this.learnMenu.render(ctx);
      const sel = this.learnMenu.sel; const L = this.learnQ[0];
      const id = sel < 4 ? L.mon.moves[sel] : L.move; const mv = MOVES[id];
      panel(ctx, 196, 100, 178, 46, COL.edgeDim);
      text(ctx, `${mv.name} (${TYPE_NAME[mv.type]})`, 202, 103, TYPE_COLOR[mv.type]);
      text(ctx, mv.kind === 'hit' ? `Power ${mv.power}  Acc ${mv.acc}` : mv.kind, 202, 114, COL.text);
      text(ctx, wrap(mv.desc, 166)[0], 202, 125, COL.dim);
    }
    const lines = wrap(this.msg, W - 24);
    let left = this.msgShown;
    for (let i = 0; i < lines.length && i < 4; i++) { if (left <= 0) break; text(ctx, lines[i], 10, 160 + i * 12, COL.text, '#05070f', left); left -= lines[i].length; }
  }

  renderEvolve(ctx: Ctx) {
    ctx.fillStyle = 'rgba(5,7,15,0.6)'; ctx.fillRect(0, 0, W, 152);
    const m = this.evoMon!;
    const t = this.evoT;
    const showNew = t >= 150 || (t > 40 && Math.floor(t / Math.max(3, 14 - t / 12)) % 2 === 0);
    const id = t >= 150 ? m.sp : showNew ? this.evoTo : m.sp;
    ctx.globalCompositeOperation = 'lighter';
    const g = glow(60, '#ffe7a0', Math.min(1, t / 100)); ctx.drawImage(g, W / 2 - 60, 80 - 60);
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(monSprite(id, false, t < 150 && t > 20), W / 2 - 40, 40, 80, 80);
    for (const p of this.parts) { ctx.fillStyle = p.col; ctx.fillRect(Math.round(p.x), Math.round(p.y), 2, 2); }
    panel(ctx, 0, 152, W, 64);
    for (const [i, l] of wrap(this.msg, W - 24).entries()) text(ctx, l, 10, 160 + i * 12, COL.text);
  }
}

export function startBattle(kind: 'wild' | 'trainer', foes: Mon[], trainer: TrainerDef | null, theme = 'docks'): Promise<BattleResult> {
  return new Promise((r) => { input.consumeAll(); scenes.push(new BattleScene(kind, foes, trainer, theme, r)); });
}
export function trainerTeam(t: TrainerDef): Mon[] { return t.team.map(([s, l], i) => makeMon(s, l, -1000 - i)); }
