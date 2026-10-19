// Typewriter sounds, synthesised with the Web Audio API (no recorded samples).
//
// Each sound is rendered once into an AudioBuffer with an OfflineAudioContext (a few variants per
// sound, from a seeded generator), so a keystroke only starts a buffer source: no synthesis on the
// input path and no delay of the keystroke itself, which goes to the terminal independently.

import type {TypewriterSettings, TypewriterVoice} from '../../../app/nocturne/types';

export type SoundKind = 'key' | 'space' | 'backspace' | 'return' | 'bell';

type Voice = {
  /** Frequency of the platen thump, Hz. */
  body: number;
  bodyGain: number;
  /** High-pass cutoff of the type-slug click, Hz. */
  click: number;
  clickGain: number;
  /** Resonance of the type bar, Hz. */
  ring: number;
  ringGain: number;
  level: number;
};

const VOICES: Record<TypewriterVoice, Voice> = {
  standard: {body: 140, bodyGain: 0.9, click: 2600, clickGain: 0.75, ring: 3300, ringGain: 0.16, level: 1},
  portable: {body: 190, bodyGain: 0.5, click: 3600, clickGain: 0.9, ring: 4300, ringGain: 0.22, level: 0.9},
  electric: {body: 105, bodyGain: 0.75, click: 1700, clickGain: 0.4, ring: 2500, ringGain: 0.06, level: 0.85},
  whisper: {body: 160, bodyGain: 0.3, click: 3000, clickGain: 0.3, ring: 3700, ringGain: 0.04, level: 0.6}
};

const VARIANTS = 4;
const SAMPLE_RATE = 44100;
const DURATION: Record<SoundKind, number> = {key: 0.18, space: 0.22, backspace: 0.16, return: 0.62, bell: 1.6};

/** Small deterministic PRNG (mulberry32) so variants are reproducible. */
function random(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function noise(context: BaseAudioContext, seconds: number, rand: () => number): AudioBuffer {
  const buffer = context.createBuffer(1, Math.max(1, Math.ceil(seconds * context.sampleRate)), context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = rand() * 2 - 1;
  }
  return buffer;
}

type Envelope = {at: number; peak: number; decay: number; attack?: number};

function envelope(context: BaseAudioContext, {at, peak, decay, attack = 0.0006}: Envelope): GainNode {
  const gain = context.createGain();
  gain.gain.setValueAtTime(0, at);
  gain.gain.linearRampToValueAtTime(peak, at + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + attack + decay);
  return gain;
}

/** A filtered noise burst. */
function burst(
  context: BaseAudioContext,
  out: AudioNode,
  rand: () => number,
  filter: {type: BiquadFilterType; frequency: number; q?: number},
  shape: Envelope
) {
  const source = context.createBufferSource();
  source.buffer = noise(context, shape.decay + 0.02, rand);
  const biquad = context.createBiquadFilter();
  biquad.type = filter.type;
  biquad.frequency.value = filter.frequency;
  biquad.Q.value = filter.q ?? 0.7;
  const gain = envelope(context, shape);
  source.connect(biquad).connect(gain).connect(out);
  source.start(shape.at);
}

/** A damped sine with a slight downward pitch glide (the platen thump). */
function thump(context: BaseAudioContext, out: AudioNode, frequency: number, shape: Envelope) {
  const oscillator = context.createOscillator();
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(frequency * 1.6, shape.at);
  oscillator.frequency.exponentialRampToValueAtTime(frequency, shape.at + 0.02);
  const gain = envelope(context, shape);
  oscillator.connect(gain).connect(out);
  oscillator.start(shape.at);
  oscillator.stop(shape.at + shape.decay + 0.05);
}

function strike(context: BaseAudioContext, out: AudioNode, voice: Voice, rand: () => number, weight: number) {
  const jitter = () => 0.92 + rand() * 0.16;
  // Type slug hitting the ribbon and paper.
  burst(
    context,
    out,
    rand,
    {type: 'highpass', frequency: voice.click * jitter()},
    {at: 0, peak: voice.clickGain, decay: 0.012}
  );
  // Platen and frame.
  thump(context, out, voice.body * jitter() * (2 - weight), {at: 0, peak: voice.bodyGain * weight, decay: 0.05});
  // Type bar ring.
  burst(
    context,
    out,
    rand,
    {type: 'bandpass', frequency: voice.ring * jitter(), q: 16},
    {at: 0.002, peak: voice.ringGain, decay: 0.1}
  );
  // Type bar falling back into the segment.
  burst(
    context,
    out,
    rand,
    {type: 'bandpass', frequency: voice.click * 0.7 * jitter(), q: 2},
    {at: 0.024 + rand() * 0.008, peak: voice.clickGain * 0.28, decay: 0.01}
  );
}

function carriageReturn(context: BaseAudioContext, out: AudioNode, voice: Voice, rand: () => number) {
  // Line-space ratchet.
  for (let i = 0; i < 5; i++) {
    burst(
      context,
      out,
      rand,
      {type: 'bandpass', frequency: 2200 + rand() * 400, q: 3},
      {at: i * 0.026, peak: 0.45 - i * 0.06, decay: 0.008}
    );
  }
  // The carriage sliding back.
  const slide = context.createBufferSource();
  slide.buffer = noise(context, 0.4, rand);
  const band = context.createBiquadFilter();
  band.type = 'bandpass';
  band.Q.value = 1.4;
  band.frequency.setValueAtTime(1900, 0.12);
  band.frequency.exponentialRampToValueAtTime(520, 0.44);
  const slideGain = context.createGain();
  slideGain.gain.setValueAtTime(0, 0.12);
  slideGain.gain.linearRampToValueAtTime(0.32, 0.18);
  slideGain.gain.exponentialRampToValueAtTime(0.0001, 0.46);
  slide.connect(band).connect(slideGain).connect(out);
  slide.start(0.12);
  // Margin stop.
  thump(context, out, voice.body * 0.7, {at: 0.46, peak: voice.bodyGain * 1.1, decay: 0.08});
  burst(context, out, rand, {type: 'highpass', frequency: 1500}, {at: 0.46, peak: 0.5, decay: 0.02});
}

function bell(context: BaseAudioContext, out: AudioNode) {
  // A small struck bell: fundamental, octave-ish partial and an inharmonic shimmer.
  const partials: [number, number, number][] = [
    [2093, 0.5, 1.3],
    [5230, 0.12, 0.6],
    [3150, 0.09, 0.9]
  ];
  for (const [frequency, peak, decay] of partials) {
    const oscillator = context.createOscillator();
    oscillator.frequency.value = frequency;
    const gain = envelope(context, {at: 0, peak, decay, attack: 0.002});
    oscillator.connect(gain).connect(out);
    oscillator.start(0);
    oscillator.stop(decay + 0.1);
  }
}

function render(kind: SoundKind, voice: Voice, seed: number): Promise<AudioBuffer> {
  const context = new OfflineAudioContext(1, Math.ceil(DURATION[kind] * SAMPLE_RATE), SAMPLE_RATE);
  const rand = random(seed);
  const out = context.createGain();
  out.gain.value = voice.level;
  out.connect(context.destination);
  if (kind === 'key') {
    strike(context, out, voice, rand, 1);
  } else if (kind === 'space') {
    strike(context, out, {...voice, clickGain: voice.clickGain * 0.5, ringGain: 0}, rand, 1.25);
  } else if (kind === 'backspace') {
    strike(context, out, {...voice, bodyGain: voice.bodyGain * 0.5}, rand, 0.7);
  } else if (kind === 'return') {
    carriageReturn(context, out, voice, rand);
  } else {
    bell(context, out);
  }
  return context.startRendering();
}

const KINDS: SoundKind[] = ['key', 'space', 'backspace', 'return', 'bell'];

export class TypewriterSounds {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private buffers = new Map<string, AudioBuffer[]>();
  private preparing = new Map<TypewriterVoice, Promise<void>>();
  private settings: TypewriterSettings | null = null;
  private rand = random(Date.now());

  configure(settings: TypewriterSettings) {
    this.settings = settings;
    if (!settings.sound || settings.volume === 0) {
      this.close();
      return;
    }
    void this.prepare(settings.voice);
  }

  /** Renders every sound of a voice in the background. */
  prepare(voiceName: TypewriterVoice): Promise<void> {
    const existing = this.preparing.get(voiceName);
    if (existing) {
      return existing;
    }
    const voice = VOICES[voiceName];
    const work = Promise.all(
      KINDS.map(async (kind) => {
        const variants: AudioBuffer[] = [];
        for (let i = 0; i < VARIANTS; i++) {
          variants.push(await render(kind, voice, i * 7919 + kind.length));
        }
        this.buffers.set(`${voiceName}:${kind}`, variants);
      })
    )
      .then(() => undefined)
      .catch((error: Error) => {
        console.warn('Typewriter sounds unavailable:', error.message);
      });
    this.preparing.set(voiceName, work);
    return work;
  }

  play(kind: SoundKind, repeat = false) {
    const settings = this.settings;
    if (!settings?.sound || settings.volume === 0) {
      return;
    }
    const variants = this.buffers.get(`${settings.voice}:${kind}`);
    if (!variants) {
      void this.prepare(settings.voice);
      return;
    }
    const context = this.ensureContext();
    if (!context || !this.master) {
      return;
    }
    const variation = settings.variation;
    const source = context.createBufferSource();
    source.buffer = variants[Math.floor(this.rand() * variants.length)];
    source.playbackRate.value = 1 + (this.rand() - 0.5) * 0.09 * variation;
    const gain = context.createGain();
    const loudness = kind === 'bell' || kind === 'return' ? 0.8 : 1;
    gain.gain.value = settings.volume * loudness * (1 + (this.rand() - 0.5) * 0.35 * variation) * (repeat ? 0.55 : 1);
    source.connect(gain).connect(this.master);
    source.start();
  }

  private ensureContext(): AudioContext | null {
    if (!this.context) {
      try {
        this.context = new AudioContext({latencyHint: 'interactive'});
        this.master = this.context.createGain();
        this.master.connect(this.context.destination);
      } catch {
        return null;
      }
    }
    if (this.context.state === 'suspended') {
      void this.context.resume();
    }
    return this.context;
  }

  /** Releases the audio device. Buffers are kept so re-enabling is instant. */
  close() {
    if (this.context) {
      void this.context.close();
    }
    this.context = null;
    this.master = null;
  }
}
