import { W, H } from './canvas';

export type Action = 'up' | 'down' | 'left' | 'right' | 'confirm' | 'back' | 'menu' | 'run' | 'debug' | 'chart' | 'end' | 'cycle' | 'undo' | 'a1' | 'a2' | 'a3';

const KEYMAP: Record<string, Action> = {
  ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
  KeyE: 'confirm', Space: 'confirm', Enter: 'confirm', NumpadEnter: 'confirm',
  Escape: 'back', Backspace: 'back', KeyQ: 'back',
  ShiftLeft: 'run', ShiftRight: 'run', F3: 'debug', KeyT: 'chart',
  KeyF: 'end', Tab: 'cycle', KeyZ: 'undo', Digit1: 'a1', Digit2: 'a2', Digit3: 'a3',
};

class Input {
  private down = new Set<Action>();
  private pressedQ = new Set<Action>();
  private pressed = new Set<Action>();
  private repeatT: Record<string, number> = {};
  mx = -1; my = -1; mouseMoved = false; private mMovedQ = false;
  clicked = false; private clickQ = false;
  rclicked = false; private rclickQ = false;
  wheel = 0; private wheelQ = 0;
  anyKeyQ = false; anyKey = false;
  lastKey = '';
  private canvas!: HTMLCanvasElement;
  usingMouse = false;

  attach(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    window.addEventListener('keydown', (e) => {
      const a = KEYMAP[e.code];
      if (a || e.code.startsWith('F')) { if (e.code !== 'F11' && e.code !== 'F12' && e.code !== 'F5') e.preventDefault(); }
      this.anyKeyQ = true;
      this.lastKey = e.key;
      if (!a) return;
      this.usingMouse = false;
      if (!this.down.has(a)) { this.pressedQ.add(a); this.repeatT[a] = 0; }
      this.down.add(a);
    });
    window.addEventListener('keyup', (e) => { const a = KEYMAP[e.code]; if (a) this.down.delete(a); });
    window.addEventListener('blur', () => this.down.clear());
    canvas.addEventListener('mousemove', (e) => { this.toInternal(e); this.mMovedQ = true; this.usingMouse = true; });
    canvas.addEventListener('mousedown', (e) => {
      this.toInternal(e); canvas.focus();
      if (e.button === 0) this.clickQ = true;
      if (e.button === 2) this.rclickQ = true;
      this.anyKeyQ = true; this.usingMouse = true;
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('wheel', (e) => { this.wheelQ += Math.sign(e.deltaY); e.preventDefault(); }, { passive: false });
  }

  private toInternal(e: MouseEvent) {
    const r = this.canvas.getBoundingClientRect();
    this.mx = Math.floor(((e.clientX - r.left) / r.width) * W);
    this.my = Math.floor(((e.clientY - r.top) / r.height) * H);
  }

  /** Called at the start of each fixed update step. */
  beginStep() {
    this.pressed.clear();
    for (const a of this.pressedQ) this.pressed.add(a);
    this.pressedQ.clear();
    // Key repeat for menus (held direction).
    for (const a of ['up', 'down', 'left', 'right'] as Action[]) {
      if (this.down.has(a)) {
        this.repeatT[a] = (this.repeatT[a] || 0) + 1;
        if (this.repeatT[a] > 22 && this.repeatT[a] % 6 === 0) this.pressed.add(a);
      }
    }
    this.clicked = this.clickQ; this.clickQ = false;
    this.rclicked = this.rclickQ; this.rclickQ = false;
    this.mouseMoved = this.mMovedQ; this.mMovedQ = false;
    this.wheel = this.wheelQ; this.wheelQ = 0;
    this.anyKey = this.anyKeyQ; this.anyKeyQ = false;
  }
  held(a: Action) { return this.down.has(a); }
  hit(a: Action) { return this.pressed.has(a); }
  consume(a: Action) { this.pressed.delete(a); }
  consumeAll() { this.pressed.clear(); this.clicked = false; this.rclicked = false; this.anyKey = false; }
  /** For test harness: inject a key press. */
  inject(a: Action, hold = false) { this.pressedQ.add(a); this.anyKeyQ = true; if (hold) this.down.add(a); }
  release(a: Action) { this.down.delete(a); }
  inRect(x: number, y: number, w: number, h: number) { return this.mx >= x && this.my >= y && this.mx < x + w && this.my < y + h; }
}

export const input = new Input();
