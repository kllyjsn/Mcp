import type { CompositionStyle, Chord } from '../types/music';

/**
 * Tension & Release Engine
 *
 * Maps every beat of a composition to a tension value (0-1).
 * This curve drives harmonic extension density, melodic contour peaks,
 * dynamic intensity, and rhythmic density across the whole arrangement.
 *
 * Based on classical formal analysis: tension rises toward cadence points,
 * releases at resolutions, and follows an overall macro-arc per section.
 */

export interface TensionCurve {
  /** Per-beat tension value, 0 = fully resolved, 1 = maximum tension */
  values: number[];
  /** Beat indices that are cadence points (strong resolutions) */
  cadencePoints: number[];
  /** Beat indices where phrases begin */
  phraseStarts: number[];
  /** Beat indices that are climax moments */
  climaxBeats: number[];
}

export interface PhraseStructure {
  start: number;
  end: number;
  type: 'antecedent' | 'consequent' | 'development' | 'coda';
  peakBeat: number;
}

const STYLE_TENSION_PROFILES: Record<CompositionStyle, {
  phraseLength: number;
  macroArc: 'arch' | 'ramp' | 'wave' | 'plateau' | 'double_arch';
  cadenceStrength: number;
  restfulness: number;
}> = {
  classical:     { phraseLength: 4, macroArc: 'arch',        cadenceStrength: 0.9,  restfulness: 0.3 },
  romantic:      { phraseLength: 4, macroArc: 'double_arch', cadenceStrength: 0.85, restfulness: 0.2 },
  impressionist: { phraseLength: 4, macroArc: 'wave',        cadenceStrength: 0.5,  restfulness: 0.4 },
  jazz:          { phraseLength: 4, macroArc: 'wave',        cadenceStrength: 0.6,  restfulness: 0.25 },
  neo_soul:      { phraseLength: 4, macroArc: 'plateau',     cadenceStrength: 0.55, restfulness: 0.3 },
  ambient:       { phraseLength: 8, macroArc: 'wave',        cadenceStrength: 0.3,  restfulness: 0.6 },
  minimalist:    { phraseLength: 8, macroArc: 'plateau',     cadenceStrength: 0.2,  restfulness: 0.5 },
  cinematic:     { phraseLength: 4, macroArc: 'ramp',        cadenceStrength: 0.95, restfulness: 0.15 },
  electronic:    { phraseLength: 8, macroArc: 'ramp',        cadenceStrength: 0.7,  restfulness: 0.2 },
  bossa_nova:    { phraseLength: 4, macroArc: 'wave',        cadenceStrength: 0.5,  restfulness: 0.35 },
  lo_fi:         { phraseLength: 4, macroArc: 'plateau',     cadenceStrength: 0.4,  restfulness: 0.45 },
  gospel:        { phraseLength: 4, macroArc: 'double_arch', cadenceStrength: 0.8,  restfulness: 0.2 },
};

function macroArcValue(t: number, arc: string): number {
  switch (arc) {
    case 'arch':        return Math.sin(t * Math.PI);
    case 'ramp':        return t * 0.7 + Math.sin(t * Math.PI) * 0.3;
    case 'wave':        return 0.5 + Math.sin(t * Math.PI * 2) * 0.4;
    case 'plateau':     return t < 0.2 ? t * 5 * 0.6 : t > 0.85 ? (1 - t) / 0.15 * 0.6 : 0.6;
    case 'double_arch': return Math.sin(t * Math.PI * 2) * 0.4 + Math.sin(t * Math.PI) * 0.6;
    default:            return Math.sin(t * Math.PI);
  }
}

export function generateTensionCurve(
  totalBeats: number,
  beatsPerBar: number,
  style: CompositionStyle,
  chords: Chord[],
): TensionCurve {
  const profile = STYLE_TENSION_PROFILES[style] ?? STYLE_TENSION_PROFILES.classical;
  const values: number[] = [];
  const cadencePoints: number[] = [];
  const phraseStarts: number[] = [];
  const climaxBeats: number[] = [];

  const phraseLengthBeats = profile.phraseLength * beatsPerBar;
  const numPhrases = Math.ceil(totalBeats / phraseLengthBeats);

  for (let beat = 0; beat < totalBeats; beat++) {
    const globalT = totalBeats > 1 ? beat / (totalBeats - 1) : 0.5;
    const macro = macroArcValue(globalT, profile.macroArc);

    const phraseIndex = Math.floor(beat / phraseLengthBeats);
    const beatInPhrase = beat - phraseIndex * phraseLengthBeats;
    const phraseT = phraseLengthBeats > 1 ? beatInPhrase / (phraseLengthBeats - 1) : 0.5;

    const phraseArc = Math.sin(phraseT * Math.PI);

    const activeChord = chords.find(c => c.startBeat <= beat && c.startBeat + c.duration > beat);
    let harmonicTension = 0;
    if (activeChord) {
      const q = activeChord.quality;
      if (q === 'dominant7' || q === 'augmented7')          harmonicTension = 0.8;
      else if (q === 'diminished' || q === 'diminished7')   harmonicTension = 0.9;
      else if (q === 'half_diminished7')                    harmonicTension = 0.85;
      else if (q === 'augmented')                           harmonicTension = 0.7;
      else if (q === 'minor7' || q === 'minor9')            harmonicTension = 0.35;
      else if (q === 'sus4' || q === 'sus2')                harmonicTension = 0.5;
      else if (q === 'major7' || q === 'major9')            harmonicTension = 0.15;
      else if (q === 'add9')                                harmonicTension = 0.2;
      else if (q === 'minor')                               harmonicTension = 0.3;
      else                                                  harmonicTension = 0.1;
    }

    const combined = macro * 0.35 + phraseArc * 0.35 + harmonicTension * 0.3;
    values.push(Math.max(0, Math.min(1, combined)));

    if (beatInPhrase === 0) {
      phraseStarts.push(beat);
    }
  }

  for (let p = 0; p < numPhrases; p++) {
    const cadenceBeat = Math.min((p + 1) * phraseLengthBeats - 1, totalBeats - 1);
    cadencePoints.push(cadenceBeat);

    if (values[cadenceBeat] !== undefined) {
      values[cadenceBeat] = Math.max(0, values[cadenceBeat]! * (1 - profile.cadenceStrength * 0.5));
    }
    const preCadence = cadenceBeat - 1;
    if (preCadence >= 0 && values[preCadence] !== undefined) {
      values[preCadence] = Math.min(1, values[preCadence]! * 1.3);
    }
  }

  let maxTension = 0;
  let climaxBeat = Math.floor(totalBeats / 2);
  for (let b = 0; b < values.length; b++) {
    if (values[b]! > maxTension) {
      maxTension = values[b]!;
      climaxBeat = b;
    }
  }
  climaxBeats.push(climaxBeat);

  return { values, cadencePoints, phraseStarts, climaxBeats };
}

export function getPhraseStructures(
  totalBeats: number,
  beatsPerBar: number,
  style: CompositionStyle,
  tension: TensionCurve,
): PhraseStructure[] {
  const profile = STYLE_TENSION_PROFILES[style] ?? STYLE_TENSION_PROFILES.classical;
  const phraseLengthBeats = profile.phraseLength * beatsPerBar;
  const phrases: PhraseStructure[] = [];
  const numPhrases = Math.ceil(totalBeats / phraseLengthBeats);

  for (let p = 0; p < numPhrases; p++) {
    const start = p * phraseLengthBeats;
    const end = Math.min(start + phraseLengthBeats, totalBeats);

    let type: PhraseStructure['type'];
    if (p === numPhrases - 1 && numPhrases > 2) {
      type = 'coda';
    } else if (p % 2 === 0) {
      type = p >= numPhrases - 2 ? 'development' : 'antecedent';
    } else {
      type = 'consequent';
    }

    let peakVal = 0;
    let peakBeat = start;
    for (let b = start; b < end && b < tension.values.length; b++) {
      if (tension.values[b]! > peakVal) {
        peakVal = tension.values[b]!;
        peakBeat = b;
      }
    }

    phrases.push({ start, end, type, peakBeat });
  }

  return phrases;
}

export function tensionAtBeat(tension: TensionCurve, beat: number): number {
  const idx = Math.floor(beat);
  if (idx < 0) return 0;
  if (idx >= tension.values.length) return tension.values[tension.values.length - 1] ?? 0;

  const frac = beat - idx;
  const current = tension.values[idx] ?? 0;
  const next = tension.values[Math.min(idx + 1, tension.values.length - 1)] ?? current;
  return current + (next - current) * frac;
}

export function isCadenceRegion(tension: TensionCurve, beat: number, windowBeats: number = 2): boolean {
  return tension.cadencePoints.some(cp => Math.abs(beat - cp) <= windowBeats);
}

export function isClimaxRegion(tension: TensionCurve, beat: number, windowBeats: number = 4): boolean {
  return tension.climaxBeats.some(cb => Math.abs(beat - cb) <= windowBeats);
}
