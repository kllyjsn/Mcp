import type { Composition, CompositionParams, Track } from '../types/music';
import { generateChordProgression } from './chords';
import { generateMelody, generateBassLine, generatePadVoicings, generateArpeggio, generateDrumPattern, generateCountermelody } from './melody';

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

export function compose(params: CompositionParams): Composition {
  const chords = generateChordProgression(
    params.key,
    params.scale,
    params.measures,
    params.style,
    params.harmonicComplexity,
  );

  const melodyNotes = generateMelody(params, chords, [4, 6]);
  const countermelodyNotes = generateCountermelody(params, chords, melodyNotes);
  const bassNotes = generateBassLine(params, chords);
  const padNotes = generatePadVoicings(params, chords);
  const arpeggioNotes = generateArpeggio(params, chords);
  const drumNotes = generateDrumPattern(params);

  const tracks: Track[] = [
    {
      id: makeTrackId(),
      name: 'Melody',
      instrument: 'piano',
      notes: melodyNotes,
      volume: 0.8,
      pan: 0,
      muted: false,
      solo: false,
      color: TRACK_COLORS.melody,
      effects: [
        { type: 'reverb', wet: 0.25, params: { decay: 2.5 } },
        { type: 'delay', wet: 0.08, params: { delayTime: 0.3, feedback: 0.15 } },
      ],
    },
    {
      id: makeTrackId(),
      name: 'Countermelody',
      instrument: 'woodwind',
      notes: countermelodyNotes,
      volume: 0.4,
      pan: 0.25,
      muted: false,
      solo: false,
      color: TRACK_COLORS.countermelody,
      effects: [
        { type: 'reverb', wet: 0.35, params: { decay: 3 } },
        { type: 'chorus', wet: 0.15, params: { frequency: 0.8, depth: 0.4 } },
      ],
    },
    {
      id: makeTrackId(),
      name: 'Harmony',
      instrument: 'strings',
      notes: padNotes,
      volume: 0.55,
      pan: -0.2,
      muted: false,
      solo: false,
      color: TRACK_COLORS.harmony,
      effects: [
        { type: 'reverb', wet: 0.4, params: { decay: 4 } },
        { type: 'chorus', wet: 0.2, params: { frequency: 1.5, depth: 0.7 } },
      ],
    },
    {
      id: makeTrackId(),
      name: 'Bass',
      instrument: 'bass',
      notes: bassNotes,
      volume: 0.7,
      pan: 0,
      muted: false,
      solo: false,
      color: TRACK_COLORS.bass,
      effects: [{ type: 'compressor', wet: 1, params: { threshold: -20, ratio: 4 } }],
    },
    {
      id: makeTrackId(),
      name: 'Arpeggio',
      instrument: 'bells',
      notes: arpeggioNotes,
      volume: 0.35,
      pan: 0.3,
      muted: false,
      solo: false,
      color: TRACK_COLORS.arpeggio,
      effects: [
        { type: 'delay', wet: 0.3, params: { delayTime: 0.375, feedback: 0.35 } },
        { type: 'reverb', wet: 0.3, params: { decay: 3 } },
      ],
    },
    {
      id: makeTrackId(),
      name: 'Drums',
      instrument: 'drums',
      notes: drumNotes,
      volume: 0.5,
      pan: 0,
      muted: false,
      solo: false,
      color: TRACK_COLORS.drums,
      effects: [{ type: 'compressor', wet: 1, params: { threshold: -15, ratio: 3 } }],
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

  let newNotes;
  switch (track.name) {
    case 'Melody': newNotes = generateMelody(params, chordProgression, [4, 6]); break;
    case 'Countermelody': {
      const melodyTrack = composition.tracks.find(t => t.name === 'Melody');
      const primaryMelody = melodyTrack ? melodyTrack.notes : [];
      newNotes = generateCountermelody(params, chordProgression, primaryMelody);
      break;
    }
    case 'Bass': newNotes = generateBassLine(params, chordProgression); break;
    case 'Harmony': newNotes = generatePadVoicings(params, chordProgression); break;
    case 'Arpeggio': newNotes = generateArpeggio(params, chordProgression); break;
    case 'Drums': newNotes = generateDrumPattern(params); break;
    default: newNotes = generateMelody(params, chordProgression);
  }

  return { ...track, notes: newNotes };
}
