export type NoteName = 'C' | 'C#' | 'D' | 'D#' | 'E' | 'F' | 'F#' | 'G' | 'G#' | 'A' | 'A#' | 'B' | 'Db' | 'Eb' | 'Ab' | 'Bb';

export type ScaleType =
  | 'major' | 'natural_minor' | 'harmonic_minor' | 'melodic_minor'
  | 'dorian' | 'phrygian' | 'lydian' | 'mixolydian'
  | 'locrian' | 'whole_tone' | 'diminished'
  | 'pentatonic_major' | 'pentatonic_minor' | 'blues'
  | 'bebop_dominant' | 'bebop_major' | 'hungarian_minor' | 'lydian_dominant';

export type ChordQuality =
  | 'major' | 'minor' | 'diminished' | 'augmented'
  | 'dominant7' | 'major7' | 'minor7' | 'diminished7'
  | 'half_diminished7' | 'augmented7'
  | 'sus2' | 'sus4' | 'add9' | 'minor9' | 'major9'
  | 'major6' | 'minor6' | 'dominant9' | 'dominant13'
  | 'minor11' | 'major7sharp11';

export interface Note {
  pitch: number;       // MIDI note number 0-127
  velocity: number;    // 0-127
  duration: number;    // in beats
  startBeat: number;
  noteName?: string;
  articulation?: 'legato' | 'staccato' | 'tenuto' | 'accent' | 'normal';
}

export interface Chord {
  root: NoteName;
  quality: ChordQuality;
  inversion: number;
  voicing: number[];   // MIDI pitches
  romanNumeral: string;
  duration: number;
  startBeat: number;
}

export interface MelodyContour {
  direction: 'ascending' | 'descending' | 'arch' | 'wave' | 'static';
  range: number;       // in semitones
  density: number;     // notes per beat (0.5 = half notes, 2 = eighth notes)
}

export interface CompositionParams {
  key: NoteName;
  scale: ScaleType;
  tempo: number;
  timeSignature: [number, number];
  measures: number;
  style: CompositionStyle;
  dynamics: DynamicCurve;
  harmonicComplexity: number;  // 1-10
  melodicDensity: number;      // 1-10
  rhythmicVariety: number;     // 1-10
  expressiveness: number;      // 1-10
}

export type CompositionStyle =
  | 'classical' | 'romantic' | 'impressionist'
  | 'jazz' | 'neo_soul' | 'ambient'
  | 'minimalist' | 'cinematic' | 'electronic'
  | 'bossa_nova' | 'lo_fi' | 'gospel'
  | 'listening_room' | 'modal_jazz' | 'chamber'
  | 'trip_hop' | 'r_and_b';

export type DynamicCurve = 'crescendo' | 'decrescendo' | 'swell' | 'terraced' | 'flat' | 'dramatic';

export interface Track {
  id: string;
  name: string;
  instrument: InstrumentType;
  notes: Note[];
  volume: number;     // 0-1
  pan: number;        // -1 to 1
  muted: boolean;
  solo: boolean;
  color: string;
  effects: TrackEffect[];
}

export type InstrumentType =
  | 'piano' | 'strings' | 'bass' | 'pads'
  | 'bells' | 'brass' | 'woodwind' | 'drums'
  | 'harp' | 'organ' | 'choir' | 'synth_lead'
  | 'electric_piano' | 'upright_bass' | 'nylon_guitar'
  | 'vibraphone' | 'clavinet' | 'tape_keys'
  | 'wurlitzer' | 'muted_trumpet' | 'marimba'
  | 'analog_pad' | 'celeste' | 'harpsichord'
  | 'fretless_bass' | 'finger_bass';

export interface TrackEffect {
  type: 'reverb' | 'delay' | 'chorus' | 'filter' | 'compressor' | 'eq' | 'distortion' | 'phaser' | 'tremolo' | 'bitcrusher' | 'auto_wah' | 'ping_pong_delay';
  wet: number;
  params: Record<string, number>;
}

export interface Composition {
  id: string;
  name: string;
  params: CompositionParams;
  tracks: Track[];
  chordProgression: Chord[];
  createdAt: number;
}

export interface TransportState {
  isPlaying: boolean;
  currentBeat: number;
  loop: boolean;
  loopStart: number;
  loopEnd: number;
}

export interface CompositionPreset {
  name: string;
  description: string;
  params: Partial<CompositionParams>;
}
