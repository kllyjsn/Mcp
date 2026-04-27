import type { NoteName, ScaleType, ChordQuality, Chord, ChordFunction, CompositionStyle } from '../types/music';
import { NOTE_NAMES, SCALE_INTERVALS, noteNameToMidi } from './scales';
import { CHORD_INTERVALS, voiceLeadChord } from './chords';

export const EXTENDED_CHORD_INTERVALS: Record<string, number[]> = {
  ...CHORD_INTERVALS,
  dominant9:        [0, 4, 7, 10, 14],
  minor11:          [0, 3, 7, 10, 14, 17],
  major11:          [0, 4, 7, 11, 14, 17],
  dominant11:       [0, 4, 7, 10, 14, 17],
  minor13:          [0, 3, 7, 10, 14, 17, 21],
  major13:          [0, 4, 7, 11, 14, 17, 21],
  dominant13:       [0, 4, 7, 10, 14, 17, 21],
  altered:          [0, 4, 8, 10, 13],
  dominant7sharp9:  [0, 4, 7, 10, 15],
  dominant7flat9:   [0, 4, 7, 10, 13],
  dominant7sharp11: [0, 4, 7, 10, 14, 18],
  minorMajor7:      [0, 3, 7, 11],
};

interface TensionProfile {
  secondaryDominantChance: number;
  modalInterchangeChance: number;
  tritoneSubChance: number;
  chromaticMediantChance: number;
  neapolitanChance: number;
  extendedVoicingChance: number;
  alterationChance: number;
}

const STYLE_TENSION: Record<CompositionStyle, TensionProfile> = {
  classical:      { secondaryDominantChance: 0.15, modalInterchangeChance: 0.05, tritoneSubChance: 0, chromaticMediantChance: 0.05, neapolitanChance: 0.05, extendedVoicingChance: 0, alterationChance: 0 },
  romantic:       { secondaryDominantChance: 0.25, modalInterchangeChance: 0.15, tritoneSubChance: 0, chromaticMediantChance: 0.15, neapolitanChance: 0.1, extendedVoicingChance: 0.1, alterationChance: 0.05 },
  impressionist:  { secondaryDominantChance: 0.1, modalInterchangeChance: 0.3, tritoneSubChance: 0.05, chromaticMediantChance: 0.25, neapolitanChance: 0.1, extendedVoicingChance: 0.2, alterationChance: 0.1 },
  jazz:           { secondaryDominantChance: 0.35, modalInterchangeChance: 0.15, tritoneSubChance: 0.25, chromaticMediantChance: 0.1, neapolitanChance: 0.05, extendedVoicingChance: 0.5, alterationChance: 0.3 },
  neo_soul:       { secondaryDominantChance: 0.3, modalInterchangeChance: 0.2, tritoneSubChance: 0.15, chromaticMediantChance: 0.1, neapolitanChance: 0.05, extendedVoicingChance: 0.4, alterationChance: 0.2 },
  ambient:        { secondaryDominantChance: 0.05, modalInterchangeChance: 0.2, tritoneSubChance: 0, chromaticMediantChance: 0.15, neapolitanChance: 0, extendedVoicingChance: 0.15, alterationChance: 0 },
  minimalist:     { secondaryDominantChance: 0.05, modalInterchangeChance: 0.1, tritoneSubChance: 0, chromaticMediantChance: 0.1, neapolitanChance: 0, extendedVoicingChance: 0.05, alterationChance: 0 },
  cinematic:      { secondaryDominantChance: 0.2, modalInterchangeChance: 0.2, tritoneSubChance: 0.05, chromaticMediantChance: 0.2, neapolitanChance: 0.1, extendedVoicingChance: 0.15, alterationChance: 0.1 },
  electronic:     { secondaryDominantChance: 0.1, modalInterchangeChance: 0.15, tritoneSubChance: 0.1, chromaticMediantChance: 0.1, neapolitanChance: 0, extendedVoicingChance: 0.2, alterationChance: 0.1 },
  bossa_nova:     { secondaryDominantChance: 0.3, modalInterchangeChance: 0.15, tritoneSubChance: 0.2, chromaticMediantChance: 0.1, neapolitanChance: 0.05, extendedVoicingChance: 0.4, alterationChance: 0.15 },
  lo_fi:          { secondaryDominantChance: 0.2, modalInterchangeChance: 0.15, tritoneSubChance: 0.1, chromaticMediantChance: 0.1, neapolitanChance: 0, extendedVoicingChance: 0.35, alterationChance: 0.1 },
  gospel:         { secondaryDominantChance: 0.3, modalInterchangeChance: 0.1, tritoneSubChance: 0.05, chromaticMediantChance: 0.1, neapolitanChance: 0.05, extendedVoicingChance: 0.25, alterationChance: 0.1 },
  late_romantic:  { secondaryDominantChance: 0.3, modalInterchangeChance: 0.25, tritoneSubChance: 0.05, chromaticMediantChance: 0.3, neapolitanChance: 0.15, extendedVoicingChance: 0.2, alterationChance: 0.15 },
  post_bop:       { secondaryDominantChance: 0.35, modalInterchangeChance: 0.25, tritoneSubChance: 0.3, chromaticMediantChance: 0.15, neapolitanChance: 0.05, extendedVoicingChance: 0.55, alterationChance: 0.4 },
  chamber:        { secondaryDominantChance: 0.2, modalInterchangeChance: 0.15, tritoneSubChance: 0, chromaticMediantChance: 0.15, neapolitanChance: 0.1, extendedVoicingChance: 0.1, alterationChance: 0.05 },
  film_noir:      { secondaryDominantChance: 0.25, modalInterchangeChance: 0.2, tritoneSubChance: 0.2, chromaticMediantChance: 0.2, neapolitanChance: 0.1, extendedVoicingChance: 0.4, alterationChance: 0.25 },
};

function getChordFunction(degree: number): ChordFunction {
  if (degree === 0) return 'tonic';
  if (degree === 3 || degree === 1) return 'subdominant';
  if (degree === 4 || degree === 6) return 'dominant';
  return 'tonic';
}

function computeTension(quality: ChordQuality, func: ChordFunction): number {
  let t = 0;
  if (func === 'dominant' || func === 'secondary_dominant') t += 0.6;
  if (func === 'subdominant') t += 0.3;
  if (quality.includes('7') || quality.includes('9')) t += 0.15;
  if (quality === 'altered' || quality === 'diminished7') t += 0.4;
  if (quality === 'augmented' || quality === 'augmented7') t += 0.35;
  if (func === 'tritone_sub') t += 0.5;
  if (func === 'neapolitan') t += 0.35;
  if (func === 'chromatic_mediant') t += 0.25;
  return Math.min(1, t);
}

function secondaryDominantOf(targetDegree: number, key: NoteName, scale: ScaleType): { root: NoteName; quality: ChordQuality } {
  const scaleIntervals = SCALE_INTERVALS[scale] ?? SCALE_INTERVALS.major;
  const targetInterval = targetDegree < scaleIntervals.length ? scaleIntervals[targetDegree] : 0;
  const domRootSemitone = (NOTE_NAMES.indexOf(key) + targetInterval + 7) % 12;
  return { root: NOTE_NAMES[domRootSemitone], quality: 'dominant7' };
}

function tritoneSub(root: NoteName, quality: ChordQuality): { root: NoteName; quality: ChordQuality } {
  const tritone = (NOTE_NAMES.indexOf(root) + 6) % 12;
  const newQuality = quality === 'dominant7' ? 'dominant7' : quality === 'dominant9' ? 'dominant9' : 'dominant7';
  return { root: NOTE_NAMES[tritone], quality: newQuality };
}

function borrowedChord(degree: number, key: NoteName, fromMinor: boolean): { root: NoteName; quality: ChordQuality; roman: string } {
  const parallelScale = fromMinor ? SCALE_INTERVALS.natural_minor : SCALE_INTERVALS.major;
  const intervals = parallelScale;
  const rootInterval = degree < intervals.length ? intervals[degree] : 0;
  const rootIdx = (NOTE_NAMES.indexOf(key) + rootInterval) % 12;
  const root = NOTE_NAMES[rootIdx];

  const third = degree + 2 < intervals.length
    ? (intervals[degree + 2] - intervals[degree] + 12) % 12
    : 4;
  const quality: ChordQuality = third === 3 ? 'minor7' : third === 4 ? 'major7' : 'minor';
  const roman = fromMinor ? `♭${['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'][degree] ?? '?'}` : `${['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'][degree] ?? '?'}`;
  return { root, quality, roman };
}

function neapolitanChord(key: NoteName): { root: NoteName; quality: ChordQuality } {
  const rootIdx = (NOTE_NAMES.indexOf(key) + 1) % 12;
  return { root: NOTE_NAMES[rootIdx], quality: 'major' };
}

function chromaticMediant(root: NoteName, direction: 'up' | 'down'): { root: NoteName; quality: ChordQuality } {
  const offset = direction === 'up' ? 4 : 8;
  const newRoot = NOTE_NAMES[(NOTE_NAMES.indexOf(root) + offset) % 12];
  return { root: newRoot, quality: Math.random() > 0.5 ? 'major' : 'minor' };
}

function upgradeExtension(quality: ChordQuality, complexity: number): ChordQuality {
  if (complexity < 6) return quality;

  if (complexity >= 9 && Math.random() > 0.5) {
    if (quality === 'dominant7') return Math.random() > 0.5 ? 'dominant13' : 'dominant9';
    if (quality === 'minor7') return Math.random() > 0.5 ? 'minor13' : 'minor11';
    if (quality === 'major7') return 'major13';
  }

  if (complexity >= 7) {
    if (quality === 'dominant7' && Math.random() > 0.4) return 'dominant9';
    if (quality === 'minor7' && Math.random() > 0.5) return 'minor9';
    if (quality === 'major7' && Math.random() > 0.5) return 'major9';
  }

  return quality;
}

export function enrichChordProgression(
  chords: Chord[],
  key: NoteName,
  scale: ScaleType,
  style: CompositionStyle,
  complexity: number,
): Chord[] {
  const profile = STYLE_TENSION[style] ?? STYLE_TENSION.classical;
  const scaleFactor = complexity / 10;
  const enriched: Chord[] = [];

  for (let i = 0; i < chords.length; i++) {
    const chord = { ...chords[i] };
    const nextChord = chords[i + 1];

    chord.function = getChordFunction(getScaleDegree(chord.root, key, scale));

    if (nextChord && Math.random() < profile.secondaryDominantChance * scaleFactor) {
      const targetDeg = getScaleDegree(nextChord.root, key, scale);
      if (targetDeg !== 0 && targetDeg !== -1) {
        const secDom = secondaryDominantOf(targetDeg, key, scale);
        const halfBeat = chord.duration / 2;
        if (halfBeat >= 1) {
          enriched.push({ ...chord, duration: halfBeat });
          const secVoicing = voiceLeadChord(chord.voicing, secDom.root, secDom.quality);
          enriched.push({
            root: secDom.root,
            quality: upgradeExtension(secDom.quality, complexity),
            inversion: 0,
            voicing: secVoicing,
            romanNumeral: `V/${targetDeg + 1}`,
            duration: halfBeat,
            startBeat: chord.startBeat + halfBeat,
            function: 'secondary_dominant',
            tension: 0.7,
          });
          continue;
        }
      }
    }

    if (Math.random() < profile.tritoneSubChance * scaleFactor) {
      if (chord.quality === 'dominant7' || chord.quality === 'dominant9') {
        const sub = tritoneSub(chord.root, chord.quality);
        const subVoicing = voiceLeadChord(chord.voicing, sub.root, sub.quality);
        enriched.push({
          ...chord,
          root: sub.root,
          quality: upgradeExtension(sub.quality, complexity),
          voicing: subVoicing,
          romanNumeral: `♭II7/${chord.romanNumeral}`,
          function: 'tritone_sub',
          tension: computeTension(sub.quality, 'tritone_sub'),
        });
        continue;
      }
    }

    if (Math.random() < profile.modalInterchangeChance * scaleFactor) {
      const isMajorScale = scale === 'major' || scale === 'lydian' || scale === 'mixolydian';
      const deg = getScaleDegree(chord.root, key, scale);
      if (deg >= 0) {
        const borrowed = borrowedChord(deg, key, isMajorScale);
        const bVoicing = voiceLeadChord(chord.voicing, borrowed.root, borrowed.quality);
        enriched.push({
          ...chord,
          root: borrowed.root,
          quality: upgradeExtension(borrowed.quality, complexity),
          voicing: bVoicing,
          romanNumeral: borrowed.roman,
          function: 'borrowed',
          tension: computeTension(borrowed.quality, 'borrowed'),
        });
        continue;
      }
    }

    if (Math.random() < profile.neapolitanChance * scaleFactor) {
      if (chord.function === 'subdominant') {
        const nea = neapolitanChord(key);
        const neaVoicing = voiceLeadChord(chord.voicing, nea.root, nea.quality);
        enriched.push({
          ...chord,
          root: nea.root,
          quality: nea.quality,
          voicing: neaVoicing,
          romanNumeral: '♭II',
          function: 'neapolitan',
          tension: computeTension(nea.quality, 'neapolitan'),
        });
        continue;
      }
    }

    if (Math.random() < profile.chromaticMediantChance * scaleFactor) {
      const dir = Math.random() > 0.5 ? 'up' as const : 'down' as const;
      const cm = chromaticMediant(chord.root, dir);
      const cmVoicing = voiceLeadChord(chord.voicing, cm.root, cm.quality);
      enriched.push({
        ...chord,
        root: cm.root,
        quality: upgradeExtension(cm.quality, complexity),
        voicing: cmVoicing,
        romanNumeral: `♭III`,
        function: 'chromatic_mediant',
        tension: computeTension(cm.quality, 'chromatic_mediant'),
      });
      continue;
    }

    if (Math.random() < profile.extendedVoicingChance * scaleFactor) {
      chord.quality = upgradeExtension(chord.quality, complexity);
    }
    chord.tension = computeTension(chord.quality, chord.function);
    enriched.push(chord);
  }

  return rebuildStartBeats(enriched);
}

function rebuildStartBeats(chords: Chord[]): Chord[] {
  let beat = 0;
  return chords.map(c => {
    const result = { ...c, startBeat: beat };
    beat += c.duration;
    return result;
  });
}

function getScaleDegree(root: NoteName, key: NoteName, scale: ScaleType): number {
  const keyIdx = NOTE_NAMES.indexOf(key);
  const rootIdx = NOTE_NAMES.indexOf(root);
  const interval = (rootIdx - keyIdx + 12) % 12;
  const scaleIntervals = SCALE_INTERVALS[scale] ?? SCALE_INTERVALS.major;
  return scaleIntervals.indexOf(interval);
}

export function buildExtendedVoicing(root: NoteName, quality: ChordQuality, octave: number, inversion: number = 0): number[] {
  const intervals = EXTENDED_CHORD_INTERVALS[quality] ?? CHORD_INTERVALS[quality] ?? [0, 4, 7];
  const rootMidi = noteNameToMidi(root, octave);

  const maxNotes = 5;
  const trimmed = intervals.slice(0, maxNotes);
  const voicing = trimmed.map(i => rootMidi + i);

  for (let inv = 0; inv < inversion && inv < voicing.length; inv++) {
    voicing[inv] += 12;
  }
  voicing.sort((a, b) => a - b);
  return voicing;
}
