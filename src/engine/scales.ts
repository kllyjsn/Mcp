import type { NoteName, ScaleType } from '../types/music';

export const NOTE_NAMES: NoteName[] = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const ENHARMONIC_MAP: Partial<Record<NoteName, NoteName>> = {
  'Db': 'C#', 'Eb': 'D#', 'Ab': 'G#', 'Bb': 'A#',
};

export function resolveNoteName(name: NoteName): NoteName {
  return ENHARMONIC_MAP[name] ?? name;
}

export const SCALE_INTERVALS: Record<ScaleType, number[]> = {
  major:            [0, 2, 4, 5, 7, 9, 11],
  natural_minor:    [0, 2, 3, 5, 7, 8, 10],
  harmonic_minor:   [0, 2, 3, 5, 7, 8, 11],
  melodic_minor:    [0, 2, 3, 5, 7, 9, 11],
  dorian:           [0, 2, 3, 5, 7, 9, 10],
  phrygian:         [0, 1, 3, 5, 7, 8, 10],
  lydian:           [0, 2, 4, 6, 7, 9, 11],
  mixolydian:       [0, 2, 4, 5, 7, 9, 10],
  locrian:          [0, 1, 3, 5, 6, 8, 10],
  whole_tone:       [0, 2, 4, 6, 8, 10],
  diminished:       [0, 2, 3, 5, 6, 8, 9, 11],
  pentatonic_major: [0, 2, 4, 7, 9],
  pentatonic_minor: [0, 3, 5, 7, 10],
  blues:            [0, 3, 5, 6, 7, 10],
  bebop_dominant:   [0, 2, 4, 5, 7, 9, 10, 11],
  bebop_major:      [0, 2, 4, 5, 7, 8, 9, 11],
  hungarian_minor:  [0, 2, 3, 6, 7, 8, 11],
  lydian_dominant:  [0, 2, 4, 6, 7, 9, 10],
};

export function noteNameToMidi(name: NoteName, octave: number): number {
  const resolved = resolveNoteName(name);
  return NOTE_NAMES.indexOf(resolved) + (octave + 1) * 12;
}

export function midiToNoteName(midi: number): { name: NoteName; octave: number } {
  const octave = Math.floor(midi / 12) - 1;
  const name = NOTE_NAMES[midi % 12];
  return { name, octave };
}

export function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function getScaleNotes(root: NoteName, scale: ScaleType, octave: number): number[] {
  const rootMidi = noteNameToMidi(root, octave);
  return SCALE_INTERVALS[scale].map(interval => rootMidi + interval);
}

export function getScaleNotesMultiOctave(root: NoteName, scale: ScaleType, startOctave: number, endOctave: number): number[] {
  const notes: number[] = [];
  for (let oct = startOctave; oct <= endOctave; oct++) {
    notes.push(...getScaleNotes(root, scale, oct));
  }
  return notes;
}

export function isNoteInScale(midi: number, root: NoteName, scale: ScaleType): boolean {
  const rootIndex = NOTE_NAMES.indexOf(resolveNoteName(root));
  const noteIndex = (midi - rootIndex + 120) % 12;
  return SCALE_INTERVALS[scale].includes(noteIndex);
}

export function nearestScaleNote(midi: number, root: NoteName, scale: ScaleType): number {
  if (isNoteInScale(midi, root, scale)) return midi;
  for (let offset = 1; offset <= 6; offset++) {
    if (isNoteInScale(midi + offset, root, scale)) return midi + offset;
    if (isNoteInScale(midi - offset, root, scale)) return midi - offset;
  }
  return midi;
}

export function midiNoteToString(midi: number): string {
  const { name, octave } = midiToNoteName(midi);
  return `${name}${octave}`;
}

export function getChordTones(_root: NoteName, scale: ScaleType, degree: number): number[] {
  const intervals = SCALE_INTERVALS[scale];
  if (!intervals || intervals.length < 5) return [0, 4, 7];
  const tones: number[] = [];
  for (let i = 0; i < 4; i++) {
    const idx = (degree + i * 2) % intervals.length;
    tones.push(intervals[idx]);
  }
  return tones;
}
