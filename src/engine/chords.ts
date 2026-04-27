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
  dominant9:         [0, 4, 7, 10, 14],
  minor11:           [0, 3, 7, 10, 14, 17],
  major11:           [0, 4, 7, 11, 14, 17],
  dominant13:        [0, 4, 7, 10, 14, 21],
  minor_major7:      [0, 3, 7, 11],
  dominant7sharp9:   [0, 4, 7, 10, 15],
  dominant7flat9:    [0, 4, 7, 10, 13],
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
      { degree: 6, quality: 'diminished', roman: 'vii\u00b0' },
    ];
  }

  const chords: DiatonicChord[] = [];
  for (let i = 0; i < 7; i++) {
    const third = (intervals[(i + 2) % intervals.length] - intervals[i] + 12) % 12;
    const fifth = (intervals[(i + 4) % intervals.length] - intervals[i] + 12) % 12;

    let quality: ChordQuality = 'major';
    let roman = ROMAN_NUMERALS[i];

    if (third === 3 && fifth === 7) { quality = 'minor'; roman = roman.toLowerCase(); }
    else if (third === 3 && fifth === 6) { quality = 'diminished'; roman = roman.toLowerCase() + '\u00b0'; }
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

    let commonTones = 0;
    for (const p of prevVoicing) {
      if (candidate.some(c => Math.abs(c - p) <= 1)) commonTones++;
    }
    const score = distance - commonTones * 2;

    if (score < bestDistance) {
      bestDistance = score;
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
  // Classical
  { name: 'Classical I-IV-V-I', degrees: [0, 3, 4, 0], style: 'classical' },
  { name: 'Circle of Fifths', degrees: [0, 3, 6, 2, 5, 1, 4, 0], style: 'classical' },
  { name: 'Phrygian i-bII-bVII-i', degrees: [0, 1, 6, 0], style: 'classical' },
  { name: 'Plagal IV-I', degrees: [3, 0], style: 'classical' },

  // Romantic
  { name: 'Romantic I-vi-IV-V', degrees: [0, 5, 3, 4], style: 'romantic' },
  { name: 'Descending Bass I-V/7-vi-IV', degrees: [0, 4, 5, 3], style: 'romantic' },

  // Post-Romantic
  { name: 'Rachmaninoff i-iv-V-VI-ii\u00b0-V', degrees: [0, 3, 4, 5, 1, 4], style: 'post_romantic' },
  { name: 'Elgar I-iii-vi-IV-ii-V', degrees: [0, 2, 5, 3, 1, 4], style: 'post_romantic' },

  // Impressionist
  { name: 'Impressionist I-bVII-IV', degrees: [0, 6, 3], style: 'impressionist' },
  { name: 'Debussy Planing I-II-III', degrees: [0, 1, 2, 1], style: 'impressionist' },
  { name: 'Ravel Color I-III-bVI-IV', degrees: [0, 2, 5, 3], style: 'impressionist' },

  // Jazz
  { name: 'Jazz ii-V-I', degrees: [1, 4, 0], style: 'jazz' },
  { name: 'Jazz I-vi-ii-V', degrees: [0, 5, 1, 4], style: 'jazz' },
  { name: 'Coltrane Changes I-III-VI-II-V-I', degrees: [0, 2, 5, 1, 4, 0], style: 'jazz' },
  { name: 'Bird Blues I-IV-I-vi-ii-V', degrees: [0, 3, 0, 5, 1, 4], style: 'jazz' },

  // Modal Jazz
  { name: 'Modal Quartal I-IV', degrees: [0, 3], style: 'modal_jazz' },
  { name: 'So What ii-ii (half step up)', degrees: [1, 1, 2, 1], style: 'modal_jazz' },
  { name: 'Modal Plateau I-bVII-I-IV', degrees: [0, 6, 0, 3], style: 'modal_jazz' },

  // Neo Soul
  { name: 'Neo Soul I-III-vi-IV', degrees: [0, 2, 5, 3], style: 'neo_soul' },
  { name: 'Erykah Badu ii-V-I-vi', degrees: [1, 4, 0, 5], style: 'neo_soul' },

  // Bossa Nova
  { name: 'Jobim I-ii-V-I', degrees: [0, 1, 4, 0], style: 'bossa_nova' },
  { name: 'Girl from Ipanema I-II-ii-bII', degrees: [0, 1, 1, 0], style: 'bossa_nova' },
  { name: 'Bossa ii-V-I-IV-iii-vi-ii-V', degrees: [1, 4, 0, 3, 2, 5, 1, 4], style: 'bossa_nova' },

  // Cinematic
  { name: 'Cinematic i-VI-III-VII', degrees: [0, 5, 2, 6], style: 'cinematic' },
  { name: 'Epic i-bVI-bIII-bVII', degrees: [0, 5, 2, 6], style: 'cinematic' },

  // Ambient
  { name: 'Ambient I-V-vi-IV', degrees: [0, 4, 5, 3], style: 'ambient' },
  { name: 'Ambient Drift I-iii-V', degrees: [0, 2, 4], style: 'ambient' },

  // Minimalist
  { name: 'Minimalist I-II', degrees: [0, 1], style: 'minimalist' },
  { name: 'Glass Oscillation I-V-I-IV', degrees: [0, 4, 0, 3], style: 'minimalist' },

  // Electronic
  { name: 'Electronic vi-IV-I-V', degrees: [5, 3, 0, 4], style: 'electronic' },
  { name: 'EDM i-bVI-bIII-bVII', degrees: [0, 5, 2, 6], style: 'electronic' },

  // Lo-fi
  { name: 'Lo-fi ii-V-I-vi', degrees: [1, 4, 0, 5], style: 'lo_fi' },
  { name: 'Lo-fi I-iii-IV-iv', degrees: [0, 2, 3, 3], style: 'lo_fi' },
  { name: 'Lo-fi vi-IV-I-V', degrees: [5, 3, 0, 4], style: 'lo_fi' },

  // Gospel
  { name: 'Gospel I-IV-I-V', degrees: [0, 3, 0, 4], style: 'gospel' },
  { name: 'Gospel I-iii-IV-V-I', degrees: [0, 2, 3, 4, 0], style: 'gospel' },
  { name: 'Gospel IV-V-iii-vi', degrees: [3, 4, 2, 5], style: 'gospel' },
];

// ---------------------------------------------------------------------------
// Advanced harmonic devices (applied probabilistically by complexity)
// ---------------------------------------------------------------------------

function tritoneSub(rootIndex: number, quality: ChordQuality): { rootIndex: number; quality: ChordQuality } {
  return { rootIndex: (rootIndex + 6) % 12, quality: quality === 'dominant7' ? 'dominant7' : 'major7' };
}

function chromaticMediant(rootIndex: number): number {
  const direction = Math.random() > 0.5 ? 4 : -3;
  return (rootIndex + direction + 12) % 12;
}

function applyChordEnrichment(
  quality: ChordQuality,
  complexity: number,
  tension: number,
): ChordQuality {
  if (complexity >= 8 && Math.random() > 0.7) {
    if (quality === 'major') return 'add9';
    if (quality === 'minor') return 'sus2';
  }
  if (complexity >= 5) {
    if (quality === 'major') quality = 'major7';
    else if (quality === 'minor') quality = 'minor7';
  }
  if (complexity >= 7 && tension > 0.5 && Math.random() > 0.5) {
    if (quality === 'major7') quality = 'major9';
    else if (quality === 'minor7') quality = 'minor9';
  }
  return quality;
}


export function generateChordProgression(
  key: NoteName,
  scale: ScaleType,
  measures: number,
  style: string,
  complexity: number,
  beatsPerMeasure: number = 4,
  tensionAtMeasure?: (measure: number) => number,
): Chord[] {
  const diatonicChords = getDiatonicChords(scale);

  const matchingTemplates = PROGRESSION_TEMPLATES.filter(t => t.style === style);
  const template = matchingTemplates.length > 0
    ? matchingTemplates[Math.floor(Math.random() * matchingTemplates.length)]
    : PROGRESSION_TEMPLATES[Math.floor(Math.random() * PROGRESSION_TEMPLATES.length)];

  const chords: Chord[] = [];
  let prevVoicing = buildChordVoicing(key, 'major', 3);
  let currentBeat = 0;


  for (let measure = 0; measure < measures; measure++) {
    const tension = tensionAtMeasure ? tensionAtMeasure(measure) : 0.5;
    const degreeIndex = measure % template.degrees.length;
    const degree = template.degrees[degreeIndex];
    const diatonic = diatonicChords[degree % diatonicChords.length];


    const scaleIntervals = SCALE_INTERVALS[scale];
    const majorIntervals = SCALE_INTERVALS['major'];
    const rootInterval = (scaleIntervals && degree < scaleIntervals.length) ? scaleIntervals[degree] : majorIntervals[degree];
    let rootIndex = (NOTE_NAMES.indexOf(key) + rootInterval) % 12;
    let quality = applyChordEnrichment(diatonic.quality, complexity, tension);
    let roman = diatonic.roman;

    // --- Advanced substitutions (mutually exclusive) ---

    if (complexity >= 7 && tension > 0.6 && diatonic.quality === 'dominant7' && Math.random() > 0.6) {
      // Tritone substitution on dominant chords
      const sub = tritoneSub(rootIndex, quality);
      rootIndex = sub.rootIndex;
      quality = sub.quality;
      roman = 'bII7';
    } else if (complexity >= 8 && tension > 0.5 && (style === 'impressionist' || style === 'cinematic' || style === 'neo_soul') && Math.random() > 0.75) {
      // Chromatic mediant
      rootIndex = chromaticMediant(rootIndex);
      quality = Math.random() > 0.5 ? 'major7' : 'major';
      roman = 'bVI';
    } else if (complexity >= 6 && tension > 0.4 && Math.random() > 0.7) {
      // Secondary dominant approach
      const nextDegreeIndex = (measure + 1) % template.degrees.length;
      const nextDegree = template.degrees[nextDegreeIndex];
      const secDomInterval = (scaleIntervals && nextDegree < scaleIntervals.length)
        ? scaleIntervals[nextDegree] : majorIntervals[nextDegree];
      const secDomRoot = (NOTE_NAMES.indexOf(key) + secDomInterval + 7) % 12;
      if (Math.random() > 0.5) {
        rootIndex = secDomRoot;
        quality = 'dominant7';
        roman = `V/${ROMAN_NUMERALS[nextDegree] ?? '?'}`;
      }
    } else if (complexity >= 6 && Math.random() > 0.8) {
      // Borrowed chord from parallel minor/major
      const parallelScale = scale === 'major' ? 'natural_minor' : 'major';
      const parallelDiatonic = getDiatonicChords(parallelScale);
      const parallelIntervals = SCALE_INTERVALS[parallelScale];
      if (parallelIntervals && degree < parallelIntervals.length) {
        const borrowedInterval = parallelIntervals[degree];
        rootIndex = (NOTE_NAMES.indexOf(key) + borrowedInterval) % 12;
        const borrowedChord = parallelDiatonic[degree % parallelDiatonic.length];
        quality = applyChordEnrichment(borrowedChord.quality, complexity, tension);
        roman = `(${borrowedChord.roman})`;
      }
    }

    const chordRoot = NOTE_NAMES[rootIndex];
    const voicing = voiceLeadChord(prevVoicing, chordRoot, quality);

    const splitMeasure = complexity >= 7 && tension > 0.5 && Math.random() > 0.5;

    if (splitMeasure) {
      const halfDuration = beatsPerMeasure / 2;

      chords.push({
        root: chordRoot,
        quality,
        inversion: 0,
        voicing,
        romanNumeral: roman,
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
        romanNumeral: roman,
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
    diminished7: 'dim7', half_diminished7: '\u00f87', augmented7: 'aug7',
    sus2: 'sus2', sus4: 'sus4', add9: 'add9', minor9: 'm9', major9: 'maj9',
    dominant9: '9', minor11: 'm11', major11: 'maj11', dominant13: '13',
    minor_major7: 'm\u0394', dominant7sharp9: '7\u266f9', dominant7flat9: '7\u266d9',
  };
  return `${chord.root}${qualityStr[chord.quality] ?? ''}`;
}
