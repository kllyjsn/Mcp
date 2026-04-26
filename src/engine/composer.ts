import type { Composition, CompositionParams, CompositionStyle, InstrumentType, Track, TrackEffect } from '../types/music';
import { generateChordProgression } from './chords';
import { generateMelody, generateBassLine, generatePadVoicings, generateArpeggio, generateDrumPattern, generateCountermelody } from './melody';
import { humanizeTrack } from './humanize';

const TRACK_COLORS: Record<string, string> = {
  melody: '#C8A97E',
  countermelody: '#A87EC8',
  harmony: '#7E9CC8',
  bass: '#8B5E3C',
  pads: '#6B8E7E',
  arpeggio: '#C87E9C',
  drums: '#9C8B7E',
};

function makeTrackId(): string {
  return Math.random().toString(36).slice(2, 10);
}

interface StyleVoicing {
  melody: InstrumentType;
  countermelody: InstrumentType;
  harmony: InstrumentType;
  bass: InstrumentType;
  arpeggio: InstrumentType;
  melodyFx: TrackEffect[];
  countermelodyFx: TrackEffect[];
  harmonyFx: TrackEffect[];
  bassFx: TrackEffect[];
  arpeggioFx: TrackEffect[];
  drumsFx: TrackEffect[];
  melodyVol: number;
  countermelodyVol: number;
  harmonyVol: number;
  bassVol: number;
  arpeggioVol: number;
  drumsVol: number;
}

const DEFAULT_CM_FX: TrackEffect[] = [
  { type: 'reverb', wet: 0.35, params: { decay: 3 } },
  { type: 'chorus', wet: 0.15, params: { frequency: 0.8, depth: 0.4 } },
];

const STYLE_VOICINGS: Record<CompositionStyle, StyleVoicing> = {
  classical: {
    melody: 'piano', countermelody: 'woodwind', harmony: 'strings', bass: 'bass', arpeggio: 'bells',
    melodyFx: [{ type: 'reverb', wet: 0.25, params: { decay: 2.5 } }],
    countermelodyFx: DEFAULT_CM_FX,
    harmonyFx: [{ type: 'reverb', wet: 0.4, params: { decay: 4 } }, { type: 'chorus', wet: 0.15, params: { frequency: 1.2, depth: 0.5 } }],
    bassFx: [{ type: 'compressor', wet: 1, params: { threshold: -20, ratio: 4 } }],
    arpeggioFx: [{ type: 'delay', wet: 0.3, params: { delayTime: 0.375, feedback: 0.3 } }, { type: 'reverb', wet: 0.3, params: { decay: 3 } }],
    drumsFx: [{ type: 'compressor', wet: 1, params: { threshold: -15, ratio: 3 } }],
    melodyVol: 0.8, countermelodyVol: 0.4, harmonyVol: 0.55, bassVol: 0.7, arpeggioVol: 0.35, drumsVol: 0.5,
  },
  romantic: {
    melody: 'piano', countermelody: 'cello', harmony: 'strings', bass: 'bass', arpeggio: 'bells',
    melodyFx: [{ type: 'reverb', wet: 0.35, params: { decay: 3.5 } }],
    countermelodyFx: [{ type: 'reverb', wet: 0.4, params: { decay: 4 } }, { type: 'chorus', wet: 0.2, params: { frequency: 0.6, depth: 0.5 } }],
    harmonyFx: [{ type: 'reverb', wet: 0.5, params: { decay: 5 } }, { type: 'chorus', wet: 0.25, params: { frequency: 1, depth: 0.7 } }],
    bassFx: [{ type: 'compressor', wet: 1, params: { threshold: -18, ratio: 3 } }],
    arpeggioFx: [{ type: 'delay', wet: 0.35, params: { delayTime: 0.5, feedback: 0.4 } }, { type: 'reverb', wet: 0.4, params: { decay: 4 } }],
    drumsFx: [{ type: 'compressor', wet: 1, params: { threshold: -15, ratio: 3 } }],
    melodyVol: 0.82, countermelodyVol: 0.42, harmonyVol: 0.6, bassVol: 0.65, arpeggioVol: 0.3, drumsVol: 0.4,
  },
  post_romantic: {
    melody: 'piano', countermelody: 'cello', harmony: 'strings', bass: 'bass', arpeggio: 'bells',
    melodyFx: [{ type: 'reverb', wet: 0.4, params: { decay: 4 } }],
    countermelodyFx: [{ type: 'reverb', wet: 0.45, params: { decay: 4.5 } }],
    harmonyFx: [{ type: 'reverb', wet: 0.55, params: { decay: 5.5 } }, { type: 'chorus', wet: 0.2, params: { frequency: 0.8, depth: 0.6 } }],
    bassFx: [{ type: 'compressor', wet: 1, params: { threshold: -18, ratio: 3.5 } }],
    arpeggioFx: [{ type: 'delay', wet: 0.3, params: { delayTime: 0.4, feedback: 0.35 } }, { type: 'reverb', wet: 0.4, params: { decay: 4 } }],
    drumsFx: [{ type: 'compressor', wet: 1, params: { threshold: -15, ratio: 3 } }],
    melodyVol: 0.82, countermelodyVol: 0.45, harmonyVol: 0.6, bassVol: 0.68, arpeggioVol: 0.32, drumsVol: 0.38,
  },
  impressionist: {
    melody: 'piano', countermelody: 'woodwind', harmony: 'pads', bass: 'bass', arpeggio: 'vibraphone',
    melodyFx: [{ type: 'reverb', wet: 0.45, params: { decay: 4 } }, { type: 'chorus', wet: 0.15, params: { frequency: 0.8, depth: 0.4 } }],
    countermelodyFx: [{ type: 'reverb', wet: 0.5, params: { decay: 5 } }],
    harmonyFx: [{ type: 'reverb', wet: 0.55, params: { decay: 6 } }],
    bassFx: [{ type: 'compressor', wet: 1, params: { threshold: -20, ratio: 3 } }, { type: 'reverb', wet: 0.15, params: { decay: 2 } }],
    arpeggioFx: [{ type: 'reverb', wet: 0.5, params: { decay: 5 } }, { type: 'tremolo', wet: 0.2, params: { frequency: 3, depth: 0.3 } }],
    drumsFx: [{ type: 'reverb', wet: 0.3, params: { decay: 3 } }],
    melodyVol: 0.75, countermelodyVol: 0.38, harmonyVol: 0.5, bassVol: 0.6, arpeggioVol: 0.4, drumsVol: 0.35,
  },
  jazz: {
    melody: 'electric_piano', countermelody: 'woodwind', harmony: 'electric_piano', bass: 'upright_bass', arpeggio: 'vibraphone',
    melodyFx: [{ type: 'reverb', wet: 0.2, params: { decay: 2 } }, { type: 'chorus', wet: 0.1, params: { frequency: 0.8, depth: 0.3 } }],
    countermelodyFx: [{ type: 'reverb', wet: 0.25, params: { decay: 2.5 } }],
    harmonyFx: [{ type: 'reverb', wet: 0.25, params: { decay: 2.5 } }, { type: 'tremolo', wet: 0.08, params: { frequency: 3.5, depth: 0.2 } }],
    bassFx: [{ type: 'compressor', wet: 1, params: { threshold: -16, ratio: 3 } }, { type: 'eq', wet: 1, params: { low: 3, mid: 0, high: -4 } }],
    arpeggioFx: [{ type: 'reverb', wet: 0.3, params: { decay: 2.5 } }, { type: 'tremolo', wet: 0.15, params: { frequency: 5, depth: 0.25 } }],
    drumsFx: [{ type: 'compressor', wet: 1, params: { threshold: -18, ratio: 2.5 } }, { type: 'reverb', wet: 0.12, params: { decay: 1.5 } }],
    melodyVol: 0.78, countermelodyVol: 0.35, harmonyVol: 0.5, bassVol: 0.72, arpeggioVol: 0.3, drumsVol: 0.52,
  },
  modal_jazz: {
    melody: 'electric_piano', countermelody: 'woodwind', harmony: 'electric_piano', bass: 'upright_bass', arpeggio: 'vibraphone',
    melodyFx: [{ type: 'reverb', wet: 0.25, params: { decay: 2.5 } }],
    countermelodyFx: [{ type: 'reverb', wet: 0.3, params: { decay: 3 } }],
    harmonyFx: [{ type: 'reverb', wet: 0.3, params: { decay: 3 } }],
    bassFx: [{ type: 'compressor', wet: 1, params: { threshold: -16, ratio: 3 } }],
    arpeggioFx: [{ type: 'reverb', wet: 0.35, params: { decay: 3 } }, { type: 'tremolo', wet: 0.1, params: { frequency: 4, depth: 0.2 } }],
    drumsFx: [{ type: 'compressor', wet: 1, params: { threshold: -18, ratio: 2.5 } }, { type: 'reverb', wet: 0.15, params: { decay: 2 } }],
    melodyVol: 0.76, countermelodyVol: 0.36, harmonyVol: 0.48, bassVol: 0.72, arpeggioVol: 0.3, drumsVol: 0.5,
  },
  neo_soul: {
    melody: 'electric_piano', countermelody: 'woodwind', harmony: 'electric_piano', bass: 'bass', arpeggio: 'vibraphone',
    melodyFx: [{ type: 'phaser', wet: 0.15, params: { frequency: 0.3, octaves: 2, baseFrequency: 400 } }, { type: 'reverb', wet: 0.25, params: { decay: 2.5 } }],
    countermelodyFx: [{ type: 'reverb', wet: 0.3, params: { decay: 3 } }, { type: 'phaser', wet: 0.1, params: { frequency: 0.4, octaves: 2 } }],
    harmonyFx: [{ type: 'chorus', wet: 0.2, params: { frequency: 1.2, depth: 0.5 } }, { type: 'reverb', wet: 0.3, params: { decay: 3 } }],
    bassFx: [{ type: 'compressor', wet: 1, params: { threshold: -18, ratio: 4 } }, { type: 'filter', wet: 1, params: { frequency: 800 } }],
    arpeggioFx: [{ type: 'delay', wet: 0.25, params: { delayTime: 0.375, feedback: 0.3 } }, { type: 'reverb', wet: 0.3, params: { decay: 3 } }],
    drumsFx: [{ type: 'compressor', wet: 1, params: { threshold: -16, ratio: 3 } }],
    melodyVol: 0.76, countermelodyVol: 0.36, harmonyVol: 0.52, bassVol: 0.7, arpeggioVol: 0.32, drumsVol: 0.5,
  },
  ambient: {
    melody: 'pads', countermelody: 'bells', harmony: 'pads', bass: 'bass', arpeggio: 'bells',
    melodyFx: [{ type: 'reverb', wet: 0.6, params: { decay: 8 } }, { type: 'delay', wet: 0.4, params: { delayTime: 0.6, feedback: 0.5 } }],
    countermelodyFx: [{ type: 'reverb', wet: 0.7, params: { decay: 9 } }, { type: 'delay', wet: 0.35, params: { delayTime: 0.75, feedback: 0.4 } }],
    harmonyFx: [{ type: 'reverb', wet: 0.7, params: { decay: 10 } }, { type: 'chorus', wet: 0.3, params: { frequency: 0.3, depth: 0.8 } }],
    bassFx: [{ type: 'reverb', wet: 0.3, params: { decay: 4 } }, { type: 'filter', wet: 1, params: { frequency: 500 } }],
    arpeggioFx: [{ type: 'delay', wet: 0.5, params: { delayTime: 0.75, feedback: 0.55 } }, { type: 'reverb', wet: 0.6, params: { decay: 8 } }],
    drumsFx: [{ type: 'reverb', wet: 0.4, params: { decay: 5 } }],
    melodyVol: 0.65, countermelodyVol: 0.3, harmonyVol: 0.55, bassVol: 0.5, arpeggioVol: 0.4, drumsVol: 0.3,
  },
  minimalist: {
    melody: 'piano', countermelody: 'piano', harmony: 'piano', bass: 'bass', arpeggio: 'bells',
    melodyFx: [{ type: 'reverb', wet: 0.2, params: { decay: 2 } }],
    countermelodyFx: [{ type: 'reverb', wet: 0.25, params: { decay: 2.5 } }],
    harmonyFx: [{ type: 'reverb', wet: 0.2, params: { decay: 2 } }],
    bassFx: [{ type: 'compressor', wet: 1, params: { threshold: -20, ratio: 3 } }],
    arpeggioFx: [{ type: 'reverb', wet: 0.25, params: { decay: 2.5 } }],
    drumsFx: [{ type: 'compressor', wet: 1, params: { threshold: -15, ratio: 2 } }],
    melodyVol: 0.75, countermelodyVol: 0.35, harmonyVol: 0.5, bassVol: 0.6, arpeggioVol: 0.35, drumsVol: 0.35,
  },
  cinematic: {
    melody: 'strings', countermelody: 'woodwind', harmony: 'strings', bass: 'bass', arpeggio: 'piano',
    melodyFx: [{ type: 'reverb', wet: 0.45, params: { decay: 5 } }],
    countermelodyFx: [{ type: 'reverb', wet: 0.5, params: { decay: 5.5 } }],
    harmonyFx: [{ type: 'reverb', wet: 0.55, params: { decay: 6 } }, { type: 'chorus', wet: 0.2, params: { frequency: 0.5, depth: 0.6 } }],
    bassFx: [{ type: 'compressor', wet: 1, params: { threshold: -18, ratio: 4 } }, { type: 'eq', wet: 1, params: { low: 4, mid: -2, high: -6 } }],
    arpeggioFx: [{ type: 'reverb', wet: 0.4, params: { decay: 4 } }, { type: 'delay', wet: 0.2, params: { delayTime: 0.5, feedback: 0.3 } }],
    drumsFx: [{ type: 'compressor', wet: 1, params: { threshold: -12, ratio: 4 } }, { type: 'reverb', wet: 0.2, params: { decay: 3 } }],
    melodyVol: 0.82, countermelodyVol: 0.4, harmonyVol: 0.65, bassVol: 0.7, arpeggioVol: 0.35, drumsVol: 0.55,
  },
  electronic: {
    melody: 'synth_lead', countermelody: 'bells', harmony: 'pads', bass: 'bass', arpeggio: 'bells',
    melodyFx: [{ type: 'delay', wet: 0.25, params: { delayTime: 0.25, feedback: 0.3 } }, { type: 'reverb', wet: 0.2, params: { decay: 2 } }],
    countermelodyFx: [{ type: 'delay', wet: 0.3, params: { delayTime: 0.375, feedback: 0.35 } }],
    harmonyFx: [{ type: 'chorus', wet: 0.3, params: { frequency: 2, depth: 0.7 } }, { type: 'reverb', wet: 0.35, params: { decay: 4 } }],
    bassFx: [{ type: 'compressor', wet: 1, params: { threshold: -15, ratio: 5 } }, { type: 'distortion', wet: 0.1, params: { amount: 0.2 } }],
    arpeggioFx: [{ type: 'delay', wet: 0.4, params: { delayTime: 0.1875, feedback: 0.45 } }, { type: 'filter', wet: 1, params: { frequency: 3000 } }],
    drumsFx: [{ type: 'compressor', wet: 1, params: { threshold: -10, ratio: 5 } }],
    melodyVol: 0.8, countermelodyVol: 0.35, harmonyVol: 0.5, bassVol: 0.75, arpeggioVol: 0.4, drumsVol: 0.6,
  },
  bossa_nova: {
    melody: 'nylon_guitar', countermelody: 'woodwind', harmony: 'electric_piano', bass: 'upright_bass', arpeggio: 'vibraphone',
    melodyFx: [{ type: 'reverb', wet: 0.2, params: { decay: 2 } }, { type: 'chorus', wet: 0.08, params: { frequency: 0.6, depth: 0.3 } }],
    countermelodyFx: [{ type: 'reverb', wet: 0.25, params: { decay: 2.5 } }],
    harmonyFx: [{ type: 'tremolo', wet: 0.1, params: { frequency: 4, depth: 0.2 } }, { type: 'reverb', wet: 0.25, params: { decay: 2.5 } }],
    bassFx: [{ type: 'compressor', wet: 1, params: { threshold: -16, ratio: 3 } }, { type: 'eq', wet: 1, params: { low: 2, mid: 1, high: -3 } }],
    arpeggioFx: [{ type: 'reverb', wet: 0.3, params: { decay: 3 } }, { type: 'tremolo', wet: 0.12, params: { frequency: 5, depth: 0.2 } }],
    drumsFx: [{ type: 'compressor', wet: 1, params: { threshold: -18, ratio: 2.5 } }, { type: 'reverb', wet: 0.1, params: { decay: 1.5 } }],
    melodyVol: 0.78, countermelodyVol: 0.35, harmonyVol: 0.48, bassVol: 0.7, arpeggioVol: 0.28, drumsVol: 0.42,
  },
  lo_fi: {
    melody: 'tape_keys', countermelody: 'vibraphone', harmony: 'electric_piano', bass: 'bass', arpeggio: 'vibraphone',
    melodyFx: [{ type: 'bitcrusher', wet: 0.12, params: { bits: 12 } }, { type: 'reverb', wet: 0.3, params: { decay: 3 } }, { type: 'chorus', wet: 0.1, params: { frequency: 0.5, depth: 0.4 } }],
    countermelodyFx: [{ type: 'bitcrusher', wet: 0.08, params: { bits: 14 } }, { type: 'reverb', wet: 0.35, params: { decay: 3.5 } }],
    harmonyFx: [{ type: 'filter', wet: 1, params: { frequency: 2500 } }, { type: 'reverb', wet: 0.35, params: { decay: 3.5 } }],
    bassFx: [{ type: 'compressor', wet: 1, params: { threshold: -18, ratio: 4 } }, { type: 'filter', wet: 1, params: { frequency: 600 } }],
    arpeggioFx: [{ type: 'bitcrusher', wet: 0.08, params: { bits: 14 } }, { type: 'delay', wet: 0.3, params: { delayTime: 0.375, feedback: 0.35 } }, { type: 'reverb', wet: 0.35, params: { decay: 3.5 } }],
    drumsFx: [{ type: 'bitcrusher', wet: 0.15, params: { bits: 10 } }, { type: 'compressor', wet: 1, params: { threshold: -14, ratio: 3 } }],
    melodyVol: 0.72, countermelodyVol: 0.32, harmonyVol: 0.48, bassVol: 0.68, arpeggioVol: 0.32, drumsVol: 0.45,
  },
  gospel: {
    melody: 'piano', countermelody: 'organ', harmony: 'organ', bass: 'bass', arpeggio: 'piano',
    melodyFx: [{ type: 'reverb', wet: 0.3, params: { decay: 3 } }],
    countermelodyFx: [{ type: 'reverb', wet: 0.35, params: { decay: 3.5 } }, { type: 'tremolo', wet: 0.08, params: { frequency: 5.5, depth: 0.15 } }],
    harmonyFx: [{ type: 'reverb', wet: 0.35, params: { decay: 3.5 } }, { type: 'tremolo', wet: 0.08, params: { frequency: 5.5, depth: 0.15 } }],
    bassFx: [{ type: 'compressor', wet: 1, params: { threshold: -18, ratio: 4 } }],
    arpeggioFx: [{ type: 'reverb', wet: 0.3, params: { decay: 3 } }],
    drumsFx: [{ type: 'compressor', wet: 1, params: { threshold: -14, ratio: 3.5 } }, { type: 'reverb', wet: 0.1, params: { decay: 2 } }],
    melodyVol: 0.82, countermelodyVol: 0.4, harmonyVol: 0.6, bassVol: 0.72, arpeggioVol: 0.3, drumsVol: 0.55,
  },
};

export function compose(params: CompositionParams): Composition {
  const beatsPerBar = params.timeSignature[0];

  const chords = generateChordProgression(
    params.key,
    params.scale,
    params.measures,
    params.style,
    params.harmonicComplexity,
    beatsPerBar,
  );

  const sv = STYLE_VOICINGS[params.style];

  const melodyNotes = humanizeTrack(generateMelody(params, chords, [4, 6]), params.style, 'Melody', beatsPerBar);
  const countermelodyNotes = humanizeTrack(generateCountermelody(params, chords, melodyNotes), params.style, 'Countermelody', beatsPerBar);
  const bassNotes = humanizeTrack(generateBassLine(params, chords), params.style, 'Bass', beatsPerBar);
  const padNotes = humanizeTrack(generatePadVoicings(params, chords), params.style, 'Harmony', beatsPerBar);
  const arpeggioNotes = humanizeTrack(generateArpeggio(params, chords), params.style, 'Arpeggio', beatsPerBar);
  const drumNotes = humanizeTrack(generateDrumPattern(params), params.style, 'Drums', beatsPerBar);

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
      name: 'Countermelody',
      instrument: sv.countermelody,
      notes: countermelodyNotes,
      volume: sv.countermelodyVol,
      pan: 0.25,
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

  return {
    id: Math.random().toString(36).slice(2, 10),
    name: `Composition in ${params.key} ${params.scale}`,
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

  let newNotes;
  switch (track.name) {
    case 'Melody': newNotes = humanizeTrack(generateMelody(params, chordProgression, [4, 6]), params.style, 'Melody', beatsPerBar); break;
    case 'Countermelody': {
      const melodyTrack = composition.tracks.find(t => t.name === 'Melody');
      const primaryMelody = melodyTrack ? melodyTrack.notes : [];
      newNotes = humanizeTrack(generateCountermelody(params, chordProgression, primaryMelody), params.style, 'Countermelody', beatsPerBar);
      break;
    }
    case 'Bass': newNotes = humanizeTrack(generateBassLine(params, chordProgression), params.style, 'Bass', beatsPerBar); break;
    case 'Harmony': newNotes = humanizeTrack(generatePadVoicings(params, chordProgression), params.style, 'Harmony', beatsPerBar); break;
    case 'Arpeggio': newNotes = humanizeTrack(generateArpeggio(params, chordProgression), params.style, 'Arpeggio', beatsPerBar); break;
    case 'Drums': newNotes = humanizeTrack(generateDrumPattern(params), params.style, 'Drums', beatsPerBar); break;
    default: newNotes = humanizeTrack(generateMelody(params, chordProgression), params.style, 'Melody', beatsPerBar);
  }

  return { ...track, notes: newNotes };
}
