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

/** Drop-2 voicing: take a close-position chord and drop the 2nd-from-top note down an octave */
export function buildDrop2Voicing(root: NoteName, quality: ChordQuality, octave: number): number[] {
  const rootMidi = noteNameToMidi(root, octave);
  const intervals = CHORD_INTERVALS[quality];
  if (intervals.length < 4) {
    return buildChordVoicing(root, quality, octave);
  }
  const close = intervals.map(i => rootMidi + i).sort((a, b) => a - b);
  // Drop the second from top
  const secondFromTop = close[close.length - 2];
  close[close.length - 2] = secondFromTop - 12;
  close.sort((a, b) => a - b);
  return close;
}

/** Shell voicing: root + 3rd + 7th only (jazz comping staple) */
export function buildShellVoicing(root: NoteName, quality: ChordQuality, octave: number): number[] {
  const rootMidi = noteNameToMidi(root, octave);
  const intervals = CHORD_INTERVALS[quality];
  const notes = [rootMidi]; // root
  if (intervals.length >= 2) notes.push(rootMidi + intervals[1]); // 3rd
  const seventh = intervals.find(i => i === 10 || i === 11); // 7th (minor or major)
  if (seventh !== undefined) {
    notes.push(rootMidi + seventh);
  } else if (intervals.length >= 3) {
    notes.push(rootMidi + intervals[2]); // 5th if no 7th
  }
  return notes.sort((a, b) => a - b);
}

/** Rootless voicing: voiced without root (pianist assumes bassist covers it) */
export function buildRootlessVoicing(root: NoteName, quality: ChordQuality, octave: number): number[] {
  const rootMidi = noteNameToMidi(root, octave);
  const intervals = CHORD_INTERVALS[quality];
  if (intervals.length < 4) {
    return buildChordVoicing(root, quality, octave);
  }
  // Type A rootless: 3-5-7-9
  const third = rootMidi + intervals[1];
  const fifth = rootMidi + intervals[2];
  const seventhInterval = intervals.find(i => i === 10 || i === 11);
  if (seventhInterval === undefined) {
    return buildChordVoicing(root, quality, octave);
  }
  const seventh = rootMidi + seventhInterval;
  const ninth = rootMidi + 14;
  return [third, fifth, seventh, ninth].sort((a, b) => a - b);
}

/** Upper structure triad: a triad built on a chord extension for colour */
export function buildUpperStructureVoicing(root: NoteName, quality: ChordQuality, octave: number): number[] {
  const rootMidi = noteNameToMidi(root, octave);
  const intervals = CHORD_INTERVALS[quality];
  // Base: root + 7th in LH, upper triad in RH
  const seventhInterval = intervals.find(i => i === 10 || i === 11) ?? intervals[2] ?? 7;
  const base = [rootMidi, rootMidi + seventhInterval];
  // Upper structure: major triad a whole step above (common upper structure)
  const upperRoot = rootMidi + 14; // 9th
  const upper = [upperRoot, upperRoot + 4, upperRoot + 7];
  return [...base, ...upper].sort((a, b) => a - b);
}

/** Spread voicing: notes distributed across wider range for open sound */
export function buildSpreadVoicing(root: NoteName, quality: ChordQuality, octave: number): number[] {
  const rootMidi = noteNameToMidi(root, octave);
  const intervals = CHORD_INTERVALS[quality];
  const spread: number[] = [];
  intervals.forEach((interval, i) => {
    const octaveShift = i % 2 === 0 ? 0 : 12;
    spread.push(rootMidi + interval + octaveShift);
  });
  return spread.sort((a, b) => a - b);
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

/** Voice-lead using the most suitable voicing technique for the style */
export function voiceLeadAdvanced(
  prevVoicing: number[],
  nextRoot: NoteName,
  nextQuality: ChordQuality,
  style: string,
  complexity: number,
): number[] {
  const useAdvanced = complexity >= 6;
  if (!useAdvanced) return voiceLeadChord(prevVoicing, nextRoot, nextQuality);

  const isJazzy = ['jazz', 'neo_soul', 'late_night', 'bossa_nova', 'lo_fi', 'gospel', 'contemporary_rnb'].includes(style);

  if (isJazzy && complexity >= 8) {
    const r = Math.random();
    if (r < 0.3) return buildDrop2Voicing(nextRoot, nextQuality, 3);
    if (r < 0.55) return buildRootlessVoicing(nextRoot, nextQuality, 3);
    if (r < 0.75) return buildShellVoicing(nextRoot, nextQuality, 3);
    return buildSpreadVoicing(nextRoot, nextQuality, 3);
  }

  if (isJazzy) {
    return Math.random() > 0.5
      ? buildDrop2Voicing(nextRoot, nextQuality, 3)
      : buildShellVoicing(nextRoot, nextQuality, 3);
  }

  if (complexity >= 8 && Math.random() > 0.6) {
    return buildSpreadVoicing(nextRoot, nextQuality, 3);
  }

  return voiceLeadChord(prevVoicing, nextRoot, nextQuality);
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
  // Late Night (supper club / cocktail jazz)
  { name: 'Late Night ii-V-I-vi', degrees: [1, 4, 0, 5], style: 'late_night' },
  { name: 'Late Night I-IV-iii-VI', degrees: [0, 3, 2, 5], style: 'late_night' },
  { name: 'Late Night iii-vi-ii-V', degrees: [2, 5, 1, 4], style: 'late_night' },
  { name: 'Late Night I-bVII-IV-iv', degrees: [0, 6, 3, 3], style: 'late_night' },
  // Afrobeat
  { name: 'Afrobeat I-IV-V-IV', degrees: [0, 3, 4, 3], style: 'afrobeat' },
  { name: 'Afrobeat i-IV-i-V', degrees: [0, 3, 0, 4], style: 'afrobeat' },
  { name: 'Afrobeat I-vi-IV-V', degrees: [0, 5, 3, 4], style: 'afrobeat' },
  // Contemporary R&B
  { name: 'R&B I-vi-IV-V', degrees: [0, 5, 3, 4], style: 'contemporary_rnb' },
  { name: 'R&B ii-V-I-iii', degrees: [1, 4, 0, 2], style: 'contemporary_rnb' },
  { name: 'R&B I-iii-vi-IV', degrees: [0, 2, 5, 3], style: 'contemporary_rnb' },
  { name: 'R&B vi-IV-I-V', degrees: [5, 3, 0, 4], style: 'contemporary_rnb' },
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
  timeSignature: [number, number] = [4, 4],
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
  const beatsPerMeasure = timeSignature[0];

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
      const sub = tritoneSub(rootIndex, quality);
      rootIndex = sub.rootIndex;
      quality = sub.quality;
      roman = 'bII7';
    } else if (complexity >= 8 && tension > 0.5 && (style === 'impressionist' || style === 'cinematic' || style === 'neo_soul') && Math.random() > 0.75) {
      rootIndex = chromaticMediant(rootIndex);
      quality = Math.random() > 0.5 ? 'major7' : 'major';
      roman = 'bVI';
    } else if (complexity >= 6 && tension > 0.4 && Math.random() > 0.7) {
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
    const voicing = voiceLeadAdvanced(prevVoicing, chordRoot, quality, style, complexity);

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
      const passingVoicing = voiceLeadAdvanced(voicing, passingRoot, passingQuality, style, complexity);

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
    diminished7: 'dim7', half_diminished7: 'ø7', augmented7: 'aug7',
    sus2: 'sus2', sus4: 'sus4', add9: 'add9', minor9: 'm9', major9: 'maj9',
    dominant9: '9', minor11: 'm11', major6: '6', minor6: 'm6',
  };
  return `${chord.root}${qualityStr[chord.quality] ?? ''}`;
}
