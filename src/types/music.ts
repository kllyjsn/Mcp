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
  | 'dominant9' | 'minor11' | 'major11' | 'dominant11'
  | 'minor13' | 'major13' | 'dominant13'
  | 'altered' | 'dominant7sharp9' | 'dominant7flat9'
  | 'dominant7sharp11' | 'minorMajor7';

export type Articulation = 'normal' | 'staccato' | 'legato' | 'accent' | 'tenuto' | 'marcato' | 'portamento';

export interface Note {
  pitch: number;
  velocity: number;
  duration: number;
  startBeat: number;
  noteName?: string;
  articulation?: Articulation;
}

export interface Chord {
  root: NoteName;
  quality: ChordQuality;
  inversion: number;
  voicing: number[];
  romanNumeral: string;
  duration: number;
  startBeat: number;
  function?: ChordFunction;
  tension?: number;
}

export type ChordFunction =
  | 'tonic' | 'subdominant' | 'dominant'
  | 'secondary_dominant' | 'borrowed' | 'neapolitan'
  | 'augmented_sixth' | 'tritone_sub' | 'chromatic_mediant'
  | 'passing' | 'pedal';

export interface MelodyContour {
  direction: 'ascending' | 'descending' | 'arch' | 'wave' | 'static';
  range: number;
  density: number;
}

export type SectionType = 'intro' | 'A' | 'B' | 'A_prime' | 'bridge' | 'climax' | 'outro' | 'development';

export interface FormSection {
  type: SectionType;
  startMeasure: number;
  length: number;
  intensity: number;
  label: string;
}

export interface CompositionParams {
  key: NoteName;
  scale: ScaleType;
  tempo: number;
  timeSignature: [number, number];
  measures: number;
  style: CompositionStyle;
  dynamics: DynamicCurve;
  harmonicComplexity: number;
  melodicDensity: number;
  rhythmicVariety: number;
  expressiveness: number;
}

export type CompositionStyle =
  | 'classical' | 'romantic' | 'impressionist'
  | 'jazz' | 'neo_soul' | 'ambient'
  | 'minimalist' | 'cinematic' | 'electronic'
  | 'bossa_nova' | 'lo_fi' | 'gospel'
  | 'late_romantic' | 'post_bop' | 'chamber' | 'film_noir';

export type DynamicCurve = 'crescendo' | 'decrescendo' | 'swell' | 'terraced' | 'flat' | 'dramatic';

export interface Track {
  id: string;
  name: string;
  instrument: InstrumentType;
  notes: Note[];
  volume: number;
  pan: number;
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
  | 'sub_bass' | 'warm_pad'
  | 'concert_grand' | 'chamber_strings' | 'warm_rhodes'
  | 'analog_pad' | 'celesta' | 'muted_trumpet'
  | 'soft_clarinet' | 'fingered_bass';

export interface TrackEffect {
  type: EffectType;
  wet: number;
  params: Record<string, number>;
}

export type EffectType =
  | 'reverb' | 'delay' | 'chorus' | 'filter' | 'compressor'
  | 'eq' | 'distortion' | 'phaser' | 'tremolo' | 'bitcrusher'
  | 'tape_saturation' | 'stereo_widener' | 'auto_pan';

export interface Composition {
  id: string;
  name: string;
  params: CompositionParams;
  tracks: Track[];
  chordProgression: Chord[];
  sections: Section[];
  tensionCurve: TensionCurve;
  form?: FormSection[];
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
  trackPresence: Record<string, number>;
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

export interface ListeningRoomPreset {
  name: string;
  description: string;
  params: Partial<CompositionParams>;
  category: 'jazz_club' | 'concert_hall' | 'salon' | 'late_night' | 'studio';
}
