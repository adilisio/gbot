// Fixed-timestep loop (60 Hz updates) driven by requestAnimationFrame.
// Rendering happens once per rAF; updates catch up in fixed slices (capped).
export const STEP = 1000 / 60;

export class Stats {
  // Ring buffer of recent frame intervals (no allocation per frame).
  frames = new Float32Array(240);
  work = new Float32Array(240);
  i = 0; n = 0;
  push(dt: number, work: number) {
    this.frames[this.i] = dt; this.work[this.i] = work;
    this.i = (this.i + 1) % this.frames.length; if (this.n < this.frames.length) this.n++;
  }
  summary(count = 60) {
    const c = Math.min(count, this.n);
    let sum = 0, worst = 0, wsum = 0, wworst = 0;
    for (let k = 0; k < c; k++) {
      const j = (this.i - 1 - k + this.frames.length) % this.frames.length;
      sum += this.frames[j]; if (this.frames[j] > worst) worst = this.frames[j];
      wsum += this.work[j]; if (this.work[j] > wworst) wworst = this.work[j];
    }
    return { avg: c ? sum / c : 0, worst, workAvg: c ? wsum / c : 0, workWorst: wworst };
  }
}

// Long-run recorder for the test harness.
export class Recorder {
  on = false; samples: number[] = []; work: number[] = [];
  start() { this.samples = []; this.work = []; this.on = true; }
  stop() {
    this.on = false;
    const s = this.samples.slice(1);
    const avg = s.reduce((a, b) => a + b, 0) / Math.max(1, s.length);
    const sorted = [...s].sort((a, b) => a - b);
    const p99 = sorted[Math.floor(sorted.length * 0.99)] || 0;
    const worst = sorted[sorted.length - 1] || 0;
    const wavg = this.work.reduce((a, b) => a + b, 0) / Math.max(1, this.work.length);
    const wworst = Math.max(0, ...this.work);
    const over20 = s.filter((x) => x > 20).length;
    return { frames: s.length, avg, p99, worst, over20, workAvg: wavg, workWorst: wworst };
  }
}

export function startLoop(update: () => void, render: () => void, stats: Stats, rec: Recorder) {
  let last = performance.now();
  let acc = 0;
  let running = true;
  let rafId = 0;
  function frame(now: number) {
    if (!running) return;
    let dt = now - last; last = now;
    if (dt > 250) dt = STEP; // came back from a stall: don't spiral
    acc += dt;
    const t0 = performance.now();
    let steps = 0;
    while (acc >= STEP - 0.5 && steps < 4) { update(); acc -= STEP; steps++; }
    if (steps === 4) acc = 0;
    if (acc < 0) acc = 0;
    render();
    const work = performance.now() - t0;
    stats.push(dt, work);
    if (rec.on) { rec.samples.push(dt); rec.work.push(work); }
    rafId = requestAnimationFrame(frame);
  }
  rafId = requestAnimationFrame(frame);
  return {
    pause() { running = false; cancelAnimationFrame(rafId); },
    resume() { if (running) return; running = true; last = performance.now(); acc = 0; rafId = requestAnimationFrame(frame); },
    get running() { return running; },
  };
}
