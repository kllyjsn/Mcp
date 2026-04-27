import type { Note, CompositionStyle, NoteName, ScaleType } from '../types/music';
import { nearestScaleNote } from './scales';

interface ArticulationProfile {
  graceNoteChance: number;
  trillChance: number;
  mordentChance: number;
  turnChance: number;
  staccatoChance: number;
  legatoOverlap: number;
  phraseBreathChance: number;
}

const STYLE_ARTICULATIONS: Record<CompositionStyle, ArticulationProfile> = {
  classical:     { graceNoteChance: 0.08, trillChance: 0.05, mordentChance: 0.04, turnChance: 0.03, staccatoChance: 0.1,  legatoOverlap: 0.02, phraseBreathChance: 0.15 },
  romantic:      { graceNoteChance: 0.1,  trillChance: 0.04, mordentChance: 0.03, turnChance: 0.04, staccatoChance: 0.05, legatoOverlap: 0.04, phraseBreathChance: 0.12 },
  impressionist: { graceNoteChance: 0.06, trillChance: 0.03, mordentChance: 0.02, turnChance: 0.02, staccatoChance: 0.03, legatoOverlap: 0.05, phraseBreathChance: 0.1  },
  jazz:          { graceNoteChance: 0.12, trillChance: 0.02, mordentChance: 0.06, turnChance: 0.01, staccatoChance: 0.15, legatoOverlap: 0.01, phraseBreathChance: 0.18 },
  neo_soul:      { graceNoteChance: 0.1,  trillChance: 0.01, mordentChance: 0.04, turnChance: 0.01, staccatoChance: 0.08, legatoOverlap: 0.03, phraseBreathChance: 0.15 },
  bossa_nova:    { graceNoteChance: 0.07, trillChance: 0.01, mordentChance: 0.03, turnChance: 0.02, staccatoChance: 0.12, legatoOverlap: 0.02, phraseBreathChance: 0.14 },
  lo_fi:         { graceNoteChance: 0.04, trillChance: 0,    mordentChance: 0.02, turnChance: 0,    staccatoChance: 0.06, legatoOverlap: 0.04, phraseBreathChance: 0.1  },
  gospel:        { graceNoteChance: 0.12, trillChance: 0.03, mordentChance: 0.06, turnChance: 0.02, staccatoChance: 0.1,  legatoOverlap: 0.02, phraseBreathChance: 0.12 },
  ambient:       { graceNoteChance: 0.02, trillChance: 0,    mordentChance: 0,    turnChance: 0,    staccatoChance: 0,    legatoOverlap: 0.06, phraseBreathChance: 0.05 },
  minimalist:    { graceNoteChance: 0.02, trillChance: 0,    mordentChance: 0,    turnChance: 0,    staccatoChance: 0.05, legatoOverlap: 0.01, phraseBreathChance: 0.08 },
  cinematic:     { graceNoteChance: 0.06, trillChance: 0.03, mordentChance: 0.02, turnChance: 0.02, staccatoChance: 0.04, legatoOverlap: 0.03, phraseBreathChance: 0.1  },
  electronic:    { graceNoteChance: 0.03, trillChance: 0,    mordentChance: 0.02, turnChance: 0,    staccatoChance: 0.2,  legatoOverlap: 0,    phraseBreathChance: 0.05 },
};

function addGraceNote(note: Note, key: NoteName, scale: ScaleType): Note[] {
  const gracePitch = nearestScaleNote(
    note.pitch + (Math.random() > 0.5 ? 1 : -1) * (1 + Math.floor(Math.random() * 2)),
    key, scale,
  );
  const grace: Note = {
    pitch: gracePitch,
    velocity: Math.round(note.velocity * 0.7),
    duration: 0.08,
    startBeat: note.startBeat - 0.1,
  };
  return [grace, note];
}

function addTrill(note: Note, key: NoteName, scale: ScaleType): Note[] {
  if (note.duration < 0.5) return [note];
  const upperPitch = nearestScaleNote(note.pitch + 2, key, scale);
  const trillNotes: Note[] = [];
  const trillSpeed = 0.1;
  const trillDuration = Math.min(note.duration * 0.6, 0.8);
  let t = 0;

  while (t < trillDuration) {
    const isUpper = Math.floor(t / trillSpeed) % 2 === 1;
    trillNotes.push({
      pitch: isUpper ? upperPitch : note.pitch,
      velocity: Math.round(note.velocity * (0.75 + Math.random() * 0.15)),
      duration: trillSpeed * 0.9,
      startBeat: note.startBeat + t,
    });
    t += trillSpeed;
  }

  if (t < note.duration) {
    trillNotes.push({
      pitch: note.pitch,
      velocity: note.velocity,
      duration: note.duration - t,
      startBeat: note.startBeat + t,
    });
  }

  return trillNotes;
}

function addMordent(note: Note, key: NoteName, scale: ScaleType): Note[] {
  if (note.duration < 0.3) return [note];
  const auxPitch = nearestScaleNote(note.pitch + (Math.random() > 0.5 ? 2 : -1), key, scale);
  return [
    { ...note, duration: 0.08, velocity: Math.round(note.velocity * 0.85) },
    { pitch: auxPitch, velocity: Math.round(note.velocity * 0.75), duration: 0.08, startBeat: note.startBeat + 0.08 },
    { ...note, startBeat: note.startBeat + 0.16, duration: note.duration - 0.16 },
  ];
}

function addTurn(note: Note, key: NoteName, scale: ScaleType): Note[] {
  if (note.duration < 0.5) return [note];
  const upper = nearestScaleNote(note.pitch + 2, key, scale);
  const lower = nearestScaleNote(note.pitch - 1, key, scale);
  const seg = 0.1;
  const vel = Math.round(note.velocity * 0.8);
  return [
    { pitch: upper, velocity: vel, duration: seg, startBeat: note.startBeat },
    { pitch: note.pitch, velocity: vel, duration: seg, startBeat: note.startBeat + seg },
    { pitch: lower, velocity: vel, duration: seg, startBeat: note.startBeat + seg * 2 },
    { ...note, startBeat: note.startBeat + seg * 3, duration: note.duration - seg * 3 },
  ];
}

export function applyArticulations(
  notes: Note[],
  style: CompositionStyle,
  key: NoteName,
  scale: ScaleType,
  expressiveness: number,
): Note[] {
  const profile = STYLE_ARTICULATIONS[style] ?? STYLE_ARTICULATIONS.classical;
  const expMod = expressiveness / 10;
  const result: Note[] = [];

  for (let i = 0; i < notes.length; i++) {
    const note = notes[i];
    const r = Math.random();
    let accumulated = 0;

    accumulated += profile.graceNoteChance * expMod;
    if (r < accumulated) {
      result.push(...addGraceNote(note, key, scale));
      continue;
    }

    accumulated += profile.trillChance * expMod;
    if (r < accumulated) {
      result.push(...addTrill(note, key, scale));
      continue;
    }

    accumulated += profile.mordentChance * expMod;
    if (r < accumulated) {
      result.push(...addMordent(note, key, scale));
      continue;
    }

    accumulated += profile.turnChance * expMod;
    if (r < accumulated) {
      result.push(...addTurn(note, key, scale));
      continue;
    }

    accumulated += profile.staccatoChance;
    if (r < accumulated) {
      result.push({ ...note, duration: note.duration * 0.4 });
      continue;
    }

    let finalNote = note;

    if (profile.legatoOverlap > 0 && i < notes.length - 1) {
      const nextStart = notes[i + 1].startBeat;
      const noteEnd = note.startBeat + note.duration;
      if (noteEnd < nextStart) {
        finalNote = { ...note, duration: note.duration + profile.legatoOverlap };
      }
    }

    if (profile.phraseBreathChance > 0 && i > 0 && i % 8 === 0 && Math.random() < profile.phraseBreathChance) {
      finalNote = { ...finalNote, startBeat: finalNote.startBeat + 0.05, duration: Math.max(0.1, finalNote.duration - 0.1) };
    }

    result.push(finalNote);
  }

  return result.filter(n => n.startBeat >= 0 && n.duration > 0.02);
}
