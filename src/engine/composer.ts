import type { Composition, CompositionParams, CompositionStyle, FormSection, InstrumentType, Track, TrackEffect } from '../types/music';
import { generateChordProgression } from './chords';
import { generateMelody, generateBassLine, generatePadVoicings, generateArpeggio, generateDrumPattern } from './melody';
import { humanizeTrack } from './humanize';
import { generateForm, isTrackActiveAtBeat } from './form';
import { addOrnaments, addPassingTones } from './ornaments';
import { generateCountermelody } from './countermelody';

const TRACK_COLORS: Record<string, string> = {
  melody: '#C8A97E',
  harmony: '#7E9CC8',
  bass: '#8B5E3C',
  pads: '#6B8E7E',
  arpeggio: '#C87E9C',
  drums: '#9C8B7E',
  counter: '#9CC87E',
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
  drumsFx: TrackEffect[];
  counterFx: TrackEffect[];
  melodyVol: number;
  harmonyVol: number;
  bassVol: number;
  arpeggioVol: number;
  drumsVol: number;
  counterVol: number;
}

const STYLE_VOICINGS: Record<CompositionStyle, StyleVoicing> = {
  classical: {
    melody: 'piano', harmony: 'strings', bass: 'bass', arpeggio: 'bells', counter: 'strings',
    melodyFx: [{ type: 'reverb', wet: 0.25, params: { decay: 2.5 } }],
    harmonyFx: [{ type: 'reverb', wet: 0.4, params: { decay: 4 } }, { type: 'chorus', wet: 0.15, params: { frequency: 1.2, depth: 0.5 } }],
    bassFx: [{ type: 'compressor', wet: 1, params: { threshold: -20, ratio: 4 } }],
    arpeggioFx: [{ type: 'delay', wet: 0.3, params: { delayTime: 0.375, feedback: 0.3 } }, { type: 'reverb', wet: 0.3, params: { decay: 3 } }],
    drumsFx: [{ type: 'compressor', wet: 1, params: { threshold: -15, ratio: 3 } }],
    counterFx: [{ type: 'reverb', wet: 0.3, params: { decay: 3 } }],
    melodyVol: 0.8, harmonyVol: 0.55, bassVol: 0.7, arpeggioVol: 0.35, drumsVol: 0.5, counterVol: 0.45,
  },
  romantic: {
    melody: 'piano', harmony: 'strings', bass: 'bass', arpeggio: 'harp', counter: 'strings',
    melodyFx: [{ type: 'reverb', wet: 0.35, params: { decay: 3.5 } }],
    harmonyFx: [{ type: 'reverb', wet: 0.5, params: { decay: 5 } }, { type: 'chorus', wet: 0.25, params: { frequency: 1, depth: 0.7 } }],
    bassFx: [{ type: 'compressor', wet: 1, params: { threshold: -18, ratio: 3 } }],
    arpeggioFx: [{ type: 'delay', wet: 0.35, params: { delayTime: 0.5, feedback: 0.4 } }, { type: 'reverb', wet: 0.4, params: { decay: 4 } }],
    drumsFx: [{ type: 'compressor', wet: 1, params: { threshold: -15, ratio: 3 } }],
    counterFx: [{ type: 'reverb', wet: 0.4, params: { decay: 4 } }, { type: 'widener', wet: 1, params: { width: 0.4 } }],
    melodyVol: 0.82, harmonyVol: 0.6, bassVol: 0.65, arpeggioVol: 0.3, drumsVol: 0.4, counterVol: 0.42,
  },
  impressionist: {
    melody: 'piano', harmony: 'warm_pad', bass: 'bass', arpeggio: 'vibraphone', counter: 'harp',
    melodyFx: [{ type: 'reverb', wet: 0.45, params: { decay: 4 } }, { type: 'chorus', wet: 0.15, params: { frequency: 0.8, depth: 0.4 } }],
    harmonyFx: [{ type: 'reverb', wet: 0.55, params: { decay: 6 } }, { type: 'widener', wet: 1, params: { width: 0.5 } }],
    bassFx: [{ type: 'compressor', wet: 1, params: { threshold: -20, ratio: 3 } }, { type: 'reverb', wet: 0.15, params: { decay: 2 } }],
    arpeggioFx: [{ type: 'reverb', wet: 0.5, params: { decay: 5 } }, { type: 'tremolo', wet: 0.2, params: { frequency: 3, depth: 0.3 } }],
    drumsFx: [{ type: 'reverb', wet: 0.3, params: { decay: 3 } }],
    counterFx: [{ type: 'reverb', wet: 0.45, params: { decay: 4.5 } }, { type: 'delay', wet: 0.2, params: { delayTime: 0.6, feedback: 0.25 } }],
    melodyVol: 0.75, harmonyVol: 0.5, bassVol: 0.6, arpeggioVol: 0.4, drumsVol: 0.35, counterVol: 0.38,
  },
  jazz: {
    melody: 'electric_piano', harmony: 'electric_piano', bass: 'upright_bass', arpeggio: 'vibraphone', counter: 'brass',
    melodyFx: [{ type: 'reverb', wet: 0.2, params: { decay: 2 } }, { type: 'chorus', wet: 0.1, params: { frequency: 0.8, depth: 0.3 } }],
    harmonyFx: [{ type: 'reverb', wet: 0.25, params: { decay: 2.5 } }, { type: 'tremolo', wet: 0.08, params: { frequency: 3.5, depth: 0.2 } }],
    bassFx: [{ type: 'compressor', wet: 1, params: { threshold: -16, ratio: 3 } }, { type: 'eq', wet: 1, params: { low: 3, mid: 0, high: -4 } }],
    arpeggioFx: [{ type: 'reverb', wet: 0.3, params: { decay: 2.5 } }, { type: 'tremolo', wet: 0.15, params: { frequency: 5, depth: 0.25 } }],
    drumsFx: [{ type: 'compressor', wet: 1, params: { threshold: -18, ratio: 2.5 } }, { type: 'reverb', wet: 0.12, params: { decay: 1.5 } }],
    counterFx: [{ type: 'reverb', wet: 0.2, params: { decay: 2 } }],
    melodyVol: 0.78, harmonyVol: 0.5, bassVol: 0.72, arpeggioVol: 0.3, drumsVol: 0.52, counterVol: 0.4,
  },
  neo_soul: {
    melody: 'electric_piano', harmony: 'electric_piano', bass: 'bass', arpeggio: 'vibraphone', counter: 'warm_pad',
    melodyFx: [{ type: 'phaser', wet: 0.15, params: { frequency: 0.3, octaves: 2, baseFrequency: 400 } }, { type: 'reverb', wet: 0.25, params: { decay: 2.5 } }],
    harmonyFx: [{ type: 'chorus', wet: 0.2, params: { frequency: 1.2, depth: 0.5 } }, { type: 'reverb', wet: 0.3, params: { decay: 3 } }],
    bassFx: [{ type: 'compressor', wet: 1, params: { threshold: -18, ratio: 4 } }, { type: 'filter', wet: 1, params: { frequency: 800 } }],
    arpeggioFx: [{ type: 'delay', wet: 0.25, params: { delayTime: 0.375, feedback: 0.3 } }, { type: 'reverb', wet: 0.3, params: { decay: 3 } }],
    drumsFx: [{ type: 'compressor', wet: 1, params: { threshold: -16, ratio: 3 } }],
    counterFx: [{ type: 'chorus', wet: 0.15, params: { frequency: 0.8, depth: 0.4 } }, { type: 'reverb', wet: 0.3, params: { decay: 3 } }],
    melodyVol: 0.76, harmonyVol: 0.52, bassVol: 0.7, arpeggioVol: 0.32, drumsVol: 0.5, counterVol: 0.38,
  },
  ambient: {
    melody: 'warm_pad', harmony: 'warm_pad', bass: 'bass', arpeggio: 'bells', counter: 'choir',
    melodyFx: [{ type: 'reverb', wet: 0.6, params: { decay: 8 } }, { type: 'delay', wet: 0.4, params: { delayTime: 0.6, feedback: 0.5 } }],
    harmonyFx: [{ type: 'reverb', wet: 0.7, params: { decay: 10 } }, { type: 'chorus', wet: 0.3, params: { frequency: 0.3, depth: 0.8 } }, { type: 'widener', wet: 1, params: { width: 0.6 } }],
    bassFx: [{ type: 'reverb', wet: 0.3, params: { decay: 4 } }, { type: 'filter', wet: 1, params: { frequency: 500 } }],
    arpeggioFx: [{ type: 'delay', wet: 0.5, params: { delayTime: 0.75, feedback: 0.55 } }, { type: 'reverb', wet: 0.6, params: { decay: 8 } }],
    drumsFx: [{ type: 'reverb', wet: 0.4, params: { decay: 5 } }],
    counterFx: [{ type: 'reverb', wet: 0.65, params: { decay: 9 } }, { type: 'widener', wet: 1, params: { width: 0.7 } }],
    melodyVol: 0.65, harmonyVol: 0.55, bassVol: 0.5, arpeggioVol: 0.4, drumsVol: 0.3, counterVol: 0.35,
  },
  minimalist: {
    melody: 'piano', harmony: 'piano', bass: 'bass', arpeggio: 'bells', counter: 'marimba',
    melodyFx: [{ type: 'reverb', wet: 0.2, params: { decay: 2 } }],
    harmonyFx: [{ type: 'reverb', wet: 0.2, params: { decay: 2 } }],
    bassFx: [{ type: 'compressor', wet: 1, params: { threshold: -20, ratio: 3 } }],
    arpeggioFx: [{ type: 'reverb', wet: 0.25, params: { decay: 2.5 } }],
    drumsFx: [{ type: 'compressor', wet: 1, params: { threshold: -15, ratio: 2 } }],
    counterFx: [{ type: 'reverb', wet: 0.2, params: { decay: 2 } }],
    melodyVol: 0.75, harmonyVol: 0.5, bassVol: 0.6, arpeggioVol: 0.35, drumsVol: 0.35, counterVol: 0.4,
  },
  cinematic: {
    melody: 'strings', harmony: 'choir', bass: 'bass', arpeggio: 'piano', counter: 'brass',
    melodyFx: [{ type: 'reverb', wet: 0.45, params: { decay: 5 } }, { type: 'widener', wet: 1, params: { width: 0.4 } }],
    harmonyFx: [{ type: 'reverb', wet: 0.55, params: { decay: 6 } }, { type: 'chorus', wet: 0.2, params: { frequency: 0.5, depth: 0.6 } }, { type: 'widener', wet: 1, params: { width: 0.5 } }],
    bassFx: [{ type: 'compressor', wet: 1, params: { threshold: -18, ratio: 4 } }, { type: 'eq', wet: 1, params: { low: 4, mid: -2, high: -6 } }],
    arpeggioFx: [{ type: 'reverb', wet: 0.4, params: { decay: 4 } }, { type: 'delay', wet: 0.2, params: { delayTime: 0.5, feedback: 0.3 } }],
    drumsFx: [{ type: 'compressor', wet: 1, params: { threshold: -12, ratio: 4 } }, { type: 'reverb', wet: 0.2, params: { decay: 3 } }],
    counterFx: [{ type: 'reverb', wet: 0.45, params: { decay: 5 } }],
    melodyVol: 0.82, harmonyVol: 0.65, bassVol: 0.7, arpeggioVol: 0.35, drumsVol: 0.55, counterVol: 0.48,
  },
  electronic: {
    melody: 'synth_lead', harmony: 'pads', bass: 'sub_bass', arpeggio: 'bells', counter: 'synth_lead',
    melodyFx: [{ type: 'delay', wet: 0.25, params: { delayTime: 0.25, feedback: 0.3 } }, { type: 'reverb', wet: 0.2, params: { decay: 2 } }],
    harmonyFx: [{ type: 'chorus', wet: 0.3, params: { frequency: 2, depth: 0.7 } }, { type: 'reverb', wet: 0.35, params: { decay: 4 } }, { type: 'widener', wet: 1, params: { width: 0.5 } }],
    bassFx: [{ type: 'compressor', wet: 1, params: { threshold: -15, ratio: 5 } }, { type: 'distortion', wet: 0.1, params: { amount: 0.2 } }],
    arpeggioFx: [{ type: 'delay', wet: 0.4, params: { delayTime: 0.1875, feedback: 0.45 } }, { type: 'filter', wet: 1, params: { frequency: 3000 } }],
    drumsFx: [{ type: 'compressor', wet: 1, params: { threshold: -10, ratio: 5 } }],
    counterFx: [{ type: 'autofilter', wet: 0.3, params: { frequency: 0.5, baseFrequency: 400, octaves: 3 } }, { type: 'reverb', wet: 0.2, params: { decay: 2 } }],
    melodyVol: 0.8, harmonyVol: 0.5, bassVol: 0.75, arpeggioVol: 0.4, drumsVol: 0.6, counterVol: 0.35,
  },
  bossa_nova: {
    melody: 'nylon_guitar', harmony: 'electric_piano', bass: 'upright_bass', arpeggio: 'vibraphone', counter: 'nylon_guitar',
    melodyFx: [{ type: 'reverb', wet: 0.2, params: { decay: 2 } }, { type: 'chorus', wet: 0.08, params: { frequency: 0.6, depth: 0.3 } }],
    harmonyFx: [{ type: 'tremolo', wet: 0.1, params: { frequency: 4, depth: 0.2 } }, { type: 'reverb', wet: 0.25, params: { decay: 2.5 } }],
    bassFx: [{ type: 'compressor', wet: 1, params: { threshold: -16, ratio: 3 } }, { type: 'eq', wet: 1, params: { low: 2, mid: 1, high: -3 } }],
    arpeggioFx: [{ type: 'reverb', wet: 0.3, params: { decay: 3 } }, { type: 'tremolo', wet: 0.12, params: { frequency: 5, depth: 0.2 } }],
    drumsFx: [{ type: 'compressor', wet: 1, params: { threshold: -18, ratio: 2.5 } }, { type: 'reverb', wet: 0.1, params: { decay: 1.5 } }],
    counterFx: [{ type: 'reverb', wet: 0.2, params: { decay: 2 } }],
    melodyVol: 0.78, harmonyVol: 0.48, bassVol: 0.7, arpeggioVol: 0.28, drumsVol: 0.42, counterVol: 0.35,
  },
  lo_fi: {
    melody: 'tape_keys', harmony: 'electric_piano', bass: 'bass', arpeggio: 'vibraphone', counter: 'kalimba',
    melodyFx: [{ type: 'bitcrusher', wet: 0.12, params: { bits: 12 } }, { type: 'reverb', wet: 0.3, params: { decay: 3 } }, { type: 'chorus', wet: 0.1, params: { frequency: 0.5, depth: 0.4 } }],
    harmonyFx: [{ type: 'filter', wet: 1, params: { frequency: 2500 } }, { type: 'reverb', wet: 0.35, params: { decay: 3.5 } }],
    bassFx: [{ type: 'compressor', wet: 1, params: { threshold: -18, ratio: 4 } }, { type: 'filter', wet: 1, params: { frequency: 600 } }],
    arpeggioFx: [{ type: 'bitcrusher', wet: 0.08, params: { bits: 14 } }, { type: 'delay', wet: 0.3, params: { delayTime: 0.375, feedback: 0.35 } }, { type: 'reverb', wet: 0.35, params: { decay: 3.5 } }],
    drumsFx: [{ type: 'bitcrusher', wet: 0.15, params: { bits: 10 } }, { type: 'compressor', wet: 1, params: { threshold: -14, ratio: 3 } }],
    counterFx: [{ type: 'bitcrusher', wet: 0.1, params: { bits: 12 } }, { type: 'reverb', wet: 0.3, params: { decay: 3 } }],
    melodyVol: 0.72, harmonyVol: 0.48, bassVol: 0.68, arpeggioVol: 0.32, drumsVol: 0.45, counterVol: 0.3,
  },
  gospel: {
    melody: 'piano', harmony: 'organ', bass: 'bass', arpeggio: 'piano', counter: 'choir',
    melodyFx: [{ type: 'reverb', wet: 0.3, params: { decay: 3 } }],
    harmonyFx: [{ type: 'reverb', wet: 0.35, params: { decay: 3.5 } }, { type: 'tremolo', wet: 0.08, params: { frequency: 5.5, depth: 0.15 } }],
    bassFx: [{ type: 'compressor', wet: 1, params: { threshold: -18, ratio: 4 } }],
    arpeggioFx: [{ type: 'reverb', wet: 0.3, params: { decay: 3 } }],
    drumsFx: [{ type: 'compressor', wet: 1, params: { threshold: -14, ratio: 3.5 } }, { type: 'reverb', wet: 0.1, params: { decay: 2 } }],
    counterFx: [{ type: 'reverb', wet: 0.35, params: { decay: 3.5 } }, { type: 'widener', wet: 1, params: { width: 0.4 } }],
    melodyVol: 0.82, harmonyVol: 0.6, bassVol: 0.72, arpeggioVol: 0.3, drumsVol: 0.55, counterVol: 0.45,
  },
  afrobeat: {
    melody: 'brass', harmony: 'organ', bass: 'bass', arpeggio: 'kalimba', counter: 'nylon_guitar',
    melodyFx: [{ type: 'reverb', wet: 0.15, params: { decay: 1.5 } }],
    harmonyFx: [{ type: 'tremolo', wet: 0.12, params: { frequency: 5, depth: 0.2 } }, { type: 'reverb', wet: 0.2, params: { decay: 2 } }],
    bassFx: [{ type: 'compressor', wet: 1, params: { threshold: -16, ratio: 4 } }, { type: 'eq', wet: 1, params: { low: 4, mid: 0, high: -3 } }],
    arpeggioFx: [{ type: 'reverb', wet: 0.2, params: { decay: 2 } }, { type: 'delay', wet: 0.15, params: { delayTime: 0.375, feedback: 0.2 } }],
    drumsFx: [{ type: 'compressor', wet: 1, params: { threshold: -14, ratio: 3 } }],
    counterFx: [{ type: 'reverb', wet: 0.15, params: { decay: 1.5 } }, { type: 'chorus', wet: 0.08, params: { frequency: 0.6, depth: 0.3 } }],
    melodyVol: 0.78, harmonyVol: 0.55, bassVol: 0.75, arpeggioVol: 0.35, drumsVol: 0.62, counterVol: 0.42,
  },
  uk_garage: {
    melody: 'electric_piano', harmony: 'warm_pad', bass: 'sub_bass', arpeggio: 'bells', counter: 'electric_piano',
    melodyFx: [{ type: 'reverb', wet: 0.2, params: { decay: 2 } }, { type: 'chorus', wet: 0.1, params: { frequency: 1, depth: 0.3 } }],
    harmonyFx: [{ type: 'reverb', wet: 0.35, params: { decay: 3.5 } }, { type: 'widener', wet: 1, params: { width: 0.5 } }],
    bassFx: [{ type: 'compressor', wet: 1, params: { threshold: -12, ratio: 5 } }, { type: 'filter', wet: 1, params: { frequency: 120 } }],
    arpeggioFx: [{ type: 'delay', wet: 0.35, params: { delayTime: 0.25, feedback: 0.4 } }, { type: 'reverb', wet: 0.25, params: { decay: 2.5 } }],
    drumsFx: [{ type: 'compressor', wet: 1, params: { threshold: -12, ratio: 4.5 } }],
    counterFx: [{ type: 'reverb', wet: 0.25, params: { decay: 2.5 } }, { type: 'autofilter', wet: 0.2, params: { frequency: 0.8, baseFrequency: 300, octaves: 2 } }],
    melodyVol: 0.75, harmonyVol: 0.5, bassVol: 0.8, arpeggioVol: 0.35, drumsVol: 0.65, counterVol: 0.38,
  },
};

function applyFormGating(
  notes: import('../types/music').Note[],
  trackName: string,
  form: FormSection[],
  beatsPerMeasure: number,
): import('../types/music').Note[] {
  return notes.filter(note =>
    isTrackActiveAtBeat(form, trackName, note.startBeat, beatsPerMeasure),
  );
}

function applyFormDynamics(
  notes: import('../types/music').Note[],
  form: FormSection[],
  beatsPerMeasure: number,
): import('../types/music').Note[] {
  return notes.map(note => {
    const section = form.find(s => {
      const startBeat = s.startMeasure * beatsPerMeasure;
      const endBeat = (s.startMeasure + s.lengthMeasures) * beatsPerMeasure;
      return note.startBeat >= startBeat && note.startBeat < endBeat;
    });
    if (!section) return note;

    const dynamicScale = 0.5 + section.intensity * 0.5;
    return {
      ...note,
      velocity: Math.max(20, Math.min(127, Math.round(note.velocity * dynamicScale))),
    };
  });
}

export function compose(params: CompositionParams): Composition {
  const form = generateForm(params);

  const chords = generateChordProgression(
    params.key,
    params.scale,
    params.measures,
    params.style,
    params.harmonicComplexity,
    form,
  );

  const sv = STYLE_VOICINGS[params.style];
  const beatsPerBar = params.timeSignature[0];

  let melodyRaw = generateMelody(params, chords, [4, 6]);
  melodyRaw = addOrnaments(melodyRaw, params);
  melodyRaw = addPassingTones(melodyRaw, params);
  const melodyNotes = humanizeTrack(
    applyFormDynamics(applyFormGating(melodyRaw, 'Melody', form, beatsPerBar), form, beatsPerBar),
    params.style, 'Melody', beatsPerBar,
  );

  const bassNotes = humanizeTrack(
    applyFormDynamics(applyFormGating(generateBassLine(params, chords), 'Bass', form, beatsPerBar), form, beatsPerBar),
    params.style, 'Bass', beatsPerBar,
  );

  const padNotes = humanizeTrack(
    applyFormDynamics(applyFormGating(generatePadVoicings(params, chords), 'Harmony', form, beatsPerBar), form, beatsPerBar),
    params.style, 'Harmony', beatsPerBar,
  );

  const arpeggioNotes = humanizeTrack(
    applyFormDynamics(applyFormGating(generateArpeggio(params, chords), 'Arpeggio', form, beatsPerBar), form, beatsPerBar),
    params.style, 'Arpeggio', beatsPerBar,
  );

  const drumNotes = humanizeTrack(
    applyFormGating(generateDrumPattern(params), 'Drums', form, beatsPerBar),
    params.style, 'Drums', beatsPerBar,
  );

  let counterRaw = generateCountermelody(params, chords, melodyRaw, form);
  counterRaw = addOrnaments(counterRaw, params);
  const counterNotes = humanizeTrack(
    applyFormDynamics(counterRaw, form, beatsPerBar),
    params.style, 'Counter', beatsPerBar,
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
    {
      id: makeTrackId(),
      name: 'Counter',
      instrument: sv.counter,
      notes: counterNotes,
      volume: sv.counterVol,
      pan: -0.35,
      muted: false,
      solo: false,
      color: TRACK_COLORS.counter,
      effects: sv.counterFx,
    },
  ];

  const scaleLabel = params.scale.replace(/_/g, ' ');
  return {
    id: Math.random().toString(36).slice(2, 10),
    name: `Composition in ${params.key} ${scaleLabel}`,
    params,
    tracks,
    chordProgression: chords,
    form,
    createdAt: Date.now(),
  };
}

export function recomposeTrack(
  composition: Composition,
  trackIndex: number,
): Track {
  const track = composition.tracks[trackIndex];
  const { params, chordProgression, form } = composition;
  const beatsPerBar = params.timeSignature[0];

  let newNotes;
  switch (track.name) {
    case 'Melody': {
      let raw = generateMelody(params, chordProgression, [4, 6]);
      raw = addOrnaments(raw, params);
      raw = addPassingTones(raw, params);
      newNotes = applyFormDynamics(applyFormGating(raw, 'Melody', form, beatsPerBar), form, beatsPerBar);
      break;
    }
    case 'Bass':
      newNotes = applyFormDynamics(applyFormGating(generateBassLine(params, chordProgression), 'Bass', form, beatsPerBar), form, beatsPerBar);
      break;
    case 'Harmony':
      newNotes = applyFormDynamics(applyFormGating(generatePadVoicings(params, chordProgression), 'Harmony', form, beatsPerBar), form, beatsPerBar);
      break;
    case 'Arpeggio':
      newNotes = applyFormDynamics(applyFormGating(generateArpeggio(params, chordProgression), 'Arpeggio', form, beatsPerBar), form, beatsPerBar);
      break;
    case 'Drums':
      newNotes = applyFormGating(generateDrumPattern(params), 'Drums', form, beatsPerBar);
      break;
    case 'Counter': {
      const melodyTrack = composition.tracks.find(t => t.name === 'Melody');
      const melodyNotes = melodyTrack?.notes ?? generateMelody(params, chordProgression, [4, 6]);
      let raw = generateCountermelody(params, chordProgression, melodyNotes, form);
      raw = addOrnaments(raw, params);
      newNotes = applyFormDynamics(raw, form, beatsPerBar);
      break;
    }
    default:
      newNotes = generateMelody(params, chordProgression);
  }

  newNotes = humanizeTrack(newNotes, params.style, track.name, beatsPerBar);

  return { ...track, notes: newNotes };
}
