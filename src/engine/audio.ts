import { settings } from './settings';

// Tiny Web Audio synth: a step sequencer for music + one-shot SFX.
// Notes are scheduled ~0.3s ahead from the main loop (no timers, no samples).

export interface Track {
  bpm: number; root: number; scale: number[]; prog: number[];
  pad?: number; arp?: number; arpWave?: OscillatorType; arpEvery?: number; arpOct?: number;
  bass?: number; bassPat?: number[]; lead?: number; leadWave?: OscillatorType; leadDensity?: number;
  drums?: number; kick?: number[]; snare?: number[]; hat?: number; bell?: boolean; hiss?: number; seed?: number;
  swing?: number;
}

const MINOR = [0, 2, 3, 5, 7, 8, 10];
const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const DORIAN = [0, 2, 3, 5, 7, 9, 10];
const MIXO = [0, 2, 4, 5, 7, 9, 10];
const PHRYG = [0, 1, 3, 5, 7, 8, 10];
const HARM = [0, 2, 3, 5, 7, 8, 11];
const LYD = [0, 2, 4, 6, 7, 9, 11];

export const TRACKS: Record<string, Track> = {
  title: { bpm: 66, root: 50, scale: MINOR, prog: [0, 5, 3, 6], pad: 0.12, arp: 0.05, arpWave: 'triangle', arpEvery: 2, arpOct: 2, hiss: 0.025, bell: true, seed: 3 },
  town: { bpm: 84, root: 53, scale: LYD, prog: [0, 4, 5, 3], pad: 0.07, arp: 0.05, arpWave: 'triangle', arpEvery: 2, arpOct: 1, bass: 0.12, bassPat: [0, 6, 10], lead: 0.04, leadWave: 'square', leadDensity: 0.22, hat: 0.012, seed: 11 },
  route: { bpm: 96, root: 52, scale: DORIAN, prog: [0, 3, 0, 4], pad: 0.05, arp: 0.045, arpWave: 'square', arpEvery: 2, arpOct: 1, bass: 0.12, bassPat: [0, 3, 8, 11], lead: 0.035, leadWave: 'triangle', leadDensity: 0.3, kick: [0, 8], drums: 0.25, hat: 0.015, seed: 21 },
  market: { bpm: 112, root: 55, scale: MIXO, prog: [0, 6, 3, 4], pad: 0.04, arp: 0.045, arpWave: 'square', arpEvery: 1, arpOct: 1, bass: 0.13, bassPat: [0, 4, 8, 12], lead: 0.04, leadWave: 'square', leadDensity: 0.35, kick: [0, 8], snare: [4, 12], drums: 0.22, hat: 0.018, swing: 0.12, seed: 33 },
  belfry: { bpm: 60, root: 47, scale: PHRYG, prog: [0, 1, 0, 6], pad: 0.11, arp: 0.05, arpWave: 'sine', arpEvery: 4, arpOct: 2, bass: 0.1, bassPat: [0], bell: true, hiss: 0.01, seed: 44 },
  heights: { bpm: 98, root: 49, scale: MINOR, prog: [0, 5, 6, 4], pad: 0.06, arp: 0.045, arpWave: 'square', arpEvery: 1, arpOct: 1, bass: 0.12, bassPat: [0, 8, 10], lead: 0.03, leadWave: 'sawtooth', leadDensity: 0.18, kick: [0, 10], drums: 0.2, hat: 0.014, hiss: 0.03, seed: 55 },
  heartwick: { bpm: 76, root: 50, scale: HARM, prog: [0, 5, 3, 4], pad: 0.1, arp: 0.05, arpWave: 'triangle', arpEvery: 1, arpOct: 2, bass: 0.13, bassPat: [0, 8], bell: true, kick: [0], drums: 0.25, seed: 66 },
  battle: { bpm: 148, root: 52, scale: MINOR, prog: [0, 5, 6, 4], arp: 0.04, arpWave: 'square', arpEvery: 1, arpOct: 1, bass: 0.14, bassPat: [0, 2, 4, 6, 8, 10, 12, 14], lead: 0.045, leadWave: 'square', leadDensity: 0.4, kick: [0, 6, 8], snare: [4, 12], drums: 0.3, hat: 0.02, seed: 77 },
  boss: { bpm: 160, root: 50, scale: HARM, prog: [0, 0, 5, 4], arp: 0.045, arpWave: 'sawtooth', arpEvery: 1, arpOct: 1, bass: 0.15, bassPat: [0, 2, 3, 6, 8, 10, 11, 14], lead: 0.045, leadWave: 'square', leadDensity: 0.45, kick: [0, 3, 8, 11], snare: [4, 12], drums: 0.32, hat: 0.022, pad: 0.04, seed: 88 },
  radio: { bpm: 72, root: 57, scale: MAJOR, prog: [0, 5, 3, 4], pad: 0.05, arp: 0.04, arpWave: 'triangle', arpEvery: 2, arpOct: 1, bass: 0.08, bassPat: [0, 8], hiss: 0.06, seed: 99 },
  ending: { bpm: 64, root: 53, scale: MAJOR, prog: [0, 3, 5, 4], pad: 0.12, arp: 0.05, arpWave: 'triangle', arpEvery: 2, arpOct: 2, bass: 0.08, bassPat: [0], bell: true, lead: 0.03, leadWave: 'sine', leadDensity: 0.2, seed: 7 },
  sad: { bpm: 56, root: 48, scale: MINOR, prog: [0, 5, 2, 6], pad: 0.12, arp: 0.04, arpWave: 'sine', arpEvery: 4, arpOct: 2, bell: true, hiss: 0.02, seed: 13 },
};

const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

class Synth {
  ctx: AudioContext | null = null;
  private master!: GainNode; private musicG!: GainNode; private sfxG!: GainNode;
  private delay!: DelayNode; private noise!: AudioBuffer;
  private hissSrc: AudioBufferSourceNode | null = null; private hissG!: GainNode;
  private track: Track | null = null; private trackName = '';
  private nextT = 0; private step = 0; private melody: number[] = [];
  private fadeG!: GainNode;

  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.connect(ctx.destination);
    this.musicG = ctx.createGain(); this.fadeG = ctx.createGain();
    this.musicG.connect(this.fadeG); this.fadeG.connect(this.master);
    this.sfxG = ctx.createGain(); this.sfxG.connect(this.master);
    // Simple echo for atmosphere.
    this.delay = ctx.createDelay(1.0); this.delay.delayTime.value = 0.33;
    const fb = ctx.createGain(); fb.gain.value = 0.38;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2200;
    this.delay.connect(lp); lp.connect(fb); fb.connect(this.delay); lp.connect(this.musicG);
    // Noise buffer (percussion + radio hiss).
    const len = ctx.sampleRate * 2;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.hissG = ctx.createGain(); this.hissG.gain.value = 0;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2600; bp.Q.value = 0.6;
    this.hissSrc = ctx.createBufferSource(); this.hissSrc.buffer = this.noise; this.hissSrc.loop = true;
    this.hissSrc.connect(bp); bp.connect(this.hissG); this.hissG.connect(this.musicG); this.hissSrc.start();
    this.applyVolume();
    if (this.trackName) { const n = this.trackName; this.trackName = ''; this.play(n); }
  }

  applyVolume() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(settings.master * settings.master, t, 0.02);
    this.musicG.gain.setTargetAtTime(settings.music * settings.music, t, 0.02);
    this.sfxG.gain.setTargetAtTime(settings.sfx * settings.sfx, t, 0.02);
  }
  suspend() { this.ctx?.suspend(); }
  resume() { this.ctx?.resume(); }

  play(name: string) {
    if (name === this.trackName) return;
    this.trackName = name;
    const tr = TRACKS[name] || null;
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.fadeG.gain.cancelScheduledValues(t);
    this.fadeG.gain.setValueAtTime(0, t);
    this.fadeG.gain.linearRampToValueAtTime(1, t + 0.8);
    this.track = tr; this.step = 0; this.nextT = t + 0.08;
    this.hissG.gain.setTargetAtTime(tr?.hiss || 0, t, 0.3);
    // Deterministic melody per track so loops feel composed.
    this.melody = [];
    if (tr) {
      let s = tr.seed || 1;
      const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
      let deg = 4;
      for (let i = 0; i < tr.prog.length * 16; i++) {
        if (rnd() < (tr.leadDensity || 0) && i % 2 === 0) {
          deg += Math.floor(rnd() * 5) - 2; if (deg < 0) deg = 1; if (deg > 9) deg = 8;
          this.melody.push(deg);
        } else this.melody.push(-99);
      }
    }
  }
  get current() { return this.trackName; }

  update() {
    const ctx = this.ctx, tr = this.track;
    if (!ctx || !tr || ctx.state !== 'running') return;
    const stepDur = 60 / tr.bpm / 4;
    if (this.nextT < ctx.currentTime - 0.5) this.nextT = ctx.currentTime + 0.05;
    while (this.nextT < ctx.currentTime + 0.3) {
      this.playStep(tr, this.step, this.nextT, stepDur);
      this.step++;
      const sw = tr.swing && this.step % 2 === 1 ? stepDur * tr.swing : (tr.swing ? -stepDur * tr.swing : 0);
      this.nextT += stepDur + sw;
    }
  }

  private noteOf(tr: Track, deg: number, oct = 0) {
    const n = tr.scale.length;
    const o = Math.floor(deg / n);
    const i = ((deg % n) + n) % n;
    return tr.root + tr.scale[i] + 12 * (o + oct);
  }

  private playStep(tr: Track, step: number, t: number, sd: number) {
    const bar = Math.floor(step / 16) % tr.prog.length;
    const s = step % 16;
    const chord = tr.prog[bar];
    if (tr.pad && s === 0) {
      for (const k of [0, 2, 4]) this.tone(mtof(this.noteOf(tr, chord + k)), t, sd * 16, tr.pad / 3, 'sine', 0.6, 1.2, true);
    }
    if (tr.arp && s % (tr.arpEvery || 2) === 0) {
      const seq = [0, 2, 4, 7, 4, 2];
      const k = seq[(s / (tr.arpEvery || 2)) % seq.length | 0];
      const f = mtof(this.noteOf(tr, chord + k, tr.arpOct || 1));
      if (tr.bell) this.tone(f, t, sd * 6, tr.arp, 'sine', 0.003, sd * 6, true, f * 2.01);
      else this.tone(f, t, sd * 1.6, tr.arp, tr.arpWave || 'square', 0.005, sd, true);
    }
    if (tr.bass && tr.bassPat && tr.bassPat.includes(s)) {
      this.tone(mtof(this.noteOf(tr, chord, -1)), t, sd * 1.8, tr.bass, 'triangle', 0.005, sd * 0.8, false);
    }
    if (tr.lead) {
      const m = this.melody[(step % (tr.prog.length * 16))];
      if (m > -99) this.tone(mtof(this.noteOf(tr, m, 1)), t, sd * 2.5, tr.lead, tr.leadWave || 'square', 0.01, sd * 1.5, true);
    }
    if (tr.drums) {
      if (tr.kick?.includes(s)) this.kick(t, tr.drums);
      if (tr.snare?.includes(s)) this.hit(t, tr.drums * 0.5, 1800, 0.12, this.musicG);
    }
    if (tr.hat && s % 2 === 0) this.hit(t, tr.hat * (s % 4 === 0 ? 1 : 0.6), 8000, 0.03, this.musicG);
  }

  private tone(f: number, t: number, dur: number, vol: number, wave: OscillatorType, att: number, rel: number, send: boolean, f2 = 0, out?: AudioNode) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator(); o.type = wave; o.frequency.value = f;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + att);
    g.gain.setTargetAtTime(0, t + Math.max(att, dur - rel), rel / 3 + 0.01);
    o.connect(g); g.connect(out || this.musicG);
    if (send && !out) g.connect(this.delay);
    o.start(t); o.stop(t + dur + rel + 0.1);
    if (f2) {
      const o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = f2;
      const g2 = ctx.createGain(); g2.gain.value = 0.35; o2.connect(g2); g2.connect(g);
      o2.start(t); o2.stop(t + dur + rel + 0.1);
    }
  }
  private kick(t: number, vol: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator(); o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.12);
    const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    o.connect(g); g.connect(this.musicG); o.start(t); o.stop(t + 0.2);
  }
  private hit(t: number, vol: number, freq: number, dur: number, out: AudioNode) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource(); src.buffer = this.noise;
    const f = ctx.createBiquadFilter(); f.type = freq > 4000 ? 'highpass' : 'bandpass'; f.frequency.value = freq;
    const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f); f.connect(g); g.connect(out);
    src.start(t, Math.random() * 1.5); src.stop(t + dur + 0.02);
  }

  sfx(name: string) {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running') return;
    const t = ctx.currentTime + 0.005;
    const o = this.sfxG;
    const seq = (notes: number[], dt: number, wave: OscillatorType, vol: number, len = dt * 1.5) =>
      notes.forEach((n, i) => this.tone(mtof(n), t + i * dt, len, vol, wave, 0.004, len * 0.6, false, 0, o));
    switch (name) {
      case 'blip': seq([84], 0.03, 'square', 0.05, 0.03); break;
      case 'select': seq([79, 86], 0.045, 'square', 0.06); break;
      case 'back': seq([79, 72], 0.045, 'square', 0.05); break;
      case 'deny': seq([50, 47], 0.07, 'square', 0.07); break;
      case 'text': seq([90 + Math.floor(Math.random() * 3)], 0.02, 'triangle', 0.025, 0.02); break;
      case 'hit': this.hit(t, 0.35, 900, 0.15, o); seq([45], 0.05, 'square', 0.08, 0.06); break;
      case 'hitSuper': this.hit(t, 0.45, 1400, 0.25, o); seq([57, 45, 40], 0.04, 'sawtooth', 0.09); break;
      case 'hitWeak': this.hit(t, 0.18, 600, 0.1, o); break;
      case 'miss': seq([72, 67], 0.06, 'triangle', 0.06); break;
      case 'heal': seq([72, 76, 79, 84], 0.06, 'triangle', 0.07); break;
      case 'faint': seq([67, 62, 58, 53, 48], 0.08, 'triangle', 0.08); break;
      case 'level': seq([72, 76, 79, 84, 88], 0.07, 'square', 0.06); break;
      case 'befriend': seq([79, 83, 86, 91, 95], 0.08, 'triangle', 0.08, 0.3); break;
      case 'shake': seq([60], 0.05, 'triangle', 0.08, 0.08); break;
      case 'fail': seq([62, 55], 0.1, 'square', 0.06); break;
      case 'door': this.hit(t, 0.2, 400, 0.2, o); seq([55, 60], 0.08, 'triangle', 0.06); break;
      case 'bump': seq([40], 0.05, 'square', 0.04, 0.04); break;
      case 'encounter': seq([76, 72, 76, 72, 79, 83], 0.05, 'square', 0.06); break;
      case 'status': seq([70, 66, 70], 0.05, 'sawtooth', 0.05); break;
      case 'buff': seq([67, 71, 74], 0.05, 'triangle', 0.06); break;
      case 'debuff': seq([74, 71, 67], 0.05, 'triangle', 0.06); break;
      case 'evolve': seq([60, 64, 67, 72, 76, 79, 84, 88, 91], 0.09, 'triangle', 0.07, 0.25); break;
      case 'buy': seq([84, 91], 0.05, 'square', 0.05); break;
      case 'save': seq([72, 79, 84], 0.08, 'sine', 0.08, 0.2); break;
      case 'push': this.hit(t, 0.15, 300, 0.15, o); break;
      case 'gust': this.hit(t, 0.12, 3000, 0.25, o); break;
      case 'static': this.hit(t, 0.12, 2500, 0.5, o); break;
      case 'chime': seq([88, 95, 100], 0.12, 'sine', 0.06, 0.6); break;
      case 'victory': seq([72, 72, 72, 76, 79, 76, 79, 84], 0.09, 'square', 0.06, 0.12); break;
      case 'puzzle': seq([72, 79, 84, 91], 0.1, 'sine', 0.08, 0.4); break;
    }
  }
}

export const audio = new Synth();
