import type { WorldId } from '../levels/worlds';
import { loadSettings, onSettingsChange, type GameSettings } from './Settings';

/**
 * All audio is synthesised with the Web Audio API — no sound files needed.
 * Structure: sfx bus + music bus → master → destination.
 * Replace `playSfx` bodies with sample playback later if you add real assets.
 */

export type SfxName =
  | 'jump'
  | 'doubleJump'
  | 'wallJump'
  | 'land'
  | 'dash'
  | 'death'
  | 'checkpoint'
  | 'key'
  | 'relic'
  | 'switch'
  | 'stomp'
  | 'kick'
  | 'bossHit'
  | 'bossDefeated'
  | 'spring'
  | 'break'
  | 'door'
  | 'gate'
  | 'crumble'
  | 'goal'
  | 'ui'
  | 'uiConfirm'
  | 'shadow';

interface MusicTheme {
  root: number; // MIDI note
  scale: number[];
  tempo: number; // beats per minute
  pad: OscillatorType;
  lead: OscillatorType;
  pattern: (number | null)[]; // scale degrees, null = rest
  bassEvery: number;
}

const THEMES: Record<WorldId, MusicTheme> = {
  'old-town': { root: 57, scale: [0, 2, 3, 5, 7, 8, 10], tempo: 84, pad: 'triangle', lead: 'triangle', pattern: [0, 2, 4, null, 3, 2, 0, null, 4, 5, 4, 2, 3, null, 1, null], bassEvery: 4 },
  graveyard: { root: 55, scale: [0, 2, 3, 5, 7, 8, 11], tempo: 72, pad: 'sine', lead: 'sine', pattern: [0, null, 4, null, 3, null, 2, null, 0, null, 6, null, 4, null, null, null], bassEvery: 8 },
  'dead-woods': { root: 52, scale: [0, 1, 3, 5, 7, 8, 10], tempo: 78, pad: 'sine', lead: 'triangle', pattern: [0, 3, null, 4, null, 3, 1, null, 0, null, 4, 5, null, 4, 3, null], bassEvery: 4 },
  'haunted-manor': { root: 58, scale: [0, 2, 3, 6, 7, 8, 11], tempo: 90, pad: 'triangle', lead: 'sine', pattern: [4, 3, 2, 3, 4, null, 0, null, 5, 4, 3, 4, 5, null, 1, null], bassEvery: 4 },
  catacombs: { root: 48, scale: [0, 1, 3, 5, 6, 8, 10], tempo: 66, pad: 'sawtooth', lead: 'sine', pattern: [0, null, null, 1, null, null, 0, null, 4, null, null, 3, null, null, 1, null], bassEvery: 8 },
  clocktower: { root: 57, scale: [0, 2, 3, 5, 7, 8, 10], tempo: 112, pad: 'triangle', lead: 'square', pattern: [0, 4, 7, 4, 2, 4, 7, 4, 1, 4, 6, 4, 2, 5, 7, 5], bassEvery: 4 },
  'black-castle': { root: 50, scale: [0, 1, 3, 5, 6, 8, 10], tempo: 96, pad: 'sawtooth', lead: 'triangle', pattern: [0, 0, 3, null, 1, null, 0, null, 4, 4, 5, null, 3, null, 1, null], bassEvery: 2 },
};

function midiToFreq(m: number): number {
  return 440 * Math.pow(2, (m - 69) / 12);
}

class AudioSystemImpl {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private music!: GainNode;
  private sfx!: GainNode;
  private noiseBuffer: AudioBuffer | null = null;
  private currentTheme: WorldId | null = null;
  private musicTimer: number | null = null;
  private step = 0;
  private nextTime = 0;
  private padNodes: AudioNode[] = [];
  private settings: GameSettings = loadSettings();

  constructor() {
    onSettingsChange((s) => {
      this.settings = s;
      this.applyVolumes();
    });
  }

  /** Must be called from a user gesture at least once (browser autoplay rules). */
  unlock(): void {
    if (!this.ctx) {
      const Ctor = (globalThis as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext ??
        (globalThis as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.music = this.ctx.createGain();
      this.sfx = this.ctx.createGain();
      this.music.connect(this.master);
      this.sfx.connect(this.master);
      this.master.connect(this.ctx.destination);
      this.applyVolumes();
      const len = this.ctx.sampleRate;
      this.noiseBuffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      if (this.currentTheme) this.startMusic(this.currentTheme, true);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  private applyVolumes(): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.settings.masterVolume, t, 0.05);
    this.music.gain.setTargetAtTime(this.settings.musicVolume * 0.35, t, 0.05);
    this.sfx.gain.setTargetAtTime(this.settings.sfxVolume * 0.6, t, 0.05);
  }

  private tone(freq: number, dur: number, type: OscillatorType, vol: number, slideTo?: number, delay = 0, dest?: AudioNode): void {
    const ctx = this.ctx!;
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(dest ?? this.sfx);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  private noise(dur: number, vol: number, filterFreq: number, type: BiquadFilterType = 'lowpass', delay = 0, sweepTo?: number): void {
    const ctx = this.ctx!;
    if (!this.noiseBuffer) return;
    const t = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(filterFreq, t);
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(this.sfx);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.05);
  }

  playSfx(name: SfxName): void {
    if (!this.ctx || this.ctx.state !== 'running') return;
    switch (name) {
      case 'jump':
        this.tone(300, 0.12, 'square', 0.08, 520);
        break;
      case 'doubleJump':
        this.tone(420, 0.14, 'triangle', 0.12, 780);
        this.noise(0.12, 0.08, 3000, 'highpass');
        break;
      case 'wallJump':
        this.tone(340, 0.1, 'square', 0.07, 600);
        this.noise(0.06, 0.1, 1800);
        break;
      case 'land':
        this.noise(0.08, 0.18, 500);
        break;
      case 'dash':
        this.noise(0.22, 0.25, 600, 'bandpass', 0, 3500);
        break;
      case 'death':
        this.tone(330, 0.5, 'sawtooth', 0.12, 60);
        this.noise(0.4, 0.2, 900);
        break;
      case 'checkpoint':
        [0, 7, 12].forEach((s, i) => this.tone(midiToFreq(72 + s), 0.7, 'sine', 0.12, undefined, i * 0.07));
        break;
      case 'key':
        [0, 4, 7, 12].forEach((s, i) => this.tone(midiToFreq(76 + s), 0.25, 'triangle', 0.1, undefined, i * 0.05));
        break;
      case 'relic':
        [0, 5, 9, 12, 17].forEach((s, i) => this.tone(midiToFreq(79 + s), 0.5, 'sine', 0.09, undefined, i * 0.06));
        break;
      case 'switch':
        this.tone(900, 0.04, 'square', 0.06);
        this.noise(0.05, 0.12, 2500, 'highpass');
        break;
      case 'stomp':
        this.tone(180, 0.12, 'square', 0.12, 60);
        this.noise(0.1, 0.18, 1200);
        break;
      case 'bossHit':
        this.tone(140, 0.25, 'square', 0.14, 50);
        this.noise(0.2, 0.25, 900);
        break;
      case 'bossDefeated':
        [0, 4, 7, 12, 16, 19, 24].forEach((s, i) => this.tone(midiToFreq(60 + s), 0.5, 'square', 0.07, undefined, i * 0.08));
        this.noise(0.5, 0.2, 1800, 'lowpass');
        break;
      case 'kick':
        this.tone(520, 0.08, 'square', 0.1, 260);
        this.noise(0.06, 0.12, 3000, 'highpass');
        break;
      case 'spring':
        this.tone(200, 0.3, 'triangle', 0.14, 900);
        break;
      case 'break':
        this.noise(0.35, 0.35, 1400, 'lowpass', 0, 200);
        break;
      case 'crumble':
        this.noise(0.25, 0.12, 2200, 'bandpass', 0, 400);
        break;
      case 'door':
      case 'gate':
        this.tone(90, 0.5, 'sawtooth', 0.06, 70);
        this.noise(0.5, 0.1, 400);
        break;
      case 'goal':
        [0, 3, 7, 12, 15].forEach((s, i) => this.tone(midiToFreq(62 + s), 1.2, 'triangle', 0.1, undefined, i * 0.09));
        break;
      case 'ui':
        this.tone(660, 0.05, 'triangle', 0.06);
        break;
      case 'uiConfirm':
        this.tone(520, 0.08, 'triangle', 0.08);
        this.tone(780, 0.12, 'triangle', 0.08, undefined, 0.06);
        break;
      case 'shadow':
        this.tone(110, 0.6, 'sawtooth', 0.05, 55);
        this.noise(0.5, 0.08, 300, 'lowpass');
        break;
    }
  }

  // ───────────────────────── music

  startMusic(world: WorldId, force = false): void {
    if (this.currentTheme === world && !force && this.musicTimer !== null) return;
    this.stopMusic();
    this.currentTheme = world;
    if (!this.ctx) return;
    const theme = THEMES[world];
    // drone pad
    const ctx = this.ctx;
    const padGain = ctx.createGain();
    padGain.gain.value = 0.0001;
    padGain.gain.setTargetAtTime(0.22, ctx.currentTime, 1.5);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 700;
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.07;
    lfoGain.gain.value = 250;
    lfo.connect(lfoGain).connect(filter.frequency);
    lfo.start();
    padGain.connect(this.music);
    filter.connect(padGain);
    this.padNodes = [padGain, lfo];
    for (const [semi, detune] of [
      [-12, -6],
      [-12, 6],
      [-5, 0],
    ]) {
      const o = ctx.createOscillator();
      o.type = theme.pad;
      o.frequency.value = midiToFreq(theme.root + semi);
      o.detune.value = detune;
      const g = ctx.createGain();
      g.gain.value = theme.pad === 'sawtooth' ? 0.12 : 0.3;
      o.connect(g).connect(filter);
      o.start();
      this.padNodes.push(o);
    }
    this.step = 0;
    this.nextTime = ctx.currentTime + 0.3;
    this.musicTimer = window.setInterval(() => this.schedule(), 100);
  }

  private schedule(): void {
    if (!this.ctx || !this.currentTheme) return;
    const theme = THEMES[this.currentTheme];
    const beat = 60 / theme.tempo / 2; // eighth notes
    while (this.nextTime < this.ctx.currentTime + 0.4) {
      const deg = theme.pattern[this.step % theme.pattern.length];
      const bar = Math.floor(this.step / theme.pattern.length);
      const delay = this.nextTime - this.ctx.currentTime;
      if (deg !== null) {
        const octave = Math.floor(deg / theme.scale.length);
        const semi = theme.scale[deg % theme.scale.length] + octave * 12 + (bar % 4 === 3 ? -2 : 0);
        this.tone(midiToFreq(theme.root + 12 + semi), beat * 1.8, theme.lead, theme.lead === 'square' ? 0.03 : 0.06, undefined, delay, this.music);
      }
      if (this.step % theme.bassEvery === 0) {
        const bassSemi = [0, 0, 5, 3][bar % 4];
        this.tone(midiToFreq(theme.root - 12 + bassSemi), beat * theme.bassEvery * 0.9, 'sine', 0.12, undefined, delay, this.music);
      }
      this.step++;
      this.nextTime += beat;
    }
  }

  stopMusic(): void {
    if (this.musicTimer !== null) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
    const ctx = this.ctx;
    for (const n of this.padNodes) {
      if (n instanceof GainNode && ctx) n.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.3);
      if (n instanceof OscillatorNode) {
        try {
          n.stop((ctx?.currentTime ?? 0) + 1.2);
        } catch {
          /* already stopped */
        }
      }
    }
    this.padNodes = [];
    this.currentTheme = null;
  }
}

export const Audio = new AudioSystemImpl();

// unlock audio on the first interaction anywhere
if (typeof window !== 'undefined') {
  const unlock = () => Audio.unlock();
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);
}
