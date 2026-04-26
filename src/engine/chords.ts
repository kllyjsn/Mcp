import type { NoteName, ScaleType, ChordQuality, Chord } from '../types/music';
import { NOTE_NAMES, noteNameToMidi, SCALE_INTERVALS } from './scales';

export const CHORD_INTERVALS: Record<ChordQuality, number[]> = {
  major:             [0, 4, 7],
  minor:             [0, 3, 7],
  diminished:        [0, 3, 6],
  augmented:         [0, 4, 8],
  dominant7:         [0, 4, 7, 10],
  major7:            [0, 4, 7, 11],
  minor7:            [0, 3, 7, 10],
  diminished7:       [0, 3, 6, 9],
  half_diminished7:  [0, 3, 6, 10],
  augmented7:        [0, 4, 8, 10],
  sus2:              [0, 2, 7],
  sus4:              [0, 5, 7],
  add9:              [0, 4, 7, 14],
  minor9:            [0, 3, 7, 10, 14],
  major9:            [0, 4, 7, 11, 14],
};

const ROMAN_NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

interface DiatonicChord {
  degree: number;
  quality: ChordQuality;
  roman: string;
}

function getDiatonicChords(scale: ScaleType): DiatonicChord[] {
  const intervals = SCALE_INTERVALS[scale];
  if (!intervals || intervals.length < 7) {
    return [
      { degree: 0, quality: 'major', roman: 'I' },
      { degree: 1, quality: 'minor', roman: 'ii' },
      { degree: 2, quality: 'minor', roman: 'iii' },
      { degree: 3, quality: 'major', roman: 'IV' },
      { degree: 4, quality: 'dominant7', roman: 'V7' },
      { degree: 5, quality: 'minor', roman: 'vi' },
      { degree: 6, quality: 'diminished', roman: 'vii°' },
    ];
  }

  const chords: DiatonicChord[] = [];
  for (let i = 0; i < 7; i++) {
    const third = (intervals[(i + 2) % intervals.length] - intervals[i] + 12) % 12;
    const fifth = (intervals[(i + 4) % intervals.length] - intervals[i] + 12) % 12;

    let quality: ChordQuality = 'major';
    let roman = ROMAN_NUMERALS[i];

    if (third === 3 && fifth === 7) { quality = 'minor'; roman = roman.toLowerCase(); }
    else if (third === 3 && fifth === 6) { quality = 'diminished'; roman = roman.toLowerCase() + '°'; }
    else if (third === 4 && fifth === 8) { quality = 'augmented'; roman = roman + '+'; }

    chords.push({ degree: i, quality, roman });
  }
  return chords;
}

export function buildChordVoicing(root: NoteName, quality: ChordQuality, octave: number, inversion: number = 0): number[] {
  const rootMidi = noteNameToMidi(root, octave);
  const intervals = CHORD_INTERVALS[quality];
  const voicing = intervals.map(i => rootMidi + i);

  for (let inv = 0; inv < inversion && inv < voicing.length; inv++) {
    voicing[inv] += 12;
  }
  voicing.sort((a, b) => a - b);
  return voicing;
}

export function voiceLeadChord(prevVoicing: number[], nextRoot: NoteName, nextQuality: ChordQuality): number[] {
  const baseOctave = 3;
  const candidates: number[][] = [];

  for (let oct = baseOctave - 1; oct <= baseOctave + 1; oct++) {
    for (let inv = 0; inv < CHORD_INTERVALS[nextQuality].length; inv++) {
      candidates.push(buildChordVoicing(nextRoot, nextQuality, oct, inv));
    }
  }

  let bestVoicing = candidates[0];
  let bestDistance = Infinity;

  for (const candidate of candidates) {
    const avgPrev = prevVoicing.reduce((a, b) => a + b, 0) / prevVoicing.length;
    const avgCand = candidate.reduce((a, b) => a + b, 0) / candidate.length;
    const distance = Math.abs(avgPrev - avgCand);

    const minNote = Math.min(...candidate);
    const maxNote = Math.max(...candidate);
    if (minNote < 36 || maxNote > 72) continue;

    if (distance < bestDistance) {
      bestDistance = distance;
      bestVoicing = candidate;
    }
  }

  return bestVoicing;
}

interface ProgressionTemplate {
  name: string;
  degrees: number[];
  style: string;
}

const PROGRESSION_TEMPLATES: ProgressionTemplate[] = [
  { name: 'Classical I-IV-V-I', degrees: [0, 3, 4, 0], style: 'classical' },
  { name: 'Circle of Fifths', degrees: [0, 3, 6, 2, 5, 1, 4, 0], style: 'classical' },
  { name: 'Romantic I-vi-IV-V', degrees: [0, 5, 3, 4], style: 'romantic' },
  { name: 'Jazz ii-V-I', degrees: [1, 4, 0], style: 'jazz' },
  { name: 'Jazz I-vi-ii-V', degrees: [0, 5, 1, 4], style: 'jazz' },
  { name: 'Neo Soul I-III-vi-IV', degrees: [0, 2, 5, 3], style: 'neo_soul' },
  { name: 'Impressionist I-bVII-IV', degrees: [0, 6, 3], style: 'impressionist' },
  { name: 'Cinematic i-VI-III-VII', degrees: [0, 5, 2, 6], style: 'cinematic' },
  { name: 'Ambient I-V-vi-IV', degrees: [0, 4, 5, 3], style: 'ambient' },
  { name: 'Minimalist I-II', degrees: [0, 1], style: 'minimalist' },
  { name: 'Electronic vi-IV-I-V', degrees: [5, 3, 0, 4], style: 'electronic' },
  { name: 'Phrygian i-bII-bVII-i', degrees: [0, 1, 6, 0], style: 'classical' },
  { name: 'Plagal IV-I', degrees: [3, 0], style: 'classical' },
  { name: 'Descending Bass I-V/7-vi-IV', degrees: [0, 4, 5, 3], style: 'romantic' },
];

export function generateChordProgression(
  key: NoteName,
  scale: ScaleType,
  measures: number,
  style: string,
  complexity: number,
): Chord[] {
  const diatonicChords = getDiatonicChords(scale);

  const matchingTemplates = PROGRESSION_TEMPLATES.filter(t => t.style === style);
  const template = matchingTemplates.length > 0
    ? matchingTemplates[Math.floor(Math.random() * matchingTemplates.length)]
    : PROGRESSION_TEMPLATES[Math.floor(Math.random() * PROGRESSION_TEMPLATES.length)];

  const chords: Chord[] = [];
  let prevVoicing = buildChordVoicing(key, 'major', 3);
  let currentBeat = 0;
  const beatsPerMeasure = 4;

  for (let measure = 0; measure < measures; measure++) {
    const degreeIndex = measure % template.degrees.length;
    const degree = template.degrees[degreeIndex];
    const diatonic = diatonicChords[degree % diatonicChords.length];

    let quality = diatonic.quality;
    if (complexity >= 5) {
      if (quality === 'major') quality = 'major7';
      else if (quality === 'minor') quality = 'minor7';
      else if (quality === 'dominant7') quality = 'dominant7';
    }
    if (complexity >= 8 && Math.random() > 0.6) {
      if (quality === 'major7') quality = 'major9';
      else if (quality === 'minor7') quality = 'minor9';
    }

    const rootIndex = (NOTE_NAMES.indexOf(key) + (SCALE_INTERVALS[scale]?.[degree] ?? degree * 2)) % 12;
    const chordRoot = NOTE_NAMES[rootIndex];

    const voicing = voiceLeadChord(prevVoicing, chordRoot, quality);

    const splitMeasure = complexity >= 7 && Math.random() > 0.5;

    if (splitMeasure) {
      const halfDuration = beatsPerMeasure / 2;

      chords.push({
        root: chordRoot,
        quality,
        inversion: 0,
        voicing,
        romanNumeral: diatonic.roman,
        duration: halfDuration,
        startBeat: currentBeat,
      });
      currentBeat += halfDuration;

      // passing chord: use the next measure's target as a secondary dominant approach
      const nextDegreeIndex = (measure + 1) % template.degrees.length;
      const nextDegree = template.degrees[nextDegreeIndex];
      const passingDegree = (nextDegree + 4) % 7; // dominant approach
      const passingDiatonic = diatonicChords[passingDegree % diatonicChords.length];
      const passingQuality: ChordQuality = complexity >= 5 ? 'dominant7' : 'major';
      const passingRootIndex = (NOTE_NAMES.indexOf(key) + (SCALE_INTERVALS[scale]?.[passingDegree] ?? passingDegree * 2)) % 12;
      const passingRoot = NOTE_NAMES[passingRootIndex];
      const passingVoicing = voiceLeadChord(voicing, passingRoot, passingQuality);

      chords.push({
        root: passingRoot,
        quality: passingQuality,
        inversion: 0,
        voicing: passingVoicing,
        romanNumeral: passingDiatonic.roman,
        duration: halfDuration,
        startBeat: currentBeat,
      });
      currentBeat += halfDuration;
      prevVoicing = passingVoicing;
    } else {
      chords.push({
        root: chordRoot,
        quality,
        inversion: 0,
        voicing,
        romanNumeral: diatonic.roman,
        duration: beatsPerMeasure,
        startBeat: currentBeat,
      });
      currentBeat += beatsPerMeasure;
      prevVoicing = voicing;
    }
  }

  return chords;
}

export function chordToString(chord: Chord): string {
  const qualityStr: Record<string, string> = {
    major: '', minor: 'm', diminished: 'dim', augmented: 'aug',
    dominant7: '7', major7: 'maj7', minor7: 'm7',
    diminished7: 'dim7', half_diminished7: 'ø7', augmented7: 'aug7',
    sus2: 'sus2', sus4: 'sus4', add9: 'add9', minor9: 'm9', major9: 'maj9',
  };
  return `${chord.root}${qualityStr[chord.quality] ?? ''}`;
}
