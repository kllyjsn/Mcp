import type { Note, Chord, CompositionParams, Articulation } from '../types/music';
import { nearestScaleNote, getScaleNotesMultiOctave } from './scales';

type MotionType = 'contrary' | 'oblique' | 'parallel' | 'similar';

function classifyMotion(melodyInterval: number, bassInterval: number): MotionType {
  if (melodyInterval === 0 && bassInterval === 0) return 'oblique';
  if (melodyInterval === 0 || bassInterval === 0) return 'oblique';
  if (Math.sign(melodyInterval) !== Math.sign(bassInterval)) return 'contrary';
  if (melodyInterval === bassInterval) return 'parallel';
  return 'similar';
}

function isParallelFifthOrOctave(prevMel: number, currMel: number, prevBass: number, currBass: number): boolean {
  const prevInterval = Math.abs(prevMel - prevBass) % 12;
  const currInterval = Math.abs(currMel - currBass) % 12;
  const isPerfect = (i: number) => i === 0 || i === 7 || i === 5;
  return isPerfect(prevInterval) && isPerfect(currInterval) && prevInterval === currInterval;
}

function isTendencyTone(pitch: number, key: string, scale: string): 'leading' | 'fourth' | null {
  const keyIdx = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'].indexOf(key);
  const pc = (pitch - keyIdx + 12) % 12;
  if (pc === 11 && (scale === 'major' || scale === 'harmonic_minor' || scale === 'melodic_minor')) return 'leading';
  if (pc === 5) return 'fourth';
  return null;
}

function resolveTendencyTone(pitch: number, tendency: 'leading' | 'fourth'): number {
  if (tendency === 'leading') return pitch + 1;
  return pitch - 1;
}

export function applyCounterpointRules(
  melodyNotes: Note[],
  bassNotes: Note[],
  params: CompositionParams,
): Note[] {
  if (melodyNotes.length < 2 || bassNotes.length < 2) return melodyNotes;

  const corrected = [...melodyNotes];

  for (let i = 1; i < corrected.length; i++) {
    const prevMel = corrected[i - 1].pitch;
    const currMel = corrected[i].pitch;

    const prevBass = findBassAtBeat(bassNotes, corrected[i - 1].startBeat);
    const currBass = findBassAtBeat(bassNotes, corrected[i].startBeat);

    if (prevBass === -1 || currBass === -1) continue;

    if (isParallelFifthOrOctave(prevMel, currMel, prevBass, currBass)) {
      let adjusted = currMel + (Math.random() > 0.5 ? 1 : -1);
      adjusted = nearestScaleNote(adjusted, params.key, params.scale);
      if (!isParallelFifthOrOctave(prevMel, adjusted, prevBass, currBass)) {
        corrected[i] = { ...corrected[i], pitch: adjusted };
      }
    }

    const melInterval = Math.abs(currMel - prevMel);
    if (melInterval > 12 && params.expressiveness < 8) {
      const direction = Math.sign(currMel - prevMel);
      let stepwise = prevMel + direction * 2;
      stepwise = nearestScaleNote(stepwise, params.key, params.scale);
      corrected[i] = { ...corrected[i], pitch: stepwise };
    }

    const motion = classifyMotion(currMel - prevMel, currBass - prevBass);
    if (motion === 'parallel' && Math.random() > 0.6) {
      let adjusted = currMel + (Math.random() > 0.5 ? 2 : -2);
      adjusted = nearestScaleNote(adjusted, params.key, params.scale);
      corrected[i] = { ...corrected[i], pitch: adjusted };
    }
  }

  if (params.expressiveness >= 5 && corrected.length >= 2) {
    const lastNote = corrected[corrected.length - 1];
    const tendency = isTendencyTone(lastNote.pitch, params.key, params.scale);
    if (tendency) {
      const resolved = resolveTendencyTone(lastNote.pitch, tendency);
      corrected[corrected.length - 1] = { ...lastNote, pitch: resolved };
    }
  }

  return corrected;
}

function findBassAtBeat(bassNotes: Note[], beat: number): number {
  let closest = -1;
  let minDist = Infinity;
  for (const n of bassNotes) {
    const dist = Math.abs(n.startBeat - beat);
    if (dist < minDist) {
      minDist = dist;
      closest = n.pitch;
    }
  }
  return minDist < 2 ? closest : -1;
}

export function applyArticulations(
  notes: Note[],
  params: CompositionParams,
  chords: Chord[],
): Note[] {
  const styleArticulations = getStyleArticulationProfile(params.style);

  return notes.map((note, i) => {
    const isDownbeat = note.startBeat % params.timeSignature[0] < 0.1;
    const isPhraseBoundary = i > 0 && (note.startBeat - notes[i - 1].startBeat) > 1.5;
    const isLeap = i > 0 && Math.abs(note.pitch - notes[i - 1].pitch) > 4;
    const activeChord = chords.find(c => c.startBeat <= note.startBeat && c.startBeat + c.duration > note.startBeat);
    const isTension = activeChord?.tension !== undefined && activeChord.tension > 0.5;

    let articulation: Articulation = 'normal';

    if (isPhraseBoundary && Math.random() < styleArticulations.legatoChance) {
      articulation = 'legato';
    } else if (isDownbeat && Math.random() < styleArticulations.accentChance) {
      articulation = isTension ? 'marcato' : 'accent';
    } else if (!isDownbeat && note.duration < 0.6 && Math.random() < styleArticulations.staccatoChance) {
      articulation = 'staccato';
    } else if (isLeap && Math.random() < styleArticulations.tenutoChance) {
      articulation = 'tenuto';
    } else if (Math.random() < styleArticulations.portamentoChance) {
      articulation = 'portamento';
    }

    let duration = note.duration;
    let velocity = note.velocity;

    switch (articulation) {
      case 'staccato':
        duration = Math.max(0.08, note.duration * 0.35);
        velocity = Math.min(127, velocity + 5);
        break;
      case 'legato':
        duration = note.duration * 1.15;
        break;
      case 'accent':
        velocity = Math.min(127, velocity + 15);
        break;
      case 'tenuto':
        duration = note.duration * 1.05;
        velocity = Math.min(127, velocity + 8);
        break;
      case 'marcato':
        velocity = Math.min(127, velocity + 20);
        duration = Math.max(0.1, note.duration * 0.8);
        break;
      case 'portamento':
        duration = note.duration * 1.1;
        break;
    }

    return { ...note, articulation, duration, velocity };
  });
}

interface ArticulationProfile {
  staccatoChance: number;
  legatoChance: number;
  accentChance: number;
  tenutoChance: number;
  portamentoChance: number;
}

function getStyleArticulationProfile(style: string): ArticulationProfile {
  const profiles: Record<string, ArticulationProfile> = {
    classical:     { staccatoChance: 0.15, legatoChance: 0.3, accentChance: 0.2, tenutoChance: 0.1, portamentoChance: 0 },
    romantic:      { staccatoChance: 0.05, legatoChance: 0.5, accentChance: 0.15, tenutoChance: 0.2, portamentoChance: 0.05 },
    impressionist: { staccatoChance: 0.1, legatoChance: 0.4, accentChance: 0.05, tenutoChance: 0.15, portamentoChance: 0.1 },
    jazz:          { staccatoChance: 0.2, legatoChance: 0.25, accentChance: 0.25, tenutoChance: 0.1, portamentoChance: 0.1 },
    neo_soul:      { staccatoChance: 0.1, legatoChance: 0.35, accentChance: 0.15, tenutoChance: 0.15, portamentoChance: 0.15 },
    ambient:       { staccatoChance: 0, legatoChance: 0.6, accentChance: 0, tenutoChance: 0.15, portamentoChance: 0.2 },
    minimalist:    { staccatoChance: 0.1, legatoChance: 0.3, accentChance: 0.1, tenutoChance: 0.15, portamentoChance: 0 },
    cinematic:     { staccatoChance: 0.1, legatoChance: 0.4, accentChance: 0.2, tenutoChance: 0.15, portamentoChance: 0.05 },
    electronic:    { staccatoChance: 0.25, legatoChance: 0.15, accentChance: 0.3, tenutoChance: 0.05, portamentoChance: 0.05 },
    bossa_nova:    { staccatoChance: 0.15, legatoChance: 0.35, accentChance: 0.1, tenutoChance: 0.15, portamentoChance: 0.1 },
    lo_fi:         { staccatoChance: 0.1, legatoChance: 0.35, accentChance: 0.1, tenutoChance: 0.15, portamentoChance: 0.15 },
    gospel:        { staccatoChance: 0.1, legatoChance: 0.3, accentChance: 0.2, tenutoChance: 0.15, portamentoChance: 0.1 },
    late_romantic:  { staccatoChance: 0.05, legatoChance: 0.55, accentChance: 0.15, tenutoChance: 0.2, portamentoChance: 0.1 },
    post_bop:       { staccatoChance: 0.2, legatoChance: 0.2, accentChance: 0.3, tenutoChance: 0.1, portamentoChance: 0.1 },
    chamber:        { staccatoChance: 0.15, legatoChance: 0.4, accentChance: 0.15, tenutoChance: 0.15, portamentoChance: 0.05 },
    film_noir:      { staccatoChance: 0.15, legatoChance: 0.3, accentChance: 0.2, tenutoChance: 0.1, portamentoChance: 0.15 },
  };
  return profiles[style] ?? profiles.classical;
}

export function applyCadentialMelody(
  notes: Note[],
  _chords: Chord[],
  params: CompositionParams,
): Note[] {
  if (notes.length < 4) return notes;

  const totalBeats = params.measures * params.timeSignature[0];
  const scaleNotes = getScaleNotesMultiOctave(params.key, params.scale, 4, 6);
  const tonic = scaleNotes.find(n => n % 12 === ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'].indexOf(params.key));
  if (!tonic) return notes;

  const result = [...notes];
  const lastFewIdx = result.length - 3;

  for (let i = lastFewIdx; i < result.length; i++) {
    if (i < 0) continue;
    const note = result[i];
    if (note.startBeat < totalBeats - 4) continue;

    if (i === result.length - 1) {
      const closestTonic = nearestTonicInOctave(note.pitch, tonic);
      result[i] = {
        ...note,
        pitch: closestTonic,
        velocity: Math.min(127, note.velocity + 5),
        duration: note.duration * 1.3,
      };
    } else if (i === result.length - 2) {
      const leadingTone = tonic - 1;
      const closest = nearestScaleNote(leadingTone, params.key, params.scale);
      const target = Math.abs(closest - note.pitch) < 7 ? closest : note.pitch;
      result[i] = { ...note, pitch: target };
    }
  }

  return result;
}

function nearestTonicInOctave(current: number, tonic: number): number {
  const tonicPc = tonic % 12;
  const candidates = [tonicPc + 48, tonicPc + 60, tonicPc + 72];
  return candidates.reduce((best, c) =>
    Math.abs(c - current) < Math.abs(best - current) ? c : best
  );
}
