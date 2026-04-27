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

interface Motif {
  intervals: number[];
  durations: number[];
}

function generateMotif(_scaleNotes: number[], density: number): Motif {
  const motifLength = density >= 7 ? 6 : density >= 4 ? 4 : 3;
  const intervals: number[] = [0];
  const durations: number[] = [];

  for (let i = 1; i < motifLength; i++) {
    const step = Math.floor(Math.random() * 5) - 2;
    intervals.push(intervals[i - 1] + step);
  }

  const baseDur = density >= 7 ? 0.5 : density >= 4 ? 0.75 : 1;
  for (let i = 0; i < motifLength; i++) {
    const variation = (Math.random() * 0.5 + 0.75);
    durations.push(baseDur * variation);
  }

  return { intervals, durations };
}

function developMotif(motif: Motif, technique: 'repeat' | 'sequence' | 'inversion' | 'augment', transposeSteps: number): Motif {
  switch (technique) {
    case 'repeat':
      return { ...motif };
    case 'sequence':
      return {
        intervals: motif.intervals.map(i => i + transposeSteps),
        durations: [...motif.durations],
      };
    case 'inversion':
      return {
        intervals: motif.intervals.map(i => -i + motif.intervals[0] * 2),
        durations: [...motif.durations],
      };
    case 'augment':
      return {
        intervals: [...motif.intervals],
        durations: motif.durations.map(d => d * 1.5),
      };
  }
}

export function generateMelody(
  params: CompositionParams,
  chords: Chord[],
  octaveRange: [number, number] = [4, 6],
): Note[] {
  const scaleNotes = getScaleNotesMultiOctave(params.key, params.scale, octaveRange[0], octaveRange[1]);
  const totalBeats = params.measures * params.timeSignature[0];
  const density = params.melodicDensity / 10;

  const useMotif = params.expressiveness >= 5;

  if (useMotif) {
    return generateMotifMelody(params, chords, scaleNotes, totalBeats);
  }

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

function generateMotifMelody(
  params: CompositionParams,
  chords: Chord[],
  scaleNotes: number[],
  totalBeats: number,
): Note[] {
  const notes: Note[] = [];
  const centerIdx = Math.floor(scaleNotes.length / 2);
  const motif = generateMotif(scaleNotes, params.melodicDensity);
  const techniques: Array<'repeat' | 'sequence' | 'inversion' | 'augment'> = ['repeat', 'sequence', 'inversion', 'augment'];

  let currentBeat = 0;
  let phraseCount = 0;

  while (currentBeat < totalBeats) {
    const technique = phraseCount === 0 ? 'repeat' : techniques[Math.floor(Math.random() * techniques.length)];
    const transposeSteps = Math.floor(Math.random() * 5) - 2;
    const developed = developMotif(motif, technique, transposeSteps);

    const activeChord = chords.find(c => c.startBeat <= currentBeat && c.startBeat + c.duration > currentBeat);

    for (let i = 0; i < developed.intervals.length; i++) {
      if (currentBeat >= totalBeats) break;

      let scaleIdx = centerIdx + developed.intervals[i];
      scaleIdx = Math.max(0, Math.min(scaleNotes.length - 1, scaleIdx));
      let pitch = scaleNotes[scaleIdx];

      if (activeChord && Math.random() > 0.55) {
        const chordTones = activeChord.voicing.map(v => v + 12);
        const nearest = chordTones.reduce((best, ct) =>
          Math.abs(ct - pitch) < Math.abs(best - pitch) ? ct : best,
          chordTones[0]
        );
        if (Math.abs(nearest - pitch) <= 3) {
          pitch = nearest;
        }
      }

      const dur = Math.min(developed.durations[i], totalBeats - currentBeat);
      const baseVelocity = 60 + Math.floor(params.expressiveness * 5);
      const accent = i === 0 ? 10 : 0;

      notes.push({
        pitch,
        velocity: Math.min(127, baseVelocity + accent + Math.floor(Math.random() * 15)),
        duration: dur * (0.8 + Math.random() * 0.15),
        startBeat: currentBeat,
      });

      currentBeat += dur;
    }

    if (Math.random() > 0.7 && currentBeat < totalBeats) {
      const restDur = Math.min(0.5 + Math.random() * 0.5, totalBeats - currentBeat);
      currentBeat += restDur;
    }

    phraseCount++;
  }

  return applyDynamics(notes, params.dynamics);
}

export function generateBassLine(
  params: CompositionParams,
  chords: Chord[],
): Note[] {
  if (params.style === 'jazz' || params.style === 'bossa_nova') {
    return generateWalkingBass(params, chords);
  }
  if (params.style === 'neo_soul' || params.style === 'lo_fi' || params.style === 'gospel') {
    return generateGrooveBass(params, chords);
  }

  const notes: Note[] = [];
  const totalBeats = params.measures * params.timeSignature[0];
  let currentBeat = 0;

  while (currentBeat < totalBeats) {
    const activeChord = chords.find(c => c.startBeat <= currentBeat && c.startBeat + c.duration > currentBeat);
    if (!activeChord) { currentBeat += 1; continue; }

    const rootMidi = Math.min(...activeChord.voicing) - 12;

    const chordDur = Math.min(activeChord.duration, totalBeats - currentBeat);

    if (params.rhythmicVariety >= 6 && Math.random() > 0.5 && chordDur >= 2) {
      const fifth = rootMidi + 7;
      if (chordDur >= 4) {
        notes.push({
          pitch: rootMidi,
          velocity: 80 + Math.floor(Math.random() * 20),
          duration: 0.75,
          startBeat: currentBeat,
        });
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
      } else {
        notes.push({
          pitch: rootMidi,
          velocity: 80 + Math.floor(Math.random() * 20),
          duration: chordDur / 2 * 0.9,
          startBeat: currentBeat,
        });
        notes.push({
          pitch: nearestScaleNote(fifth, params.key, params.scale),
          velocity: 65 + Math.floor(Math.random() * 20),
          duration: chordDur / 2 * 0.9,
          startBeat: currentBeat + chordDur / 2,
        });
      }
      currentBeat += chordDur;
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

function generateWalkingBass(
  params: CompositionParams,
  chords: Chord[],
): Note[] {
  const notes: Note[] = [];
  const totalBeats = params.measures * params.timeSignature[0];
  let currentBeat = 0;
  let prevPitch = 0;

  while (currentBeat < totalBeats) {
    const activeChord = chords.find(c => c.startBeat <= currentBeat && c.startBeat + c.duration > currentBeat);
    if (!activeChord) { currentBeat += 1; continue; }

    const rootMidi = Math.min(...activeChord.voicing) - 12;
    const chordDur = Math.min(activeChord.duration, totalBeats - currentBeat);
    const stepsInChord = Math.floor(chordDur);

    const chordTones = [rootMidi, rootMidi + 3, rootMidi + 5, rootMidi + 7];

    for (let step = 0; step < stepsInChord && currentBeat < totalBeats; step++) {
      let pitch: number;

      if (step === 0) {
        pitch = rootMidi;
      } else if (step === stepsInChord - 1) {
        const nextChord = chords.find(c => c.startBeat > activeChord.startBeat);
        if (nextChord) {
          const nextRoot = Math.min(...nextChord.voicing) - 12;
          pitch = nextRoot + (Math.random() > 0.5 ? -1 : 1);
          pitch = nearestScaleNote(pitch, params.key, params.scale);
        } else {
          pitch = rootMidi + 7;
        }
      } else {
        pitch = chordTones[Math.floor(Math.random() * chordTones.length)];
      }

      if (prevPitch !== 0 && Math.abs(pitch - prevPitch) > 7) {
        pitch = prevPitch + Math.sign(pitch - prevPitch) * (3 + Math.floor(Math.random() * 4));
        pitch = nearestScaleNote(pitch, params.key, params.scale);
      }

      const isDownbeat = step === 0;
      notes.push({
        pitch,
        velocity: isDownbeat ? 85 + Math.floor(Math.random() * 15) : 65 + Math.floor(Math.random() * 20),
        duration: 0.85,
        startBeat: currentBeat,
      });

      prevPitch = pitch;
      currentBeat += 1;
    }

    const remainder = chordDur - stepsInChord;
    if (remainder > 0.1) currentBeat += remainder;
  }

  return applyDynamics(notes, params.dynamics);
}

function generateGrooveBass(
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
    const fifth = rootMidi + 7;
    const octave = rootMidi + 12;
    const chordDur = Math.min(activeChord.duration, totalBeats - currentBeat);

    notes.push({ pitch: rootMidi, velocity: 90, duration: 0.4, startBeat: currentBeat });

    if (chordDur >= 1.5) {
      notes.push({ pitch: rootMidi, velocity: 55, duration: 0.3, startBeat: currentBeat + 0.75 });
    }

    if (chordDur >= 2) {
      const target = Math.random() > 0.5 ? fifth : octave;
      notes.push({
        pitch: nearestScaleNote(target, params.key, params.scale),
        velocity: 70 + Math.floor(Math.random() * 15),
        duration: 0.5,
        startBeat: currentBeat + 1.5,
      });
    }

    if (chordDur >= 3 && Math.random() > 0.4) {
      notes.push({
        pitch: nearestScaleNote(rootMidi + 5, params.key, params.scale),
        velocity: 60 + Math.floor(Math.random() * 15),
        duration: 0.35,
        startBeat: currentBeat + 2.5,
      });
    }

    if (chordDur >= 3.5 && Math.random() > 0.5) {
      notes.push({
        pitch: nearestScaleNote(rootMidi + 10, params.key, params.scale),
        velocity: 55 + Math.floor(Math.random() * 15),
        duration: 0.3,
        startBeat: currentBeat + 3.25,
      });
    }

    currentBeat += chordDur;
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
  if (params.style === 'jazz' || params.style === 'neo_soul') {
    return generateJazzDrums(params);
  }
  if (params.style === 'bossa_nova') {
    return generateBossaDrums(params);
  }
  if (params.style === 'lo_fi') {
    return generateLoFiDrums(params);
  }
  if (params.style === 'afrobeat') {
    return generateAfrobeatDrums(params);
  }
  if (params.style === 'uk_garage') {
    return generateUKGarageDrums(params);
  }

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

    if (params.style === 'gospel') {
      if (beat % 1 === 0) {
        notes.push({ pitch: HIHAT_CLOSED, velocity: 60 + Math.floor(Math.random() * 15), duration: 0.2, startBeat: beat });
      }
      if (isEighth && params.rhythmicVariety >= 4) {
        notes.push({ pitch: HIHAT_CLOSED, velocity: 40 + Math.floor(Math.random() * 15), duration: 0.15, startBeat: beat });
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

    if (params.style === 'gospel' && isBackbeat && params.rhythmicVariety >= 5 && Math.random() > 0.7) {
      notes.push({ pitch: RIDE, velocity: 50, duration: 0.3, startBeat: beat + 0.5 });
    }
  }

  return notes;
}

function generateJazzDrums(params: CompositionParams): Note[] {
  const notes: Note[] = [];
  const totalBeats = params.measures * params.timeSignature[0];
  const KICK = 36;
  const SNARE = 38;
  const RIDE = 51;
  const HIHAT_CLOSED = 42;
  const CRASH = 49;

  for (let beat = 0; beat < totalBeats; beat += 0.5) {
    const isDownbeat = beat % params.timeSignature[0] === 0;
    const beatInBar = beat % params.timeSignature[0];

    if (beat % 1 === 0) {
      notes.push({ pitch: RIDE, velocity: 60 + Math.floor(Math.random() * 20), duration: 0.4, startBeat: beat });
    }

    if (beat % 1 === 0.5 && Math.random() > 0.3) {
      notes.push({ pitch: RIDE, velocity: 35 + Math.floor(Math.random() * 15), duration: 0.25, startBeat: beat });
    }

    if (beatInBar === 1 || beatInBar === 3) {
      notes.push({ pitch: HIHAT_CLOSED, velocity: 40 + Math.floor(Math.random() * 15), duration: 0.1, startBeat: beat });
    }

    if (isDownbeat && Math.random() > 0.6) {
      notes.push({ pitch: KICK, velocity: 65 + Math.floor(Math.random() * 20), duration: 0.25, startBeat: beat });
    }

    if (!isDownbeat && Math.random() > 0.88) {
      notes.push({ pitch: KICK, velocity: 50 + Math.floor(Math.random() * 20), duration: 0.2, startBeat: beat });
    }

    if (Math.random() > 0.92 && params.rhythmicVariety >= 5) {
      notes.push({ pitch: SNARE, velocity: 40 + Math.floor(Math.random() * 25), duration: 0.15, startBeat: beat });
    }

    if (beat === 0 && Math.random() > 0.75) {
      notes.push({ pitch: CRASH, velocity: 70, duration: 0.5, startBeat: beat });
    }
  }

  return notes;
}

function generateBossaDrums(params: CompositionParams): Note[] {
  const notes: Note[] = [];
  const KICK = 36;
  const SNARE = 38;
  const HIHAT_CLOSED = 42;
  const RIDE = 51;

  for (let measure = 0; measure < params.measures; measure++) {
    const base = measure * params.timeSignature[0];

    notes.push({ pitch: KICK, velocity: 80, duration: 0.3, startBeat: base });
    notes.push({ pitch: KICK, velocity: 65, duration: 0.25, startBeat: base + 1.5 });
    notes.push({ pitch: KICK, velocity: 70, duration: 0.3, startBeat: base + 3 });

    notes.push({ pitch: SNARE, velocity: 45, duration: 0.15, startBeat: base + 0.5 });
    notes.push({ pitch: SNARE, velocity: 55, duration: 0.2, startBeat: base + 1 });
    notes.push({ pitch: SNARE, velocity: 45, duration: 0.15, startBeat: base + 2.5 });
    notes.push({ pitch: SNARE, velocity: 55, duration: 0.2, startBeat: base + 3 });

    for (let eighth = 0; eighth < params.timeSignature[0] * 2; eighth++) {
      const beat = base + eighth * 0.5;
      if (beat < base + params.timeSignature[0]) {
        notes.push({
          pitch: Math.random() > 0.3 ? HIHAT_CLOSED : RIDE,
          velocity: eighth % 2 === 0 ? 55 : 40,
          duration: 0.15,
          startBeat: beat,
        });
      }
    }
  }

  return notes;
}

function generateLoFiDrums(params: CompositionParams): Note[] {
  const notes: Note[] = [];
  const totalBeats = params.measures * params.timeSignature[0];
  const KICK = 36;
  const SNARE = 38;
  const HIHAT_CLOSED = 42;
  const HIHAT_OPEN = 46;

  for (let beat = 0; beat < totalBeats; beat += 0.5) {
    const barBeat = beat % params.timeSignature[0];

    if (barBeat === 0) {
      notes.push({ pitch: KICK, velocity: 90, duration: 0.3, startBeat: beat });
    }
    if (Math.abs(barBeat - 2.5) < 0.1 || (Math.abs(barBeat - 2) < 0.1 && Math.random() > 0.5)) {
      notes.push({ pitch: KICK, velocity: 70 + Math.floor(Math.random() * 15), duration: 0.25, startBeat: beat });
    }

    if (barBeat === 1) {
      notes.push({ pitch: SNARE, velocity: 80 + Math.floor(Math.random() * 15), duration: 0.25, startBeat: beat });
    }
    if (barBeat === 3) {
      notes.push({ pitch: SNARE, velocity: 75 + Math.floor(Math.random() * 15), duration: 0.25, startBeat: beat });
    }

    if (beat % 0.5 === 0 && params.rhythmicVariety >= 3) {
      const isOpen = Math.abs(barBeat - 3.5) < 0.1 && Math.random() > 0.6;
      notes.push({
        pitch: isOpen ? HIHAT_OPEN : HIHAT_CLOSED,
        velocity: beat % 1 === 0 ? 50 : 35,
        duration: isOpen ? 0.3 : 0.15,
        startBeat: beat,
      });
    }

    if (Math.random() > 0.93 && params.rhythmicVariety >= 5) {
      notes.push({ pitch: SNARE, velocity: 30 + Math.floor(Math.random() * 15), duration: 0.1, startBeat: beat });
    }
  }

  return notes;
}

function generateAfrobeatDrums(params: CompositionParams): Note[] {
  const notes: Note[] = [];
  const KICK = 36;
  const SNARE = 38;
  const HIHAT_CLOSED = 42;
  const HIHAT_OPEN = 46;
  const RIDE = 51;

  for (let measure = 0; measure < params.measures; measure++) {
    const base = measure * params.timeSignature[0];

    // Polyrhythmic bell pattern (12/8 feel in 4/4)
    const bellPattern = [0, 0.75, 1.5, 2, 2.75, 3.5];
    for (const offset of bellPattern) {
      notes.push({ pitch: RIDE, velocity: 65 + Math.floor(Math.random() * 15), duration: 0.25, startBeat: base + offset });
    }

    // Kick on 1 and the "and" of 3
    notes.push({ pitch: KICK, velocity: 95, duration: 0.3, startBeat: base });
    notes.push({ pitch: KICK, velocity: 75, duration: 0.25, startBeat: base + 2.5 });
    if (params.rhythmicVariety >= 5 && Math.random() > 0.5) {
      notes.push({ pitch: KICK, velocity: 65, duration: 0.2, startBeat: base + 1.75 });
    }

    // Snare on 2 and 4 with ghost notes
    notes.push({ pitch: SNARE, velocity: 85, duration: 0.2, startBeat: base + 1 });
    notes.push({ pitch: SNARE, velocity: 90, duration: 0.2, startBeat: base + 3 });
    if (params.rhythmicVariety >= 4 && Math.random() > 0.5) {
      notes.push({ pitch: SNARE, velocity: 35, duration: 0.1, startBeat: base + 0.75 });
    }
    if (params.rhythmicVariety >= 6 && Math.random() > 0.6) {
      notes.push({ pitch: SNARE, velocity: 40, duration: 0.1, startBeat: base + 3.5 });
    }

    // Hi-hats filling the gaps
    for (let eighth = 0; eighth < 8; eighth++) {
      const beat = base + eighth * 0.5;
      const isOpen = eighth === 7 && Math.random() > 0.4;
      notes.push({
        pitch: isOpen ? HIHAT_OPEN : HIHAT_CLOSED,
        velocity: eighth % 2 === 0 ? 50 : 35,
        duration: isOpen ? 0.25 : 0.12,
        startBeat: beat,
      });
    }
  }

  return notes;
}

function generateUKGarageDrums(params: CompositionParams): Note[] {
  const notes: Note[] = [];
  const totalBeats = params.measures * params.timeSignature[0];
  const KICK = 36;
  const SNARE = 38;
  const HIHAT_CLOSED = 42;
  const HIHAT_OPEN = 46;

  for (let beat = 0; beat < totalBeats; beat += 0.25) {
    const barBeat = beat % params.timeSignature[0];

    // 2-step kick: emphasise beat 1, skip beat 3 sometimes
    if (Math.abs(barBeat) < 0.05) {
      notes.push({ pitch: KICK, velocity: 95, duration: 0.2, startBeat: beat });
    }
    if (Math.abs(barBeat - 1.75) < 0.05 && Math.random() > 0.3) {
      notes.push({ pitch: KICK, velocity: 75, duration: 0.15, startBeat: beat });
    }
    if (Math.abs(barBeat - 2.5) < 0.05 && Math.random() > 0.5) {
      notes.push({ pitch: KICK, velocity: 70, duration: 0.15, startBeat: beat });
    }

    // Snare on 2 and ghost on "and" of 4
    if (Math.abs(barBeat - 1) < 0.05) {
      notes.push({ pitch: SNARE, velocity: 85, duration: 0.2, startBeat: beat });
    }
    if (Math.abs(barBeat - 3) < 0.05) {
      notes.push({ pitch: SNARE, velocity: 80 + Math.floor(Math.random() * 10), duration: 0.2, startBeat: beat });
    }
    if (Math.abs(barBeat - 3.5) < 0.05 && params.rhythmicVariety >= 5 && Math.random() > 0.5) {
      notes.push({ pitch: SNARE, velocity: 40, duration: 0.1, startBeat: beat });
    }

    // Shuffled hi-hats — skip some 16ths for the "2-step" feel
    if (beat % 0.25 === 0 && params.rhythmicVariety >= 2) {
      const posIn16th = Math.round(barBeat * 4) % 4;
      const skip = posIn16th === 2 && Math.random() > 0.4;
      if (!skip) {
        const isOpen = Math.abs(barBeat - 3.75) < 0.05 && Math.random() > 0.5;
        notes.push({
          pitch: isOpen ? HIHAT_OPEN : HIHAT_CLOSED,
          velocity: posIn16th === 0 ? 55 : 30 + Math.floor(Math.random() * 15),
          duration: isOpen ? 0.2 : 0.08,
          startBeat: beat,
        });
      }
    }
  }

  return notes;
}
