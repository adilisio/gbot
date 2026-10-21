import { Ctx, W, H } from './engine/canvas';

export interface Scene {
  update(): void;
  render(ctx: Ctx): void;
  /** If true the scene below is rendered first (overlay/modal). */
  transparent?: boolean;
  name?: string;
}

class SceneStack {
  stack: Scene[] = [];
  push(s: Scene) { this.stack.push(s); }
  pop(s?: Scene) {
    if (s) { const i = this.stack.lastIndexOf(s); if (i >= 0) this.stack.splice(i, 1); }
    else this.stack.pop();
  }
  replaceAll(s: Scene) { this.stack.length = 0; this.stack.push(s); }
  top(): Scene | undefined { return this.stack[this.stack.length - 1]; }
  has(name: string) { return this.stack.some((s) => s.name === name); }
  update() { const t = this.top(); if (t) t.update(); }
  render(ctx: Ctx) {
    let start = this.stack.length - 1;
    while (start > 0 && this.stack[start].transparent) start--;
    for (let i = Math.max(0, start); i < this.stack.length; i++) this.stack[i].render(ctx);
  }
}
export const scenes = new SceneStack();

// ---- Global fade ----
class Fader {
  a = 0; target = 0; speed = 0.08; private res: (() => void) | null = null; color = '#05070f';
  to(target: number, frames = 14, color = '#05070f'): Promise<void> {
    this.target = target; this.speed = 1 / Math.max(1, frames); this.color = color;
    return new Promise((r) => { if (this.res) this.res(); this.res = r; });
  }
  update() {
    if (this.a < this.target) this.a = Math.min(this.target, this.a + this.speed);
    else if (this.a > this.target) this.a = Math.max(this.target, this.a - this.speed);
    if (this.a === this.target && this.res) { const r = this.res; this.res = null; r(); }
  }
  render(ctx: Ctx) {
    if (this.a <= 0) return;
    ctx.globalAlpha = this.a; ctx.fillStyle = this.color; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
  }
}
export const fader = new Fader();
export const fadeOut = (f = 14, c?: string) => fader.to(1, f, c);
export const fadeIn = (f = 14) => fader.to(0, f);

// Frame counter for animation (60/s)
export const clock = { t: 0 };

// Wait N update frames.
const waiters: { f: number; r: () => void }[] = [];
export function waitFrames(f: number): Promise<void> { return new Promise((r) => waiters.push({ f, r })); }
export function tickWaiters() {
  for (let i = waiters.length - 1; i >= 0; i--) { if (--waiters[i].f <= 0) { const w = waiters[i]; waiters.splice(i, 1); w.r(); } }
}

// Toast notifications (top of screen)
export const toasts: { text: string; t: number }[] = [];
export function toast(text: string) { toasts.push({ text, t: 150 }); if (toasts.length > 3) toasts.shift(); }
