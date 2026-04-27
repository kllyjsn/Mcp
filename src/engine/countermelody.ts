import type { Note, Chord, CompositionParams, TensionCurve, Section, NoteName, ScaleType } from '../types/music';
import { getScaleNotesMultiOctave, nearestScaleNote } from './scales';
import { getTensionAtBeat, tensionToVelocityMod } from './tension';
import { getTrackPresenceAtBeat } from './sections';

export function generateCounterMelody(
  params: CompositionParams,
  chords: Chord[],
  mainMelody: Note[],
  sections: Section[],
  tensionCurve: TensionCurve,
): Note[] {
  const scaleNotes = getScaleNotesMultiOctave(params.key, params.scale, 3, 6);
  const totalBeats = params.measures * params.timeSignature[0];
  const beatsPerBar = params.timeSignature[0];
  const notes: Note[] = [];

  let currentBeat = 0;
  const stepSize = params.melodicDensity >= 6 ? 1 : 1.5;

  while (currentBeat < totalBeats) {
    const presence = getTrackPresenceAtBeat(sections, 'CounterMelody', currentBeat, beatsPerBar);
    if (presence <= 0) {
      currentBeat += stepSize;
      continue;
    }

    const tension = getTensionAtBeat(tensionCurve, currentBeat);
    const activeChord = chords.find(
      c => c.startBeat <= currentBeat && c.startBeat + c.duration > currentBeat,
    );

    const mainNote = findNearestMainNote(mainMelody, currentBeat);

    let pitch: number;
    if (activeChord) {
      pitch = pickCounterPitch(activeChord, mainNote, scaleNotes, tension, params.key, params.scale);
    } else {
      const center = scaleNotes[Math.floor(scaleNotes.length * 0.4)];
      pitch = nearestScaleNote(center, params.key, params.scale);
    }

    const isRest = Math.random() > (0.6 + presence * 0.3);
    if (!isRest) {
      const velMod = tensionToVelocityMod(tension);
      const baseVel = 45 + Math.floor(params.expressiveness * 3);
      const duration = stepSize * (0.7 + Math.random() * 0.25);

      notes.push({
        pitch,
        velocity: Math.min(110, Math.round((baseVel + Math.floor(Math.random() * 15)) * velMod)),
        duration: Math.min(duration, totalBeats - currentBeat),
        startBeat: currentBeat,
      });
    }

    currentBeat += stepSize;
  }

  return notes;
}

function findNearestMainNote(melody: Note[], beat: number): Note | null {
  let best: Note | null = null;
  let bestDist = Infinity;
  for (const n of melody) {
    const d = Math.abs(n.startBeat - beat);
    if (d < bestDist) {
      bestDist = d;
      best = n;
    }
  }
  return best;
}

function pickCounterPitch(
  chord: Chord,
  mainNote: Note | null,
  scaleNotes: number[],
  tension: number,
  key: NoteName,
  scale: ScaleType,
): number {
  const chordTones = chord.voicing;
  const mainPitch = mainNote?.pitch ?? 72;

  const targetInterval = tension > 0.6 ? 7 : tension > 0.3 ? 5 : 3;
  let target = mainPitch - targetInterval;

  if (Math.random() < 0.5) {
    const nearest = chordTones.reduce((best, ct) =>
      Math.abs(ct - target) < Math.abs(best - target) ? ct : best,
      chordTones[0],
    );
    if (Math.abs(nearest - target) <= 5) {
      target = nearest;
    }
  }

  if (Math.abs(target - mainPitch) < 2) {
    target = mainPitch - 5;
  }

  const inScale = scaleNotes.find(n => Math.abs(n - target) <= 1);
  return inScale ?? nearestScaleNote(target, key, scale);
}
