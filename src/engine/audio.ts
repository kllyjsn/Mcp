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

function createInstrument(trackName: string): Tone.PolySynth | Tone.NoiseSynth | Tone.MembraneSynth | Tone.MetalSynth {
  switch (trackName) {
    case 'Melody':
      return new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'triangle8' },
        envelope: { attack: 0.02, decay: 0.3, sustain: 0.4, release: 0.8 },
        volume: -6,
      });
    case 'Harmony':
      return new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'sine4' },
        envelope: { attack: 0.4, decay: 0.5, sustain: 0.7, release: 2 },
        volume: -10,
      });
    case 'Bass':
      return new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'sawtooth4' },
        envelope: { attack: 0.01, decay: 0.2, sustain: 0.5, release: 0.4 },
        volume: -8,
      });
    case 'Arpeggio':
      return new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'sine8' },
        envelope: { attack: 0.01, decay: 0.15, sustain: 0.2, release: 1 },
        volume: -12,
      });
    case 'Drums':
      return new Tone.MembraneSynth({
        pitchDecay: 0.05,
        octaves: 6,
        oscillator: { type: 'sine' },
        envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.2 },
        volume: -6,
      });
    default:
      return new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.05, decay: 0.3, sustain: 0.4, release: 0.8 },
        volume: -8,
      });
  }
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
    const instrument = createInstrument(track.name);
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

    scheduleTrackNotes(track, instrument);
  }
}

function scheduleTrackNotes(
  track: Track,
  instrument: Tone.PolySynth | Tone.NoiseSynth | Tone.MembraneSynth | Tone.MetalSynth,
): void {
  const transport = Tone.getTransport();

  if (track.name === 'Drums') {
    const drumSynths = {
      kick: new Tone.MembraneSynth({ pitchDecay: 0.05, octaves: 6, volume: -6 }),
      snare: new Tone.NoiseSynth({ noise: { type: 'white' }, envelope: { attack: 0.001, decay: 0.15, sustain: 0 }, volume: -10 }),
      hihat: new Tone.MetalSynth({ envelope: { attack: 0.001, decay: 0.05, release: 0.01 }, harmonicity: 5.1, modulationIndex: 32, resonance: 4000, octaves: 1.5, volume: -16 }),
    };

    drumSynthInstances.push(drumSynths.kick, drumSynths.snare, drumSynths.hihat);

    const ch = channels.get(track.id);
    if (ch) {
      drumSynths.kick.connect(ch);
      drumSynths.snare.connect(ch);
      drumSynths.hihat.connect(ch);
    }

    for (const note of track.notes) {
      const time = `0:0:${note.startBeat * 2}`;
      const vel = note.velocity / 127;

      if (note.pitch === 36 || note.pitch === 49) {
        transport.schedule((t) => {
          drumSynths.kick.triggerAttackRelease('C1', '8n', t, vel);
        }, time);
      } else if (note.pitch === 38) {
        transport.schedule((t) => {
          drumSynths.snare.triggerAttackRelease('8n', t);
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
    const time = `0:0:${note.startBeat * 2}`;
    const noteName = midiNoteToString(note.pitch);
    const duration = `0:0:${note.duration * 2}`;
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
  transport.loopStart = `0:0:${start * 2}`;
  transport.loopEnd = `0:0:${end * 2}`;
}

export function disableLoop(): void {
  Tone.getTransport().loop = false;
}
