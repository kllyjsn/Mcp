export type NoteName = 'C' | 'C#' | 'D' | 'D#' | 'E' | 'F' | 'F#' | 'G' | 'G#' | 'A' | 'A#' | 'B';

export type ScaleType =
  | 'major' | 'natural_minor' | 'harmonic_minor' | 'melodic_minor'
  | 'dorian' | 'phrygian' | 'lydian' | 'mixolydian'
  | 'locrian' | 'whole_tone' | 'diminished'
  | 'pentatonic_major' | 'pentatonic_minor' | 'blues';

export type ChordQuality =
  | 'major' | 'minor' | 'diminished' | 'augmented'
  | 'dominant7' | 'major7' | 'minor7' | 'diminished7'
  | 'half_diminished7' | 'augmented7'
  | 'sus2' | 'sus4' | 'add9' | 'minor9' | 'major9'
  | 'dominant9' | 'minor11' | 'major13' | 'dominant13'
  | 'altered' | 'dominant7sharp9' | 'dominant7flat9';

export interface Note {
  pitch: number;       // MIDI note number 0-127
  velocity: number;    // 0-127
  duration: number;    // in beats
  startBeat: number;
  noteName?: string;
  ornament?: 'grace' | 'mordent' | 'turn' | 'appoggiatura';
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

export type SectionType = 'intro' | 'A' | 'B' | 'bridge' | 'climax' | 'outro';

export interface FormSection {
  type: SectionType;
  startMeasure: number;
  lengthMeasures: number;
  intensity: number;       // 0-1, controls textural density and dynamics
  activeTracks: string[];  // which track names are active in this section
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
  | 'afrobeat' | 'uk_garage';

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
  | 'warm_pad' | 'sub_bass' | 'kalimba' | 'marimba';

export interface TrackEffect {
  type: 'reverb' | 'delay' | 'chorus' | 'filter' | 'compressor' | 'eq' | 'distortion' | 'phaser' | 'tremolo' | 'bitcrusher' | 'autofilter' | 'widener';
  wet: number;
  params: Record<string, number>;
}

export interface Composition {
  id: string;
  name: string;
  params: CompositionParams;
  tracks: Track[];
  chordProgression: Chord[];
  form: FormSection[];
  createdAt: number;
}

export interface TransportState {
  isPlaying: boolean;
  currentBeat: number;
  loop: boolean;
  loopStart: number;
  loopEnd: number;
}
