import type { Composition, CompositionParams, CompositionStyle, InstrumentType, Track, TrackEffect } from '../types/music';
import { generateChordProgression } from './chords';
import { generateMelody, generateBassLine, generatePadVoicings, generateArpeggio, generateDrumPattern, addDrumFills } from './melody';
import { humanizeTrack } from './humanize';
import { generateSections } from './sections';
import { generateTensionCurve, getTensionAtBeat } from './tension';
import { generateCounterMelody } from './countermelody';
import { applyArticulations } from './articulations';

const TRACK_COLORS: Record<string, string> = {
  melody: '#C8A97E',
  harmony: '#7E9CC8',
  bass: '#8B5E3C',
  pads: '#6B8E7E',
  arpeggio: '#C87E9C',
  counter: '#A67EC8',
  drums: '#9C8B7E',
};

function makeTrackId(): string {
  return Math.random().toString(36).slice(2, 10);
}

interface StyleVoicing {
  melody: InstrumentType;
  harmony: InstrumentType;
  bass: InstrumentType;
  arpeggio: InstrumentType;
  counter: InstrumentType;
  melodyFx: TrackEffect[];
  harmonyFx: TrackEffect[];
  bassFx: TrackEffect[];
  arpeggioFx: TrackEffect[];
  counterFx: TrackEffect[];
  drumsFx: TrackEffect[];
  melodyVol: number;
  harmonyVol: number;
  bassVol: number;
  arpeggioVol: number;
  counterVol: number;
  drumsVol: number;
}

const STYLE_VOICINGS: Record<CompositionStyle, StyleVoicing> = {
  classical: {
    melody: 'piano', harmony: 'strings', bass: 'bass', arpeggio: 'bells', counter: 'strings',
    melodyFx: [{ type: 'reverb', wet: 0.25, params: { decay: 2.5 } }],
    harmonyFx: [{ type: 'reverb', wet: 0.4, params: { decay: 4 } }, { type: 'chorus', wet: 0.15, params: { frequency: 1.2, depth: 0.5 } }],
    bassFx: [{ type: 'compressor', wet: 1, params: { threshold: -20, ratio: 4 } }],
    arpeggioFx: [{ type: 'delay', wet: 0.3, params: { delayTime: 0.375, feedback: 0.3 } }, { type: 'reverb', wet: 0.3, params: { decay: 3 } }],
    counterFx: [{ type: 'reverb', wet: 0.3, params: { decay: 3 } }],
    drumsFx: [{ type: 'compressor', wet: 1, params: { threshold: -15, ratio: 3 } }],
    melodyVol: 0.8, harmonyVol: 0.55, bassVol: 0.7, arpeggioVol: 0.35, counterVol: 0.4, drumsVol: 0.5,
  },
  romantic: {
    melody: 'piano', harmony: 'strings', bass: 'bass', arpeggio: 'bells', counter: 'strings',
    melodyFx: [{ type: 'reverb', wet: 0.35, params: { decay: 3.5 } }],
    harmonyFx: [{ type: 'reverb', wet: 0.5, params: { decay: 5 } }, { type: 'chorus', wet: 0.25, params: { frequency: 1, depth: 0.7 } }],
    bassFx: [{ type: 'compressor', wet: 1, params: { threshold: -18, ratio: 3 } }],
    arpeggioFx: [{ type: 'delay', wet: 0.35, params: { delayTime: 0.5, feedback: 0.4 } }, { type: 'reverb', wet: 0.4, params: { decay: 4 } }],
    counterFx: [{ type: 'reverb', wet: 0.35, params: { decay: 3.5 } }, { type: 'chorus', wet: 0.1, params: { frequency: 0.8, depth: 0.3 } }],
    drumsFx: [{ type: 'compressor', wet: 1, params: { threshold: -15, ratio: 3 } }],
    melodyVol: 0.82, harmonyVol: 0.6, bassVol: 0.65, arpeggioVol: 0.3, counterVol: 0.38, drumsVol: 0.4,
  },
  impressionist: {
    melody: 'piano', harmony: 'pads', bass: 'bass', arpeggio: 'vibraphone', counter: 'vibraphone',
    melodyFx: [{ type: 'reverb', wet: 0.45, params: { decay: 4 } }, { type: 'chorus', wet: 0.15, params: { frequency: 0.8, depth: 0.4 } }],
    harmonyFx: [{ type: 'reverb', wet: 0.55, params: { decay: 6 } }],
    bassFx: [{ type: 'compressor', wet: 1, params: { threshold: -20, ratio: 3 } }, { type: 'reverb', wet: 0.15, params: { decay: 2 } }],
    arpeggioFx: [{ type: 'reverb', wet: 0.5, params: { decay: 5 } }, { type: 'tremolo', wet: 0.2, params: { frequency: 3, depth: 0.3 } }],
    counterFx: [{ type: 'reverb', wet: 0.5, params: { decay: 5 } }, { type: 'delay', wet: 0.2, params: { delayTime: 0.5, feedback: 0.3 } }],
    drumsFx: [{ type: 'reverb', wet: 0.3, params: { decay: 3 } }],
    melodyVol: 0.75, harmonyVol: 0.5, bassVol: 0.6, arpeggioVol: 0.4, counterVol: 0.35, drumsVol: 0.35,
  },
  jazz: {
    melody: 'electric_piano', harmony: 'electric_piano', bass: 'upright_bass', arpeggio: 'vibraphone', counter: 'nylon_guitar',
    melodyFx: [{ type: 'reverb', wet: 0.2, params: { decay: 2 } }, { type: 'chorus', wet: 0.1, params: { frequency: 0.8, depth: 0.3 } }],
    harmonyFx: [{ type: 'reverb', wet: 0.25, params: { decay: 2.5 } }, { type: 'tremolo', wet: 0.08, params: { frequency: 3.5, depth: 0.2 } }],
    bassFx: [{ type: 'compressor', wet: 1, params: { threshold: -16, ratio: 3 } }, { type: 'eq', wet: 1, params: { low: 3, mid: 0, high: -4 } }],
    arpeggioFx: [{ type: 'reverb', wet: 0.3, params: { decay: 2.5 } }, { type: 'tremolo', wet: 0.15, params: { frequency: 5, depth: 0.25 } }],
    counterFx: [{ type: 'reverb', wet: 0.2, params: { decay: 2 } }],
    drumsFx: [{ type: 'compressor', wet: 1, params: { threshold: -18, ratio: 2.5 } }, { type: 'reverb', wet: 0.12, params: { decay: 1.5 } }],
    melodyVol: 0.78, harmonyVol: 0.5, bassVol: 0.72, arpeggioVol: 0.3, counterVol: 0.35, drumsVol: 0.52,
  },
  neo_soul: {
    melody: 'electric_piano', harmony: 'electric_piano', bass: 'bass', arpeggio: 'vibraphone', counter: 'electric_piano',
    melodyFx: [{ type: 'phaser', wet: 0.15, params: { frequency: 0.3, octaves: 2, baseFrequency: 400 } }, { type: 'reverb', wet: 0.25, params: { decay: 2.5 } }],
    harmonyFx: [{ type: 'chorus', wet: 0.2, params: { frequency: 1.2, depth: 0.5 } }, { type: 'reverb', wet: 0.3, params: { decay: 3 } }],
    bassFx: [{ type: 'compressor', wet: 1, params: { threshold: -18, ratio: 4 } }, { type: 'filter', wet: 1, params: { frequency: 800 } }],
    arpeggioFx: [{ type: 'delay', wet: 0.25, params: { delayTime: 0.375, feedback: 0.3 } }, { type: 'reverb', wet: 0.3, params: { decay: 3 } }],
    counterFx: [{ type: 'phaser', wet: 0.1, params: { frequency: 0.2, octaves: 2, baseFrequency: 350 } }, { type: 'reverb', wet: 0.25, params: { decay: 2.5 } }],
    drumsFx: [{ type: 'compressor', wet: 1, params: { threshold: -16, ratio: 3 } }],
    melodyVol: 0.76, harmonyVol: 0.52, bassVol: 0.7, arpeggioVol: 0.32, counterVol: 0.35, drumsVol: 0.5,
  },
  ambient: {
    melody: 'pads', harmony: 'pads', bass: 'bass', arpeggio: 'bells', counter: 'pads',
    melodyFx: [{ type: 'reverb', wet: 0.6, params: { decay: 8 } }, { type: 'delay', wet: 0.4, params: { delayTime: 0.6, feedback: 0.5 } }],
    harmonyFx: [{ type: 'reverb', wet: 0.7, params: { decay: 10 } }, { type: 'chorus', wet: 0.3, params: { frequency: 0.3, depth: 0.8 } }],
    bassFx: [{ type: 'reverb', wet: 0.3, params: { decay: 4 } }, { type: 'filter', wet: 1, params: { frequency: 500 } }],
    arpeggioFx: [{ type: 'delay', wet: 0.5, params: { delayTime: 0.75, feedback: 0.55 } }, { type: 'reverb', wet: 0.6, params: { decay: 8 } }],
    counterFx: [{ type: 'reverb', wet: 0.55, params: { decay: 7 } }, { type: 'delay', wet: 0.3, params: { delayTime: 0.75, feedback: 0.4 } }],
    drumsFx: [{ type: 'reverb', wet: 0.4, params: { decay: 5 } }],
    melodyVol: 0.65, harmonyVol: 0.55, bassVol: 0.5, arpeggioVol: 0.4, counterVol: 0.3, drumsVol: 0.3,
  },
  minimalist: {
    melody: 'piano', harmony: 'piano', bass: 'bass', arpeggio: 'bells', counter: 'piano',
    melodyFx: [{ type: 'reverb', wet: 0.2, params: { decay: 2 } }],
    harmonyFx: [{ type: 'reverb', wet: 0.2, params: { decay: 2 } }],
    bassFx: [{ type: 'compressor', wet: 1, params: { threshold: -20, ratio: 3 } }],
    arpeggioFx: [{ type: 'reverb', wet: 0.25, params: { decay: 2.5 } }],
    counterFx: [{ type: 'reverb', wet: 0.2, params: { decay: 2 } }],
    drumsFx: [{ type: 'compressor', wet: 1, params: { threshold: -15, ratio: 2 } }],
    melodyVol: 0.75, harmonyVol: 0.5, bassVol: 0.6, arpeggioVol: 0.35, counterVol: 0.3, drumsVol: 0.35,
  },
  cinematic: {
    melody: 'strings', harmony: 'strings', bass: 'bass', arpeggio: 'piano', counter: 'piano',
    melodyFx: [{ type: 'reverb', wet: 0.45, params: { decay: 5 } }],
    harmonyFx: [{ type: 'reverb', wet: 0.55, params: { decay: 6 } }, { type: 'chorus', wet: 0.2, params: { frequency: 0.5, depth: 0.6 } }],
    bassFx: [{ type: 'compressor', wet: 1, params: { threshold: -18, ratio: 4 } }, { type: 'eq', wet: 1, params: { low: 4, mid: -2, high: -6 } }],
    arpeggioFx: [{ type: 'reverb', wet: 0.4, params: { decay: 4 } }, { type: 'delay', wet: 0.2, params: { delayTime: 0.5, feedback: 0.3 } }],
    counterFx: [{ type: 'reverb', wet: 0.4, params: { decay: 4 } }],
    drumsFx: [{ type: 'compressor', wet: 1, params: { threshold: -12, ratio: 4 } }, { type: 'reverb', wet: 0.2, params: { decay: 3 } }],
    melodyVol: 0.82, harmonyVol: 0.65, bassVol: 0.7, arpeggioVol: 0.35, counterVol: 0.4, drumsVol: 0.55,
  },
  electronic: {
    melody: 'synth_lead', harmony: 'pads', bass: 'bass', arpeggio: 'bells', counter: 'synth_lead',
    melodyFx: [{ type: 'delay', wet: 0.25, params: { delayTime: 0.25, feedback: 0.3 } }, { type: 'reverb', wet: 0.2, params: { decay: 2 } }],
    harmonyFx: [{ type: 'chorus', wet: 0.3, params: { frequency: 2, depth: 0.7 } }, { type: 'reverb', wet: 0.35, params: { decay: 4 } }],
    bassFx: [{ type: 'compressor', wet: 1, params: { threshold: -15, ratio: 5 } }, { type: 'distortion', wet: 0.1, params: { amount: 0.2 } }],
    arpeggioFx: [{ type: 'delay', wet: 0.4, params: { delayTime: 0.1875, feedback: 0.45 } }, { type: 'filter', wet: 1, params: { frequency: 3000 } }],
    counterFx: [{ type: 'delay', wet: 0.3, params: { delayTime: 0.375, feedback: 0.35 } }, { type: 'reverb', wet: 0.25, params: { decay: 2.5 } }],
    drumsFx: [{ type: 'compressor', wet: 1, params: { threshold: -10, ratio: 5 } }],
    melodyVol: 0.8, harmonyVol: 0.5, bassVol: 0.75, arpeggioVol: 0.4, counterVol: 0.3, drumsVol: 0.6,
  },
  bossa_nova: {
    melody: 'nylon_guitar', harmony: 'electric_piano', bass: 'upright_bass', arpeggio: 'vibraphone', counter: 'nylon_guitar',
    melodyFx: [{ type: 'reverb', wet: 0.2, params: { decay: 2 } }, { type: 'chorus', wet: 0.08, params: { frequency: 0.6, depth: 0.3 } }],
    harmonyFx: [{ type: 'tremolo', wet: 0.1, params: { frequency: 4, depth: 0.2 } }, { type: 'reverb', wet: 0.25, params: { decay: 2.5 } }],
    bassFx: [{ type: 'compressor', wet: 1, params: { threshold: -16, ratio: 3 } }, { type: 'eq', wet: 1, params: { low: 2, mid: 1, high: -3 } }],
    arpeggioFx: [{ type: 'reverb', wet: 0.3, params: { decay: 3 } }, { type: 'tremolo', wet: 0.12, params: { frequency: 5, depth: 0.2 } }],
    counterFx: [{ type: 'reverb', wet: 0.2, params: { decay: 2 } }, { type: 'chorus', wet: 0.06, params: { frequency: 0.5, depth: 0.2 } }],
    drumsFx: [{ type: 'compressor', wet: 1, params: { threshold: -18, ratio: 2.5 } }, { type: 'reverb', wet: 0.1, params: { decay: 1.5 } }],
    melodyVol: 0.78, harmonyVol: 0.48, bassVol: 0.7, arpeggioVol: 0.28, counterVol: 0.32, drumsVol: 0.42,
  },
  lo_fi: {
    melody: 'tape_keys', harmony: 'electric_piano', bass: 'bass', arpeggio: 'vibraphone', counter: 'tape_keys',
    melodyFx: [{ type: 'bitcrusher', wet: 0.12, params: { bits: 12 } }, { type: 'reverb', wet: 0.3, params: { decay: 3 } }, { type: 'chorus', wet: 0.1, params: { frequency: 0.5, depth: 0.4 } }],
    harmonyFx: [{ type: 'filter', wet: 1, params: { frequency: 2500 } }, { type: 'reverb', wet: 0.35, params: { decay: 3.5 } }],
    bassFx: [{ type: 'compressor', wet: 1, params: { threshold: -18, ratio: 4 } }, { type: 'filter', wet: 1, params: { frequency: 600 } }],
    arpeggioFx: [{ type: 'bitcrusher', wet: 0.08, params: { bits: 14 } }, { type: 'delay', wet: 0.3, params: { delayTime: 0.375, feedback: 0.35 } }, { type: 'reverb', wet: 0.35, params: { decay: 3.5 } }],
    counterFx: [{ type: 'bitcrusher', wet: 0.08, params: { bits: 12 } }, { type: 'reverb', wet: 0.3, params: { decay: 3 } }],
    drumsFx: [{ type: 'bitcrusher', wet: 0.15, params: { bits: 10 } }, { type: 'compressor', wet: 1, params: { threshold: -14, ratio: 3 } }],
    melodyVol: 0.72, harmonyVol: 0.48, bassVol: 0.68, arpeggioVol: 0.32, counterVol: 0.3, drumsVol: 0.45,
  },
  gospel: {
    melody: 'piano', harmony: 'organ', bass: 'bass', arpeggio: 'piano', counter: 'organ',
    melodyFx: [{ type: 'reverb', wet: 0.3, params: { decay: 3 } }],
    harmonyFx: [{ type: 'reverb', wet: 0.35, params: { decay: 3.5 } }, { type: 'tremolo', wet: 0.08, params: { frequency: 5.5, depth: 0.15 } }],
    bassFx: [{ type: 'compressor', wet: 1, params: { threshold: -18, ratio: 4 } }],
    arpeggioFx: [{ type: 'reverb', wet: 0.3, params: { decay: 3 } }],
    counterFx: [{ type: 'reverb', wet: 0.3, params: { decay: 3 } }, { type: 'tremolo', wet: 0.06, params: { frequency: 5, depth: 0.12 } }],
    drumsFx: [{ type: 'compressor', wet: 1, params: { threshold: -14, ratio: 3.5 } }, { type: 'reverb', wet: 0.1, params: { decay: 2 } }],
    melodyVol: 0.82, harmonyVol: 0.6, bassVol: 0.72, arpeggioVol: 0.3, counterVol: 0.35, drumsVol: 0.55,
  },
};

export function compose(params: CompositionParams): Composition {
  const sections = generateSections(params.style, params.measures);
  const beatsPerBar = params.timeSignature[0];
  const tensionCurve = generateTensionCurve(sections, beatsPerBar);

  const tensionAtMeasure = (measure: number) => {
    const beat = measure * beatsPerBar + beatsPerBar / 2;
    return getTensionAtBeat(tensionCurve, beat);
  };

  const chords = generateChordProgression(
    params.key,
    params.scale,
    params.measures,
    params.style,
    params.harmonicComplexity,
    tensionAtMeasure,
  );

  const sv = STYLE_VOICINGS[params.style];

  const melodyNotes = applyArticulations(
    humanizeTrack(
      generateMelody(params, chords, [4, 6], sections, tensionCurve),
      params.style, 'Melody', beatsPerBar,
    ),
    params.style, params.key, params.scale, params.expressiveness,
  );
  const bassNotes = humanizeTrack(generateBassLine(params, chords), params.style, 'Bass', beatsPerBar);
  const padNotes = humanizeTrack(generatePadVoicings(params, chords), params.style, 'Harmony', beatsPerBar);
  const arpeggioNotes = humanizeTrack(generateArpeggio(params, chords), params.style, 'Arpeggio', beatsPerBar);
  const rawDrums = generateDrumPattern(params);
  const drumNotes = humanizeTrack(addDrumFills(rawDrums, sections, beatsPerBar), params.style, 'Drums', beatsPerBar);
  const counterNotes = applyArticulations(
    humanizeTrack(
      generateCounterMelody(params, chords, melodyNotes, sections, tensionCurve),
      params.style, 'CounterMelody', beatsPerBar,
    ),
    params.style, params.key, params.scale, params.expressiveness,
  );

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
      name: 'CounterMelody',
      instrument: sv.counter,
      notes: counterNotes,
      volume: sv.counterVol,
      pan: -0.15,
      muted: false,
      solo: false,
      color: TRACK_COLORS.counter,
      effects: sv.counterFx,
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
    sections,
    tensionCurve,
    createdAt: Date.now(),
  };
}

export function recomposeTrack(
  composition: Composition,
  trackIndex: number,
): Track {
  const track = composition.tracks[trackIndex];
  const { params, chordProgression, sections, tensionCurve } = composition;
  const beatsPerBar = params.timeSignature[0];

  let newNotes;
  switch (track.name) {
    case 'Melody': newNotes = generateMelody(params, chordProgression, [4, 6], sections, tensionCurve); break;
    case 'Bass': newNotes = generateBassLine(params, chordProgression); break;
    case 'Harmony': newNotes = generatePadVoicings(params, chordProgression); break;
    case 'Arpeggio': newNotes = generateArpeggio(params, chordProgression); break;
    case 'Drums': newNotes = addDrumFills(generateDrumPattern(params), sections, beatsPerBar); break;
    case 'CounterMelody': {
      const melodyTrack = composition.tracks.find(t => t.name === 'Melody');
      newNotes = generateCounterMelody(params, chordProgression, melodyTrack?.notes ?? [], sections, tensionCurve);
      break;
    }
    default: newNotes = generateMelody(params, chordProgression);
  }

  newNotes = humanizeTrack(newNotes, params.style, track.name, beatsPerBar);

  if (track.name === 'Melody' || track.name === 'CounterMelody') {
    newNotes = applyArticulations(newNotes, params.style, params.key, params.scale, params.expressiveness);
  }

  return { ...track, notes: newNotes };
}
