import type { NoteName, ScaleType, ChordQuality, Chord, CompositionStyle } from '../types/music';
import { NOTE_NAMES, noteNameToMidi, SCALE_INTERVALS } from './scales';
import type { TensionCurve } from './tension';
import { tensionAtBeat } from './tension';

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
  dominant9:         [0, 4, 7, 10, 14],
  minor11:           [0, 3, 7, 10, 14, 17],
  dominant13:        [0, 4, 7, 10, 14, 21],
  major6:            [0, 4, 7, 9],
  minor6:            [0, 3, 7, 9],
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

/**
 * Drop-2 voicing: take a close-position chord and drop the second-from-top
 * note down an octave. Standard jazz guitar/piano technique.
 */
function buildDrop2Voicing(root: NoteName, quality: ChordQuality, octave: number): number[] {
  const close = buildChordVoicing(root, quality, octave);
  if (close.length < 4) return close;

  const sorted = [...close].sort((a, b) => a - b);
  const secondFromTop = sorted[sorted.length - 2];
  return sorted.map(n => n === secondFromTop ? n - 12 : n).sort((a, b) => a - b);
}

/**
 * Shell voicing: root + 3rd + 7th (omit 5th). Classic jazz comping technique.
 */
function buildShellVoicing(root: NoteName, quality: ChordQuality, octave: number): number[] {
  const rootMidi = noteNameToMidi(root, octave);
  const intervals = CHORD_INTERVALS[quality];
  const shell = [rootMidi];

  const third = intervals.find(i => i === 3 || i === 4);
  if (third !== undefined) shell.push(rootMidi + third);

  const seventh = intervals.find(i => i === 10 || i === 11);
  if (seventh !== undefined) {
    shell.push(rootMidi + seventh);
  } else {
    const fifth = intervals.find(i => i === 7 || i === 6 || i === 8);
    if (fifth !== undefined) shell.push(rootMidi + fifth);
  }

  return shell;
}

/**
 * Open voicing: spread notes across a wider range for cinematic/ambient textures.
 */
function buildOpenVoicing(root: NoteName, quality: ChordQuality, octave: number): number[] {
  const close = buildChordVoicing(root, quality, octave);
  if (close.length < 3) return close;

  const result: number[] = [];
  for (let i = 0; i < close.length; i++) {
    result.push(close[i] + (i % 2 === 1 ? 12 : 0));
  }
  return result.sort((a, b) => a - b);
}

type VoicingStrategy = 'close' | 'drop2' | 'shell' | 'open';

const STYLE_VOICING_STRATEGY: Record<CompositionStyle, VoicingStrategy> = {
  classical:     'close',
  romantic:      'close',
  impressionist: 'open',
  jazz:          'drop2',
  neo_soul:      'drop2',
  ambient:       'open',
  minimalist:    'close',
  cinematic:     'open',
  electronic:    'close',
  bossa_nova:    'shell',
  lo_fi:         'shell',
  gospel:        'close',
};

function buildStyledVoicing(root: NoteName, quality: ChordQuality, octave: number, style: CompositionStyle): number[] {
  const strategy = STYLE_VOICING_STRATEGY[style] ?? 'close';
  switch (strategy) {
    case 'drop2': return buildDrop2Voicing(root, quality, octave);
    case 'shell': return buildShellVoicing(root, quality, octave);
    case 'open':  return buildOpenVoicing(root, quality, octave);
    default:      return buildChordVoicing(root, quality, octave);
  }
}

export function voiceLeadChord(prevVoicing: number[], nextRoot: NoteName, nextQuality: ChordQuality, style?: CompositionStyle): number[] {
  const baseOctave = 3;
  const candidates: number[][] = [];

  for (let oct = baseOctave - 1; oct <= baseOctave + 1; oct++) {
    if (style) {
      candidates.push(buildStyledVoicing(nextRoot, nextQuality, oct, style));
    }
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
  { name: 'Jazz iii-VI-ii-V', degrees: [2, 5, 1, 4], style: 'jazz' },
  { name: 'Neo Soul I-III-vi-IV', degrees: [0, 2, 5, 3], style: 'neo_soul' },
  { name: 'Neo Soul IV-iii-vi-I', degrees: [3, 2, 5, 0], style: 'neo_soul' },
  { name: 'Impressionist I-bVII-IV', degrees: [0, 6, 3], style: 'impressionist' },
  { name: 'Cinematic i-VI-III-VII', degrees: [0, 5, 2, 6], style: 'cinematic' },
  { name: 'Cinematic i-iv-v-VI', degrees: [0, 3, 4, 5], style: 'cinematic' },
  { name: 'Ambient I-V-vi-IV', degrees: [0, 4, 5, 3], style: 'ambient' },
  { name: 'Minimalist I-II', degrees: [0, 1], style: 'minimalist' },
  { name: 'Electronic vi-IV-I-V', degrees: [5, 3, 0, 4], style: 'electronic' },
  { name: 'Electronic i-III-VI-iv', degrees: [0, 2, 5, 3], style: 'electronic' },
  { name: 'Phrygian i-bII-bVII-i', degrees: [0, 1, 6, 0], style: 'classical' },
  { name: 'Plagal IV-I', degrees: [3, 0], style: 'classical' },
  { name: 'Descending Bass I-V/7-vi-IV', degrees: [0, 4, 5, 3], style: 'romantic' },
  // Bossa nova
  { name: 'Bossa I-vi-II-V', degrees: [0, 5, 1, 4], style: 'bossa_nova' },
  { name: 'Bossa I-IV-iii-vi', degrees: [0, 3, 2, 5], style: 'bossa_nova' },
  { name: 'Bossa I-bVII-vi-V', degrees: [0, 6, 5, 4], style: 'bossa_nova' },
  // Lo-fi
  { name: 'Lo-fi ii-V-I-vi', degrees: [1, 4, 0, 5], style: 'lo_fi' },
  { name: 'Lo-fi I-iii-IV-iv', degrees: [0, 2, 3, 3], style: 'lo_fi' },
  { name: 'Lo-fi vi-IV-I-V', degrees: [5, 3, 0, 4], style: 'lo_fi' },
  // Gospel
  { name: 'Gospel I-IV-I-V', degrees: [0, 3, 0, 4], style: 'gospel' },
  { name: 'Gospel I-iii-IV-V-I', degrees: [0, 2, 3, 4, 0], style: 'gospel' },
  { name: 'Gospel IV-V-iii-vi', degrees: [3, 4, 2, 5], style: 'gospel' },
];

/**
 * Tension-aware quality upgrade: when tension is high, add extensions;
 * when tension is low (cadence), keep chord simple for resolution.
 */
function tensionAwareQuality(
  baseQuality: ChordQuality,
  complexity: number,
  tension: TensionCurve | undefined,
  beat: number,
): ChordQuality {
  // Basic complexity upgrades (always applied)
  if (complexity >= 5) {
    if (baseQuality === 'major') baseQuality = 'major7';
    else if (baseQuality === 'minor') baseQuality = 'minor7';
  }

  // Skip tension-dependent extensions when no tension curve is available
  if (!tension) return baseQuality;

  const t = tensionAtBeat(tension, beat);

  // High tension + high complexity → richer extensions
  if (complexity >= 7 && t > 0.6) {
    if (baseQuality === 'dominant7')  baseQuality = Math.random() > 0.5 ? 'dominant9' : 'dominant13';
    else if (baseQuality === 'minor7')     baseQuality = Math.random() > 0.6 ? 'minor9' : 'minor11';
    else if (baseQuality === 'major7')     baseQuality = Math.random() > 0.5 ? 'major9' : 'major7';
  } else if (complexity >= 8 && t > 0.4) {
    if (baseQuality === 'major7') baseQuality = Math.random() > 0.6 ? 'major9' : 'major7';
    else if (baseQuality === 'minor7') baseQuality = Math.random() > 0.6 ? 'minor9' : 'minor7';
  }

  // Low tension → simpler chord for resolution clarity
  if (t < 0.2) {
    if (baseQuality === 'major9')    baseQuality = 'major7';
    else if (baseQuality === 'minor9')    baseQuality = 'minor7';
    else if (baseQuality === 'dominant9') baseQuality = 'dominant7';
    else if (baseQuality === 'minor11')   baseQuality = 'minor7';
  }

  return baseQuality;
}

export function generateChordProgression(
  key: NoteName,
  scale: ScaleType,
  measures: number,
  style: string,
  complexity: number,
  tension?: TensionCurve,
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
  const compStyle = style as CompositionStyle;

  for (let measure = 0; measure < measures; measure++) {
    const degreeIndex = measure % template.degrees.length;
    const degree = template.degrees[degreeIndex];
    const diatonic = diatonicChords[degree % diatonicChords.length];

    const quality = tensionAwareQuality(diatonic.quality, complexity, tension, currentBeat);

    const scaleIntervals = SCALE_INTERVALS[scale];
    const majorIntervals = SCALE_INTERVALS['major'];
    const rootInterval = (scaleIntervals && degree < scaleIntervals.length) ? scaleIntervals[degree] : majorIntervals[degree];
    const rootIndex = (NOTE_NAMES.indexOf(key) + rootInterval) % 12;
    const chordRoot = NOTE_NAMES[rootIndex];

    const voicing = voiceLeadChord(prevVoicing, chordRoot, quality, compStyle);

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

      const nextDegreeIndex = (measure + 1) % template.degrees.length;
      const nextDegree = template.degrees[nextDegreeIndex];
      const passingDegree = (nextDegree + 4) % 7;
      const passingDiatonic = diatonicChords[passingDegree % diatonicChords.length];
      const passingQuality: ChordQuality = complexity >= 5 ? 'dominant7' : 'major';
      const passingInterval = (scaleIntervals && passingDegree < scaleIntervals.length) ? scaleIntervals[passingDegree] : majorIntervals[passingDegree];
      const passingRootIndex = (NOTE_NAMES.indexOf(key) + passingInterval) % 12;
      const passingRoot = NOTE_NAMES[passingRootIndex];
      const passingVoicing = voiceLeadChord(voicing, passingRoot, passingQuality, compStyle);

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

/**
 * Apply tension-aware quality upgrades to an existing chord progression in-place.
 * Rebuilds voicings with voice-leading after quality changes so extended tones are audible.
 */
export function applyTensionToChords(chords: Chord[], complexity: number, tension: TensionCurve, style: CompositionStyle): void {
  for (let i = 0; i < chords.length; i++) {
    const chord = chords[i];
    const newQuality = tensionAwareQuality(chord.quality, complexity, tension, chord.startBeat);
    if (newQuality !== chord.quality) {
      chord.quality = newQuality;
      const prevVoicing = i > 0 ? chords[i - 1].voicing : chord.voicing;
      chord.voicing = voiceLeadChord(prevVoicing, chord.root, newQuality, style);
    }
  }
}

export function chordToString(chord: Chord): string {
  const qualityStr: Record<string, string> = {
    major: '', minor: 'm', diminished: 'dim', augmented: 'aug',
    dominant7: '7', major7: 'maj7', minor7: 'm7',
    diminished7: 'dim7', half_diminished7: 'ø7', augmented7: 'aug7',
    sus2: 'sus2', sus4: 'sus4', add9: 'add9', minor9: 'm9', major9: 'maj9',
    dominant9: '9', minor11: 'm11', dominant13: '13',
    major6: '6', minor6: 'm6',
  };
  return `${chord.root}${qualityStr[chord.quality] ?? ''}`;
}
