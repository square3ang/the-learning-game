// 모든 BGM·SFX는 Web Audio API로 실시간 합성합니다 (외부 음원 파일 없음).
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
const PENT = [72, 74, 76, 79, 81, 84, 86, 88];
const LAYERS = ['pad', 'bass', 'arp', 'bell', 'drums'];

const MOODS = {
  ocean: { tempo: 84, prog: [[48, [64, 67, 71, 72]], [45, [64, 67, 69, 72]], [41, [65, 69, 72, 76]], [43, [62, 67, 71, 74]]] },
  factory: { tempo: 104, clap: true, prog: [[50, [62, 65, 69, 72]], [43, [62, 65, 67, 71]], [48, [64, 67, 71, 72]], [45, [64, 67, 69, 72]]] },
  ending: { tempo: 92, prog: [[41, [65, 69, 72, 76]], [43, [67, 71, 74, 79]], [45, [64, 69, 72, 76]], [48, [67, 72, 76, 79]]] },
};

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.mood = 'ocean';
    this.level = 0;
    this._scrubT = 0;
  }

  init() {
    if (this.ctx) { this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = (this.ctx = new AC());

    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 1;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.knee.value = 10; comp.ratio.value = 3.5;
    comp.attack.value = 0.004; comp.release.value = 0.25;
    this.master.connect(comp);
    comp.connect(ctx.destination);

    this.reverb = ctx.createConvolver();
    this.reverb.buffer = this._impulse(2.6);
    const rv = ctx.createGain(); rv.gain.value = 0.55;
    this.reverb.connect(rv); rv.connect(this.master);

    this.delay = ctx.createDelay(1);
    this.delay.delayTime.value = 0.34;
    const fb = ctx.createGain(); fb.gain.value = 0.33;
    const dlp = ctx.createBiquadFilter(); dlp.type = 'lowpass'; dlp.frequency.value = 2400;
    this.delay.connect(dlp); dlp.connect(fb); fb.connect(this.delay);
    const dOut = ctx.createGain(); dOut.gain.value = 0.45;
    dlp.connect(dOut); dOut.connect(this.master);

    this.music = ctx.createGain(); this.music.gain.value = 0.38; this.music.connect(this.master);
    this.sfx = ctx.createGain(); this.sfx.gain.value = 0.85; this.sfx.connect(this.master);
    this.layers = {};
    for (const k of LAYERS) {
      const g = ctx.createGain(); g.gain.value = 0; g.connect(this.music); this.layers[k] = g;
    }
    this.noiseBuf = this._noise(3);
    this._ambience();

    this.step = 0;
    this.next = ctx.currentTime + 0.2;
    this.gullT = ctx.currentTime + 5;
    this.timer = setInterval(() => this._tick(), 30);
    this.setIntensity(this.level);
  }

  /* ---------- controls ---------- */
  setIntensity(level) {
    this.level = level;
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    LAYERS.forEach((k, i) => this.layers[k].gain.setTargetAtTime(i <= level ? (k === 'drums' ? 0.85 : 1) : 0, now, 1.2));
  }
  setMood(m) { this.mood = m; }
  toggleMute() {
    this.muted = !this.muted;
    if (this.ctx) this.master.gain.setTargetAtTime(this.muted ? 0 : 1, this.ctx.currentTime, 0.05);
    return this.muted;
  }
  setHum(on) {
    if (!this.ctx) return;
    this.humGain.gain.setTargetAtTime(on ? 0.05 : 0, this.ctx.currentTime, 0.12);
  }

  /* ---------- building blocks ---------- */
  _impulse(sec) {
    const ctx = this.ctx, len = Math.floor(ctx.sampleRate * sec);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    }
    return buf;
  }
  _noise(sec) {
    const ctx = this.ctx, len = Math.floor(ctx.sampleRate * sec);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }
  _now() { return this.ctx ? this.ctx.currentTime : null; }

  tone({ f, t, dur = 0.2, type = 'sine', gain = 0.2, a = 0.005, r = 0.2, dest, lp, q = 0.7, send = 0, delay = 0, detune = 0, slide, slideT }) {
    const ctx = this.ctx;
    if (!ctx) return;
    t = t ?? ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (detune) o.detune.value = detune;
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + (slideT || dur));
    const g = ctx.createGain();
    const peak = Math.max(0.0002, gain);
    const hold = t + Math.max(a, dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.setValueAtTime(peak, hold);
    g.gain.exponentialRampToValueAtTime(0.0001, hold + r);
    let node = o;
    if (lp) {
      const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = lp; fl.Q.value = q;
      o.connect(fl); node = fl;
    }
    node.connect(g);
    g.connect(dest || this.sfx);
    if (send) { const s = ctx.createGain(); s.gain.value = send; g.connect(s); s.connect(this.reverb); }
    if (delay) { const s = ctx.createGain(); s.gain.value = delay; g.connect(s); s.connect(this.delay); }
    o.start(t);
    o.stop(hold + r + 0.05);
  }

  noise({ t, dur = 0.1, gain = 0.2, type = 'bandpass', f = 1000, f2, q = 1, a = 0.004, r = 0.1, dest, send = 0 }) {
    const ctx = this.ctx;
    if (!ctx) return;
    t = t ?? ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const fl = ctx.createBiquadFilter();
    fl.type = type; fl.Q.value = q;
    fl.frequency.setValueAtTime(f, t);
    if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + dur + r);
    const g = ctx.createGain();
    const peak = Math.max(0.0002, gain);
    const hold = t + Math.max(a, dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.setValueAtTime(peak, hold);
    g.gain.exponentialRampToValueAtTime(0.0001, hold + r);
    src.connect(fl); fl.connect(g); g.connect(dest || this.sfx);
    if (send) { const s = ctx.createGain(); s.gain.value = send; g.connect(s); s.connect(this.reverb); }
    src.start(t, Math.random() * 2);
    src.stop(hold + r + 0.05);
  }

  _ambience() {
    const ctx = this.ctx;
    const src = ctx.createBufferSource(); src.buffer = this.noiseBuf; src.loop = true;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 520; lp.Q.value = 0.3;
    const g = ctx.createGain(); g.gain.value = 0.13;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.12;
    const lg = ctx.createGain(); lg.gain.value = 0.09;
    lfo.connect(lg); lg.connect(g.gain);
    const lfo2 = ctx.createOscillator(); lfo2.frequency.value = 0.07;
    const lg2 = ctx.createGain(); lg2.gain.value = 260;
    lfo2.connect(lg2); lg2.connect(lp.frequency);
    src.connect(lp); lp.connect(g); g.connect(this.master);
    src.start(); lfo.start(); lfo2.start();

    const hum = ctx.createOscillator(); hum.type = 'sawtooth'; hum.frequency.value = 55;
    const hlp = ctx.createBiquadFilter(); hlp.type = 'lowpass'; hlp.frequency.value = 220;
    this.humGain = ctx.createGain(); this.humGain.gain.value = 0;
    hum.connect(hlp); hlp.connect(this.humGain); this.humGain.connect(this.sfx);
    hum.start();
  }

  /* ---------- generative BGM ---------- */
  _tick() {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running') return;
    const m = MOODS[this.mood];
    const e = 60 / m.tempo / 2;
    if (this.next < ctx.currentTime - 0.2) this.next = ctx.currentTime + 0.05;
    while (this.next < ctx.currentTime + 0.15) {
      this._step(this.step, this.next, e, m);
      this.next += e;
      this.step++;
    }
    if (this.mood !== 'factory' && ctx.currentTime > this.gullT) {
      this.gull(0.5);
      this.gullT = ctx.currentTime + 14 + Math.random() * 14;
    }
  }

  _step(step, t, e, m) {
    const s = step % 8;
    const bar = Math.floor(step / 8);
    const [root, chord] = m.prog[bar % m.prog.length];
    const L = this.layers;

    if (s === 0) {
      for (const n of chord) {
        this.tone({ f: mtof(n), t, dur: e * 8 - 0.2, type: 'triangle', gain: 0.045, a: 0.9, r: 1.4, dest: L.pad, lp: 1100, send: 0.5, detune: -6 });
        this.tone({ f: mtof(n), t, dur: e * 8 - 0.2, type: 'sine', gain: 0.035, a: 0.9, r: 1.4, dest: L.pad, detune: 6 });
      }
    }
    if (s === 0) this.tone({ f: mtof(root), t, dur: e * 2.5, gain: 0.22, a: 0.01, r: 0.3, dest: L.bass });
    if (s === 3) this.tone({ f: mtof(root + 7), t, dur: e * 0.7, gain: 0.12, a: 0.01, r: 0.2, dest: L.bass });
    if (s === 4) this.tone({ f: mtof(root), t, dur: e * 2, gain: 0.17, a: 0.01, r: 0.25, dest: L.bass });
    if (s === 6) this.tone({ f: mtof(root + 12), t, dur: e * 0.5, gain: 0.1, a: 0.01, r: 0.15, dest: L.bass });

    const pat = [0, 1, 2, 3, 2, 1, 2, 3];
    if (Math.random() > 0.12) {
      this.tone({ f: mtof(chord[pat[s]] + 12), t, dur: 0.02, type: 'triangle', gain: 0.055, a: 0.004, r: 0.35, dest: L.arp, lp: 2600, send: 0.25 });
    }
    if ((s === 0 || s === 5) && Math.random() < 0.55) {
      this.tone({ f: mtof(PENT[(Math.random() * PENT.length) | 0]), t, dur: 0.01, gain: 0.06, a: 0.003, r: 1.6, dest: L.bell, delay: 0.5, send: 0.4 });
    }
    if (s === 0 || s === 4) this._kick(t);
    if (s % 2 === 1) this._hat(t, s === 3 || s === 7 ? 0.05 : 0.03);
    if (m.clap && s === 4) this._snare(t);
  }
  _kick(t) { this.tone({ f: 140, slide: 42, slideT: 0.16, t, dur: 0.05, gain: 0.32, r: 0.22, dest: this.layers.drums }); }
  _hat(t, g) { this.noise({ t, dur: 0.008, r: 0.05, gain: g, type: 'highpass', f: 7000, dest: this.layers.drums }); }
  _snare(t) {
    this.noise({ t, dur: 0.02, r: 0.15, gain: 0.1, type: 'bandpass', f: 1800, q: 0.8, dest: this.layers.drums, send: 0.2 });
    this.tone({ f: 220, slide: 150, slideT: 0.08, t, dur: 0.02, gain: 0.06, r: 0.08, type: 'triangle', dest: this.layers.drums });
  }

  /* ---------- SFX ---------- */
  click() { const t = this._now(); if (t === null) return; this.tone({ f: 620, slide: 980, slideT: 0.05, t, dur: 0.02, gain: 0.16, r: 0.06 }); }
  grab() { const t = this._now(); if (t === null) return; this.tone({ f: 300, slide: 520, slideT: 0.08, t, dur: 0.04, gain: 0.18, r: 0.08, type: 'triangle' }); }
  pop() {
    const t = this._now(); if (t === null) return;
    this.tone({ f: 260, slide: 1300, slideT: 0.09, t, dur: 0.05, gain: 0.28, r: 0.08 });
    this.noise({ t, dur: 0.02, r: 0.06, gain: 0.16, type: 'highpass', f: 2500 });
    [88, 91, 96].forEach((n, i) => this.tone({ f: mtof(n), t: t + 0.08 + i * 0.06, dur: 0.01, gain: 0.07, r: 0.5, delay: 0.4 }));
  }
  sparkle() {
    const t = this._now(); if (t === null) return;
    for (let i = 0; i < 5; i++) this.tone({ f: mtof(PENT[(Math.random() * PENT.length) | 0] + 12), t: t + i * 0.055, dur: 0.01, gain: 0.055, r: 0.4, delay: 0.35, send: 0.2 });
  }
  correct() {
    const t = this._now(); if (t === null) return;
    [72, 76, 79, 84].forEach((n, i) => {
      this.tone({ f: mtof(n), t: t + i * 0.075, dur: 0.05, type: 'triangle', gain: 0.13, r: 0.45, send: 0.3 });
      this.tone({ f: mtof(n + 12), t: t + i * 0.075, dur: 0.02, gain: 0.04, r: 0.35 });
    });
  }
  wrong() {
    const t = this._now(); if (t === null) return;
    this.tone({ f: 300, slide: 140, slideT: 0.28, t, dur: 0.22, gain: 0.22, r: 0.12, type: 'triangle' });
    this.tone({ f: 150, slide: 75, slideT: 0.3, t, dur: 0.2, gain: 0.05, r: 0.1, type: 'square', lp: 700 });
  }
  splash(big = 1) {
    const t = this._now(); if (t === null) return;
    this.noise({ t, dur: 0.08, r: 0.55 * big, gain: 0.3 * big, type: 'bandpass', f: 1800, f2: 350, q: 0.7 });
    this.noise({ t, dur: 0.03, r: 0.25, gain: 0.22 * big, type: 'lowpass', f: 500 });
    for (let i = 0; i < 4; i++) {
      this.tone({ f: 700 + Math.random() * 900, slide: 1600 + Math.random() * 900, slideT: 0.05, t: t + 0.05 + Math.random() * 0.3, dur: 0.01, gain: 0.035, r: 0.05 });
    }
  }
  whoosh() { const t = this._now(); if (t === null) return; this.noise({ t, a: 0.25, dur: 0.3, r: 0.35, gain: 0.2, type: 'bandpass', f: 280, f2: 2600, q: 1.4 }); }
  scrub() {
    const t = this._now(); if (t === null) return;
    if (t - this._scrubT < 0.07) return;
    this._scrubT = t;
    this.noise({ t, dur: 0.02, r: 0.07, gain: 0.12, type: 'bandpass', f: 2200 + Math.random() * 2500, q: 2.5 });
    if (Math.random() < 0.5) this.tone({ f: 900 + Math.random() * 700, slide: 1800, slideT: 0.04, t, dur: 0.01, gain: 0.04, r: 0.04 });
  }
  peel() {
    const t = this._now(); if (t === null) return;
    this.noise({ t, dur: 0.22, r: 0.05, gain: 0.2, type: 'highpass', f: 1000, f2: 5000 });
    for (let i = 0; i < 7; i++) this.noise({ t: t + i * 0.03 + Math.random() * 0.02, dur: 0.004, r: 0.02, gain: 0.12, type: 'bandpass', f: 3000, q: 3 });
  }
  crush() {
    const t = this._now(); if (t === null) return;
    this.noise({ t, dur: 0.1, r: 0.25, gain: 0.4, type: 'lowpass', f: 2600, f2: 300 });
    this.tone({ f: 130, slide: 40, slideT: 0.2, t, dur: 0.1, gain: 0.4, r: 0.2 });
    for (let i = 0; i < 9; i++) this.noise({ t: t + Math.random() * 0.18, dur: 0.004, r: 0.02, gain: 0.14, type: 'bandpass', f: 2500 + Math.random() * 2500, q: 4 });
  }
  capTwist() {
    const t = this._now(); if (t === null) return;
    for (let i = 0; i < 6; i++) this.noise({ t: t + i * 0.07, dur: 0.004, r: 0.025, gain: 0.18, type: 'bandpass', f: 4200, q: 5 });
    this.tone({ f: 1400, t: t + 0.45, dur: 0.01, gain: 0.1, r: 0.06, type: 'square', lp: 3000 });
  }
  beep() {
    const t = this._now(); if (t === null) return;
    [0, 0.15].forEach((o) => this.tone({ f: 1046, t: t + o, dur: 0.09, gain: 0.07, r: 0.02, type: 'square', lp: 3500 }));
  }
  clunk() {
    const t = this._now(); if (t === null) return;
    this.tone({ f: 90, slide: 55, slideT: 0.1, t, dur: 0.06, gain: 0.2, r: 0.18, type: 'square', lp: 420 });
    this.noise({ t, dur: 0.02, r: 0.1, gain: 0.12, type: 'lowpass', f: 900 });
  }
  pluck() {
    const t = this._now(); if (t === null) return;
    [79, 84].forEach((n, i) => this.tone({ f: mtof(n), t: t + i * 0.06, dur: 0.01, type: 'triangle', gain: 0.14, r: 0.35, send: 0.2 }));
    this.noise({ t, dur: 0.02, r: 0.12, gain: 0.15, type: 'lowpass', f: 700 });
  }
  stamp() {
    const t = this._now(); if (t === null) return;
    this.tone({ f: 150, slide: 45, slideT: 0.18, t, dur: 0.08, gain: 0.45, r: 0.2 });
    this.noise({ t, dur: 0.02, r: 0.12, gain: 0.2, type: 'lowpass', f: 1200 });
    [60, 64, 67, 72, 76].forEach((n, i) => this.tone({ f: mtof(n), t: t + 0.12 + i * 0.04, dur: 0.5, type: 'triangle', gain: 0.07, a: 0.01, r: 1.0, send: 0.45 }));
  }
  fanfare() {
    const t = this._now(); if (t === null) return;
    [67, 72, 76, 79].forEach((n, i) => this.tone({ f: mtof(n), t: t + i * 0.12, dur: 0.08, type: 'triangle', gain: 0.13, r: 0.3, send: 0.3 }));
    [72, 76, 79, 84].forEach((n) => {
      this.tone({ f: mtof(n), t: t + 0.5, dur: 0.7, type: 'triangle', gain: 0.08, a: 0.02, r: 1.2, send: 0.5 });
      this.tone({ f: mtof(n) * 1.004, t: t + 0.5, dur: 0.7, type: 'sawtooth', gain: 0.02, a: 0.02, r: 1.0, lp: 2000 });
    });
    this.sparkle();
  }
  gull(vol = 1) {
    const t = this._now(); if (t === null) return;
    [0, 0.32].forEach((o, i) => this.tone({ f: 1750 - i * 120, slide: 1050, slideT: 0.22, t: t + o, dur: 0.16, a: 0.02, gain: 0.045 * vol, r: 0.08, type: 'sawtooth', lp: 2600, q: 3, send: 0.3 }));
  }
  whale() {
    const t = this._now(); if (t === null) return;
    this.tone({ f: 170, slide: 330, slideT: 0.9, t, dur: 1.6, a: 0.3, gain: 0.12, r: 0.9, send: 0.9 });
    this.tone({ f: 340, slide: 230, slideT: 1.6, t: t + 0.9, dur: 0.9, a: 0.2, gain: 0.06, r: 0.8, type: 'triangle', lp: 900, send: 0.9 });
  }
}
