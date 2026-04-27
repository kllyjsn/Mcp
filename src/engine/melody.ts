import type { Note, Chord, CompositionParams, Section, TensionCurve } from '../types/music';
import { getScaleNotesMultiOctave, nearestScaleNote } from './scales';
import { getTensionAt, getTensionAtBeat, tensionToVelocityMod, tensionToRegisterShift, tensionToDensityScale, type StyleTensionPoint } from './tension';
import { getTrackPresenceAtBeat } from './sections';

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

function developMotif(motif: Motif, technique: 'repeat' | 'sequence' | 'inversion' | 'augment' | 'retrograde' | 'diminution', transposeSteps: number): Motif {
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
    case 'retrograde':
      return {
        intervals: [...motif.intervals].reverse(),
        durations: [...motif.durations].reverse(),
      };
    case 'diminution':
      return {
        intervals: [...motif.intervals],
        durations: motif.durations.map(d => d * 0.66),
      };
  }
}

function addOrnaments(notes: Note[], params: CompositionParams): Note[] {
  if (params.expressiveness < 5) return notes;

  const result: Note[] = [];
  const ornamentChance = (params.expressiveness - 4) / 12; // 0.08 at 5, ~0.5 at 10

  for (let i = 0; i < notes.length; i++) {
    const note = notes[i];

    if (Math.random() < ornamentChance && !note.isGraceNote) {
      const ornType = Math.random();

      if (ornType < 0.35) {
        // Grace note (appoggiatura) — a step above, played just before
        const graceStep = Math.random() > 0.5 ? 2 : -2;
        const gracePitch = nearestScaleNote(note.pitch + graceStep, params.key, params.scale);
        result.push({
          pitch: gracePitch,
          velocity: Math.round(note.velocity * 0.65),
          duration: 0.08,
          startBeat: note.startBeat - 0.08,
          isGraceNote: true,
          ornament: 'appoggiatura',
        });
      } else if (ornType < 0.6) {
        // Mordent — quick alternation with upper neighbor
        const upperNeighbor = nearestScaleNote(note.pitch + 2, params.key, params.scale);
        result.push({
          pitch: upperNeighbor,
          velocity: Math.round(note.velocity * 0.7),
          duration: 0.06,
          startBeat: note.startBeat,
          isGraceNote: true,
          ornament: 'mordent',
        });
        result.push({
          ...note,
          startBeat: note.startBeat + 0.06,
          duration: note.duration - 0.06,
        });
        continue;
      } else if (ornType < 0.8) {
        // Turn — upper-note-main-lower-main
        const upper = nearestScaleNote(note.pitch + 2, params.key, params.scale);
        const lower = nearestScaleNote(note.pitch - 2, params.key, params.scale);
        const turnDur = 0.06;
        result.push({ pitch: upper, velocity: Math.round(note.velocity * 0.7), duration: turnDur, startBeat: note.startBeat, isGraceNote: true, ornament: 'turn' });
        result.push({ pitch: note.pitch, velocity: Math.round(note.velocity * 0.75), duration: turnDur, startBeat: note.startBeat + turnDur, isGraceNote: true });
        result.push({ pitch: lower, velocity: Math.round(note.velocity * 0.7), duration: turnDur, startBeat: note.startBeat + turnDur * 2, isGraceNote: true });
        result.push({ ...note, startBeat: note.startBeat + turnDur * 3, duration: note.duration - turnDur * 3 });
        continue;
      }
    }

    result.push(note);
  }

  return result;
}

function addPickupNotes(notes: Note[], params: CompositionParams, beatsPerBar: number): Note[] {
  if (params.expressiveness < 6 || notes.length < 4) return notes;

  const result: Note[] = [...notes];
  const pickupChance = (params.expressiveness - 5) / 15;

  for (let i = 1; i < result.length; i++) {
    const note = result[i];
    const barPos = note.startBeat % beatsPerBar;

    // Add pickup before bar start
    if (barPos < 0.1 && Math.random() < pickupChance && !note.isGraceNote) {
      const pickupPitch = nearestScaleNote(
        note.pitch + (Math.random() > 0.5 ? 2 : -2),
        params.key,
        params.scale,
      );
      result.splice(i, 0, {
        pitch: pickupPitch,
        velocity: Math.round(note.velocity * 0.6),
        duration: 0.25,
        startBeat: note.startBeat - 0.25,
      });
      i++;
    }
  }

  return result;
}

export function generateMelody(
  params: CompositionParams,
  chords: Chord[],
  octaveRange: [number, number] = [4, 6],
  tensionArc?: StyleTensionPoint[],
  sections?: Section[],
  tensionCurve?: TensionCurve,
): Note[] {
  const scaleNotes = getScaleNotesMultiOctave(params.key, params.scale, octaveRange[0], octaveRange[1]);
  const totalBeats = params.measures * params.timeSignature[0];
  const beatsPerBar = params.timeSignature[0];

  const useMotif = params.expressiveness >= 5;

  let notes: Note[];

  if (useMotif) {
    notes = generateMotifMelody(params, chords, scaleNotes, totalBeats, tensionArc, sections, tensionCurve);
  } else {
    notes = generateContourMelody(params, chords, scaleNotes, totalBeats, tensionArc, sections, tensionCurve);
  }

  notes = addOrnaments(notes, params);
  notes = addPickupNotes(notes, params, beatsPerBar);
  return applyDynamics(notes, params.dynamics);
}

function generateContourMelody(
  params: CompositionParams,
  chords: Chord[],
  scaleNotes: number[],
  totalBeats: number,
  tensionArc?: StyleTensionPoint[],
  sections?: Section[],
  tensionCurve?: TensionCurve,
): Note[] {
  const density = params.melodicDensity / 10;
  const beatsPerBar = params.timeSignature[0];
  const contour = generateContour(totalBeats, density);
  const rhythmPattern = generateRhythmPattern(totalBeats, params.melodicDensity, params.rhythmicVariety);

  const centerPitch = scaleNotes[Math.floor(scaleNotes.length / 2)];
  const notes: Note[] = [];
  let currentBeat = 0;

  for (let i = 0; i < rhythmPattern.length; i++) {
    const duration = rhythmPattern[i];
    const contourPoint = contour[Math.min(i, contour.length - 1)];

    const tension = tensionCurve ? getTensionAtBeat(tensionCurve, currentBeat) : 0.5;
    const presence = sections ? getTrackPresenceAtBeat(sections, 'Melody', currentBeat, beatsPerBar) : 1;

    if (presence <= 0) {
      currentBeat += duration;
      continue;
    }

    const registerShift = tensionCurve ? tensionToRegisterShift(tension) : 0;

    let targetPitch = centerPitch + contourPoint.target + registerShift;
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

    let tensionVelocityMod = 1;
    if (tensionArc) {
      const tp = getTensionAt(tensionArc, currentBeat);
      tensionVelocityMod = tp.dynamicLevel;
    }

    const isRest = Math.random() > (0.85 - (1 - presence) * 0.3) && params.melodicDensity < 7;

    // Phrase breathing: insert rests near phrase boundaries (every 4 bars)
    const phrasePos = currentBeat % (beatsPerBar * 4);
    const nearPhraseEnd = phrasePos > beatsPerBar * 3.5;
    const breathRest = nearPhraseEnd && Math.random() > 0.5;

    if (!isRest && !breathRest) {
      const velMod = tensionCurve ? tensionToVelocityMod(tension) : 1;
      const baseVelocity = 60 + Math.floor(params.expressiveness * 5);
      const accentVariation = Math.floor(Math.random() * 30 * (params.expressiveness / 10));

      notes.push({
        pitch: targetPitch,
        velocity: Math.min(127, Math.round((baseVelocity + accentVariation) * tensionVelocityMod * velMod)),
        duration: duration * (0.8 + Math.random() * 0.15),
        startBeat: currentBeat,
      });
    }

    currentBeat += duration;
  }

  return notes;
}

function generateMotifMelody(
  params: CompositionParams,
  chords: Chord[],
  scaleNotes: number[],
  totalBeats: number,
  tensionArc?: StyleTensionPoint[],
  sections?: Section[],
  tensionCurve?: TensionCurve,
): Note[] {
  const notes: Note[] = [];
  const centerIdx = Math.floor(scaleNotes.length / 2);
  const beatsPerBar = params.timeSignature[0];
  const motif = generateMotif(scaleNotes, params.melodicDensity);
  const techniques: Array<'repeat' | 'sequence' | 'inversion' | 'augment' | 'retrograde' | 'diminution'> = [
    'repeat', 'sequence', 'inversion', 'augment', 'retrograde', 'diminution',
  ];

  let currentBeat = 0;
  let phraseCount = 0;

  while (currentBeat < totalBeats) {
    const presence = sections ? getTrackPresenceAtBeat(sections, 'Melody', currentBeat, beatsPerBar) : 1;
    if (presence <= 0) {
      currentBeat += 1;
      continue;
    }

    const tension = tensionCurve ? getTensionAtBeat(tensionCurve, currentBeat) : 0.5;
    const registerShift = tensionCurve ? tensionToRegisterShift(tension) : 0;

    const technique = phraseCount === 0 ? 'repeat' : techniques[Math.floor(Math.random() * techniques.length)];
    const transposeSteps = Math.floor(Math.random() * 5) - 2 + Math.round(registerShift * 0.3);
    const developed = developMotif(motif, technique, transposeSteps);

    const activeChord = chords.find(c => c.startBeat <= currentBeat && c.startBeat + c.duration > currentBeat);

    let tensionVelocityMod = 1;
    let tensionRhythmMod = 1;
    if (tensionArc) {
      const tp = getTensionAt(tensionArc, currentBeat);
      tensionVelocityMod = tp.dynamicLevel;
      tensionRhythmMod = tp.rhythmicActivity;
    }

    for (let i = 0; i < developed.intervals.length; i++) {
      if (currentBeat >= totalBeats) break;

      let scaleIdx = centerIdx + developed.intervals[i] + Math.round(registerShift * 0.5);
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

      const densityScale = tensionCurve ? tensionToDensityScale(tension) : 1;
      const dur = Math.min(developed.durations[i] / (tensionRhythmMod * densityScale), totalBeats - currentBeat);
      const velMod = tensionCurve ? tensionToVelocityMod(tension) : 1;
      const baseVelocity = 60 + Math.floor(params.expressiveness * 5);
      const accent = i === 0 ? 10 : 0;

      notes.push({
        pitch,
        velocity: Math.min(127, Math.round((baseVelocity + accent + Math.floor(Math.random() * 15)) * tensionVelocityMod * velMod)),
        duration: dur * (0.8 + Math.random() * 0.15),
        startBeat: currentBeat,
      });

      currentBeat += dur;
    }

    const restChance = tension < 0.4 ? 0.4 : 0.6;
    if (Math.random() > restChance && currentBeat < totalBeats) {
      const restDur = Math.min(0.5 + Math.random() * 0.5, totalBeats - currentBeat);
      currentBeat += restDur;
    }

    phraseCount++;
  }

  return notes;
}

/** Counter-melody: independent voice that moves contrary to the melody */
export function generateCounterMelody(
  params: CompositionParams,
  chords: Chord[],
  melodyNotes: Note[],
  tensionArc?: StyleTensionPoint[],
): Note[] {
  const scaleNotes = getScaleNotesMultiOctave(params.key, params.scale, 3, 5);
  const totalBeats = params.measures * params.timeSignature[0];
  const notes: Note[] = [];

  // Build a simplified melody contour to move against
  const melodyPitchAtBeat = (beat: number): number => {
    const nearest = melodyNotes.reduce((best, n) =>
      Math.abs(n.startBeat - beat) < Math.abs(best.startBeat - beat) ? n : best,
      melodyNotes[0],
    );
    return nearest?.pitch ?? 60;
  };

  let currentBeat = 0;
  const noteDensity = Math.max(0.3, params.melodicDensity / 15);

  while (currentBeat < totalBeats) {
    const activeChord = chords.find(c => c.startBeat <= currentBeat && c.startBeat + c.duration > currentBeat);
    if (!activeChord) { currentBeat += 1; continue; }

    let tensionMod = 1;
    if (tensionArc) {
      const tp = getTensionAt(tensionArc, currentBeat);
      tensionMod = tp.rhythmicActivity;
    }

    // Counter-melody note density is inversely scaled - it plays less when melody is busy
    const dur = (1 + Math.random()) / Math.max(0.5, noteDensity * tensionMod);
    const melodyPitch = melodyPitchAtBeat(currentBeat);

    // Contrary motion: move opposite to melody within chord tones
    const chordTones = activeChord.voicing;
    let targetPitch: number;

    if (chordTones.length > 0) {
      // Pick a chord tone that's in contrary motion to the melody
      const centerScaleIdx = Math.floor(scaleNotes.length / 2);
      const melodyDirection = melodyPitch > scaleNotes[centerScaleIdx] ? -1 : 1;
      const offset = melodyDirection * (3 + Math.floor(Math.random() * 5));

      targetPitch = nearestScaleNote(
        scaleNotes[Math.max(0, Math.min(scaleNotes.length - 1, centerScaleIdx + offset))],
        params.key,
        params.scale,
      );

      // Snap to nearest chord tone if close
      const nearestChordTone = chordTones.reduce((best, ct) =>
        Math.abs(ct - targetPitch) < Math.abs(best - targetPitch) ? ct : best,
        chordTones[0],
      );
      if (Math.abs(nearestChordTone - targetPitch) <= 3) {
        targetPitch = nearestChordTone;
      }
    } else {
      targetPitch = nearestScaleNote(melodyPitch - 7, params.key, params.scale);
    }

    // Avoid unisons with melody
    if (Math.abs(targetPitch - melodyPitch) < 2) {
      targetPitch = nearestScaleNote(targetPitch - 3, params.key, params.scale);
    }

    // Sometimes rest for breathing
    const shouldRest = Math.random() > 0.75;
    if (!shouldRest) {
      const velocity = 50 + Math.floor(params.expressiveness * 3) + Math.floor(Math.random() * 15);

      notes.push({
        pitch: targetPitch,
        velocity: Math.min(110, velocity),
        duration: Math.min(dur * 0.85, totalBeats - currentBeat),
        startBeat: currentBeat,
      });
    }

    currentBeat += Math.min(dur, totalBeats - currentBeat);
  }

  return applyDynamics(notes, params.dynamics);
}

export function generateBassLine(
  params: CompositionParams,
  chords: Chord[],
): Note[] {
  if (params.style === 'jazz' || params.style === 'bossa_nova' || params.style === 'late_night') {
    return generateWalkingBass(params, chords);
  }
  if (params.style === 'neo_soul' || params.style === 'lo_fi' || params.style === 'gospel' || params.style === 'contemporary_rnb') {
    return generateGrooveBass(params, chords);
  }
  if (params.style === 'afrobeat') {
    return generateAfrobeatBass(params, chords);
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

function generateAfrobeatBass(
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
    const chordDur = Math.min(activeChord.duration, totalBeats - currentBeat);

    // Afrobeat: driving, syncopated, repetitive bass line
    const patternLength = Math.min(4, chordDur);
    for (let b = 0; b < patternLength; b += 0.25) {
      if (currentBeat + b >= totalBeats) break;

      if (b === 0) {
        notes.push({ pitch: rootMidi, velocity: 95, duration: 0.35, startBeat: currentBeat + b });
      } else if (Math.abs(b - 0.75) < 0.1) {
        notes.push({ pitch: rootMidi, velocity: 70, duration: 0.2, startBeat: currentBeat + b });
      } else if (Math.abs(b - 1.5) < 0.1) {
        notes.push({ pitch: nearestScaleNote(fifth, params.key, params.scale), velocity: 80, duration: 0.3, startBeat: currentBeat + b });
      } else if (Math.abs(b - 2) < 0.1) {
        notes.push({ pitch: rootMidi, velocity: 85, duration: 0.3, startBeat: currentBeat + b });
      } else if (Math.abs(b - 2.75) < 0.1 && params.rhythmicVariety >= 5) {
        notes.push({ pitch: nearestScaleNote(rootMidi + 5, params.key, params.scale), velocity: 65, duration: 0.2, startBeat: currentBeat + b });
      } else if (Math.abs(b - 3.5) < 0.1) {
        notes.push({ pitch: nearestScaleNote(rootMidi + 3, params.key, params.scale), velocity: 75, duration: 0.25, startBeat: currentBeat + b });
      }
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
  const patterns = ['up', 'down', 'updown', 'random', 'broken'] as const;
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
        case 'broken': {
          // Broken chord: root, 5th, 3rd, octave pattern
          const brokenOrder = [0, Math.min(2, chordNotes.length - 1), Math.min(1, chordNotes.length - 1), chordNotes.length - 1];
          noteIndex = brokenOrder[i % brokenOrder.length];
          break;
        }
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
  if (params.style === 'jazz' || params.style === 'neo_soul' || params.style === 'late_night') {
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
  if (params.style === 'contemporary_rnb') {
    return generateRnbDrums(params);
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
  const SHAKER = 70;
  const CLAP = 39;

  for (let measure = 0; measure < params.measures; measure++) {
    const base = measure * params.timeSignature[0];

    // Afrobeat: polyrhythmic, driving, clave-based
    // Kick pattern: syncopated, heavy
    notes.push({ pitch: KICK, velocity: 100, duration: 0.3, startBeat: base });
    notes.push({ pitch: KICK, velocity: 85, duration: 0.25, startBeat: base + 1.25 });
    notes.push({ pitch: KICK, velocity: 90, duration: 0.3, startBeat: base + 2 });
    notes.push({ pitch: KICK, velocity: 80, duration: 0.25, startBeat: base + 3.25 });

    // Snare on 2 and 4 but with ghost notes
    notes.push({ pitch: SNARE, velocity: 90, duration: 0.2, startBeat: base + 1 });
    notes.push({ pitch: SNARE, velocity: 85, duration: 0.2, startBeat: base + 3 });
    if (params.rhythmicVariety >= 5) {
      notes.push({ pitch: SNARE, velocity: 40, duration: 0.1, startBeat: base + 0.75 });
      notes.push({ pitch: SNARE, velocity: 35, duration: 0.1, startBeat: base + 2.75 });
    }

    // Clap on backbeats
    if (params.rhythmicVariety >= 4) {
      notes.push({ pitch: CLAP, velocity: 70, duration: 0.15, startBeat: base + 1 });
      notes.push({ pitch: CLAP, velocity: 65, duration: 0.15, startBeat: base + 3 });
    }

    // Driving 16th-note hihat with accent pattern
    for (let s = 0; s < params.timeSignature[0] * 4; s++) {
      const beat = base + s * 0.25;
      const isDownSixteenth = s % 4 === 0;
      const isOpen = s % 8 === 6 && Math.random() > 0.5;
      notes.push({
        pitch: isOpen ? HIHAT_OPEN : HIHAT_CLOSED,
        velocity: isDownSixteenth ? 65 : 35 + Math.floor(Math.random() * 15),
        duration: isOpen ? 0.2 : 0.1,
        startBeat: beat,
      });
    }

    // Shaker pattern (continuous 8ths)
    for (let e = 0; e < params.timeSignature[0] * 2; e++) {
      notes.push({
        pitch: SHAKER,
        velocity: 30 + Math.floor(Math.random() * 15),
        duration: 0.1,
        startBeat: base + e * 0.5,
      });
    }
  }

  return notes;
}

function generateRnbDrums(params: CompositionParams): Note[] {
  const notes: Note[] = [];
  const totalBeats = params.measures * params.timeSignature[0];
  const KICK = 36;
  const SNARE = 38;
  const CLAP = 39;
  const HIHAT_CLOSED = 42;
  const HIHAT_OPEN = 46;

  for (let beat = 0; beat < totalBeats; beat += 0.25) {
    const barBeat = beat % params.timeSignature[0];

    // Kick: syncopated, slightly off-grid feel
    if (barBeat === 0) {
      notes.push({ pitch: KICK, velocity: 95, duration: 0.3, startBeat: beat });
    }
    if (Math.abs(barBeat - 1.75) < 0.1 && Math.random() > 0.3) {
      notes.push({ pitch: KICK, velocity: 75, duration: 0.25, startBeat: beat });
    }
    if (Math.abs(barBeat - 2.5) < 0.1 && Math.random() > 0.5) {
      notes.push({ pitch: KICK, velocity: 80, duration: 0.25, startBeat: beat });
    }

    // Snare/clap on 2 and 4
    if (Math.abs(barBeat - 1) < 0.1) {
      notes.push({ pitch: CLAP, velocity: 85, duration: 0.2, startBeat: beat });
    }
    if (Math.abs(barBeat - 3) < 0.1) {
      notes.push({ pitch: SNARE, velocity: 80, duration: 0.2, startBeat: beat });
    }

    // Hihat: 16ths with dynamics
    if (beat % 0.25 === 0 && params.rhythmicVariety >= 3) {
      const sixteenthPos = (beat * 4) % 4;
      const isOpen = Math.abs(barBeat - 3.75) < 0.1 && Math.random() > 0.5;
      notes.push({
        pitch: isOpen ? HIHAT_OPEN : HIHAT_CLOSED,
        velocity: sixteenthPos === 0 ? 55 : 30 + Math.floor(Math.random() * 15),
        duration: isOpen ? 0.2 : 0.1,
        startBeat: beat,
      });
    }
  }

  return notes;
}

// ---------------------------------------------------------------------------
// Drum fills at section boundaries
// ---------------------------------------------------------------------------

export function addDrumFills(
  drumNotes: Note[],
  sections: Section[],
  beatsPerMeasure: number,
): Note[] {
  const SNARE = 38;
  const KICK = 36;
  const HIHAT_OPEN = 46;
  const fills: Note[] = [];

  for (const section of sections) {
    if (section.startMeasure === 0) continue;
    const fillStart = section.startMeasure * beatsPerMeasure - 1;
    if (fillStart < 0) continue;

    const fillType = Math.random();

    if (fillType < 0.4) {
      // Snare roll fill
      for (let i = 0; i < 4; i++) {
        fills.push({
          pitch: SNARE,
          velocity: 70 + i * 12,
          duration: 0.12,
          startBeat: fillStart + i * 0.25,
        });
      }
    } else if (fillType < 0.7) {
      // Kick-snare alternating fill
      fills.push({ pitch: KICK, velocity: 85, duration: 0.15, startBeat: fillStart });
      fills.push({ pitch: SNARE, velocity: 80, duration: 0.12, startBeat: fillStart + 0.25 });
      fills.push({ pitch: KICK, velocity: 75, duration: 0.15, startBeat: fillStart + 0.5 });
      fills.push({ pitch: SNARE, velocity: 90, duration: 0.15, startBeat: fillStart + 0.75 });
    } else {
      // Crash + snare hit
      fills.push({ pitch: SNARE, velocity: 95, duration: 0.2, startBeat: fillStart + 0.5 });
      fills.push({ pitch: HIHAT_OPEN, velocity: 80, duration: 0.4, startBeat: fillStart + 0.5 });
      fills.push({ pitch: KICK, velocity: 100, duration: 0.25, startBeat: fillStart + 0.75 });
    }
  }

  return [...drumNotes, ...fills];
}
