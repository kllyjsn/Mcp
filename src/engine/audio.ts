import * as Tone from 'tone';
import type { Composition, Track, CompositionStyle } from '../types/music';
import { midiNoteToString } from './scales';

let initialized = false;

const instruments: Map<string, Tone.PolySynth | Tone.NoiseSynth | Tone.MembraneSynth | Tone.MetalSynth> = new Map();
const channels: Map<string, Tone.Channel> = new Map();
const effectChains: Map<string, Tone.ToneAudioNode[]> = new Map();
const drumSynthInstances: (Tone.MembraneSynth | Tone.NoiseSynth | Tone.MetalSynth)[] = [];

const masterReverb = new Tone.Reverb({ decay: 3, wet: 0.15 }).toDestination();
const masterCompressor = new Tone.Compressor({ threshold: -12, ratio: 3 }).connect(masterReverb);
const masterLimiter = new Tone.Limiter(-1).connect(masterCompressor);

// Analyser node for real-time visualization
const analyserNode = new Tone.Analyser('waveform', 256);
masterLimiter.connect(analyserNode);

// Recorder for WAV export
let recorder: Tone.Recorder | null = null;

export function getAnalyser(): Tone.Analyser {
  return analyserNode;
}

// Style-specific synth configurations for richer, more expressive sound
interface SynthConfig {
  oscillator: { type: string };
  envelope: { attack: number; decay: number; sustain: number; release: number };
  volume: number;
}

const MELODY_PATCHES: Record<string, SynthConfig> = {
  classical:     { oscillator: { type: 'triangle8' }, envelope: { attack: 0.01, decay: 0.25, sustain: 0.5, release: 0.6 }, volume: -6 },
  romantic:      { oscillator: { type: 'triangle16' }, envelope: { attack: 0.03, decay: 0.4, sustain: 0.6, release: 1.2 }, volume: -6 },
  impressionist: { oscillator: { type: 'sine8' }, envelope: { attack: 0.08, decay: 0.5, sustain: 0.4, release: 1.5 }, volume: -8 },
  jazz:          { oscillator: { type: 'triangle4' }, envelope: { attack: 0.005, decay: 0.15, sustain: 0.3, release: 0.5 }, volume: -5 },
  neo_soul:      { oscillator: { type: 'sine16' }, envelope: { attack: 0.01, decay: 0.3, sustain: 0.5, release: 0.8 }, volume: -6 },
  ambient:       { oscillator: { type: 'sine8' }, envelope: { attack: 0.2, decay: 0.8, sustain: 0.6, release: 2.5 }, volume: -10 },
  minimalist:    { oscillator: { type: 'triangle' }, envelope: { attack: 0.01, decay: 0.2, sustain: 0.4, release: 0.6 }, volume: -8 },
  cinematic:     { oscillator: { type: 'triangle16' }, envelope: { attack: 0.05, decay: 0.5, sustain: 0.6, release: 1.5 }, volume: -6 },
  electronic:    { oscillator: { type: 'sawtooth8' }, envelope: { attack: 0.005, decay: 0.2, sustain: 0.3, release: 0.4 }, volume: -6 },
};

const HARMONY_PATCHES: Record<string, SynthConfig> = {
  classical:     { oscillator: { type: 'sine4' }, envelope: { attack: 0.3, decay: 0.5, sustain: 0.7, release: 2 }, volume: -10 },
  romantic:      { oscillator: { type: 'sine8' }, envelope: { attack: 0.5, decay: 0.6, sustain: 0.8, release: 2.5 }, volume: -10 },
  impressionist: { oscillator: { type: 'sine16' }, envelope: { attack: 0.6, decay: 0.8, sustain: 0.6, release: 3 }, volume: -12 },
  jazz:          { oscillator: { type: 'triangle4' }, envelope: { attack: 0.02, decay: 0.3, sustain: 0.4, release: 0.8 }, volume: -10 },
  neo_soul:      { oscillator: { type: 'sine8' }, envelope: { attack: 0.15, decay: 0.4, sustain: 0.6, release: 1.5 }, volume: -10 },
  ambient:       { oscillator: { type: 'sine16' }, envelope: { attack: 1, decay: 1, sustain: 0.8, release: 4 }, volume: -14 },
  minimalist:    { oscillator: { type: 'sine4' }, envelope: { attack: 0.3, decay: 0.5, sustain: 0.7, release: 2 }, volume: -10 },
  cinematic:     { oscillator: { type: 'sine8' }, envelope: { attack: 0.5, decay: 0.6, sustain: 0.8, release: 3 }, volume: -10 },
  electronic:    { oscillator: { type: 'square4' }, envelope: { attack: 0.01, decay: 0.3, sustain: 0.5, release: 1 }, volume: -12 },
};

const BASS_PATCHES: Record<string, SynthConfig> = {
  classical:     { oscillator: { type: 'triangle8' }, envelope: { attack: 0.02, decay: 0.3, sustain: 0.5, release: 0.5 }, volume: -6 },
  romantic:      { oscillator: { type: 'triangle8' }, envelope: { attack: 0.03, decay: 0.4, sustain: 0.6, release: 0.8 }, volume: -6 },
  impressionist: { oscillator: { type: 'sine8' }, envelope: { attack: 0.05, decay: 0.5, sustain: 0.5, release: 1 }, volume: -8 },
  jazz:          { oscillator: { type: 'triangle4' }, envelope: { attack: 0.01, decay: 0.15, sustain: 0.4, release: 0.3 }, volume: -4 },
  neo_soul:      { oscillator: { type: 'sawtooth4' }, envelope: { attack: 0.01, decay: 0.2, sustain: 0.5, release: 0.4 }, volume: -6 },
  ambient:       { oscillator: { type: 'sine8' }, envelope: { attack: 0.1, decay: 0.5, sustain: 0.6, release: 1.5 }, volume: -8 },
  minimalist:    { oscillator: { type: 'triangle' }, envelope: { attack: 0.01, decay: 0.2, sustain: 0.5, release: 0.4 }, volume: -6 },
  cinematic:     { oscillator: { type: 'sawtooth8' }, envelope: { attack: 0.02, decay: 0.3, sustain: 0.6, release: 0.8 }, volume: -6 },
  electronic:    { oscillator: { type: 'sawtooth8' }, envelope: { attack: 0.005, decay: 0.15, sustain: 0.4, release: 0.3 }, volume: -5 },
};

const ARPEGGIO_PATCHES: Record<string, SynthConfig> = {
  classical:     { oscillator: { type: 'sine8' }, envelope: { attack: 0.01, decay: 0.15, sustain: 0.2, release: 1 }, volume: -12 },
  romantic:      { oscillator: { type: 'sine16' }, envelope: { attack: 0.02, decay: 0.2, sustain: 0.3, release: 1.5 }, volume: -12 },
  impressionist: { oscillator: { type: 'sine16' }, envelope: { attack: 0.03, decay: 0.3, sustain: 0.2, release: 2 }, volume: -14 },
  jazz:          { oscillator: { type: 'triangle4' }, envelope: { attack: 0.005, decay: 0.1, sustain: 0.15, release: 0.5 }, volume: -12 },
  neo_soul:      { oscillator: { type: 'sine8' }, envelope: { attack: 0.01, decay: 0.2, sustain: 0.2, release: 0.8 }, volume: -12 },
  ambient:       { oscillator: { type: 'sine16' }, envelope: { attack: 0.08, decay: 0.5, sustain: 0.3, release: 3 }, volume: -16 },
  minimalist:    { oscillator: { type: 'sine4' }, envelope: { attack: 0.01, decay: 0.15, sustain: 0.2, release: 1 }, volume: -12 },
  cinematic:     { oscillator: { type: 'sine8' }, envelope: { attack: 0.02, decay: 0.2, sustain: 0.3, release: 1.5 }, volume: -12 },
  electronic:    { oscillator: { type: 'square8' }, envelope: { attack: 0.005, decay: 0.1, sustain: 0.15, release: 0.6 }, volume: -12 },
};

function getPatch(trackName: string, style: CompositionStyle): SynthConfig {
  const defaultPatch: SynthConfig = { oscillator: { type: 'triangle' }, envelope: { attack: 0.05, decay: 0.3, sustain: 0.4, release: 0.8 }, volume: -8 };
  switch (trackName) {
    case 'Melody': return MELODY_PATCHES[style] ?? defaultPatch;
    case 'Harmony': return HARMONY_PATCHES[style] ?? defaultPatch;
    case 'Bass': return BASS_PATCHES[style] ?? defaultPatch;
    case 'Arpeggio': return ARPEGGIO_PATCHES[style] ?? defaultPatch;
    default: return defaultPatch;
  }
}

function createInstrument(trackName: string, style: CompositionStyle): Tone.PolySynth | Tone.NoiseSynth | Tone.MembraneSynth | Tone.MetalSynth {
  if (trackName === 'Drums') {
    return new Tone.MembraneSynth({
      pitchDecay: 0.05,
      octaves: 6,
      oscillator: { type: 'sine' },
      envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.2 },
      volume: -6,
    });
  }

  const patch = getPatch(trackName, style);
  const synthOptions: Tone.SynthOptions = {
    oscillator: { type: patch.oscillator.type },
    envelope: patch.envelope,
    volume: patch.volume,
  } as Tone.SynthOptions;
  return new Tone.PolySynth(Tone.Synth, synthOptions);
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
  effectChains.forEach(fxArr => fxArr.forEach(fx => fx.dispose()));
  drumSynthInstances.forEach(ds => ds.dispose());
  instruments.clear();
  channels.clear();
  effectChains.clear();
  drumSynthInstances.length = 0;
}

export function buildComposition(composition: Composition): void {
  disposeAll();

  const transport = Tone.getTransport();
  transport.cancel();
  transport.bpm.value = composition.params.tempo;
  transport.timeSignature = composition.params.timeSignature;

  for (const track of composition.tracks) {
    const instrument = createInstrument(track.name, composition.params.style);
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
    effectChains.set(track.id, fxChain);

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
    };

    drumSynthInstances.push(drumSynths.kick, drumSynths.snare, drumSynths.hihat);

    connectDrumSynthToChain(drumSynths.kick, fxChain, channel);
    connectDrumSynthToChain(drumSynths.snare, fxChain, channel);
    connectDrumSynthToChain(drumSynths.hihat, fxChain, channel);

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

// WAV Export
export async function startRecording(): Promise<void> {
  if (recorder) {
    try { recorder.dispose(); } catch { /* ignore */ }
  }
  recorder = new Tone.Recorder();
  Tone.getDestination().connect(recorder);
  recorder.start();
}

export async function stopRecording(): Promise<Blob | null> {
  if (!recorder) return null;
  const blob = await recorder.stop();
  Tone.getDestination().disconnect(recorder);
  recorder.dispose();
  recorder = null;
  return blob;
}

export function isRecording(): boolean {
  return recorder !== null && recorder.state === 'started';
}
