import type { Note, Chord, CompositionParams } from '../types/music';
import { getScaleNotesMultiOctave, nearestScaleNote } from './scales';
import { humanize } from './humanize';

function weightedRandom(weights: number[]): number {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r <= 0) return i;
  }
  return weights.length - 1;
}

/* ---- Motif-based melody generation ---- */

interface Motif {
  intervals: number[];
  rhythm: number[];
}

function generateSeedMotif(density: number, variety: number): Motif {
  const motifLength = 3 + Math.floor(Math.random() * 3);
  const intervals: number[] = [0];
  const rhythm: number[] = [];

  const possibleIntervals = [-5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 7];
  const shortDurations = [0.25, 0.5, 0.75, 1];
  const longDurations = [0.5, 1, 1.5, 2];
  const durations = density >= 6 ? shortDurations : longDurations;

  for (let i = 1; i < motifLength; i++) {
    const intIdx = Math.floor(Math.random() * possibleIntervals.length);
    intervals.push(intervals[i - 1] + possibleIntervals[intIdx]);
  }

  for (let i = 0; i < motifLength; i++) {
    const idx = Math.floor(Math.random() * durations.length);
    rhythm.push(durations[idx] + (variety > 5 ? (Math.random() - 0.5) * 0.1 : 0));
  }

  return { intervals, rhythm };
}

function transformMotif(motif: Motif, transform: 'sequence' | 'invert' | 'augment' | 'retrograde', transposition: number): Motif {
  switch (transform) {
    case 'sequence':
      return {
        intervals: motif.intervals.map(i => i + transposition),
        rhythm: [...motif.rhythm],
      };
    case 'invert':
      return {
        intervals: motif.intervals.map(i => -i + transposition),
        rhythm: [...motif.rhythm],
      };
    case 'augment':
      return {
        intervals: motif.intervals.map(i => i + transposition),
        rhythm: motif.rhythm.map(r => r * 1.5),
      };
    case 'retrograde':
      return {
        intervals: [...motif.intervals].reverse().map(i => i + transposition),
        rhythm: [...motif.rhythm].reverse(),
      };
  }
}

function generateContour(totalBeats: number, density: number): { beat: number; target: number }[] {
  const points: { beat: number; target: number }[] = [];
  const numNotes = Math.max(4, Math.floor(totalBeats * density));
  const beatStep = totalBeats / numNotes;

  const contourType = Math.random();

  for (let i = 0; i < numNotes; i++) {
    const t = i / numNotes;
    let target: number;

    if (contourType < 0.2) {
      target = t * 12;
    } else if (contourType < 0.4) {
      target = (1 - t) * 12;
    } else if (contourType < 0.6) {
      target = Math.sin(t * Math.PI) * 12;
    } else if (contourType < 0.8) {
      target = Math.sin(t * Math.PI * 2) * 8;
    } else {
      target = Math.sin(t * Math.PI * 3) * 6 + Math.cos(t * Math.PI) * 4;
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
  const useMotif = params.melodicDensity >= 3;

  const notes: Note[] = [];
  const centerPitch = scaleNotes[Math.floor(scaleNotes.length / 2)];

  if (useMotif) {
    const seed = generateSeedMotif(params.melodicDensity, params.rhythmicVariety);
    const transforms: Array<'sequence' | 'invert' | 'augment' | 'retrograde'> = ['sequence', 'invert', 'augment', 'retrograde'];
    let currentBeat = 0;
    let iteration = 0;

    while (currentBeat < totalBeats) {
      const transform = transforms[iteration % transforms.length];
      const transposition = Math.floor(iteration / transforms.length) * 2;
      const motif = iteration === 0 ? seed : transformMotif(seed, transform, transposition);

      for (let j = 0; j < motif.intervals.length && currentBeat < totalBeats; j++) {
        let targetPitch = centerPitch + motif.intervals[j];
        targetPitch = nearestScaleNote(targetPitch, params.key, params.scale);

        const activeChord = chords.find(c => c.startBeat <= currentBeat && c.startBeat + c.duration > currentBeat);
        if (activeChord && Math.random() > 0.55) {
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

        const dur = Math.min(motif.rhythm[j], totalBeats - currentBeat);
        const isRest = Math.random() > 0.88 && params.melodicDensity < 7;

        if (!isRest) {
          const baseVelocity = 60 + Math.floor(params.expressiveness * 5);
          const accentVariation = Math.floor(Math.random() * 30 * (params.expressiveness / 10));

          notes.push({
            pitch: targetPitch,
            velocity: Math.min(127, baseVelocity + accentVariation),
            duration: dur * (0.8 + Math.random() * 0.15),
            startBeat: currentBeat,
          });
        }

        currentBeat += dur;
      }
      iteration++;
    }
  } else {
    const contour = generateContour(totalBeats, density);
    const rhythmPattern = generateRhythmPattern(totalBeats, params.melodicDensity, params.rhythmicVariety);

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
  }

  const shaped = applyDynamics(notes, params.dynamics);
  return humanize(shaped, params.humanize);
}

export function generateBassLine(
  params: CompositionParams,
  chords: Chord[],
): Note[] {
  const notes: Note[] = [];
  const totalBeats = params.measures * params.timeSignature[0];
  let currentBeat = 0;

  const isBossa = params.style === 'bossa_nova';

  while (currentBeat < totalBeats) {
    const activeChord = chords.find(c => c.startBeat <= currentBeat && c.startBeat + c.duration > currentBeat);
    if (!activeChord) { currentBeat += 1; continue; }

    const rootMidi = Math.min(...activeChord.voicing) - 12;
    const chordDur = Math.min(activeChord.duration, totalBeats - currentBeat);

    if (isBossa && chordDur >= 2) {
      const fifth = rootMidi + 7;
      const third = rootMidi + (activeChord.quality.includes('minor') ? 3 : 4);
      notes.push({ pitch: rootMidi, velocity: 80, duration: 0.9, startBeat: currentBeat });
      notes.push({ pitch: nearestScaleNote(fifth, params.key, params.scale), velocity: 65, duration: 0.4, startBeat: currentBeat + 1.5 });
      if (chordDur >= 4) {
        notes.push({ pitch: nearestScaleNote(third, params.key, params.scale), velocity: 60, duration: 0.9, startBeat: currentBeat + 2 });
        notes.push({ pitch: rootMidi, velocity: 70, duration: 0.4, startBeat: currentBeat + 3.5 });
      }
      currentBeat += chordDur;
    } else if (params.rhythmicVariety >= 6 && Math.random() > 0.5 && chordDur >= 2) {
      const fifth = rootMidi + 7;
      if (chordDur >= 4) {
        notes.push({ pitch: rootMidi, velocity: 80 + Math.floor(Math.random() * 20), duration: 0.75, startBeat: currentBeat });
        notes.push({ pitch: nearestScaleNote(fifth, params.key, params.scale), velocity: 65 + Math.floor(Math.random() * 20), duration: 0.75, startBeat: currentBeat + 1 });
        notes.push({ pitch: rootMidi, velocity: 70 + Math.floor(Math.random() * 15), duration: 1.5, startBeat: currentBeat + 2 });
      } else {
        notes.push({ pitch: rootMidi, velocity: 80 + Math.floor(Math.random() * 20), duration: chordDur / 2 * 0.9, startBeat: currentBeat });
        notes.push({ pitch: nearestScaleNote(fifth, params.key, params.scale), velocity: 65 + Math.floor(Math.random() * 20), duration: chordDur / 2 * 0.9, startBeat: currentBeat + chordDur / 2 });
      }
      currentBeat += chordDur;
    } else {
      const duration = Math.min(activeChord.duration, totalBeats - currentBeat);
      notes.push({ pitch: rootMidi, velocity: 75 + Math.floor(Math.random() * 25), duration: duration * 0.9, startBeat: currentBeat });
      currentBeat += duration;
    }
  }

  const shaped = applyDynamics(notes, params.dynamics);
  return humanize(shaped, params.humanize);
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

  const shaped = applyDynamics(notes, params.dynamics);
  return humanize(shaped, params.humanize);
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

  const shaped = applyDynamics(notes, params.dynamics);
  return humanize(shaped, params.humanize);
}

export function generateDrumPattern(
  params: CompositionParams,
): Note[] {
  const notes: Note[] = [];
  const totalBeats = params.measures * params.timeSignature[0];
  const beatsPerMeasure = params.timeSignature[0];
  const KICK = 36;
  const SNARE = 38;
  const HIHAT_CLOSED = 42;
  const HIHAT_OPEN = 46;
  const RIDE = 51;
  const CRASH = 49;
  const RIMSHOT = 37;
  const TOM_LOW = 45;
  const TOM_HIGH = 50;

  const isBossa = params.style === 'bossa_nova';
  const isWaltz = beatsPerMeasure === 3;

  for (let beat = 0; beat < totalBeats; beat += 0.5) {
    const measureBeat = beat % beatsPerMeasure;
    const isDownbeat = measureBeat === 0;
    const isBackbeat = isWaltz ? false : (measureBeat % 2 === 1);
    const isEighth = beat % 1 === 0.5;

    if (isBossa) {
      if (isDownbeat) {
        notes.push({ pitch: KICK, velocity: 85, duration: 0.25, startBeat: beat });
      }
      if (Math.abs(measureBeat - 1.5) < 0.01) {
        notes.push({ pitch: KICK, velocity: 70, duration: 0.25, startBeat: beat });
      }
      if (beat % 1 === 0) {
        notes.push({ pitch: RIMSHOT, velocity: 50 + Math.floor(Math.random() * 15), duration: 0.2, startBeat: beat });
      }
      if (isEighth && Math.random() > 0.3) {
        notes.push({ pitch: HIHAT_CLOSED, velocity: 35, duration: 0.15, startBeat: beat });
      }
      continue;
    }

    if (isWaltz) {
      if (isDownbeat) {
        notes.push({ pitch: KICK, velocity: 95, duration: 0.25, startBeat: beat });
        if (beat === 0 && Math.random() > 0.7) {
          notes.push({ pitch: CRASH, velocity: 75, duration: 0.5, startBeat: beat });
        }
      }
      if ((measureBeat === 1 || measureBeat === 2) && params.rhythmicVariety >= 3) {
        notes.push({ pitch: HIHAT_CLOSED, velocity: 55, duration: 0.2, startBeat: beat });
      }
      if (measureBeat === 2 && params.rhythmicVariety >= 5 && Math.random() > 0.6) {
        notes.push({ pitch: SNARE, velocity: 60, duration: 0.2, startBeat: beat });
      }
      continue;
    }

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

    if (params.rhythmicVariety >= 7 && Math.random() > 0.92) {
      const tom = Math.random() > 0.5 ? TOM_HIGH : TOM_LOW;
      notes.push({ pitch: tom, velocity: 65, duration: 0.2, startBeat: beat });
    }

    if (params.style === 'jazz' || params.style === 'neo_soul' || params.style === 'modal_jazz') {
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

  return humanize(notes, params.humanize);
}

export function generateCountermelody(
  params: CompositionParams,
  chords: Chord[],
  primaryMelody: Note[],
): Note[] {
  const scaleNotes = getScaleNotesMultiOctave(params.key, params.scale, 3, 5);
  const notes: Note[] = [];
  const totalBeats = params.measures * params.timeSignature[0];

  for (const chord of chords) {
    const chordEnd = chord.startBeat + chord.duration;
    const midBeat = chord.startBeat + chord.duration / 2;

    const primaryInRange = primaryMelody.filter(n =>
      n.startBeat >= chord.startBeat && n.startBeat < chordEnd
    );
    const avgPrimaryPitch = primaryInRange.length > 0
      ? primaryInRange.reduce((s, n) => s + n.pitch, 0) / primaryInRange.length
      : 60;

    let counterPitch = Math.round(avgPrimaryPitch) - 7;
    counterPitch = nearestScaleNote(counterPitch, params.key, params.scale);

    const inScaleBelow = scaleNotes.filter(n => n <= counterPitch && n >= counterPitch - 12);
    if (inScaleBelow.length > 0) {
      counterPitch = inScaleBelow[Math.floor(Math.random() * inScaleBelow.length)];
    }

    if (chord.duration >= 2 && Math.random() > 0.4) {
      notes.push({
        pitch: counterPitch,
        velocity: 45 + Math.floor(Math.random() * 20),
        duration: chord.duration / 2 * 0.85,
        startBeat: chord.startBeat,
      });
      const secondPitch = nearestScaleNote(counterPitch + (Math.random() > 0.5 ? 2 : -2), params.key, params.scale);
      notes.push({
        pitch: secondPitch,
        velocity: 40 + Math.floor(Math.random() * 20),
        duration: Math.min(chord.duration / 2 * 0.85, totalBeats - midBeat),
        startBeat: midBeat,
      });
    } else {
      notes.push({
        pitch: counterPitch,
        velocity: 45 + Math.floor(Math.random() * 15),
        duration: chord.duration * 0.9,
        startBeat: chord.startBeat,
      });
    }
  }

  const shaped = applyDynamics(notes, params.dynamics);
  return humanize(shaped, params.humanize);
}
