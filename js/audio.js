'use strict';
// ================= ЗВУК: процедурни ефекти + тъмна фонова музика (WebAudio) =================

const Sfx = {
  ctx: null, master: null, musicGain: null, muted: false,
  _noiseBuf: null, _musicTimer: 0, _bar: 0,

  baseGain() {
    const v = (typeof G !== 'undefined' && G.meta && G.meta.volume !== undefined) ? G.meta.volume : 0.8;
    return 0.7 * v;
  },
  init() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) { return; }
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : this.baseGain();
    this.master.connect(this.ctx.destination);
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.16;
    this.musicGain.connect(this.master);
  },
  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); },
  setVolume(v) {
    if (typeof G !== 'undefined' && G.meta) G.meta.volume = clamp(v, 0, 1);
    if (this.master && !this.muted) this.master.gain.value = this.baseGain();
  },
  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : this.baseGain();
    return this.muted;
  },

  noise() {
    if (!this._noiseBuf) {
      const len = this.ctx.sampleRate * 1;
      this._noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this._noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    const src = this.ctx.createBufferSource();
    src.buffer = this._noiseBuf;
    return src;
  },

  // общ хеликоптер: осцилатор/шум + плик + филтър
  hit(o) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(o.vol || 0.2, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + (o.dur || 0.2));
    let node;
    if (o.noise) {
      node = this.noise();
      const f = this.ctx.createBiquadFilter();
      f.type = o.ftype || 'lowpass';
      f.frequency.setValueAtTime(o.f || 1200, t0);
      if (o.f1) f.frequency.exponentialRampToValueAtTime(o.f1, t0 + (o.dur || 0.2));
      node.connect(f); f.connect(g);
    } else {
      node = this.ctx.createOscillator();
      node.type = o.type || 'square';
      node.frequency.setValueAtTime(o.f || 440, t0);
      if (o.f1) node.frequency.exponentialRampToValueAtTime(Math.max(20, o.f1), t0 + (o.dur || 0.2));
      node.connect(g);
    }
    g.connect(this.master);
    node.start(t0);
    node.stop(t0 + (o.dur || 0.2) + 0.05);
  },

  play(name) {
    if (!this.ctx || this.muted) return;
    switch (name) {
      case 'swing': this.hit({ noise: true, f: 2400, f1: 400, dur: 0.12, vol: 0.12, ftype: 'bandpass' }); break;
      case 'hit': this.hit({ noise: true, f: 900, f1: 200, dur: 0.14, vol: 0.22 }); this.hit({ f: 220, f1: 90, dur: 0.1, vol: 0.12, type: 'square' }); break;
      case 'crit': this.hit({ noise: true, f: 1400, f1: 250, dur: 0.2, vol: 0.26 }); this.hit({ f: 520, f1: 130, dur: 0.16, vol: 0.16, type: 'sawtooth' }); break;
      case 'hurt': this.hit({ f: 180, f1: 60, dur: 0.25, vol: 0.24, type: 'sawtooth' }); this.hit({ noise: true, f: 600, f1: 150, dur: 0.18, vol: 0.14 }); break;
      case 'die': this.hit({ noise: true, f: 800, f1: 60, dur: 0.45, vol: 0.24 }); this.hit({ f: 140, f1: 30, dur: 0.4, vol: 0.18, type: 'triangle' }); break;
      case 'coin': this.hit({ f: 1050, dur: 0.06, vol: 0.1, type: 'square' }); setTimeout(() => this.hit({ f: 1500, dur: 0.12, vol: 0.1, type: 'square' }), 55); break;
      case 'potion': this.hit({ f: 300, f1: 700, dur: 0.18, vol: 0.14, type: 'sine' }); setTimeout(() => this.hit({ f: 500, f1: 900, dur: 0.14, vol: 0.1, type: 'sine' }), 90); break;
      case 'fire': this.hit({ noise: true, f: 2000, f1: 300, dur: 0.3, vol: 0.16 }); this.hit({ f: 300, f1: 90, dur: 0.28, vol: 0.1, type: 'sawtooth' }); break;
      case 'boom': this.hit({ noise: true, f: 500, f1: 50, dur: 0.5, vol: 0.3 }); this.hit({ f: 90, f1: 30, dur: 0.45, vol: 0.24, type: 'sine' }); break;
      case 'dash': this.hit({ noise: true, f: 3000, f1: 800, dur: 0.14, vol: 0.1, ftype: 'highpass' }); break;
      case 'level': [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this.hit({ f, dur: 0.22, vol: 0.14, type: 'triangle' }), i * 90)); break;
      case 'open': this.hit({ f: 160, f1: 240, dur: 0.15, vol: 0.14, type: 'square' }); setTimeout(() => this.hit({ f: 900, dur: 0.1, vol: 0.08, type: 'square' }), 120); break;
      case 'stairs': [440, 349, 262].forEach((f, i) => setTimeout(() => this.hit({ f, dur: 0.25, vol: 0.12, type: 'triangle' }), i * 140)); break;
      case 'pickup': this.hit({ f: 700, f1: 1100, dur: 0.1, vol: 0.1, type: 'square' }); break;
      case 'roar': this.hit({ f: 110, f1: 45, dur: 0.8, vol: 0.3, type: 'sawtooth' }); this.hit({ noise: true, f: 400, f1: 80, dur: 0.7, vol: 0.18 }); break;
      case 'tp': this.hit({ f: 1200, f1: 300, dur: 0.25, vol: 0.1, type: 'sine' }); break;
      case 'thump': this.hit({ f: 65, f1: 35, dur: 0.18, vol: 0.22, type: 'sine' }); break;
      case 'deny': this.hit({ f: 180, dur: 0.12, vol: 0.12, type: 'square' }); break;
    }
  },

  // много семпла тъмна музика: пад-акорд на всеки такт + рядка камбанка
  chord(notes, dur) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime;
    for (const f of notes) {
      const o = this.ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.value = f;
      const o2 = this.ctx.createOscillator();
      o2.type = 'triangle';
      o2.frequency.value = f * 1.005;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(0.05, t0 + 0.6);
      g.gain.linearRampToValueAtTime(0.0001, t0 + dur);
      const fl = this.ctx.createBiquadFilter();
      fl.type = 'lowpass'; fl.frequency.value = 700;
      o.connect(fl); o2.connect(fl); fl.connect(g); g.connect(this.musicGain);
      o.start(t0); o.stop(t0 + dur + 0.1);
      o2.start(t0); o2.stop(t0 + dur + 0.1);
    }
  },
  bell(f) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    o.type = 'sine'; o.frequency.value = f;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.06, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.6);
    o.connect(g); g.connect(this.musicGain);
    o.start(t0); o.stop(t0 + 1.7);
  },

  updateMusic(dt, inGame) {
    if (!this.ctx || this.muted) return;
    this._musicTimer -= dt;
    if (this._musicTimer <= 0) {
      this._musicTimer = 3.6;
      const A = 110, C = 130.8, D = 146.8, E = 164.8, F = 174.6, G_ = 196;
      const prog = [[A, C, E], [F, A, C], [D, F, A], [E, G_ * 0.5 ? 98 : 98, 123.5]];
      const ch = prog[this._bar % 4];
      this.chord(ch, 3.8);
      if (inGame && Math.random() < 0.45) {
        setTimeout(() => this.bell(pick([440, 523, 587, 659, 880])), Math.random() * 2000);
      }
      this._bar++;
    }
  },
};
