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

// --- Motif system: generates a short melodic cell and develops it ---

interface Motif {
  intervals: number[];   // scale-degree offsets from root
  rhythm: number[];      // beat durations
  accents: boolean[];    // which notes are accented
}

function generateMotif(density: number, variety: number): Motif {
  const motifLength = density >= 7 ? 5 : density >= 4 ? 4 : 3;
  const intervals: number[] = [0];
  const rhythm: number[] = [];
  const accents: boolean[] = [true];

  const stepWeights = [0.1, 3, 2, 1.5, 0.8, 0.5, 0.3]; // step, 2nd, 3rd, 4th, 5th, 6th, 7th

  for (let i = 1; i < motifLength; i++) {
    const step = weightedRandom(stepWeights);
    const direction = Math.random() > 0.5 ? 1 : -1;
    intervals.push(intervals[i - 1] + step * direction);
    accents.push(i === 0 || Math.random() > 0.65);
  }

  const possibleDurations = density >= 7
    ? [0.25, 0.5, 0.5, 0.75, 1]
    : density >= 4
      ? [0.5, 0.75, 1, 1, 1.5]
      : [1, 1.5, 2, 2, 3];

  for (let i = 0; i < motifLength; i++) {
    const durationPool = variety >= 6
      ? possibleDurations
      : possibleDurations.slice(1);
    rhythm.push(durationPool[Math.floor(Math.random() * durationPool.length)]);
  }

  return { intervals, rhythm, accents };
}

function developMotif(motif: Motif, technique: 'repeat' | 'sequence' | 'inversion' | 'augmentation' | 'variation', transposition: number): Motif {
  const { intervals, rhythm, accents } = motif;
  switch (technique) {
    case 'repeat':
      return { intervals: intervals.map(i => i + transposition), rhythm: [...rhythm], accents: [...accents] };
    case 'sequence':
      return {
        intervals: intervals.map(i => i + transposition),
        rhythm: [...rhythm],
        accents: [...accents],
      };
    case 'inversion':
      return {
        intervals: intervals.map((iv, idx) => idx === 0 ? iv + transposition : intervals[0] + transposition - (iv - intervals[0])),
        rhythm: [...rhythm],
        accents: [...accents],
      };
    case 'augmentation':
      return {
        intervals: intervals.map(i => i + transposition),
        rhythm: rhythm.map(d => d * 1.5),
        accents: [...accents],
      };
    case 'variation':
      return {
        intervals: intervals.map((iv, idx) => {
          if (idx === 0) return iv + transposition;
          return iv + transposition + (Math.random() > 0.6 ? (Math.random() > 0.5 ? 1 : -1) : 0);
        }),
        rhythm: rhythm.map(d => {
          if (Math.random() > 0.7) return d * (Math.random() > 0.5 ? 0.75 : 1.25);
          return d;
        }),
        accents: accents.map(a => Math.random() > 0.2 ? a : !a),
      };
  }
}

function motifToNotes(
  motif: Motif,
  startBeat: number,
  centerPitch: number,
  scaleNotes: number[],
  key: string,
  scale: string,
  baseVelocity: number,
  expressiveness: number,
): Note[] {
  const notes: Note[] = [];
  let beat = startBeat;

  for (let i = 0; i < motif.intervals.length; i++) {
    const scaleIdx = Math.floor(scaleNotes.length / 2) + motif.intervals[i];
    const clampedIdx = Math.max(0, Math.min(scaleNotes.length - 1, scaleIdx));
    let pitch = scaleNotes[clampedIdx];

    if (Math.abs(pitch - centerPitch) > 14) {
      pitch = nearestScaleNote(
        centerPitch + Math.sign(pitch - centerPitch) * 7,
        key as Parameters<typeof nearestScaleNote>[1],
        scale as Parameters<typeof nearestScaleNote>[2],
      );
    }

    const accent = motif.accents[i] ? Math.floor(expressiveness * 3) : 0;
    const vel = Math.min(127, Math.max(30, baseVelocity + accent + Math.floor(Math.random() * 12 - 6)));

    notes.push({
      pitch,
      velocity: vel,
      duration: motif.rhythm[i] * 0.85,
      startBeat: beat,
    });
    beat += motif.rhythm[i];
  }

  return notes;
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
  const centerPitch = scaleNotes[Math.floor(scaleNotes.length / 2)];

  const motif = generateMotif(params.melodicDensity, params.rhythmicVariety);

  const developmentTechniques: ('repeat' | 'sequence' | 'inversion' | 'augmentation' | 'variation')[] = [
    'repeat', 'sequence', 'variation', 'inversion', 'augmentation', 'variation',
  ];

  const notes: Note[] = [];
  let currentBeat = 0;
  let phraseIndex = 0;
  const phraseLength = params.timeSignature[0] * 2; // 2-measure phrases

  while (currentBeat < totalBeats) {
    const technique = developmentTechniques[phraseIndex % developmentTechniques.length];
    const transposition = phraseIndex === 0 ? 0 : Math.floor(phraseIndex / 2) * (Math.random() > 0.5 ? 2 : -2);
    const developed = phraseIndex === 0 ? motif : developMotif(motif, technique, transposition);

    const activeChord = chords.find(c => c.startBeat <= currentBeat && c.startBeat + c.duration > currentBeat);
    const chordCenter = activeChord
      ? activeChord.voicing[Math.floor(activeChord.voicing.length / 2)] + 12
      : centerPitch;

    const baseVelocity = 55 + Math.floor(params.expressiveness * 5);
    const motifNotes = motifToNotes(
      developed,
      currentBeat,
      chordCenter,
      scaleNotes,
      params.key,
      params.scale,
      baseVelocity,
      params.expressiveness,
    );

    // Chord-tone gravity: pull notes toward chord tones on strong beats
    for (const note of motifNotes) {
      if (activeChord && note.startBeat % 1 < 0.05 && Math.random() > 0.4) {
        const chordTones = activeChord.voicing.map(v => v + 12);
        const nearest = chordTones.reduce((best, ct) =>
          Math.abs(ct - note.pitch) < Math.abs(best - note.pitch) ? ct : best,
          chordTones[0],
        );
        if (Math.abs(nearest - note.pitch) <= 3) {
          note.pitch = nearest;
        }
      }
    }

    notes.push(...motifNotes);

    // Rest between phrases (breathing space)
    const motifDuration = developed.rhythm.reduce((a, b) => a + b, 0);
    currentBeat += Math.max(motifDuration, phraseLength);

    // Occasional rest
    if (Math.random() > 0.75 && params.melodicDensity < 7) {
      currentBeat += 0.5 + Math.random() * 1;
    }

    phraseIndex++;
  }

  // Stepwise smoothing: large leaps get passing tones
  const smoothed: Note[] = [];
  for (let i = 0; i < notes.length; i++) {
    smoothed.push(notes[i]);
    if (i < notes.length - 1) {
      const interval = Math.abs(notes[i + 1].pitch - notes[i].pitch);
      if (interval > 7 && notes[i].duration > 0.3 && params.melodicDensity >= 5) {
        const passingPitch = nearestScaleNote(
          Math.round((notes[i].pitch + notes[i + 1].pitch) / 2),
          params.key,
          params.scale,
        );
        smoothed.push({
          pitch: passingPitch,
          velocity: Math.round(notes[i].velocity * 0.7),
          duration: 0.2,
          startBeat: notes[i].startBeat + notes[i].duration * 0.8,
        });
      }
    }
  }

  return applyDynamics(smoothed, params.dynamics);
}

export function generateBassLine(
  params: CompositionParams,
  chords: Chord[],
): Note[] {
  const notes: Note[] = [];
  const totalBeats = params.measures * params.timeSignature[0];
  let currentBeat = 0;

  const isGrooveStyle = ['jazz', 'neo_soul', 'electronic'].includes(params.style);

  while (currentBeat < totalBeats) {
    const activeChord = chords.find(c => c.startBeat <= currentBeat && c.startBeat + c.duration > currentBeat);
    if (!activeChord) { currentBeat += 1; continue; }

    const rootMidi = Math.min(...activeChord.voicing) - 12;
    const fifth = nearestScaleNote(rootMidi + 7, params.key, params.scale);
    const octave = rootMidi + 12;
    const chordDur = Math.min(activeChord.duration, totalBeats - currentBeat);

    if (isGrooveStyle && params.rhythmicVariety >= 5 && chordDur >= 2) {
      // Walking / groove bass pattern
      const pattern = Math.random();
      if (pattern < 0.35 && chordDur >= 4) {
        // Walking: root - passing - fifth - chromatic approach
        const passing = nearestScaleNote(rootMidi + 4, params.key, params.scale);
        const approach = rootMidi - 1;
        notes.push(
          { pitch: rootMidi, velocity: 85, duration: 0.9, startBeat: currentBeat },
          { pitch: passing, velocity: 70, duration: 0.9, startBeat: currentBeat + 1 },
          { pitch: fifth, velocity: 75, duration: 0.9, startBeat: currentBeat + 2 },
          { pitch: approach, velocity: 65, duration: 0.9, startBeat: currentBeat + 3 },
        );
      } else if (pattern < 0.65 && chordDur >= 2) {
        // Syncopated root-octave
        notes.push(
          { pitch: rootMidi, velocity: 85, duration: 0.4, startBeat: currentBeat },
          { pitch: rootMidi, velocity: 55, duration: 0.3, startBeat: currentBeat + 0.75 },
          { pitch: octave, velocity: 70, duration: 0.6, startBeat: currentBeat + 1.5 },
        );
        if (chordDur >= 3) {
          notes.push({ pitch: fifth, velocity: 65, duration: 0.8, startBeat: currentBeat + 2.5 });
        }
      } else {
        // Root-fifth bounce
        notes.push(
          { pitch: rootMidi, velocity: 80, duration: chordDur / 2 * 0.9, startBeat: currentBeat },
          { pitch: fifth, velocity: 68, duration: chordDur / 2 * 0.9, startBeat: currentBeat + chordDur / 2 },
        );
      }
      currentBeat += chordDur;
    } else if (params.rhythmicVariety >= 6 && Math.random() > 0.5 && chordDur >= 2) {
      // Active bass with fifth
      if (chordDur >= 4) {
        notes.push(
          { pitch: rootMidi, velocity: 80 + Math.floor(Math.random() * 20), duration: 0.75, startBeat: currentBeat },
          { pitch: fifth, velocity: 65 + Math.floor(Math.random() * 20), duration: 0.75, startBeat: currentBeat + 1 },
          { pitch: rootMidi, velocity: 70 + Math.floor(Math.random() * 15), duration: 1.5, startBeat: currentBeat + 2 },
        );
      } else {
        notes.push(
          { pitch: rootMidi, velocity: 80 + Math.floor(Math.random() * 20), duration: chordDur / 2 * 0.9, startBeat: currentBeat },
          { pitch: fifth, velocity: 65 + Math.floor(Math.random() * 20), duration: chordDur / 2 * 0.9, startBeat: currentBeat + chordDur / 2 },
        );
      }
      currentBeat += chordDur;
    } else {
      // Whole-note sustain
      notes.push({
        pitch: rootMidi,
        velocity: 75 + Math.floor(Math.random() * 25),
        duration: chordDur * 0.9,
        startBeat: currentBeat,
      });
      currentBeat += chordDur;
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

  // Style-aware pattern selection
  const stylePatterns: Record<string, ('up' | 'down' | 'updown' | 'random' | 'broken')[]> = {
    classical:     ['up', 'down', 'updown'],
    romantic:      ['updown', 'broken'],
    impressionist: ['broken', 'random'],
    jazz:          ['broken', 'random', 'up'],
    neo_soul:      ['broken', 'random'],
    ambient:       ['up', 'broken'],
    minimalist:    ['up', 'up'],
    cinematic:     ['updown', 'broken'],
    electronic:    ['up', 'down', 'updown'],
  };
  const patternPool = stylePatterns[params.style] ?? ['up', 'down', 'updown', 'random'];
  const pattern = patternPool[Math.floor(Math.random() * patternPool.length)];

  for (const chord of chords) {
    const chordNotes = [...chord.voicing].sort((a, b) => a - b);
    const notesPerBeat = params.melodicDensity >= 7 ? 3 : params.melodicDensity >= 5 ? 2 : 1;
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
        case 'broken': {
          // Skip pattern: 1st, 3rd, 2nd, 4th... creates a harp-like broken chord
          const base = Math.floor(i / 2) % chordNotes.length;
          noteIndex = (base + (i % 2) * 2) % chordNotes.length;
          break;
        }
        case 'random': noteIndex = Math.floor(Math.random() * chordNotes.length); break;
      }

      // Accent pattern: slight emphasis every downbeat
      const isDownbeat = (chord.startBeat + i * noteDuration) % 1 < 0.05;
      const vel = isDownbeat ? 65 : 45 + Math.floor(Math.random() * 25);

      notes.push({
        pitch: chordNotes[noteIndex] + 12,
        velocity: vel,
        duration: noteDuration * 0.75,
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

  const isSwingStyle = params.style === 'jazz' || params.style === 'neo_soul';
  const measuresPerPhrase = 4;

  for (let beat = 0; beat < totalBeats; beat += 0.5) {
    const measureInPhrase = Math.floor(beat / params.timeSignature[0]) % measuresPerPhrase;
    const isLastMeasureInPhrase = measureInPhrase === measuresPerPhrase - 1;
    const isDownbeat = beat % params.timeSignature[0] === 0;
    const isBackbeat = beat % 2 === 1;
    const isEighth = beat % 1 === 0.5;
    const beatInMeasure = beat % params.timeSignature[0];

    // Kick patterns
    if (isDownbeat) {
      notes.push({ pitch: KICK, velocity: 100, duration: 0.25, startBeat: beat });
      if (beat === 0 && Math.random() > 0.6) {
        notes.push({ pitch: CRASH, velocity: 85, duration: 0.5, startBeat: beat });
      }
    }
    // Syncopated kick ghost note (adds groove)
    if (beat % 2 === 0 && !isDownbeat && params.rhythmicVariety >= 5 && Math.random() > 0.55) {
      notes.push({ pitch: KICK, velocity: 60 + Math.floor(Math.random() * 15), duration: 0.25, startBeat: beat });
    }
    // "And of 4" kick for groove styles
    if (isSwingStyle && Math.abs(beatInMeasure - 3.5) < 0.01 && Math.random() > 0.5) {
      notes.push({ pitch: KICK, velocity: 55, duration: 0.2, startBeat: beat });
    }

    // Snare
    if (isBackbeat && params.rhythmicVariety >= 3) {
      notes.push({ pitch: SNARE, velocity: 85 + Math.floor(Math.random() * 15), duration: 0.25, startBeat: beat });
    }
    // Ghost snare notes (soft taps between main hits — the heart of groove drumming)
    if (!isBackbeat && !isDownbeat && params.rhythmicVariety >= 6 && Math.random() > 0.75) {
      notes.push({ pitch: SNARE, velocity: 25 + Math.floor(Math.random() * 15), duration: 0.15, startBeat: beat });
    }

    // Drum fill at phrase boundaries
    if (isLastMeasureInPhrase && beatInMeasure >= 3 && params.rhythmicVariety >= 4 && Math.random() > 0.4) {
      notes.push({ pitch: SNARE, velocity: 70 + Math.floor(Math.random() * 25), duration: 0.2, startBeat: beat });
      if (isEighth) {
        notes.push({ pitch: KICK, velocity: 65, duration: 0.15, startBeat: beat });
      }
    }

    // Hihat / Ride
    if (isSwingStyle) {
      // Jazz ride pattern: quarter notes with off-beat "spang-a-lang"
      if (beat % 1 === 0) {
        notes.push({ pitch: RIDE, velocity: 55 + Math.floor(Math.random() * 20), duration: 0.4, startBeat: beat });
      }
      if (isEighth && Math.random() > 0.35) {
        notes.push({ pitch: RIDE, velocity: 38 + Math.floor(Math.random() * 12), duration: 0.25, startBeat: beat });
      }
      // Feathered hihat on 2 and 4 for jazz
      if (isBackbeat && Math.random() > 0.3) {
        notes.push({ pitch: HIHAT_CLOSED, velocity: 30, duration: 0.2, startBeat: beat });
      }
    } else {
      if (beat % 0.5 === 0 && params.rhythmicVariety >= 2) {
        const isOpen = isEighth && Math.random() > 0.85;
        const velocity = isEighth ? 40 + Math.floor(Math.random() * 10) : 58 + Math.floor(Math.random() * 12);
        notes.push({
          pitch: isOpen ? HIHAT_OPEN : HIHAT_CLOSED,
          velocity,
          duration: 0.2,
          startBeat: beat,
        });
      }
    }

    // Crash on phrase starts
    if (beat > 0 && beat % (measuresPerPhrase * params.timeSignature[0]) === 0 && Math.random() > 0.4) {
      notes.push({ pitch: CRASH, velocity: 80, duration: 0.5, startBeat: beat });
    }
  }

  return notes;
}
