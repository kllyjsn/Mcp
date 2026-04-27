import type { Note, Chord, CompositionParams } from '../types/music';
import { getScaleNotesMultiOctave, nearestScaleNote } from './scales';

function melodyDirectionAt(melody: Note[], beat: number): number {
  const window = melody.filter(n => Math.abs(n.startBeat - beat) < 4);
  if (window.length < 2) return 0;
  let rising = 0;
  let falling = 0;
  for (let i = 1; i < window.length; i++) {
    const diff = window[i].pitch - window[i - 1].pitch;
    if (diff > 0) rising++;
    else if (diff < 0) falling++;
  }
  if (rising > falling) return 1;
  if (falling > rising) return -1;
  return 0;
}

function findChordAt(chords: Chord[], beat: number): Chord | undefined {
  return chords.find(c => c.startBeat <= beat && c.startBeat + c.duration > beat);
}

export function generateCounterMelody(
  params: CompositionParams,
  chords: Chord[],
  melody: Note[],
  octaveRange: [number, number] = [3, 5],
): Note[] {
  const scaleNotes = getScaleNotesMultiOctave(params.key, params.scale, octaveRange[0], octaveRange[1]);
  const totalBeats = params.measures * params.timeSignature[0];
  const beatsPerMeasure = params.timeSignature[0];
  const notes: Note[] = [];
  let prevPitch = scaleNotes[Math.floor(scaleNotes.length * 0.4)];

  const melodyRhythm = buildRhythmMap(melody);

  let currentBeat = 0;
  while (currentBeat < totalBeats) {
    const chord = findChordAt(chords, currentBeat);
    if (!chord) { currentBeat += 1; continue; }

    const melodyDir = melodyDirectionAt(melody, currentBeat);
    const melodyActive = melodyRhythm.get(Math.floor(currentBeat * 4) / 4) ?? false;

    let dur: number;
    if (melodyActive) {
      dur = 1 + Math.random() * 1.5;
    } else {
      const densityFactor = params.melodicDensity / 10;
      dur = 0.5 + Math.random() * (1 - densityFactor * 0.5);
    }
    dur = Math.min(dur, totalBeats - currentBeat);
    if (dur < 0.125) break;

    let targetPitch: number;
    const isStrongBeat = currentBeat % beatsPerMeasure < 0.1 || Math.abs(currentBeat % beatsPerMeasure - 2) < 0.1;

    if (isStrongBeat && chord) {
      const chordTones = chord.voicing.flatMap(v => [v, v - 12, v + 12])
        .filter(v => v >= scaleNotes[0] && v <= scaleNotes[scaleNotes.length - 1]);
      if (chordTones.length > 0) {
        const sorted = chordTones.sort((a, b) => Math.abs(a - prevPitch) - Math.abs(b - prevPitch));
        targetPitch = sorted[0];
      } else {
        targetPitch = prevPitch;
      }
    } else {
      const step = melodyDir <= 0 ? 1 : -1;
      const idx = scaleNotes.indexOf(nearestScaleNote(prevPitch, params.key, params.scale));
      const newIdx = Math.max(0, Math.min(scaleNotes.length - 1, idx + step * (1 + Math.floor(Math.random() * 2))));
      targetPitch = scaleNotes[newIdx];
    }

    const melodyPitchNear = melody.find(n => Math.abs(n.startBeat - currentBeat) < 0.5);
    if (melodyPitchNear) {
      const interval = Math.abs(targetPitch - melodyPitchNear.pitch) % 12;
      if (interval === 0 || interval === 1 || interval === 11) {
        targetPitch = nearestScaleNote(
          targetPitch + (Math.random() > 0.5 ? 2 : -2),
          params.key, params.scale,
        );
      }
    }

    if (Math.abs(targetPitch - prevPitch) > 9) {
      targetPitch = prevPitch + Math.sign(targetPitch - prevPitch) * (3 + Math.floor(Math.random() * 4));
      targetPitch = nearestScaleNote(targetPitch, params.key, params.scale);
    }

    const baseVelocity = 45 + Math.floor(params.expressiveness * 3);
    const accent = isStrongBeat ? 8 : 0;

    notes.push({
      pitch: targetPitch,
      velocity: Math.min(110, baseVelocity + accent + Math.floor(Math.random() * 12)),
      duration: dur * 0.85,
      startBeat: currentBeat,
    });

    prevPitch = targetPitch;
    currentBeat += dur;

    if (Math.random() > 0.75 && currentBeat < totalBeats) {
      const rest = 0.25 + Math.random() * 0.75;
      currentBeat += Math.min(rest, totalBeats - currentBeat);
    }
  }

  return notes;
}

function buildRhythmMap(melody: Note[]): Map<number, boolean> {
  const map = new Map<number, boolean>();
  for (const note of melody) {
    const quantized = Math.floor(note.startBeat * 4) / 4;
    map.set(quantized, true);
  }
  return map;
}
