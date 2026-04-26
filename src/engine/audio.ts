import * as Tone from 'tone';
import type { Composition, Track } from '../types/music';
import { midiNoteToString } from './scales';

let initialized = false;

const instruments: Map<string, Tone.PolySynth | Tone.NoiseSynth | Tone.MembraneSynth | Tone.MetalSynth> = new Map();
const channels: Map<string, Tone.Channel> = new Map();
const effects: Map<string, Tone.ToneAudioNode[]> = new Map();
const drumSynthInstances: (Tone.MembraneSynth | Tone.NoiseSynth | Tone.MetalSynth)[] = [];

const masterReverb = new Tone.Reverb({ decay: 3, wet: 0.15 }).toDestination();
const masterCompressor = new Tone.Compressor({ threshold: -12, ratio: 3 }).connect(masterReverb);
const masterLimiter = new Tone.Limiter(-1).connect(masterCompressor);

type InstrumentKey = string;

interface InstrumentDef {
  create: () => Tone.PolySynth | Tone.NoiseSynth | Tone.MembraneSynth | Tone.MetalSynth;
}

const INSTRUMENT_DEFS: Record<InstrumentKey, InstrumentDef> = {
  piano: {
    create: () => new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle8' },
      envelope: { attack: 0.008, decay: 0.4, sustain: 0.25, release: 1.2 },
      volume: -6,
    }),
  },
  electric_piano: {
    create: () => new Tone.PolySynth(Tone.FMSynth, {
      harmonicity: 3.01,
      modulationIndex: 1.5,
      oscillator: { type: 'sine' },
      envelope: { attack: 0.005, decay: 0.6, sustain: 0.2, release: 1.8 },
      modulation: { type: 'square' },
      modulationEnvelope: { attack: 0.002, decay: 0.3, sustain: 0, release: 0.5 },
      volume: -8,
    }),
  },
  wurlitzer: {
    create: () => new Tone.PolySynth(Tone.FMSynth, {
      harmonicity: 2.5,
      modulationIndex: 2.2,
      oscillator: { type: 'sine' },
      envelope: { attack: 0.003, decay: 0.5, sustain: 0.15, release: 1.2 },
      modulation: { type: 'triangle' },
      modulationEnvelope: { attack: 0.001, decay: 0.2, sustain: 0.05, release: 0.4 },
      volume: -8,
    }),
  },
  tape_keys: {
    create: () => new Tone.PolySynth(Tone.FMSynth, {
      harmonicity: 2,
      modulationIndex: 0.8,
      oscillator: { type: 'sine' },
      envelope: { attack: 0.05, decay: 0.8, sustain: 0.3, release: 2.5 },
      modulation: { type: 'triangle' },
      modulationEnvelope: { attack: 0.01, decay: 0.5, sustain: 0.1, release: 1 },
      volume: -10,
    }),
  },
  strings: {
    create: () => new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'fatsawtooth', spread: 20, count: 3 },
      envelope: { attack: 0.5, decay: 0.4, sustain: 0.8, release: 2.5 },
      volume: -12,
    }),
  },
  vibraphone: {
    create: () => new Tone.PolySynth(Tone.FMSynth, {
      harmonicity: 8,
      modulationIndex: 0.4,
      oscillator: { type: 'sine' },
      envelope: { attack: 0.001, decay: 1.2, sustain: 0, release: 2 },
      modulation: { type: 'sine' },
      modulationEnvelope: { attack: 0.001, decay: 0.8, sustain: 0, release: 1.5 },
      volume: -14,
    }),
  },
  marimba: {
    create: () => new Tone.PolySynth(Tone.FMSynth, {
      harmonicity: 4,
      modulationIndex: 0.8,
      oscillator: { type: 'sine' },
      envelope: { attack: 0.001, decay: 0.6, sustain: 0, release: 1.0 },
      modulation: { type: 'sine' },
      modulationEnvelope: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.5 },
      volume: -10,
    }),
  },
  celeste: {
    create: () => new Tone.PolySynth(Tone.FMSynth, {
      harmonicity: 12,
      modulationIndex: 0.3,
      oscillator: { type: 'sine' },
      envelope: { attack: 0.001, decay: 1.5, sustain: 0.02, release: 2.5 },
      modulation: { type: 'sine' },
      modulationEnvelope: { attack: 0.001, decay: 1.0, sustain: 0, release: 2 },
      volume: -16,
    }),
  },
  harpsichord: {
    create: () => new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'square8' },
      envelope: { attack: 0.001, decay: 0.3, sustain: 0.05, release: 0.5 },
      volume: -10,
    }),
  },
  nylon_guitar: {
    create: () => new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle4' },
      envelope: { attack: 0.005, decay: 0.5, sustain: 0.1, release: 1.5 },
      volume: -8,
    }),
  },
  muted_trumpet: {
    create: () => new Tone.PolySynth(Tone.FMSynth, {
      harmonicity: 1.5,
      modulationIndex: 3,
      oscillator: { type: 'sine' },
      envelope: { attack: 0.06, decay: 0.2, sustain: 0.6, release: 0.8 },
      modulation: { type: 'sawtooth' },
      modulationEnvelope: { attack: 0.04, decay: 0.3, sustain: 0.3, release: 0.5 },
      volume: -10,
    }),
  },
  bass: {
    create: () => new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'fatsawtooth', spread: 10, count: 2 },
      envelope: { attack: 0.01, decay: 0.25, sustain: 0.5, release: 0.4 },
      volume: -8,
    }),
  },
  upright_bass: {
    create: () => new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle4' },
      envelope: { attack: 0.015, decay: 0.5, sustain: 0.3, release: 0.8 },
      volume: -6,
    }),
  },
  fretless_bass: {
    create: () => new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sine4' },
      envelope: { attack: 0.03, decay: 0.4, sustain: 0.4, release: 0.6 },
      volume: -7,
    }),
  },
  finger_bass: {
    create: () => new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle8' },
      envelope: { attack: 0.008, decay: 0.35, sustain: 0.2, release: 0.5 },
      volume: -7,
    }),
  },
  bells: {
    create: () => new Tone.PolySynth(Tone.FMSynth, {
      harmonicity: 5.07,
      modulationIndex: 1,
      oscillator: { type: 'sine' },
      envelope: { attack: 0.001, decay: 0.8, sustain: 0.05, release: 2 },
      modulation: { type: 'sine' },
      modulationEnvelope: { attack: 0.001, decay: 0.5, sustain: 0, release: 1.5 },
      volume: -14,
    }),
  },
  pads: {
    create: () => new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sine4' },
      envelope: { attack: 0.6, decay: 0.5, sustain: 0.7, release: 3 },
      volume: -12,
    }),
  },
  analog_pad: {
    create: () => new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'fatsawtooth', spread: 40, count: 3 },
      envelope: { attack: 1.2, decay: 0.8, sustain: 0.6, release: 4 },
      volume: -16,
    }),
  },
  organ: {
    create: () => new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sine8' },
      envelope: { attack: 0.05, decay: 0.1, sustain: 0.9, release: 0.3 },
      volume: -10,
    }),
  },
  clavinet: {
    create: () => new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'square8' },
      envelope: { attack: 0.002, decay: 0.2, sustain: 0.15, release: 0.3 },
      volume: -10,
    }),
  },
  synth_lead: {
    create: () => new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'fatsawtooth', spread: 30, count: 3 },
      envelope: { attack: 0.02, decay: 0.3, sustain: 0.5, release: 0.8 },
      volume: -8,
    }),
  },
  drums_placeholder: {
    create: () => new Tone.MembraneSynth({
      pitchDecay: 0.05, octaves: 6,
      oscillator: { type: 'sine' },
      envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.2 },
      volume: -6,
    }),
  },
};

function createInstrument(trackName: string, instrumentType?: string): Tone.PolySynth | Tone.NoiseSynth | Tone.MembraneSynth | Tone.MetalSynth {
  if (trackName === 'Drums') {
    return INSTRUMENT_DEFS.drums_placeholder.create();
  }

  const key = instrumentType ?? trackName.toLowerCase();
  const def = INSTRUMENT_DEFS[key];
  if (def) return def.create();

  return INSTRUMENT_DEFS.piano.create();
}

function createTrackEffects(track: Track): Tone.ToneAudioNode[] {
  const fxChain: Tone.ToneAudioNode[] = [];

  for (const effect of track.effects) {
    switch (effect.type) {
      case 'reverb':
        fxChain.push(new Tone.Reverb({
          decay: effect.params.decay ?? 2.5,
          wet: effect.wet,
        }));
        break;
      case 'delay':
        fxChain.push(new Tone.FeedbackDelay({
          delayTime: effect.params.delayTime ?? 0.25,
          feedback: effect.params.feedback ?? 0.3,
          wet: effect.wet,
        }));
        break;
      case 'chorus':
        fxChain.push(new Tone.Chorus({
          frequency: effect.params.frequency ?? 1.5,
          depth: effect.params.depth ?? 0.5,
          wet: effect.wet,
        }).start());
        break;
      case 'compressor':
        fxChain.push(new Tone.Compressor({
          threshold: effect.params.threshold ?? -20,
          ratio: effect.params.ratio ?? 4,
        }));
        break;
      case 'filter':
        fxChain.push(new Tone.Filter({
          frequency: effect.params.frequency ?? 2000,
          type: 'lowpass',
        }));
        break;
      case 'eq':
        fxChain.push(new Tone.EQ3({
          low: effect.params.low ?? 0,
          mid: effect.params.mid ?? 0,
          high: effect.params.high ?? 0,
        }));
        break;
      case 'distortion':
        fxChain.push(new Tone.Distortion({
          distortion: effect.params.amount ?? 0.4,
          wet: effect.wet,
        }));
        break;
      case 'phaser':
        fxChain.push(new Tone.Phaser({
          frequency: effect.params.frequency ?? 0.5,
          octaves: effect.params.octaves ?? 3,
          baseFrequency: effect.params.baseFrequency ?? 350,
          wet: effect.wet,
        }));
        break;
      case 'tremolo':
        fxChain.push(new Tone.Tremolo({
          frequency: effect.params.frequency ?? 4,
          depth: effect.params.depth ?? 0.5,
          wet: effect.wet,
        }).start());
        break;
      case 'bitcrusher': {
        const bc = new Tone.BitCrusher(effect.params.bits ?? 8);
        bc.wet.value = effect.wet;
        fxChain.push(bc);
        break;
      }
      case 'auto_wah':
        fxChain.push(new Tone.AutoWah({
          baseFrequency: effect.params.baseFrequency ?? 200,
          octaves: effect.params.octaves ?? 4,
          sensitivity: effect.params.sensitivity ?? 0,
          wet: effect.wet,
        }));
        break;
      case 'ping_pong_delay':
        fxChain.push(new Tone.PingPongDelay({
          delayTime: effect.params.delayTime ?? 0.25,
          feedback: effect.params.feedback ?? 0.3,
          wet: effect.wet,
        }));
        break;
    }
  }

  return fxChain;
}

export async function initAudio(): Promise<void> {
  if (initialized) return;
  await Tone.start();
  initialized = true;
}

export function disposeAll(): void {
  instruments.forEach(inst => inst.dispose());
  channels.forEach(ch => ch.dispose());
  effects.forEach(fxArr => fxArr.forEach(fx => fx.dispose()));
  drumSynthInstances.forEach(ds => ds.dispose());
  instruments.clear();
  channels.clear();
  effects.clear();
  drumSynthInstances.length = 0;
}

export function buildComposition(composition: Composition): void {
  disposeAll();

  const transport = Tone.getTransport();
  transport.cancel();
  transport.bpm.value = composition.params.tempo;
  transport.timeSignature = composition.params.timeSignature;

  for (const track of composition.tracks) {
    const instrument = createInstrument(track.name, track.instrument);
    const channel = new Tone.Channel({
      volume: Tone.gainToDb(track.volume),
      pan: track.pan,
      mute: track.muted,
    }).connect(masterLimiter);

    const fxChain = createTrackEffects(track);

    if (fxChain.length > 0) {
      instrument.connect(fxChain[0]);
      for (let i = 0; i < fxChain.length - 1; i++) {
        fxChain[i].connect(fxChain[i + 1]);
      }
      fxChain[fxChain.length - 1].connect(channel);
    } else {
      instrument.connect(channel);
    }

    instruments.set(track.id, instrument);
    channels.set(track.id, channel);
    effects.set(track.id, fxChain);

    scheduleTrackNotes(track, instrument, fxChain, channel);
  }
}

function connectDrumSynthToChain(
  synth: Tone.MembraneSynth | Tone.NoiseSynth | Tone.MetalSynth,
  fxChain: Tone.ToneAudioNode[],
  channel: Tone.Channel,
): void {
  if (fxChain.length > 0) {
    synth.connect(fxChain[0]);
  } else {
    synth.connect(channel);
  }
}

function scheduleTrackNotes(
  track: Track,
  instrument: Tone.PolySynth | Tone.NoiseSynth | Tone.MembraneSynth | Tone.MetalSynth,
  fxChain: Tone.ToneAudioNode[],
  channel: Tone.Channel,
): void {
  const transport = Tone.getTransport();

  if (track.name === 'Drums') {
    const drumSynths = {
      kick: new Tone.MembraneSynth({ pitchDecay: 0.05, octaves: 6, volume: -6 }),
      snare: new Tone.NoiseSynth({ noise: { type: 'white' }, envelope: { attack: 0.001, decay: 0.15, sustain: 0 }, volume: -10 }),
      hihat: new Tone.MetalSynth({ envelope: { attack: 0.001, decay: 0.05, release: 0.01 }, harmonicity: 5.1, modulationIndex: 32, resonance: 4000, octaves: 1.5, volume: -16 }),
      rimshot: new Tone.NoiseSynth({ noise: { type: 'pink' }, envelope: { attack: 0.001, decay: 0.08, sustain: 0 }, volume: -14 }),
    };

    drumSynthInstances.push(drumSynths.kick, drumSynths.snare, drumSynths.hihat, drumSynths.rimshot);

    connectDrumSynthToChain(drumSynths.kick, fxChain, channel);
    connectDrumSynthToChain(drumSynths.snare, fxChain, channel);
    connectDrumSynthToChain(drumSynths.hihat, fxChain, channel);
    connectDrumSynthToChain(drumSynths.rimshot, fxChain, channel);

    for (const note of track.notes) {
      const time = `0:${note.startBeat}:0`;
      const vel = note.velocity / 127;

      if (note.pitch === 36) {
        transport.schedule((t) => {
          drumSynths.kick.triggerAttackRelease('C1', '8n', t, vel);
        }, time);
      } else if (note.pitch === 38) {
        transport.schedule((t) => {
          drumSynths.snare.triggerAttackRelease('8n', t, vel);
        }, time);
      } else if (note.pitch === 37) {
        transport.schedule((t) => {
          drumSynths.rimshot.triggerAttackRelease('32n', t, vel * 0.6);
        }, time);
      } else if (note.pitch === 49 || note.pitch === 51) {
        transport.schedule((t) => {
          drumSynths.hihat.triggerAttackRelease('4n', t, vel * 0.7);
        }, time);
      } else if (note.pitch === 46) {
        transport.schedule((t) => {
          drumSynths.hihat.triggerAttackRelease('8n', t, vel * 0.5);
        }, time);
      } else {
        transport.schedule((t) => {
          drumSynths.hihat.triggerAttackRelease('32n', t, vel * 0.3);
        }, time);
      }
    }
    return;
  }

  if (!(instrument instanceof Tone.PolySynth)) return;

  for (const note of track.notes) {
    const time = `0:${note.startBeat}:0`;
    const noteName = midiNoteToString(note.pitch);
    const duration = `0:${note.duration}:0`;
    const velocity = note.velocity / 127;

    transport.schedule((t) => {
      try {
        instrument.triggerAttackRelease(noteName, duration, t, velocity);
      } catch {
        // note out of range
      }
    }, time);
  }
}

export function play(): void {
  const transport = Tone.getTransport();
  transport.start();
}

export function pause(): void {
  Tone.getTransport().pause();
}

export function stop(): void {
  const transport = Tone.getTransport();
  transport.stop();
  transport.position = 0;
}

export function setTempo(bpm: number): void {
  Tone.getTransport().bpm.value = bpm;
}

export function setTrackVolume(trackId: string, volume: number): void {
  const ch = channels.get(trackId);
  if (ch) ch.volume.value = Tone.gainToDb(volume);
}

export function setTrackPan(trackId: string, pan: number): void {
  const ch = channels.get(trackId);
  if (ch) ch.pan.value = pan;
}

export function setTrackMute(trackId: string, muted: boolean): void {
  const ch = channels.get(trackId);
  if (ch) ch.mute = muted;
}

export function setTrackSolo(
  allTrackStates: { id: string; solo: boolean; muted: boolean }[],
): void {
  const anySoloed = allTrackStates.some(t => t.solo);
  for (const t of allTrackStates) {
    const ch = channels.get(t.id);
    if (!ch) continue;
    if (anySoloed) {
      ch.mute = !t.solo;
    } else {
      ch.mute = t.muted;
    }
  }
}

export function getTransportPosition(): number {
  const transport = Tone.getTransport();
  return transport.seconds;
}

export function getTransportProgress(totalBeats: number, tempo: number): number {
  const totalSeconds = (totalBeats / tempo) * 60;
  const current = Tone.getTransport().seconds;
  return Math.min(1, current / totalSeconds);
}

export function setLoop(start: number, end: number): void {
  const transport = Tone.getTransport();
  transport.loop = true;
  transport.loopStart = `0:${start}:0`;
  transport.loopEnd = `0:${end}:0`;
}

export function disableLoop(): void {
  Tone.getTransport().loop = false;
}

let analyserNode: Tone.Analyser | null = null;
let waveformNode: Tone.Analyser | null = null;

export function getAnalyserNode(): Tone.Analyser {
  if (!analyserNode) {
    analyserNode = new Tone.Analyser('fft', 64);
    masterLimiter.connect(analyserNode);
  }
  return analyserNode;
}

export function getWaveformNode(): Tone.Analyser {
  if (!waveformNode) {
    waveformNode = new Tone.Analyser('waveform', 128);
    masterLimiter.connect(waveformNode);
  }
  return waveformNode;
}
