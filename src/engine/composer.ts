import type { Composition, CompositionParams, CompositionStyle, Track, InstrumentType, TrackEffect, CompositionPreset } from '../types/music';
import { generateChordProgression } from './chords';
import { generateMelody, generateBassLine, generatePadVoicings, generateArpeggio, generateDrumPattern, generatePadTexture } from './melody';
import { humanizeTrack } from './humanize';

interface StyleVoicing {
  melody: InstrumentType;
  harmony: InstrumentType;
  bass: InstrumentType;
  arpeggio: InstrumentType;
  pads: InstrumentType;
  melodyVolume: number;
  harmonyVolume: number;
  bassVolume: number;
  arpeggioVolume: number;
  padsVolume: number;
  melodyPan: number;
  harmonyPan: number;
  bassPan: number;
  arpeggioPan: number;
  padsPan: number;
  melodyEffects: TrackEffect[];
  harmonyEffects: TrackEffect[];
  bassEffects: TrackEffect[];
  arpeggioEffects: TrackEffect[];
  padsEffects: TrackEffect[];
}

const STYLE_VOICINGS: Record<CompositionStyle, StyleVoicing> = {
  classical: {
    melody: 'piano', harmony: 'strings', bass: 'bass', arpeggio: 'bells', pads: 'pads',
    melodyVolume: 0.8, harmonyVolume: 0.55, bassVolume: 0.7, arpeggioVolume: 0.35, padsVolume: 0.2,
    melodyPan: 0.1, harmonyPan: -0.2, bassPan: 0, arpeggioPan: 0.3, padsPan: 0,
    melodyEffects: [{ type: 'reverb', wet: 0.2, params: { decay: 2.5 } }],
    harmonyEffects: [{ type: 'reverb', wet: 0.3, params: { decay: 3 } }],
    bassEffects: [],
    arpeggioEffects: [{ type: 'reverb', wet: 0.25, params: { decay: 2 } }],
    padsEffects: [{ type: 'reverb', wet: 0.4, params: { decay: 4 } }],
  },
  romantic: {
    melody: 'piano', harmony: 'strings', bass: 'bass', arpeggio: 'bells', pads: 'pads',
    melodyVolume: 0.85, harmonyVolume: 0.6, bassVolume: 0.65, arpeggioVolume: 0.3, padsVolume: 0.25,
    melodyPan: 0, harmonyPan: -0.15, bassPan: 0, arpeggioPan: 0.25, padsPan: -0.1,
    melodyEffects: [{ type: 'reverb', wet: 0.25, params: { decay: 3 } }],
    harmonyEffects: [{ type: 'reverb', wet: 0.35, params: { decay: 3.5 } }, { type: 'chorus', wet: 0.1, params: { frequency: 0.5, depth: 0.3 } }],
    bassEffects: [],
    arpeggioEffects: [{ type: 'reverb', wet: 0.3, params: { decay: 2.5 } }],
    padsEffects: [{ type: 'reverb', wet: 0.5, params: { decay: 5 } }],
  },
  impressionist: {
    melody: 'piano', harmony: 'pads', bass: 'bass', arpeggio: 'celeste', pads: 'analog_pad',
    melodyVolume: 0.7, harmonyVolume: 0.45, bassVolume: 0.5, arpeggioVolume: 0.4, padsVolume: 0.3,
    melodyPan: 0, harmonyPan: -0.25, bassPan: 0, arpeggioPan: 0.35, padsPan: 0.15,
    melodyEffects: [{ type: 'reverb', wet: 0.35, params: { decay: 4 } }],
    harmonyEffects: [{ type: 'reverb', wet: 0.45, params: { decay: 5 } }, { type: 'chorus', wet: 0.15, params: { frequency: 0.3, depth: 0.5 } }],
    bassEffects: [{ type: 'reverb', wet: 0.15, params: { decay: 2 } }],
    arpeggioEffects: [{ type: 'reverb', wet: 0.4, params: { decay: 3.5 } }],
    padsEffects: [{ type: 'reverb', wet: 0.6, params: { decay: 6 } }, { type: 'chorus', wet: 0.2, params: { frequency: 0.2, depth: 0.4 } }],
  },
  jazz: {
    melody: 'piano', harmony: 'electric_piano', bass: 'upright_bass', arpeggio: 'vibraphone', pads: 'pads',
    melodyVolume: 0.75, harmonyVolume: 0.5, bassVolume: 0.75, arpeggioVolume: 0.35, padsVolume: 0.15,
    melodyPan: 0.1, harmonyPan: -0.2, bassPan: 0, arpeggioPan: 0.3, padsPan: -0.1,
    melodyEffects: [{ type: 'reverb', wet: 0.2, params: { decay: 2 } }],
    harmonyEffects: [{ type: 'reverb', wet: 0.25, params: { decay: 2.5 } }, { type: 'tremolo', wet: 0.1, params: { frequency: 3, depth: 0.3 } }],
    bassEffects: [{ type: 'compressor', wet: 1, params: { threshold: -15, ratio: 3 } }],
    arpeggioEffects: [{ type: 'reverb', wet: 0.3, params: { decay: 2.5 } }],
    padsEffects: [{ type: 'reverb', wet: 0.3, params: { decay: 3 } }],
  },
  neo_soul: {
    melody: 'electric_piano', harmony: 'electric_piano', bass: 'finger_bass', arpeggio: 'vibraphone', pads: 'analog_pad',
    melodyVolume: 0.75, harmonyVolume: 0.55, bassVolume: 0.8, arpeggioVolume: 0.3, padsVolume: 0.2,
    melodyPan: 0.1, harmonyPan: -0.15, bassPan: 0, arpeggioPan: 0.25, padsPan: -0.2,
    melodyEffects: [{ type: 'reverb', wet: 0.2, params: { decay: 2 } }, { type: 'chorus', wet: 0.1, params: { frequency: 1, depth: 0.3 } }],
    harmonyEffects: [{ type: 'reverb', wet: 0.2, params: { decay: 2 } }, { type: 'tremolo', wet: 0.1, params: { frequency: 4, depth: 0.3 } }],
    bassEffects: [{ type: 'compressor', wet: 1, params: { threshold: -12, ratio: 4 } }],
    arpeggioEffects: [{ type: 'reverb', wet: 0.3, params: { decay: 2.5 } }],
    padsEffects: [{ type: 'reverb', wet: 0.4, params: { decay: 3.5 } }],
  },
  ambient: {
    melody: 'pads', harmony: 'pads', bass: 'bass', arpeggio: 'bells', pads: 'analog_pad',
    melodyVolume: 0.5, harmonyVolume: 0.4, bassVolume: 0.4, arpeggioVolume: 0.5, padsVolume: 0.4,
    melodyPan: 0.2, harmonyPan: -0.3, bassPan: 0, arpeggioPan: 0.4, padsPan: -0.2,
    melodyEffects: [{ type: 'reverb', wet: 0.6, params: { decay: 6 } }, { type: 'delay', wet: 0.3, params: { delayTime: 0.5, feedback: 0.4 } }],
    harmonyEffects: [{ type: 'reverb', wet: 0.7, params: { decay: 7 } }],
    bassEffects: [{ type: 'reverb', wet: 0.3, params: { decay: 3 } }],
    arpeggioEffects: [{ type: 'reverb', wet: 0.5, params: { decay: 5 } }, { type: 'ping_pong_delay', wet: 0.25, params: { delayTime: 0.375, feedback: 0.35 } }],
    padsEffects: [{ type: 'reverb', wet: 0.7, params: { decay: 8 } }, { type: 'chorus', wet: 0.2, params: { frequency: 0.15, depth: 0.6 } }],
  },
  minimalist: {
    melody: 'piano', harmony: 'strings', bass: 'bass', arpeggio: 'marimba', pads: 'pads',
    melodyVolume: 0.7, harmonyVolume: 0.35, bassVolume: 0.5, arpeggioVolume: 0.55, padsVolume: 0.15,
    melodyPan: 0, harmonyPan: -0.2, bassPan: 0, arpeggioPan: 0.15, padsPan: 0,
    melodyEffects: [{ type: 'reverb', wet: 0.15, params: { decay: 2 } }],
    harmonyEffects: [{ type: 'reverb', wet: 0.25, params: { decay: 3 } }],
    bassEffects: [],
    arpeggioEffects: [{ type: 'reverb', wet: 0.2, params: { decay: 2 } }],
    padsEffects: [{ type: 'reverb', wet: 0.3, params: { decay: 3.5 } }],
  },
  cinematic: {
    melody: 'strings', harmony: 'strings', bass: 'bass', arpeggio: 'celeste', pads: 'analog_pad',
    melodyVolume: 0.85, harmonyVolume: 0.65, bassVolume: 0.7, arpeggioVolume: 0.35, padsVolume: 0.35,
    melodyPan: 0.1, harmonyPan: -0.15, bassPan: 0, arpeggioPan: 0.3, padsPan: -0.15,
    melodyEffects: [{ type: 'reverb', wet: 0.35, params: { decay: 4 } }],
    harmonyEffects: [{ type: 'reverb', wet: 0.4, params: { decay: 4.5 } }, { type: 'chorus', wet: 0.1, params: { frequency: 0.3, depth: 0.3 } }],
    bassEffects: [{ type: 'compressor', wet: 1, params: { threshold: -15, ratio: 3 } }],
    arpeggioEffects: [{ type: 'reverb', wet: 0.4, params: { decay: 3.5 } }],
    padsEffects: [{ type: 'reverb', wet: 0.6, params: { decay: 6 } }],
  },
  electronic: {
    melody: 'synth_lead', harmony: 'pads', bass: 'bass', arpeggio: 'bells', pads: 'analog_pad',
    melodyVolume: 0.8, harmonyVolume: 0.45, bassVolume: 0.85, arpeggioVolume: 0.45, padsVolume: 0.25,
    melodyPan: 0, harmonyPan: -0.25, bassPan: 0, arpeggioPan: 0.35, padsPan: -0.2,
    melodyEffects: [{ type: 'reverb', wet: 0.15, params: { decay: 1.5 } }, { type: 'delay', wet: 0.2, params: { delayTime: 0.25, feedback: 0.3 } }],
    harmonyEffects: [{ type: 'reverb', wet: 0.3, params: { decay: 3 } }],
    bassEffects: [{ type: 'distortion', wet: 0.1, params: { amount: 0.2 } }, { type: 'compressor', wet: 1, params: { threshold: -10, ratio: 6 } }],
    arpeggioEffects: [{ type: 'ping_pong_delay', wet: 0.3, params: { delayTime: 0.125, feedback: 0.3 } }, { type: 'reverb', wet: 0.2, params: { decay: 2 } }],
    padsEffects: [{ type: 'reverb', wet: 0.4, params: { decay: 4 } }, { type: 'phaser', wet: 0.15, params: { frequency: 0.3, octaves: 3, baseFrequency: 400 } }],
  },
  bossa_nova: {
    melody: 'nylon_guitar', harmony: 'electric_piano', bass: 'upright_bass', arpeggio: 'vibraphone', pads: 'pads',
    melodyVolume: 0.75, harmonyVolume: 0.5, bassVolume: 0.7, arpeggioVolume: 0.3, padsVolume: 0.15,
    melodyPan: 0.15, harmonyPan: -0.2, bassPan: 0, arpeggioPan: 0.25, padsPan: -0.1,
    melodyEffects: [{ type: 'reverb', wet: 0.2, params: { decay: 2 } }],
    harmonyEffects: [{ type: 'reverb', wet: 0.2, params: { decay: 2 } }, { type: 'tremolo', wet: 0.08, params: { frequency: 3, depth: 0.2 } }],
    bassEffects: [{ type: 'compressor', wet: 1, params: { threshold: -15, ratio: 3 } }],
    arpeggioEffects: [{ type: 'reverb', wet: 0.3, params: { decay: 2.5 } }],
    padsEffects: [{ type: 'reverb', wet: 0.3, params: { decay: 3 } }],
  },
  lo_fi: {
    melody: 'tape_keys', harmony: 'electric_piano', bass: 'bass', arpeggio: 'vibraphone', pads: 'analog_pad',
    melodyVolume: 0.7, harmonyVolume: 0.45, bassVolume: 0.7, arpeggioVolume: 0.35, padsVolume: 0.2,
    melodyPan: 0.1, harmonyPan: -0.15, bassPan: 0, arpeggioPan: 0.2, padsPan: -0.15,
    melodyEffects: [{ type: 'reverb', wet: 0.2, params: { decay: 2 } }, { type: 'filter', wet: 1, params: { frequency: 3000 } }],
    harmonyEffects: [{ type: 'reverb', wet: 0.2, params: { decay: 2 } }, { type: 'chorus', wet: 0.1, params: { frequency: 0.5, depth: 0.3 } }],
    bassEffects: [{ type: 'filter', wet: 1, params: { frequency: 2500 } }],
    arpeggioEffects: [{ type: 'reverb', wet: 0.3, params: { decay: 2.5 } }, { type: 'bitcrusher', wet: 0.05, params: { bits: 12 } }],
    padsEffects: [{ type: 'reverb', wet: 0.4, params: { decay: 3.5 } }, { type: 'filter', wet: 1, params: { frequency: 2800 } }],
  },
  gospel: {
    melody: 'piano', harmony: 'organ', bass: 'bass', arpeggio: 'piano', pads: 'pads',
    melodyVolume: 0.85, harmonyVolume: 0.6, bassVolume: 0.75, arpeggioVolume: 0.3, padsVolume: 0.2,
    melodyPan: 0.1, harmonyPan: -0.15, bassPan: 0, arpeggioPan: 0.2, padsPan: -0.1,
    melodyEffects: [{ type: 'reverb', wet: 0.25, params: { decay: 2.5 } }],
    harmonyEffects: [{ type: 'reverb', wet: 0.3, params: { decay: 3 } }, { type: 'chorus', wet: 0.08, params: { frequency: 1, depth: 0.2 } }],
    bassEffects: [{ type: 'compressor', wet: 1, params: { threshold: -12, ratio: 4 } }],
    arpeggioEffects: [{ type: 'reverb', wet: 0.2, params: { decay: 2 } }],
    padsEffects: [{ type: 'reverb', wet: 0.35, params: { decay: 3.5 } }],
  },
  listening_room: {
    melody: 'wurlitzer', harmony: 'electric_piano', bass: 'upright_bass', arpeggio: 'vibraphone', pads: 'analog_pad',
    melodyVolume: 0.7, harmonyVolume: 0.45, bassVolume: 0.7, arpeggioVolume: 0.3, padsVolume: 0.2,
    melodyPan: 0.15, harmonyPan: -0.2, bassPan: 0, arpeggioPan: 0.3, padsPan: -0.15,
    melodyEffects: [{ type: 'reverb', wet: 0.25, params: { decay: 2.5 } }, { type: 'tremolo', wet: 0.05, params: { frequency: 2.5, depth: 0.2 } }],
    harmonyEffects: [{ type: 'reverb', wet: 0.3, params: { decay: 3 } }, { type: 'tremolo', wet: 0.08, params: { frequency: 3, depth: 0.25 } }],
    bassEffects: [{ type: 'compressor', wet: 1, params: { threshold: -15, ratio: 3 } }],
    arpeggioEffects: [{ type: 'reverb', wet: 0.35, params: { decay: 3 } }],
    padsEffects: [{ type: 'reverb', wet: 0.5, params: { decay: 5 } }],
  },
  modal_jazz: {
    melody: 'muted_trumpet', harmony: 'electric_piano', bass: 'upright_bass', arpeggio: 'vibraphone', pads: 'pads',
    melodyVolume: 0.75, harmonyVolume: 0.45, bassVolume: 0.75, arpeggioVolume: 0.3, padsVolume: 0.15,
    melodyPan: 0.2, harmonyPan: -0.2, bassPan: 0, arpeggioPan: 0.25, padsPan: -0.1,
    melodyEffects: [{ type: 'reverb', wet: 0.25, params: { decay: 2.5 } }, { type: 'delay', wet: 0.12, params: { delayTime: 0.375, feedback: 0.2 } }],
    harmonyEffects: [{ type: 'reverb', wet: 0.25, params: { decay: 2.5 } }, { type: 'tremolo', wet: 0.08, params: { frequency: 3, depth: 0.2 } }],
    bassEffects: [{ type: 'compressor', wet: 1, params: { threshold: -15, ratio: 3 } }],
    arpeggioEffects: [{ type: 'reverb', wet: 0.3, params: { decay: 2.5 } }],
    padsEffects: [{ type: 'reverb', wet: 0.4, params: { decay: 4 } }],
  },
  chamber: {
    melody: 'piano', harmony: 'strings', bass: 'bass', arpeggio: 'harpsichord', pads: 'strings',
    melodyVolume: 0.75, harmonyVolume: 0.6, bassVolume: 0.6, arpeggioVolume: 0.35, padsVolume: 0.25,
    melodyPan: 0.1, harmonyPan: -0.25, bassPan: 0, arpeggioPan: 0.2, padsPan: -0.15,
    melodyEffects: [{ type: 'reverb', wet: 0.3, params: { decay: 3 } }],
    harmonyEffects: [{ type: 'reverb', wet: 0.35, params: { decay: 3.5 } }],
    bassEffects: [{ type: 'reverb', wet: 0.15, params: { decay: 2 } }],
    arpeggioEffects: [{ type: 'reverb', wet: 0.25, params: { decay: 2 } }],
    padsEffects: [{ type: 'reverb', wet: 0.4, params: { decay: 4 } }],
  },
  trip_hop: {
    melody: 'tape_keys', harmony: 'pads', bass: 'bass', arpeggio: 'bells', pads: 'analog_pad',
    melodyVolume: 0.65, harmonyVolume: 0.4, bassVolume: 0.85, arpeggioVolume: 0.35, padsVolume: 0.3,
    melodyPan: 0.1, harmonyPan: -0.2, bassPan: 0, arpeggioPan: 0.3, padsPan: -0.2,
    melodyEffects: [{ type: 'reverb', wet: 0.3, params: { decay: 3 } }, { type: 'filter', wet: 1, params: { frequency: 2500 } }],
    harmonyEffects: [{ type: 'reverb', wet: 0.4, params: { decay: 4 } }],
    bassEffects: [{ type: 'distortion', wet: 0.05, params: { amount: 0.15 } }, { type: 'compressor', wet: 1, params: { threshold: -10, ratio: 5 } }],
    arpeggioEffects: [{ type: 'ping_pong_delay', wet: 0.3, params: { delayTime: 0.375, feedback: 0.35 } }, { type: 'reverb', wet: 0.3, params: { decay: 3 } }],
    padsEffects: [{ type: 'reverb', wet: 0.5, params: { decay: 5 } }, { type: 'phaser', wet: 0.1, params: { frequency: 0.15, octaves: 3, baseFrequency: 300 } }],
  },
  r_and_b: {
    melody: 'electric_piano', harmony: 'electric_piano', bass: 'finger_bass', arpeggio: 'bells', pads: 'analog_pad',
    melodyVolume: 0.8, harmonyVolume: 0.5, bassVolume: 0.8, arpeggioVolume: 0.3, padsVolume: 0.2,
    melodyPan: 0.1, harmonyPan: -0.15, bassPan: 0, arpeggioPan: 0.25, padsPan: -0.15,
    melodyEffects: [{ type: 'reverb', wet: 0.2, params: { decay: 2 } }, { type: 'chorus', wet: 0.08, params: { frequency: 0.8, depth: 0.3 } }],
    harmonyEffects: [{ type: 'reverb', wet: 0.2, params: { decay: 2.5 } }, { type: 'tremolo', wet: 0.08, params: { frequency: 3.5, depth: 0.2 } }],
    bassEffects: [{ type: 'compressor', wet: 1, params: { threshold: -12, ratio: 4 } }],
    arpeggioEffects: [{ type: 'reverb', wet: 0.3, params: { decay: 2.5 } }],
    padsEffects: [{ type: 'reverb', wet: 0.4, params: { decay: 3.5 } }],
  },
};

const TRACK_COLORS = {
  melody: '#f59e0b',
  harmony: '#8b5cf6',
  bass: '#10b981',
  arpeggio: '#3b82f6',
  pads: '#ec4899',
  drums: '#ef4444',
};

export function compose(params: CompositionParams): Composition {
  const style = params.style;
  const voicing = STYLE_VOICINGS[style];

  const chordProgression = generateChordProgression(
    params.key,
    params.scale,
    params.measures,
    style,
    params.harmonicComplexity,
  );

  const melodyNotes = humanizeTrack(
    generateMelody(params, chordProgression),
    style, 'Melody', params.timeSignature[0],
  );

  const harmonyNotes = humanizeTrack(
    generatePadVoicings(params, chordProgression),
    style, 'Harmony', params.timeSignature[0],
  );

  const bassNotes = humanizeTrack(
    generateBassLine(params, chordProgression),
    style, 'Bass', params.timeSignature[0],
  );

  const arpeggioNotes = humanizeTrack(
    generateArpeggio(params, chordProgression),
    style, 'Arpeggio', params.timeSignature[0],
  );

  const drumNotes = humanizeTrack(
    generateDrumPattern(params),
    style, 'Drums', params.timeSignature[0],
  );

  const padTextureNotes = humanizeTrack(
    generatePadTexture(params, chordProgression),
    style, 'Pads', params.timeSignature[0],
  );

  const tracks: Track[] = [
    {
      id: `melody-${Date.now()}`,
      name: 'Melody',
      instrument: voicing.melody,
      notes: melodyNotes,
      volume: voicing.melodyVolume,
      pan: voicing.melodyPan,
      muted: false,
      solo: false,
      color: TRACK_COLORS.melody,
      effects: voicing.melodyEffects,
    },
    {
      id: `harmony-${Date.now()}`,
      name: 'Harmony',
      instrument: voicing.harmony,
      notes: harmonyNotes,
      volume: voicing.harmonyVolume,
      pan: voicing.harmonyPan,
      muted: false,
      solo: false,
      color: TRACK_COLORS.harmony,
      effects: voicing.harmonyEffects,
    },
    {
      id: `bass-${Date.now()}`,
      name: 'Bass',
      instrument: voicing.bass,
      notes: bassNotes,
      volume: voicing.bassVolume,
      pan: voicing.bassPan,
      muted: false,
      solo: false,
      color: TRACK_COLORS.bass,
      effects: voicing.bassEffects,
    },
    {
      id: `arpeggio-${Date.now()}`,
      name: 'Arpeggio',
      instrument: voicing.arpeggio,
      notes: arpeggioNotes,
      volume: voicing.arpeggioVolume,
      pan: voicing.arpeggioPan,
      muted: false,
      solo: false,
      color: TRACK_COLORS.arpeggio,
      effects: voicing.arpeggioEffects,
    },
    {
      id: `pads-${Date.now()}`,
      name: 'Pads',
      instrument: voicing.pads,
      notes: padTextureNotes,
      volume: voicing.padsVolume,
      pan: voicing.padsPan,
      muted: false,
      solo: false,
      color: TRACK_COLORS.pads,
      effects: voicing.padsEffects,
    },
    {
      id: `drums-${Date.now()}`,
      name: 'Drums',
      instrument: 'drums',
      notes: drumNotes,
      volume: 0.7,
      pan: 0,
      muted: false,
      solo: false,
      color: TRACK_COLORS.drums,
      effects: [],
    },
  ];

  return {
    id: `comp-${Date.now()}`,
    name: `${params.key} ${params.scale} — ${style}`,
    params,
    tracks,
    chordProgression,
    createdAt: Date.now(),
  };
}

export function recomposeTrack(composition: Composition, trackIndex: number): Track {
  const track = composition.tracks[trackIndex];
  const params = composition.params;
  const style = params.style;
  const chords = composition.chordProgression;

  let newNotes: import('../types/music').Note[];

  switch (track.name) {
    case 'Melody':
      newNotes = humanizeTrack(generateMelody(params, chords), style, 'Melody', params.timeSignature[0]);
      break;
    case 'Harmony':
      newNotes = humanizeTrack(generatePadVoicings(params, chords), style, 'Harmony', params.timeSignature[0]);
      break;
    case 'Bass':
      newNotes = humanizeTrack(generateBassLine(params, chords), style, 'Bass', params.timeSignature[0]);
      break;
    case 'Arpeggio':
      newNotes = humanizeTrack(generateArpeggio(params, chords), style, 'Arpeggio', params.timeSignature[0]);
      break;
    case 'Pads':
      newNotes = humanizeTrack(generatePadTexture(params, chords), style, 'Pads', params.timeSignature[0]);
      break;
    case 'Drums':
      newNotes = humanizeTrack(generateDrumPattern(params), style, 'Drums', params.timeSignature[0]);
      break;
    default:
      newNotes = track.notes;
  }

  return { ...track, notes: newNotes };
}

export const COMPOSITION_PRESETS: CompositionPreset[] = [
  {
    name: 'Late Night in Soho',
    description: 'Intimate Rhodes trio — brushes, walking bass, soft melody',
    params: {
      style: 'listening_room', key: 'Eb', scale: 'dorian', tempo: 88,
      measures: 16, dynamics: 'swell', harmonicComplexity: 7,
      melodicDensity: 5, rhythmicVariety: 6, expressiveness: 8,
    },
  },
  {
    name: 'Blue Note Set',
    description: 'Modal jazz exploration — open harmonies, sparse melody, swing',
    params: {
      style: 'modal_jazz', key: 'D', scale: 'dorian', tempo: 130,
      measures: 16, dynamics: 'terraced', harmonicComplexity: 6,
      melodicDensity: 6, rhythmicVariety: 7, expressiveness: 9,
    },
  },
  {
    name: "Ravel's Garden",
    description: 'Impressionist colour — whole-tone washes, celeste arpeggios',
    params: {
      style: 'impressionist', key: 'Db', scale: 'whole_tone', tempo: 72,
      measures: 12, dynamics: 'swell', harmonicComplexity: 8,
      melodicDensity: 4, rhythmicVariety: 3, expressiveness: 7,
    },
  },
  {
    name: 'Massive Attack Midnight',
    description: 'Trip-hop darkness — heavy bass, broken beats, filtered pads',
    params: {
      style: 'trip_hop', key: 'A', scale: 'natural_minor', tempo: 78,
      measures: 8, dynamics: 'dramatic', harmonicComplexity: 4,
      melodicDensity: 3, rhythmicVariety: 6, expressiveness: 6,
    },
  },
  {
    name: 'Motown Sunday',
    description: 'R&B groove — Rhodes, finger bass, smooth vocal line',
    params: {
      style: 'r_and_b', key: 'F', scale: 'major', tempo: 98,
      measures: 8, dynamics: 'swell', harmonicComplexity: 6,
      melodicDensity: 5, rhythmicVariety: 5, expressiveness: 7,
    },
  },
  {
    name: 'String Quartet No. 1',
    description: 'Chamber music — piano + strings, no drums, classical voice-leading',
    params: {
      style: 'chamber', key: 'C', scale: 'major', tempo: 110,
      measures: 16, dynamics: 'crescendo', harmonicComplexity: 7,
      melodicDensity: 6, rhythmicVariety: 4, expressiveness: 8,
    },
  },
  {
    name: 'Lo-fi Study Session',
    description: 'Chill tape-saturated beats with warm keys',
    params: {
      style: 'lo_fi', key: 'G', scale: 'dorian', tempo: 75,
      measures: 8, dynamics: 'flat', harmonicComplexity: 5,
      melodicDensity: 4, rhythmicVariety: 5, expressiveness: 5,
    },
  },
  {
    name: 'Dawn Cinema',
    description: 'Cinematic orchestral swell — strings and celeste',
    params: {
      style: 'cinematic', key: 'Bb', scale: 'natural_minor', tempo: 65,
      measures: 12, dynamics: 'dramatic', harmonicComplexity: 8,
      melodicDensity: 3, rhythmicVariety: 3, expressiveness: 9,
    },
  },
  {
    name: 'Gospel Revival',
    description: 'Organ-led praise — driving rhythm, rich harmony',
    params: {
      style: 'gospel', key: 'Ab', scale: 'major', tempo: 115,
      measures: 8, dynamics: 'crescendo', harmonicComplexity: 7,
      melodicDensity: 6, rhythmicVariety: 7, expressiveness: 8,
    },
  },
  {
    name: 'Ipanema Sunset',
    description: 'Bossa nova — nylon guitar, gentle percussion',
    params: {
      style: 'bossa_nova', key: 'F', scale: 'major', tempo: 140,
      measures: 8, dynamics: 'swell', harmonicComplexity: 6,
      melodicDensity: 5, rhythmicVariety: 5, expressiveness: 6,
    },
  },
];
