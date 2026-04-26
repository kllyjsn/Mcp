import type { Composition, CompositionParams, CompositionStyle, InstrumentType, Track, TrackEffect } from '../types/music';
import { generateChordProgression } from './chords';
import { generateMelody, generateBassLine, generatePadVoicings, generateArpeggio, generateDrumPattern, generateCounterMelody } from './melody';
import { humanizeTrack } from './humanize';
import { generateTensionArc } from './tension';

const TRACK_COLORS: Record<string, string> = {
  melody: '#C8A97E',
  harmony: '#7E9CC8',
  bass: '#8B5E3C',
  pads: '#6B8E7E',
  arpeggio: '#C87E9C',
  drums: '#9C8B7E',
  countermelody: '#A8C87E',
};

function makeTrackId(): string {
  return Math.random().toString(36).slice(2, 10);
}

interface StyleVoicing {
  melody: InstrumentType;
  harmony: InstrumentType;
  bass: InstrumentType;
  arpeggio: InstrumentType;
  countermelody: InstrumentType;
  melodyFx: TrackEffect[];
  harmonyFx: TrackEffect[];
  bassFx: TrackEffect[];
  arpeggioFx: TrackEffect[];
  drumsFx: TrackEffect[];
  countermelodyFx: TrackEffect[];
  melodyVol: number;
  harmonyVol: number;
  bassVol: number;
  arpeggioVol: number;
  drumsVol: number;
  countermelodyVol: number;
}

const STYLE_VOICINGS: Record<CompositionStyle, StyleVoicing> = {
  classical: {
    melody: 'piano', harmony: 'strings', bass: 'bass', arpeggio: 'bells', countermelody: 'strings',
    melodyFx: [{ type: 'reverb', wet: 0.25, params: { decay: 2.5 } }],
    harmonyFx: [{ type: 'reverb', wet: 0.4, params: { decay: 4 } }, { type: 'chorus', wet: 0.15, params: { frequency: 1.2, depth: 0.5 } }],
    bassFx: [{ type: 'compressor', wet: 1, params: { threshold: -20, ratio: 4 } }],
    arpeggioFx: [{ type: 'delay', wet: 0.3, params: { delayTime: 0.375, feedback: 0.3 } }, { type: 'reverb', wet: 0.3, params: { decay: 3 } }],
    drumsFx: [{ type: 'compressor', wet: 1, params: { threshold: -15, ratio: 3 } }],
    countermelodyFx: [{ type: 'reverb', wet: 0.35, params: { decay: 3 } }],
    melodyVol: 0.8, harmonyVol: 0.55, bassVol: 0.7, arpeggioVol: 0.35, drumsVol: 0.5, countermelodyVol: 0.45,
  },
  romantic: {
    melody: 'piano', harmony: 'strings', bass: 'bass', arpeggio: 'bells', countermelody: 'strings',
    melodyFx: [{ type: 'reverb', wet: 0.35, params: { decay: 3.5 } }],
    harmonyFx: [{ type: 'reverb', wet: 0.5, params: { decay: 5 } }, { type: 'chorus', wet: 0.25, params: { frequency: 1, depth: 0.7 } }],
    bassFx: [{ type: 'compressor', wet: 1, params: { threshold: -18, ratio: 3 } }],
    arpeggioFx: [{ type: 'delay', wet: 0.35, params: { delayTime: 0.5, feedback: 0.4 } }, { type: 'reverb', wet: 0.4, params: { decay: 4 } }],
    drumsFx: [{ type: 'compressor', wet: 1, params: { threshold: -15, ratio: 3 } }],
    countermelodyFx: [{ type: 'reverb', wet: 0.4, params: { decay: 4 } }, { type: 'chorus', wet: 0.1, params: { frequency: 0.8, depth: 0.4 } }],
    melodyVol: 0.82, harmonyVol: 0.6, bassVol: 0.65, arpeggioVol: 0.3, drumsVol: 0.4, countermelodyVol: 0.5,
  },
  impressionist: {
    melody: 'piano', harmony: 'pads', bass: 'bass', arpeggio: 'vibraphone', countermelody: 'vibraphone',
    melodyFx: [{ type: 'reverb', wet: 0.45, params: { decay: 4 } }, { type: 'chorus', wet: 0.15, params: { frequency: 0.8, depth: 0.4 } }],
    harmonyFx: [{ type: 'reverb', wet: 0.55, params: { decay: 6 } }],
    bassFx: [{ type: 'compressor', wet: 1, params: { threshold: -20, ratio: 3 } }, { type: 'reverb', wet: 0.15, params: { decay: 2 } }],
    arpeggioFx: [{ type: 'reverb', wet: 0.5, params: { decay: 5 } }, { type: 'tremolo', wet: 0.2, params: { frequency: 3, depth: 0.3 } }],
    drumsFx: [{ type: 'reverb', wet: 0.3, params: { decay: 3 } }],
    countermelodyFx: [{ type: 'reverb', wet: 0.5, params: { decay: 5 } }, { type: 'delay', wet: 0.2, params: { delayTime: 0.5, feedback: 0.25 } }],
    melodyVol: 0.75, harmonyVol: 0.5, bassVol: 0.6, arpeggioVol: 0.4, drumsVol: 0.35, countermelodyVol: 0.4,
  },
  jazz: {
    melody: 'electric_piano', harmony: 'electric_piano', bass: 'upright_bass', arpeggio: 'vibraphone', countermelody: 'muted_trumpet',
    melodyFx: [{ type: 'reverb', wet: 0.2, params: { decay: 2 } }, { type: 'chorus', wet: 0.1, params: { frequency: 0.8, depth: 0.3 } }],
    harmonyFx: [{ type: 'reverb', wet: 0.25, params: { decay: 2.5 } }, { type: 'tremolo', wet: 0.08, params: { frequency: 3.5, depth: 0.2 } }],
    bassFx: [{ type: 'compressor', wet: 1, params: { threshold: -16, ratio: 3 } }, { type: 'eq', wet: 1, params: { low: 3, mid: 0, high: -4 } }],
    arpeggioFx: [{ type: 'reverb', wet: 0.3, params: { decay: 2.5 } }, { type: 'tremolo', wet: 0.15, params: { frequency: 5, depth: 0.25 } }],
    drumsFx: [{ type: 'compressor', wet: 1, params: { threshold: -18, ratio: 2.5 } }, { type: 'reverb', wet: 0.12, params: { decay: 1.5 } }],
    countermelodyFx: [{ type: 'reverb', wet: 0.2, params: { decay: 2 } }, { type: 'filter', wet: 1, params: { frequency: 3000 } }],
    melodyVol: 0.78, harmonyVol: 0.5, bassVol: 0.72, arpeggioVol: 0.3, drumsVol: 0.52, countermelodyVol: 0.42,
  },
  neo_soul: {
    melody: 'warm_rhodes', harmony: 'warm_rhodes', bass: 'fretless_bass', arpeggio: 'vibraphone', countermelody: 'wurlitzer',
    melodyFx: [{ type: 'phaser', wet: 0.15, params: { frequency: 0.3, octaves: 2, baseFrequency: 400 } }, { type: 'reverb', wet: 0.25, params: { decay: 2.5 } }],
    harmonyFx: [{ type: 'chorus', wet: 0.2, params: { frequency: 1.2, depth: 0.5 } }, { type: 'reverb', wet: 0.3, params: { decay: 3 } }],
    bassFx: [{ type: 'compressor', wet: 1, params: { threshold: -18, ratio: 4 } }, { type: 'filter', wet: 1, params: { frequency: 800 } }],
    arpeggioFx: [{ type: 'delay', wet: 0.25, params: { delayTime: 0.375, feedback: 0.3 } }, { type: 'reverb', wet: 0.3, params: { decay: 3 } }],
    drumsFx: [{ type: 'compressor', wet: 1, params: { threshold: -16, ratio: 3 } }],
    countermelodyFx: [{ type: 'tremolo', wet: 0.1, params: { frequency: 4, depth: 0.2 } }, { type: 'reverb', wet: 0.25, params: { decay: 2.5 } }],
    melodyVol: 0.76, harmonyVol: 0.52, bassVol: 0.7, arpeggioVol: 0.32, drumsVol: 0.5, countermelodyVol: 0.38,
  },
  ambient: {
    melody: 'pads', harmony: 'analog_pad', bass: 'bass', arpeggio: 'bells', countermelody: 'kalimba',
    melodyFx: [{ type: 'reverb', wet: 0.6, params: { decay: 8 } }, { type: 'delay', wet: 0.4, params: { delayTime: 0.6, feedback: 0.5 } }],
    harmonyFx: [{ type: 'reverb', wet: 0.7, params: { decay: 10 } }, { type: 'chorus', wet: 0.3, params: { frequency: 0.3, depth: 0.8 } }],
    bassFx: [{ type: 'reverb', wet: 0.3, params: { decay: 4 } }, { type: 'filter', wet: 1, params: { frequency: 500 } }],
    arpeggioFx: [{ type: 'delay', wet: 0.5, params: { delayTime: 0.75, feedback: 0.55 } }, { type: 'reverb', wet: 0.6, params: { decay: 8 } }],
    drumsFx: [{ type: 'reverb', wet: 0.4, params: { decay: 5 } }],
    countermelodyFx: [{ type: 'delay', wet: 0.5, params: { delayTime: 0.75, feedback: 0.5 } }, { type: 'reverb', wet: 0.6, params: { decay: 7 } }],
    melodyVol: 0.65, harmonyVol: 0.55, bassVol: 0.5, arpeggioVol: 0.4, drumsVol: 0.3, countermelodyVol: 0.35,
  },
  minimalist: {
    melody: 'piano', harmony: 'piano', bass: 'bass', arpeggio: 'bells', countermelody: 'marimba',
    melodyFx: [{ type: 'reverb', wet: 0.2, params: { decay: 2 } }],
    harmonyFx: [{ type: 'reverb', wet: 0.2, params: { decay: 2 } }],
    bassFx: [{ type: 'compressor', wet: 1, params: { threshold: -20, ratio: 3 } }],
    arpeggioFx: [{ type: 'reverb', wet: 0.25, params: { decay: 2.5 } }],
    drumsFx: [{ type: 'compressor', wet: 1, params: { threshold: -15, ratio: 2 } }],
    countermelodyFx: [{ type: 'reverb', wet: 0.25, params: { decay: 2.5 } }],
    melodyVol: 0.75, harmonyVol: 0.5, bassVol: 0.6, arpeggioVol: 0.35, drumsVol: 0.35, countermelodyVol: 0.42,
  },
  cinematic: {
    melody: 'strings', harmony: 'strings', bass: 'bass', arpeggio: 'piano', countermelody: 'piano',
    melodyFx: [{ type: 'reverb', wet: 0.45, params: { decay: 5 } }],
    harmonyFx: [{ type: 'reverb', wet: 0.55, params: { decay: 6 } }, { type: 'chorus', wet: 0.2, params: { frequency: 0.5, depth: 0.6 } }],
    bassFx: [{ type: 'compressor', wet: 1, params: { threshold: -18, ratio: 4 } }, { type: 'eq', wet: 1, params: { low: 4, mid: -2, high: -6 } }],
    arpeggioFx: [{ type: 'reverb', wet: 0.4, params: { decay: 4 } }, { type: 'delay', wet: 0.2, params: { delayTime: 0.5, feedback: 0.3 } }],
    drumsFx: [{ type: 'compressor', wet: 1, params: { threshold: -12, ratio: 4 } }, { type: 'reverb', wet: 0.2, params: { decay: 3 } }],
    countermelodyFx: [{ type: 'reverb', wet: 0.4, params: { decay: 4.5 } }],
    melodyVol: 0.82, harmonyVol: 0.65, bassVol: 0.7, arpeggioVol: 0.35, drumsVol: 0.55, countermelodyVol: 0.48,
  },
  electronic: {
    melody: 'synth_lead', harmony: 'pads', bass: 'bass', arpeggio: 'bells', countermelody: 'synth_lead',
    melodyFx: [{ type: 'delay', wet: 0.25, params: { delayTime: 0.25, feedback: 0.3 } }, { type: 'reverb', wet: 0.2, params: { decay: 2 } }],
    harmonyFx: [{ type: 'chorus', wet: 0.3, params: { frequency: 2, depth: 0.7 } }, { type: 'reverb', wet: 0.35, params: { decay: 4 } }],
    bassFx: [{ type: 'compressor', wet: 1, params: { threshold: -15, ratio: 5 } }, { type: 'distortion', wet: 0.1, params: { amount: 0.2 } }],
    arpeggioFx: [{ type: 'delay', wet: 0.4, params: { delayTime: 0.1875, feedback: 0.45 } }, { type: 'filter', wet: 1, params: { frequency: 3000 } }],
    drumsFx: [{ type: 'compressor', wet: 1, params: { threshold: -10, ratio: 5 } }],
    countermelodyFx: [{ type: 'delay', wet: 0.3, params: { delayTime: 0.333, feedback: 0.35 } }, { type: 'filter', wet: 1, params: { frequency: 4000 } }],
    melodyVol: 0.8, harmonyVol: 0.5, bassVol: 0.75, arpeggioVol: 0.4, drumsVol: 0.6, countermelodyVol: 0.35,
  },
  bossa_nova: {
    melody: 'nylon_guitar', harmony: 'warm_rhodes', bass: 'upright_bass', arpeggio: 'vibraphone', countermelody: 'fingerstyle_guitar',
    melodyFx: [{ type: 'reverb', wet: 0.2, params: { decay: 2 } }, { type: 'chorus', wet: 0.08, params: { frequency: 0.6, depth: 0.3 } }],
    harmonyFx: [{ type: 'tremolo', wet: 0.1, params: { frequency: 4, depth: 0.2 } }, { type: 'reverb', wet: 0.25, params: { decay: 2.5 } }],
    bassFx: [{ type: 'compressor', wet: 1, params: { threshold: -16, ratio: 3 } }, { type: 'eq', wet: 1, params: { low: 2, mid: 1, high: -3 } }],
    arpeggioFx: [{ type: 'reverb', wet: 0.3, params: { decay: 3 } }, { type: 'tremolo', wet: 0.12, params: { frequency: 5, depth: 0.2 } }],
    drumsFx: [{ type: 'compressor', wet: 1, params: { threshold: -18, ratio: 2.5 } }, { type: 'reverb', wet: 0.1, params: { decay: 1.5 } }],
    countermelodyFx: [{ type: 'reverb', wet: 0.2, params: { decay: 2 } }],
    melodyVol: 0.78, harmonyVol: 0.48, bassVol: 0.7, arpeggioVol: 0.28, drumsVol: 0.42, countermelodyVol: 0.35,
  },
  lo_fi: {
    melody: 'tape_keys', harmony: 'warm_rhodes', bass: 'bass', arpeggio: 'vibraphone', countermelody: 'kalimba',
    melodyFx: [{ type: 'bitcrusher', wet: 0.12, params: { bits: 12 } }, { type: 'reverb', wet: 0.3, params: { decay: 3 } }, { type: 'chorus', wet: 0.1, params: { frequency: 0.5, depth: 0.4 } }],
    harmonyFx: [{ type: 'filter', wet: 1, params: { frequency: 2500 } }, { type: 'reverb', wet: 0.35, params: { decay: 3.5 } }],
    bassFx: [{ type: 'compressor', wet: 1, params: { threshold: -18, ratio: 4 } }, { type: 'filter', wet: 1, params: { frequency: 600 } }],
    arpeggioFx: [{ type: 'bitcrusher', wet: 0.08, params: { bits: 14 } }, { type: 'delay', wet: 0.3, params: { delayTime: 0.375, feedback: 0.35 } }, { type: 'reverb', wet: 0.35, params: { decay: 3.5 } }],
    drumsFx: [{ type: 'bitcrusher', wet: 0.15, params: { bits: 10 } }, { type: 'compressor', wet: 1, params: { threshold: -14, ratio: 3 } }],
    countermelodyFx: [{ type: 'bitcrusher', wet: 0.06, params: { bits: 14 } }, { type: 'delay', wet: 0.3, params: { delayTime: 0.5, feedback: 0.3 } }, { type: 'reverb', wet: 0.3, params: { decay: 3 } }],
    melodyVol: 0.72, harmonyVol: 0.48, bassVol: 0.68, arpeggioVol: 0.32, drumsVol: 0.45, countermelodyVol: 0.3,
  },
  gospel: {
    melody: 'piano', harmony: 'organ', bass: 'bass', arpeggio: 'piano', countermelody: 'organ',
    melodyFx: [{ type: 'reverb', wet: 0.3, params: { decay: 3 } }],
    harmonyFx: [{ type: 'reverb', wet: 0.35, params: { decay: 3.5 } }, { type: 'tremolo', wet: 0.08, params: { frequency: 5.5, depth: 0.15 } }],
    bassFx: [{ type: 'compressor', wet: 1, params: { threshold: -18, ratio: 4 } }],
    arpeggioFx: [{ type: 'reverb', wet: 0.3, params: { decay: 3 } }],
    drumsFx: [{ type: 'compressor', wet: 1, params: { threshold: -14, ratio: 3.5 } }, { type: 'reverb', wet: 0.1, params: { decay: 2 } }],
    countermelodyFx: [{ type: 'reverb', wet: 0.3, params: { decay: 3 } }, { type: 'tremolo', wet: 0.06, params: { frequency: 5, depth: 0.12 } }],
    melodyVol: 0.82, harmonyVol: 0.6, bassVol: 0.72, arpeggioVol: 0.3, drumsVol: 0.55, countermelodyVol: 0.42,
  },
  // New styles
  late_night: {
    melody: 'warm_rhodes', harmony: 'warm_rhodes', bass: 'upright_bass', arpeggio: 'vibraphone', countermelody: 'muted_trumpet',
    melodyFx: [{ type: 'reverb', wet: 0.3, params: { decay: 3 } }, { type: 'chorus', wet: 0.08, params: { frequency: 0.6, depth: 0.3 } }, { type: 'saturator', wet: 0.08, params: { amount: 0.1 } }],
    harmonyFx: [{ type: 'tremolo', wet: 0.06, params: { frequency: 3, depth: 0.15 } }, { type: 'reverb', wet: 0.3, params: { decay: 3 } }],
    bassFx: [{ type: 'compressor', wet: 1, params: { threshold: -16, ratio: 3 } }, { type: 'eq', wet: 1, params: { low: 3, mid: 1, high: -5 } }],
    arpeggioFx: [{ type: 'reverb', wet: 0.35, params: { decay: 3 } }, { type: 'tremolo', wet: 0.1, params: { frequency: 4.5, depth: 0.2 } }],
    drumsFx: [{ type: 'compressor', wet: 1, params: { threshold: -20, ratio: 2 } }, { type: 'reverb', wet: 0.15, params: { decay: 1.8 } }],
    countermelodyFx: [{ type: 'reverb', wet: 0.25, params: { decay: 2.5 } }, { type: 'filter', wet: 1, params: { frequency: 2500 } }],
    melodyVol: 0.72, harmonyVol: 0.45, bassVol: 0.68, arpeggioVol: 0.25, drumsVol: 0.38, countermelodyVol: 0.4,
  },
  afrobeat: {
    melody: 'organ', harmony: 'clavinet', bass: 'bass', arpeggio: 'marimba', countermelody: 'muted_trumpet',
    melodyFx: [{ type: 'tremolo', wet: 0.1, params: { frequency: 5, depth: 0.2 } }, { type: 'reverb', wet: 0.15, params: { decay: 1.5 } }],
    harmonyFx: [{ type: 'phaser', wet: 0.12, params: { frequency: 0.5, octaves: 2, baseFrequency: 500 } }, { type: 'reverb', wet: 0.1, params: { decay: 1.5 } }],
    bassFx: [{ type: 'compressor', wet: 1, params: { threshold: -14, ratio: 5 } }, { type: 'eq', wet: 1, params: { low: 4, mid: 0, high: -3 } }],
    arpeggioFx: [{ type: 'reverb', wet: 0.15, params: { decay: 1.5 } }],
    drumsFx: [{ type: 'compressor', wet: 1, params: { threshold: -12, ratio: 4 } }],
    countermelodyFx: [{ type: 'reverb', wet: 0.15, params: { decay: 1.5 } }, { type: 'filter', wet: 1, params: { frequency: 3500 } }],
    melodyVol: 0.78, harmonyVol: 0.55, bassVol: 0.8, arpeggioVol: 0.4, drumsVol: 0.65, countermelodyVol: 0.45,
  },
  contemporary_rnb: {
    melody: 'warm_rhodes', harmony: 'analog_pad', bass: 'fretless_bass', arpeggio: 'kalimba', countermelody: 'wurlitzer',
    melodyFx: [{ type: 'chorus', wet: 0.12, params: { frequency: 0.8, depth: 0.4 } }, { type: 'reverb', wet: 0.3, params: { decay: 3 } }],
    harmonyFx: [{ type: 'filter', wet: 1, params: { frequency: 3000 } }, { type: 'reverb', wet: 0.4, params: { decay: 4 } }, { type: 'widener', wet: 0.15, params: { depth: 0.6 } }],
    bassFx: [{ type: 'compressor', wet: 1, params: { threshold: -16, ratio: 4 } }, { type: 'saturator', wet: 0.1, params: { amount: 0.12 } }],
    arpeggioFx: [{ type: 'delay', wet: 0.3, params: { delayTime: 0.333, feedback: 0.3 } }, { type: 'reverb', wet: 0.3, params: { decay: 3 } }],
    drumsFx: [{ type: 'compressor', wet: 1, params: { threshold: -14, ratio: 3.5 } }],
    countermelodyFx: [{ type: 'phaser', wet: 0.1, params: { frequency: 0.4, octaves: 2, baseFrequency: 350 } }, { type: 'reverb', wet: 0.25, params: { decay: 2.5 } }],
    melodyVol: 0.75, harmonyVol: 0.5, bassVol: 0.72, arpeggioVol: 0.3, drumsVol: 0.52, countermelodyVol: 0.38,
  },
};

export function compose(params: CompositionParams): Composition {
  const tensionArc = generateTensionArc(params);

  const chords = generateChordProgression(
    params.key,
    params.scale,
    params.measures,
    params.style,
    params.harmonicComplexity,
    params.timeSignature,
  );

  const sv = STYLE_VOICINGS[params.style];
  const beatsPerBar = params.timeSignature[0];

  const melodyNotes = humanizeTrack(generateMelody(params, chords, [4, 6], tensionArc), params.style, 'Melody', beatsPerBar);
  const bassNotes = humanizeTrack(generateBassLine(params, chords), params.style, 'Bass', beatsPerBar);
  const padNotes = humanizeTrack(generatePadVoicings(params, chords), params.style, 'Harmony', beatsPerBar);
  const arpeggioNotes = humanizeTrack(generateArpeggio(params, chords), params.style, 'Arpeggio', beatsPerBar);
  const drumNotes = humanizeTrack(generateDrumPattern(params), params.style, 'Drums', beatsPerBar);
  const countermelodyNotes = humanizeTrack(generateCounterMelody(params, chords, melodyNotes, tensionArc), params.style, 'Counter', beatsPerBar);

  const tracks: Track[] = [
    {
      id: makeTrackId(),
      name: 'Melody',
      instrument: sv.melody,
      notes: melodyNotes,
      volume: sv.melodyVol,
      pan: 0,
      muted: false,
      solo: false,
      color: TRACK_COLORS.melody,
      effects: sv.melodyFx,
    },
    {
      id: makeTrackId(),
      name: 'Counter',
      instrument: sv.countermelody,
      notes: countermelodyNotes,
      volume: sv.countermelodyVol,
      pan: 0.15,
      muted: false,
      solo: false,
      color: TRACK_COLORS.countermelody,
      effects: sv.countermelodyFx,
    },
    {
      id: makeTrackId(),
      name: 'Harmony',
      instrument: sv.harmony,
      notes: padNotes,
      volume: sv.harmonyVol,
      pan: -0.2,
      muted: false,
      solo: false,
      color: TRACK_COLORS.harmony,
      effects: sv.harmonyFx,
    },
    {
      id: makeTrackId(),
      name: 'Bass',
      instrument: sv.bass,
      notes: bassNotes,
      volume: sv.bassVol,
      pan: 0,
      muted: false,
      solo: false,
      color: TRACK_COLORS.bass,
      effects: sv.bassFx,
    },
    {
      id: makeTrackId(),
      name: 'Arpeggio',
      instrument: sv.arpeggio,
      notes: arpeggioNotes,
      volume: sv.arpeggioVol,
      pan: 0.3,
      muted: false,
      solo: false,
      color: TRACK_COLORS.arpeggio,
      effects: sv.arpeggioFx,
    },
    {
      id: makeTrackId(),
      name: 'Drums',
      instrument: 'drums',
      notes: drumNotes,
      volume: sv.drumsVol,
      pan: 0,
      muted: false,
      solo: false,
      color: TRACK_COLORS.drums,
      effects: sv.drumsFx,
    },
  ];

  const scaleLabel = params.scale.replace(/_/g, ' ');
  return {
    id: Math.random().toString(36).slice(2, 10),
    name: `Composition in ${params.key} ${scaleLabel}`,
    params,
    tracks,
    chordProgression: chords,
    createdAt: Date.now(),
  };
}

export function recomposeTrack(
  composition: Composition,
  trackIndex: number,
): Track {
  const track = composition.tracks[trackIndex];
  const { params, chordProgression } = composition;
  const beatsPerBar = params.timeSignature[0];
  const tensionArc = generateTensionArc(params);

  let newNotes;
  switch (track.name) {
    case 'Melody': newNotes = generateMelody(params, chordProgression, [4, 6], tensionArc); break;
    case 'Bass': newNotes = generateBassLine(params, chordProgression); break;
    case 'Harmony': newNotes = generatePadVoicings(params, chordProgression); break;
    case 'Arpeggio': newNotes = generateArpeggio(params, chordProgression); break;
    case 'Drums': newNotes = generateDrumPattern(params); break;
    case 'Counter': {
      const melodyTrack = composition.tracks.find(t => t.name === 'Melody');
      const melodyNotes = melodyTrack ? melodyTrack.notes : [];
      newNotes = generateCounterMelody(params, chordProgression, melodyNotes, tensionArc);
      break;
    }
    default: newNotes = generateMelody(params, chordProgression);
  }

  newNotes = humanizeTrack(newNotes, params.style, track.name, beatsPerBar);

  return { ...track, notes: newNotes };
}
