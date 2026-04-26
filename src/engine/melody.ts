import type { Note, Chord, CompositionParams } from '../types/music';
import { getScaleNotesMultiOctave, nearestScaleNote } from './scales';

function weightedRandom(weights: number[]): number {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r <= 0) return i;
  }
  return weights.length - 1;
}

function generateContour(totalBeats: number, density: number): { beat: number; target: number }[] {
  const points: { beat: number; target: number }[] = [];
  const numNotes = Math.max(4, Math.floor(totalBeats * density));
  const beatStep = totalBeats / numNotes;

  const contourType = Math.random();

  for (let i = 0; i < numNotes; i++) {
    const t = i / numNotes;
    let target: number;

    if (contourType < 0.25) {
      target = t * 12;
    } else if (contourType < 0.5) {
      target = (1 - t) * 12;
    } else if (contourType < 0.75) {
      target = Math.sin(t * Math.PI) * 12;
    } else {
      target = Math.sin(t * Math.PI * 2) * 8;
    }

    points.push({ beat: i * beatStep, target: Math.round(target) });
  }

  return points;
}

function generateRhythmPattern(totalBeats: number, density: number, variety: number): number[] {
  const durations: number[] = [];
  const possibleDurations = [0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4];

  const weights = possibleDurations.map((_d, i) => {
    const idealIndex = Math.floor((1 - density / 10) * possibleDurations.length);
    const dist = Math.abs(i - idealIndex);
    return Math.max(0.1, 1 - dist * 0.2 + (variety / 10) * Math.random() * 0.5);
  });

  let remaining = totalBeats;
  while (remaining > 0.125) {
    const idx = weightedRandom(weights);
    const dur = Math.min(possibleDurations[idx], remaining);
    durations.push(dur);
    remaining -= dur;
  }

  return durations;
}

function applyDynamics(notes: Note[], curve: string): Note[] {
  const total = notes.length;
  return notes.map((note, i) => {
    const t = total > 1 ? i / (total - 1) : 0.5;
    let velocityMod: number;

    switch (curve) {
      case 'crescendo': velocityMod = 0.5 + t * 0.5; break;
      case 'decrescendo': velocityMod = 1 - t * 0.5; break;
      case 'swell': velocityMod = 0.5 + Math.sin(t * Math.PI) * 0.5; break;
      case 'terraced': velocityMod = t < 0.5 ? 0.6 : 0.9; break;
      case 'dramatic': velocityMod = 0.4 + Math.abs(Math.sin(t * Math.PI * 2)) * 0.6; break;
      default: velocityMod = 0.75;
    }

    return { ...note, velocity: Math.round(Math.min(127, note.velocity * velocityMod)) };
  });
}

export function generateMelody(
  params: CompositionParams,
  chords: Chord[],
  octaveRange: [number, number] = [4, 6],
): Note[] {
  const scaleNotes = getScaleNotesMultiOctave(params.key, params.scale, octaveRange[0], octaveRange[1]);
  const totalBeats = params.measures * params.timeSignature[0];
  const density = params.melodicDensity / 10;

  const contour = generateContour(totalBeats, density);
  const rhythmPattern = generateRhythmPattern(totalBeats, params.melodicDensity, params.rhythmicVariety);

  const centerPitch = scaleNotes[Math.floor(scaleNotes.length / 2)];
  const notes: Note[] = [];
  let currentBeat = 0;

  for (let i = 0; i < rhythmPattern.length; i++) {
    const duration = rhythmPattern[i];
    const contourPoint = contour[Math.min(i, contour.length - 1)];

    let targetPitch = centerPitch + contourPoint.target;
    targetPitch = nearestScaleNote(targetPitch, params.key, params.scale);

    const activeChord = chords.find(c => c.startBeat <= currentBeat && c.startBeat + c.duration > currentBeat);
    if (activeChord && Math.random() > 0.6) {
      const chordTones = activeChord.voicing.map(v => v + 12);
      const nearest = chordTones.reduce((best, ct) =>
        Math.abs(ct - targetPitch) < Math.abs(best - targetPitch) ? ct : best,
        chordTones[0]
      );
      if (Math.abs(nearest - targetPitch) <= 4) {
        targetPitch = nearest;
      }
    }

    if (notes.length > 0) {
      const prev = notes[notes.length - 1].pitch;
      const interval = Math.abs(targetPitch - prev);
      if (interval > 7 && Math.random() > 0.3) {
        targetPitch = prev + Math.sign(targetPitch - prev) * Math.min(interval, 5);
        targetPitch = nearestScaleNote(targetPitch, params.key, params.scale);
      }
    }

    const isRest = Math.random() > 0.85 && params.melodicDensity < 7;

    if (!isRest) {
      const baseVelocity = 60 + Math.floor(params.expressiveness * 5);
      const accentVariation = Math.floor(Math.random() * 30 * (params.expressiveness / 10));

      notes.push({
        pitch: targetPitch,
        velocity: Math.min(127, baseVelocity + accentVariation),
        duration: duration * (0.8 + Math.random() * 0.15),
        startBeat: currentBeat,
      });
    }

    currentBeat += duration;
  }

  return applyDynamics(notes, params.dynamics);
}

export function generateBassLine(
  params: CompositionParams,
  chords: Chord[],
): Note[] {
  const notes: Note[] = [];
  const totalBeats = params.measures * params.timeSignature[0];
  let currentBeat = 0;

  while (currentBeat < totalBeats) {
    const activeChord = chords.find(c => c.startBeat <= currentBeat && c.startBeat + c.duration > currentBeat);
    if (!activeChord) { currentBeat += 1; continue; }

    const rootMidi = Math.min(...activeChord.voicing) - 12;

    if (params.rhythmicVariety >= 6 && Math.random() > 0.5) {
      notes.push({
        pitch: rootMidi,
        velocity: 80 + Math.floor(Math.random() * 20),
        duration: 0.75,
        startBeat: currentBeat,
      });
      const fifth = rootMidi + 7;
      notes.push({
        pitch: nearestScaleNote(fifth, params.key, params.scale),
        velocity: 65 + Math.floor(Math.random() * 20),
        duration: 0.75,
        startBeat: currentBeat + 1,
      });
      notes.push({
        pitch: rootMidi,
        velocity: 70 + Math.floor(Math.random() * 15),
        duration: 1.5,
        startBeat: currentBeat + 2,
      });
      currentBeat += 4;
    } else {
      const duration = Math.min(activeChord.duration, totalBeats - currentBeat);
      notes.push({
        pitch: rootMidi,
        velocity: 75 + Math.floor(Math.random() * 25),
        duration: duration * 0.9,
        startBeat: currentBeat,
      });
      currentBeat += duration;
    }
  }

  return applyDynamics(notes, params.dynamics);
}

export function generatePadVoicings(
  params: CompositionParams,
  chords: Chord[],
): Note[] {
  const notes: Note[] = [];

  for (const chord of chords) {
    const velocityBase = 40 + Math.floor(params.expressiveness * 4);

    for (const pitch of chord.voicing) {
      notes.push({
        pitch,
        velocity: velocityBase + Math.floor(Math.random() * 15),
        duration: chord.duration * 0.95,
        startBeat: chord.startBeat,
      });
    }
  }

  return applyDynamics(notes, params.dynamics);
}

export function generateArpeggio(
  params: CompositionParams,
  chords: Chord[],
): Note[] {
  const notes: Note[] = [];
  const patterns = ['up', 'down', 'updown', 'random'] as const;
  const pattern = patterns[Math.floor(Math.random() * patterns.length)];

  for (const chord of chords) {
    const chordNotes = [...chord.voicing].sort((a, b) => a - b);
    const notesPerBeat = params.melodicDensity >= 5 ? 2 : 1;
    const totalArpNotes = Math.floor(chord.duration * notesPerBeat);
    const noteDuration = chord.duration / totalArpNotes;

    for (let i = 0; i < totalArpNotes; i++) {
      let noteIndex: number;
      switch (pattern) {
        case 'up': noteIndex = i % chordNotes.length; break;
        case 'down': noteIndex = (chordNotes.length - 1 - i % chordNotes.length); break;
        case 'updown': {
          const cycle = chordNotes.length * 2 - 2;
          const pos = i % Math.max(1, cycle);
          noteIndex = pos < chordNotes.length ? pos : cycle - pos;
          break;
        }
        case 'random': noteIndex = Math.floor(Math.random() * chordNotes.length); break;
      }

      notes.push({
        pitch: chordNotes[noteIndex] + 12,
        velocity: 50 + Math.floor(Math.random() * 30),
        duration: noteDuration * 0.8,
        startBeat: chord.startBeat + i * noteDuration,
      });
    }
  }

  return applyDynamics(notes, params.dynamics);
}

export function generateDrumPattern(
  params: CompositionParams,
): Note[] {
  const notes: Note[] = [];
  const totalBeats = params.measures * params.timeSignature[0];
  const KICK = 36;
  const SNARE = 38;
  const HIHAT_CLOSED = 42;
  const HIHAT_OPEN = 46;
  const RIDE = 51;
  const CRASH = 49;

  for (let beat = 0; beat < totalBeats; beat += 0.5) {
    const isDownbeat = beat % params.timeSignature[0] === 0;
    const isBackbeat = beat % 2 === 1;
    const isEighth = beat % 1 === 0.5;

    if (isDownbeat) {
      notes.push({ pitch: KICK, velocity: 100, duration: 0.25, startBeat: beat });
      if (beat === 0 && Math.random() > 0.7) {
        notes.push({ pitch: CRASH, velocity: 80, duration: 0.5, startBeat: beat });
      }
    }

    if (isBackbeat && params.rhythmicVariety >= 3) {
      notes.push({ pitch: SNARE, velocity: 85 + Math.floor(Math.random() * 15), duration: 0.25, startBeat: beat });
    }

    if (beat % 2 === 0 && !isDownbeat && params.rhythmicVariety >= 5 && Math.random() > 0.6) {
      notes.push({ pitch: KICK, velocity: 70, duration: 0.25, startBeat: beat });
    }

    if (params.style === 'jazz' || params.style === 'neo_soul') {
      if (beat % 1 === 0) {
        notes.push({ pitch: RIDE, velocity: 55 + Math.floor(Math.random() * 20), duration: 0.4, startBeat: beat });
      }
      if (isEighth && Math.random() > 0.4) {
        notes.push({ pitch: RIDE, velocity: 40, duration: 0.25, startBeat: beat });
      }
    } else {
      if (beat % 0.5 === 0 && params.rhythmicVariety >= 2) {
        const isOpen = isEighth && Math.random() > 0.85;
        notes.push({
          pitch: isOpen ? HIHAT_OPEN : HIHAT_CLOSED,
          velocity: isEighth ? 45 : 60,
          duration: 0.2,
          startBeat: beat,
        });
      }
    }
  }

  return notes;
}
