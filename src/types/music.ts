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
  | 'dominant9' | 'dominant13' | 'minor11' | 'major7sharp11'
  | 'altered' | 'minor_major7' | 'sixth' | 'minor6';

export interface Note {
  pitch: number;       // MIDI note number 0-127
  velocity: number;    // 0-127
  duration: number;    // in beats
  startBeat: number;
  noteName?: string;
  isGraceNote?: boolean;
  ornament?: 'mordent' | 'trill' | 'turn' | 'appoggiatura';
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
  | 'bossa_nova' | 'lo_fi' | 'gospel';

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
  | 'muted_trumpet' | 'flute' | 'celesta' | 'warm_pad'
  | 'sub_bass';

export interface TrackEffect {
  type: 'reverb' | 'delay' | 'chorus' | 'filter' | 'compressor' | 'eq' | 'distortion' | 'phaser' | 'tremolo' | 'bitcrusher' | 'auto_filter' | 'stereo_widener' | 'vibrato';
  wet: number;
  params: Record<string, number>;
}

export interface Composition {
  id: string;
  name: string;
  params: CompositionParams;
  tracks: Track[];
  chordProgression: Chord[];
  sections: Section[];
  tensionCurve: TensionCurve;
  createdAt: number;
}

export interface TransportState {
  isPlaying: boolean;
  currentBeat: number;
  loop: boolean;
  loopStart: number;
  loopEnd: number;
}

// ---------------------------------------------------------------------------
// Section / Arrangement intelligence
// ---------------------------------------------------------------------------

export type SectionKind = 'intro' | 'verse' | 'build' | 'climax' | 'breakdown' | 'outro';

export interface Section {
  kind: SectionKind;
  startMeasure: number;
  lengthMeasures: number;
  /** Per-track presence: 0 = silent, 0.5 = sparse/textural, 1 = full */
  trackPresence: Record<string, number>;
  /** 0-1 tension level for this section */
  tension: number;
}

// ---------------------------------------------------------------------------
// Tension / Release arc
// ---------------------------------------------------------------------------

export interface TensionPoint {
  beat: number;
  tension: number;  // 0-1
}

export type TensionCurve = TensionPoint[];
