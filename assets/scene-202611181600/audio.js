// Suono della scena con la Web Audio API: niente file audio.
// Un sottofondo leggero solo se l'utente sceglie "Suono si'"; ogni synth ha la sua frase.
//
// Il sottofondo e' musica generativa, non un accordo tenuto: sette note morbide, ognuna con un suo
// periodo (tutti diversi, fra 17 e 35 secondi), cosi' gli incontri fra le note non si ripetono mai uguali;
// sotto, un fondo appena udibile che ogni venti secondi cambia accordo. Niente frequenze gravi e niente rumore.

// Note (Re maggiore pentatonico): frequenza, periodo in secondi, primo ingresso, posizione stereo
const LOOPS = [
  [220.00, 19.7, 9.0, -0.15],   // La3
  [293.66, 23.3, 2.0, 0.35],    // Re4
  [329.63, 26.9, 6.5, -0.5],    // Mi4
  [369.99, 31.1, 13.0, 0.1],    // Fa#4
  [440.00, 17.3, 4.0, 0.55],    // La4
  [493.88, 28.1, 17.0, -0.35],  // Si4
  [587.33, 34.7, 11.0, 0.2],    // Re5
];
// Fondo: quattro accordi di due note che si danno il cambio (Re, Si minore, Sol, La)
const CHORDS = [[293.66, 440.0], [246.94, 369.99], [196.0, 293.66], [220.0, 329.63]];
const CHORD_EVERY = 20, CHORD_LEN = 27;

const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

export class SceneAudio {
  constructor() {
    this.ctx = null;
    this.enabled = false;
    this.visible = true;
    this.ambience = null;
  }

  // given: un contesto gia' pronto (serve alle prove con OfflineAudioContext)
  init(given = null) {
    if (this.ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!given && !AC) return false;
    const ctx = (this.ctx = given || new AC());
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18; comp.ratio.value = 4;
    this.master = ctx.createGain();
    this.master.gain.value = 0.0001;
    this.master.connect(comp).connect(ctx.destination);
    // riverbero corto sintetico (impulso di rumore che decade), per la stanza
    const len = ctx.sampleRate * 1.6;
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    }
    this.verb = ctx.createConvolver();
    this.verb.buffer = ir;
    this.verbGain = ctx.createGain();
    this.verbGain.gain.value = 0.25;
    this.verb.connect(this.verbGain).connect(this.master);
    this.bus = ctx.createGain();
    this.bus.connect(this.master);
    this.bus.connect(this.verb);
    this.noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const n = this.noise.getChannelData(0);
    for (let i = 0; i < n.length; i++) n[i] = Math.random() * 2 - 1;
    return true;
  }

  setEnabled(on) {
    this.enabled = on;
    if (on) {
      if (!this.init()) return;
      if (this.ctx.state === "suspended" && this.visible) this.ctx.resume();
      if (!this.ambience) this.ambience = this.startAmbience();
      this.fade(0.9);
    } else if (this.ctx) {
      this.fade(0.0001);
      clearTimeout(this.suspendTimer);
      this.suspendTimer = setTimeout(() => { if (!this.enabled) this.ctx.suspend(); }, 400);
    }
  }

  // la scheda non e' visibile o la scena e' nascosta: l'audio si ferma
  setVisible(v) {
    this.visible = v;
    if (!this.ctx) return;
    if (!v) this.ctx.suspend();
    else if (this.enabled) this.ctx.resume();
  }

  fade(to) {
    const g = this.master.gain, t = this.ctx.currentTime;
    g.cancelScheduledValues(t);
    g.setValueAtTime(Math.max(g.value, 0.0001), t);
    g.exponentialRampToValueAtTime(to, t + 0.35);
  }

  // --- sottofondo generativo (vedi in testa al file). offline: secondi da scrivere subito, per le prove ---
  startAmbience({ offline = 0 } = {}) {
    const ctx = this.ctx, t = ctx.currentTime;
    const out = ctx.createGain();
    out.gain.setValueAtTime(0.0001, t);
    out.gain.exponentialRampToValueAtTime(0.4, t + 4);
    out.connect(this.master);
    // riverbero lungo e scuro, solo per il sottofondo: e' la coda delle note a riempire i silenzi
    const len = Math.floor(ctx.sampleRate * 4.2);
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      let lp = 0;
      for (let i = 0; i < len; i++) {
        lp += (Math.random() * 2 - 1 - lp) * 0.3;
        d[i] = lp * Math.pow(1 - i / len, 2.4);
      }
    }
    const hall = ctx.createConvolver();
    hall.buffer = ir;
    const wet = ctx.createGain();
    wet.gain.value = 0.55;
    hall.connect(wet).connect(out);
    const notes = ctx.createGain();
    notes.connect(out);
    notes.connect(hall);
    const padLp = ctx.createBiquadFilter();
    padLp.type = "lowpass"; padLp.frequency.value = 1100; padLp.Q.value = 0.5;
    const pad = ctx.createGain();
    pad.connect(padLp).connect(out);
    padLp.connect(hall);
    this.amb = { notes, pad, t0: t + 0.3, until: t };
    if (offline) this.scheduleAmbience(t, t + offline);
    else {
      this.pumpAmbience();
      this.ambTimer = setInterval(() => this.pumpAmbience(), 2000);
    }
    return out;
  }

  // prepara gli eventi dei prossimi secondi (se l'audio e' in pausa il tempo e' fermo e non si accumula nulla)
  pumpAmbience() {
    if (this.ctx.state !== "running") return;
    this.scheduleAmbience(this.amb.until, this.ctx.currentTime + 8);
  }

  scheduleAmbience(from, to) {
    const A = this.amb;
    from = Math.max(from, this.ctx.currentTime); // niente eventi nel passato: suonerebbero tutti insieme
    if (to <= from) return;
    for (const [freq, period, first, pan] of LOOPS) {
      for (let k = Math.max(0, Math.ceil((from - A.t0 - first) / period)); A.t0 + first + k * period < to; k++) {
        const r = Math.random();
        if (r < 0.1) continue;                                   // ogni tanto una nota manca
        const high = r > 0.86;                                   // ogni tanto suona un'ottava sopra, piu' piano
        this.softNote(A.t0 + first + k * period, high ? freq * 2 : freq, (high ? 0.45 : 0.7) + Math.random() * 0.3, pan);
      }
    }
    for (let i = Math.max(0, Math.ceil((from - A.t0) / CHORD_EVERY)); A.t0 + i * CHORD_EVERY < to; i++) {
      this.padChord(A.t0 + i * CHORD_EVERY, CHORDS[i % CHORDS.length]);
    }
    A.until = to;
  }

  // nota morbida, tra il piano elettrico e una goccia: attacco dolce, coda lunga, armoniche che si spengono presto
  softNote(t, freq, vel, pan) {
    const ctx = this.ctx, dur = 6;
    const g = ctx.createGain(), p = ctx.createStereoPanner();
    p.pan.value = pan;
    const peak = 0.2 * vel;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.04);
    g.gain.exponentialRampToValueAtTime(peak * 0.32, t + 0.7);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    for (const [mult, amp] of [[1, 1], [2, 0.2], [3, 0.05]]) {
      const o = ctx.createOscillator(), og = ctx.createGain();
      o.frequency.value = freq * mult;
      o.detune.value = (Math.random() - 0.5) * 8;
      og.gain.setValueAtTime(amp, t);
      if (mult > 1) og.gain.exponentialRampToValueAtTime(amp * 0.04, t + 1.1);
      o.connect(og).connect(g);
      o.start(t); o.stop(t + dur + 0.1);
    }
    g.connect(p).connect(this.amb.notes);
  }

  // accordo del fondo: entra in nove secondi, resta, esce mentre entra il successivo
  padChord(t, freqs) {
    const ctx = this.ctx, g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(1, t + 9);
    g.gain.setValueAtTime(1, t + 15);
    g.gain.linearRampToValueAtTime(0, t + CHORD_LEN);
    for (const f of freqs) for (const det of [-4, 4]) {
      const o = ctx.createOscillator(), og = ctx.createGain();
      o.frequency.value = f; o.detune.value = det;                // due voci appena scordate: il suono si muove piano
      og.gain.value = 0.02;
      o.connect(og).connect(g);
      o.start(t); o.stop(t + CHORD_LEN + 0.1);
    }
    g.connect(this.amb.pad);
  }

  // --- frasi degli strumenti ---
  playSynth(slug) {
    if (!this.enabled || !this.init()) return;
    if (this.ctx.state === "suspended") this.ctx.resume();
    const t = this.ctx.currentTime + 0.05;
    ({ ichosynth: () => this.stepPattern(t), "ichosynth-mini": () => this.granular(t), "open-orc": () => this.chord(t), stame: () => this.drone(t) }[slug] || (() => {}))();
  }

  env(g, t, a, peak, d) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }

  // Ichosynth: pattern a step percussivo (come il sequencer della home Lo-Fi)
  stepPattern(t0) {
    const ctx = this.ctx, step = 60 / 118 / 4;
    const kick = [0, 4, 8, 11, 12], hat = [2, 6, 10, 14, 15], blip = [0, 3, 7, 10, 13];
    const notes = [57, 60, 64, 62, 67];
    for (let i = 0; i < 16; i++) {
      const t = t0 + i * step;
      if (kick.includes(i)) {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
        this.env(g, t, 0.003, 0.9, 0.3);
        o.connect(g).connect(this.bus); o.start(t); o.stop(t + 0.35);
      }
      if (hat.includes(i)) {
        const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
        s.buffer = this.noise; f.type = "highpass"; f.frequency.value = 7000;
        this.env(g, t, 0.002, 0.25, 0.05);
        s.connect(f).connect(g).connect(this.bus); s.start(t, Math.random()); s.stop(t + 0.08);
      }
      const bi = blip.indexOf(i);
      if (bi >= 0) {
        const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
        o.type = "square"; o.frequency.value = midi(notes[bi]);
        f.type = "lowpass"; f.Q.value = 8;
        f.frequency.setValueAtTime(3200, t); f.frequency.exponentialRampToValueAtTime(400, t + 0.15);
        this.env(g, t, 0.004, 0.12, 0.16);
        o.connect(f).connect(g).connect(this.bus); o.start(t); o.stop(t + 0.2);
      }
    }
  }

  // Ichosynth Mini: un campione (qui generato) suonato a grani
  granular(t0) {
    const ctx = this.ctx, sr = ctx.sampleRate, len = sr * 0.8;
    if (!this.sample) {
      // "campione": accordo vocale con formanti e un po' di fruscio, come registrato da un microfono
      this.sample = ctx.createBuffer(1, len, sr);
      const d = this.sample.getChannelData(0);
      const fs = [220, 277.2, 329.6, 440];
      for (let i = 0; i < len; i++) {
        const tt = i / sr;
        let v = 0;
        for (const f of fs) v += Math.sin(2 * Math.PI * f * tt + Math.sin(2 * Math.PI * 5 * tt) * 0.6) * 0.22;
        v += (Math.random() * 2 - 1) * 0.04;
        d[i] = v * Math.min(1, tt * 20) * Math.exp(-tt * 1.5);
      }
    }
    for (let i = 0; i < 46; i++) {
      const t = t0 + i * 0.045 + Math.random() * 0.02;
      const s = ctx.createBufferSource(), g = ctx.createGain(), p = ctx.createStereoPanner();
      s.buffer = this.sample;
      s.playbackRate.value = [1, 1.5, 0.75, 2][Math.floor(Math.random() * 4)] * (1 + (Math.random() - 0.5) * 0.01);
      p.pan.value = Math.random() * 1.6 - 0.8;
      const dur = 0.06 + Math.random() * 0.08;
      const fadeOut = 1 - i / 46;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.18 * fadeOut + 0.03, t + dur / 2);
      g.gain.linearRampToValueAtTime(0, t + dur);
      s.connect(g).connect(p).connect(this.bus);
      s.start(t, Math.random() * 0.6, dur);
    }
  }

  // Open-Orc: un accordo pieno con il basso
  chord(t0) {
    const ctx = this.ctx;
    const voices = [[48, "triangle", 0.22], [60, "sawtooth", 0.07], [64, "sawtooth", 0.07], [67, "sawtooth", 0.07], [71, "sawtooth", 0.06], [74, "sawtooth", 0.05]];
    const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.Q.value = 2;
    f.frequency.setValueAtTime(600, t0); f.frequency.exponentialRampToValueAtTime(2600, t0 + 0.4); f.frequency.exponentialRampToValueAtTime(900, t0 + 2.4);
    f.connect(this.bus);
    voices.forEach(([n, type, a], i) => {
      for (const det of [-6, 6]) {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = type; o.frequency.value = midi(n); o.detune.value = det;
        const t = t0 + i * 0.025;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(a, t + 0.03);
        g.gain.exponentialRampToValueAtTime(a * 0.6, t + 0.6);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 2.6);
        o.connect(g).connect(f); o.start(t); o.stop(t + 2.7);
      }
    });
  }

  // Stame: un bordone che si apre piano
  drone(t0) {
    const ctx = this.ctx, dur = 4.2;
    const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.Q.value = 6;
    f.frequency.setValueAtTime(180, t0);
    f.frequency.exponentialRampToValueAtTime(2400, t0 + 2.4);
    f.frequency.exponentialRampToValueAtTime(260, t0 + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.28, t0 + 1.2);
    g.gain.setValueAtTime(0.28, t0 + 2.6);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    f.connect(g).connect(this.bus);
    const lfo = ctx.createOscillator(), ld = ctx.createGain();
    lfo.frequency.value = 0.35; ld.gain.value = 9;
    lfo.connect(ld); lfo.start(t0); lfo.stop(t0 + dur);
    for (const [n, det] of [[33, -7], [33, 7], [45, 0], [52, 4], [57, -3]]) {
      const o = ctx.createOscillator();
      o.type = "sawtooth"; o.frequency.value = midi(n); o.detune.value = det;
      ld.connect(o.detune);
      const vg = ctx.createGain(); vg.gain.value = n < 40 ? 0.3 : 0.16;
      o.connect(vg).connect(f); o.start(t0); o.stop(t0 + dur + 0.1);
    }
  }
}
