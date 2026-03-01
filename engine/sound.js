/**
 * SAMURAI USAGI — SOUND & MUSIC ENGINE
 * ======================================
 * Procedural audio via Web Audio API. No audio files needed.
 * Generates chiptune/JRPG-style music and SFX from oscillators.
 *
 * Musical philosophy:
 *   - Each era has its own scale and instrument palette
 *   - Book Zero (Japan 1587): pentatonic, shakuhachi-like tones
 *   - Liturgical seasons shift musical mood per act
 *   - Sacred sites have distinct reverberant quality
 *   - Battle music intensifies with enemy tier
 *   - Miracles have unique audio signatures
 */

export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.ambientGain = null;
    this.initialized = false;
    this.muted = false;
    this.musicVolume = 0.3;
    this.sfxVolume = 0.5;
    this.ambientVolume = 0.15;

    // Current music state
    this.currentBGM = null;
    this.bgmLoop = null;
    this.bgmTempo = 120;
    this.bgmPlaying = false;

    // Ambient layers
    this.ambientLayers = [];

    // Music scales per era
    this.scales = {
      'book-00': {
        // Japanese pentatonic (In scale) — melancholic, devotional
        exploration: [261.63, 293.66, 311.13, 392.00, 440.00, 523.25], // C D Eb G A C
        battle:      [261.63, 311.13, 349.23, 392.00, 466.16, 523.25], // C Eb F G Bb C (blues-ish urgency)
        sacred:      [261.63, 293.66, 392.00, 440.00, 523.25],          // C D G A C (open, reverent)
        tension:     [261.63, 277.18, 311.13, 369.99, 415.30],          // C Db Eb Gb Ab (dissonant, fear)
        sorrow:      [220.00, 246.94, 261.63, 329.63, 369.99],          // A B C E Gb (grief)
      },
    };

    // Instrument timbres (oscillator configs)
    this.timbres = {
      shakuhachi: { type: 'sine', attack: 0.1, decay: 0.3, sustain: 0.4, release: 0.5, vibrato: 3, vibratoDepth: 5 },
      koto:       { type: 'triangle', attack: 0.01, decay: 0.4, sustain: 0.1, release: 0.3, vibrato: 0, vibratoDepth: 0 },
      taiko:      { type: 'sine', attack: 0.005, decay: 0.3, sustain: 0, release: 0.2, pitchDrop: 80 },
      bell:       { type: 'sine', attack: 0.01, decay: 0.8, sustain: 0.1, release: 1.0, harmonics: [1, 2.4, 3.6] },
      choir:      { type: 'sine', attack: 0.3, decay: 0.2, sustain: 0.6, release: 0.8, vibrato: 5, vibratoDepth: 3, detune: 5 },
      pulse:      { type: 'square', attack: 0.01, decay: 0.1, sustain: 0.3, release: 0.1, vibrato: 0, vibratoDepth: 0 },
    };
  }

  init() {
    if (this.initialized) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.connect(this.ctx.destination);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = this.musicVolume;
      this.musicGain.connect(this.masterGain);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = this.sfxVolume;
      this.sfxGain.connect(this.masterGain);

      this.ambientGain = this.ctx.createGain();
      this.ambientGain.gain.value = this.ambientVolume;
      this.ambientGain.connect(this.masterGain);

      this.initialized = true;
    } catch (e) {
      console.warn('Web Audio not available:', e);
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  setMusicVolume(v) { this.musicVolume = v; if (this.musicGain) this.musicGain.gain.value = v; }
  setSFXVolume(v)   { this.sfxVolume = v; if (this.sfxGain) this.sfxGain.gain.value = v; }
  setMuted(m)       { this.muted = m; if (this.masterGain) this.masterGain.gain.value = m ? 0 : 1; }

  // ── Note player ──────────────────────────────────────────

  _playNote(freq, timbre, duration, destination, startTime) {
    if (!this.ctx || this.muted) return;
    const t = this.timbres[timbre] || this.timbres.pulse;
    const now = startTime || this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();

    osc.type = t.type;
    osc.frequency.value = freq;

    // Vibrato
    if (t.vibrato && t.vibratoDepth) {
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      lfo.frequency.value = t.vibrato;
      lfoGain.gain.value = t.vibratoDepth;
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      lfo.start(now);
      lfo.stop(now + duration + t.release);
    }

    // Detune for choir effect
    if (t.detune) osc.detune.value = (Math.random() - 0.5) * t.detune * 2;

    // Pitch drop for percussion
    if (t.pitchDrop) {
      osc.frequency.setValueAtTime(freq + t.pitchDrop, now);
      osc.frequency.exponentialRampToValueAtTime(freq, now + 0.1);
    }

    // ADSR envelope
    env.gain.setValueAtTime(0.001, now);
    env.gain.linearRampToValueAtTime(0.3, now + t.attack);
    env.gain.linearRampToValueAtTime(0.3 * t.sustain, now + t.attack + t.decay);
    env.gain.setValueAtTime(0.3 * t.sustain, now + duration);
    env.gain.linearRampToValueAtTime(0.001, now + duration + t.release);

    osc.connect(env);
    env.connect(destination || this.musicGain);
    osc.start(now);
    osc.stop(now + duration + t.release + 0.1);

    // Harmonics for bell-like sounds
    if (t.harmonics) {
      for (const h of t.harmonics) {
        const hOsc = this.ctx.createOscillator();
        const hEnv = this.ctx.createGain();
        hOsc.type = 'sine';
        hOsc.frequency.value = freq * h;
        hEnv.gain.setValueAtTime(0.001, now);
        hEnv.gain.linearRampToValueAtTime(0.1 / h, now + t.attack);
        hEnv.gain.linearRampToValueAtTime(0.001, now + duration + t.release);
        hOsc.connect(hEnv);
        hEnv.connect(destination || this.musicGain);
        hOsc.start(now);
        hOsc.stop(now + duration + t.release + 0.1);
      }
    }
  }

  // ── BGM System ───────────────────────────────────────────

  /**
   * Start procedural BGM.
   * @param {string} mood - 'exploration', 'battle', 'sacred', 'tension', 'sorrow', 'boss', 'accuser'
   * @param {string} era - 'book-00'
   */
  startBGM(mood, era = 'book-00') {
    this.stopBGM();
    if (!this.ctx || this.muted) return;

    this.bgmPlaying = true;
    this.currentBGM = mood;

    const tempoMap = {
      exploration: 90, battle: 140, sacred: 60,
      tension: 100, sorrow: 70, boss: 160, accuser: 80,
    };
    this.bgmTempo = tempoMap[mood] || 100;

    const scale = this.scales[era]?.[mood] || this.scales[era]?.exploration || [261.63, 293.66, 329.63, 392.00, 440.00];

    this._bgmLoop(mood, scale, era);
  }

  _bgmLoop(mood, scale, era) {
    if (!this.bgmPlaying) return;

    const beatDuration = 60 / this.bgmTempo;
    const barLength = 4;
    const barDuration = beatDuration * barLength;

    switch (mood) {
      case 'exploration':
        this._genExplorationBar(scale, beatDuration);
        break;
      case 'battle':
        this._genBattleBar(scale, beatDuration);
        break;
      case 'sacred':
        this._genSacredBar(scale, beatDuration);
        break;
      case 'tension':
        this._genTensionBar(scale, beatDuration);
        break;
      case 'sorrow':
        this._genSorrowBar(scale, beatDuration);
        break;
      case 'boss':
        this._genBossBar(scale, beatDuration);
        break;
      case 'accuser':
        this._genAccuserBar(scale, beatDuration);
        break;
    }

    this.bgmLoop = setTimeout(() => this._bgmLoop(mood, scale, era), barDuration * 1000);
  }

  _genExplorationBar(scale, beat) {
    const now = this.ctx.currentTime;
    // Shakuhachi melody — sparse, pentatonic, breathing
    const melody = [0, -1, 2, -1, 1, -1, 3, 2]; // -1 = rest
    for (let i = 0; i < melody.length; i++) {
      if (melody[i] >= 0) {
        const note = scale[melody[i] % scale.length];
        this._playNote(note, 'shakuhachi', beat * 0.8, this.musicGain, now + i * beat * 0.5);
      }
    }
    // Soft koto drone on root
    this._playNote(scale[0] * 0.5, 'koto', beat * 3, this.musicGain, now);
  }

  _genBattleBar(scale, beat) {
    const now = this.ctx.currentTime;
    // Taiko rhythm
    for (let i = 0; i < 4; i++) {
      this._playNote(80, 'taiko', beat * 0.3, this.musicGain, now + i * beat);
      if (i === 1 || i === 3) {
        this._playNote(120, 'taiko', beat * 0.2, this.musicGain, now + i * beat + beat * 0.5);
      }
    }
    // Aggressive pulse melody
    const notes = [0, 2, 1, 3, 4, 2, 3, 1];
    for (let i = 0; i < notes.length; i++) {
      this._playNote(scale[notes[i] % scale.length], 'pulse', beat * 0.3, this.musicGain, now + i * beat * 0.5);
    }
  }

  _genSacredBar(scale, beat) {
    const now = this.ctx.currentTime;
    // Choir pads — long, reverberant
    const chord = [0, 2, 4];
    for (const deg of chord) {
      this._playNote(scale[deg % scale.length] * 0.5, 'choir', beat * 3.5, this.musicGain, now);
    }
    // Bell — single, clear
    this._playNote(scale[0], 'bell', beat * 2, this.musicGain, now + beat * 2);
  }

  _genTensionBar(scale, beat) {
    const now = this.ctx.currentTime;
    // Low pulse drone
    this._playNote(scale[0] * 0.5, 'pulse', beat * 3.8, this.musicGain, now);
    // Dissonant stabs
    for (let i = 0; i < 3; i++) {
      const t = now + beat * (1 + i * 1.2) + Math.random() * beat * 0.3;
      this._playNote(scale[Math.floor(Math.random() * scale.length)], 'koto', beat * 0.2, this.musicGain, t);
    }
  }

  _genSorrowBar(scale, beat) {
    const now = this.ctx.currentTime;
    // Slow shakuhachi with long sustain
    const melody = [0, 2, 1, 4];
    for (let i = 0; i < melody.length; i++) {
      this._playNote(scale[melody[i] % scale.length], 'shakuhachi', beat * 1.8, this.musicGain, now + i * beat);
    }
  }

  _genBossBar(scale, beat) {
    const now = this.ctx.currentTime;
    // Fast taiko
    for (let i = 0; i < 8; i++) {
      this._playNote(80 + (i % 2) * 40, 'taiko', beat * 0.15, this.musicGain, now + i * beat * 0.5);
    }
    // Aggressive scale runs
    for (let i = 0; i < 6; i++) {
      this._playNote(scale[i % scale.length] * (i < 3 ? 1 : 2), 'pulse', beat * 0.2, this.musicGain, now + i * beat * 0.3 + beat);
    }
  }

  _genAccuserBar(scale, beat) {
    const now = this.ctx.currentTime;
    // Low choir drone — oppressive
    this._playNote(130.81, 'choir', beat * 3.8, this.musicGain, now); // Low C
    this._playNote(138.59, 'choir', beat * 3.8, this.musicGain, now); // Db — dissonant with C
    // Sparse bell — like a funeral
    this._playNote(523.25, 'bell', beat * 1.5, this.musicGain, now + beat * 2);
  }

  stopBGM() {
    this.bgmPlaying = false;
    if (this.bgmLoop) { clearTimeout(this.bgmLoop); this.bgmLoop = null; }
    this.currentBGM = null;
  }

  // ── SFX System ───────────────────────────────────────────

  playSFX(sfxId) {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;

    switch (sfxId) {
      case 'attack':
        this._playNote(200, 'taiko', 0.1, this.sfxGain, now);
        this._playNote(150, 'taiko', 0.08, this.sfxGain, now + 0.05);
        break;
      case 'hit':
        this._playNote(100, 'taiko', 0.15, this.sfxGain, now);
        break;
      case 'critical':
        this._playNote(250, 'taiko', 0.08, this.sfxGain, now);
        this._playNote(200, 'taiko', 0.1, this.sfxGain, now + 0.05);
        this._playNote(150, 'taiko', 0.12, this.sfxGain, now + 0.1);
        break;
      case 'heal':
        this._playNote(523.25, 'bell', 0.4, this.sfxGain, now);
        this._playNote(659.25, 'bell', 0.3, this.sfxGain, now + 0.15);
        break;
      case 'prayer':
        this._playNote(440, 'choir', 0.8, this.sfxGain, now);
        this._playNote(523.25, 'choir', 0.6, this.sfxGain, now + 0.3);
        this._playNote(659.25, 'choir', 0.5, this.sfxGain, now + 0.6);
        break;
      case 'holy_damage':
        this._playNote(880, 'bell', 0.3, this.sfxGain, now);
        this._playNote(1046.50, 'bell', 0.4, this.sfxGain, now + 0.1);
        break;
      case 'level_up':
        for (let i = 0; i < 6; i++) {
          this._playNote(261.63 * Math.pow(2, i / 6), 'bell', 0.3, this.sfxGain, now + i * 0.12);
        }
        break;
      case 'defeat':
        this._playNote(220, 'shakuhachi', 1.5, this.sfxGain, now);
        this._playNote(196, 'shakuhachi', 1.2, this.sfxGain, now + 0.5);
        break;
      case 'menu_select':
        this._playNote(880, 'koto', 0.08, this.sfxGain, now);
        break;
      case 'menu_confirm':
        this._playNote(880, 'koto', 0.06, this.sfxGain, now);
        this._playNote(1046.50, 'koto', 0.08, this.sfxGain, now + 0.06);
        break;
      case 'menu_cancel':
        this._playNote(440, 'koto', 0.1, this.sfxGain, now);
        this._playNote(349.23, 'koto', 0.1, this.sfxGain, now + 0.06);
        break;
      case 'item_get':
        this._playNote(523.25, 'koto', 0.15, this.sfxGain, now);
        this._playNote(659.25, 'koto', 0.15, this.sfxGain, now + 0.1);
        this._playNote(783.99, 'koto', 0.2, this.sfxGain, now + 0.2);
        break;
      case 'status_inflict':
        this._playNote(180, 'pulse', 0.3, this.sfxGain, now);
        this._playNote(160, 'pulse', 0.3, this.sfxGain, now + 0.15);
        break;
      case 'accuser_whisper':
        this._playNote(130.81, 'choir', 1.2, this.sfxGain, now);
        this._playNote(123.47, 'choir', 1.0, this.sfxGain, now + 0.3);
        break;
      case 'memorare':
        // The most dramatic SFX — ascending choir
        for (let i = 0; i < 8; i++) {
          const freq = 261.63 * Math.pow(2, i / 8);
          this._playNote(freq, 'choir', 0.6, this.sfxGain, now + i * 0.25);
        }
        this._playNote(1046.50, 'bell', 1.5, this.sfxGain, now + 2);
        break;
      case 'save':
        this._playNote(523.25, 'bell', 0.5, this.sfxGain, now);
        this._playNote(659.25, 'bell', 0.5, this.sfxGain, now + 0.3);
        break;
      case 'blessing':
        this._playNote(440, 'choir', 0.8, this.sfxGain, now);
        this._playNote(523.25, 'bell', 0.6, this.sfxGain, now + 0.4);
        this._playNote(659.25, 'bell', 0.4, this.sfxGain, now + 0.8);
        break;
    }
  }

  // ── Ambient ──────────────────────────────────────────────

  startAmbient(areaType) {
    this.stopAmbient();
    if (!this.ctx || this.muted) return;

    // Ambient uses filtered noise and low drones
    switch (areaType) {
      case 'forest':
        this._startWindAmbient(0.08);
        break;
      case 'mountain':
        this._startWindAmbient(0.12);
        break;
      case 'coast':
        this._startWaveAmbient();
        break;
      case 'fire':
        this._startFireAmbient();
        break;
      case 'sacred':
        this._startSacredAmbient();
        break;
    }
  }

  _startWindAmbient(intensity) {
    // Brown noise approximation via filtered oscillator
    const bufferSize = 4096;
    const processor = this.ctx.createScriptProcessor(bufferSize, 1, 1);
    let lastOut = 0;
    processor.onaudioprocess = (e) => {
      const output = e.outputBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        output[i] = (lastOut + (0.02 * white)) / 1.02;
        lastOut = output[i];
        output[i] *= intensity;
      }
    };
    processor.connect(this.ambientGain);
    this.ambientLayers.push(processor);
  }

  _startWaveAmbient() {
    this._startWindAmbient(0.06);
    // Low periodic swell
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 65;
    lfo.frequency.value = 0.1;
    lfoGain.gain.value = 0.05;
    lfo.connect(lfoGain);
    lfoGain.connect(env.gain);
    env.gain.value = 0.03;
    osc.connect(env);
    env.connect(this.ambientGain);
    osc.start(); lfo.start();
    this.ambientLayers.push(osc, lfo);
  }

  _startFireAmbient() {
    // Crackling — rapid random noise bursts
    const bufferSize = 4096;
    const processor = this.ctx.createScriptProcessor(bufferSize, 1, 1);
    processor.onaudioprocess = (e) => {
      const output = e.outputBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() < 0.02 ? (Math.random() - 0.5) * 0.3 : 0;
      }
    };
    processor.connect(this.ambientGain);
    this.ambientLayers.push(processor);
  }

  _startSacredAmbient() {
    // Very low, very soft choir drone
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 130.81; // Low C
    env.gain.value = 0.03;
    osc.connect(env);
    env.connect(this.ambientGain);
    osc.start();
    this.ambientLayers.push(osc);
  }

  stopAmbient() {
    for (const node of this.ambientLayers) {
      try { node.disconnect(); } catch (e) {}
      try { node.stop?.(); } catch (e) {}
    }
    this.ambientLayers = [];
  }

  /** Clean shutdown */
  destroy() {
    this.stopBGM();
    this.stopAmbient();
    if (this.ctx) this.ctx.close();
  }
}
