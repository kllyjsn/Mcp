import type { Note, CompositionParams } from '../types/music';
import { nearestScaleNote } from './scales';

export function addOrnaments(notes: Note[], params: CompositionParams): Note[] {
  if (params.expressiveness < 4) return notes;

  const ornamentChance = Math.min(0.3, (params.expressiveness - 3) * 0.04);
  const result: Note[] = [];

  for (let i = 0; i < notes.length; i++) {
    const note = notes[i];
    const roll = Math.random();

    if (roll < ornamentChance && note.duration > 0.3) {
      const ornType = Math.random();

      if (ornType < 0.35) {
        const graceNote = createGraceNote(note, params);
        if (graceNote) result.push(graceNote);
        result.push(note);
      } else if (ornType < 0.6) {
        const appoggiatura = createAppoggiatura(note, params);
        if (appoggiatura) {
          result.push(appoggiatura.approach);
          result.push(appoggiatura.resolution);
        } else {
          result.push(note);
        }
      } else if (ornType < 0.8) {
        const mordentNotes = createMordent(note, params);
        result.push(...mordentNotes);
      } else {
        const turnNotes = createTurn(note, params);
        result.push(...turnNotes);
      }
    } else {
      result.push(note);
    }
  }

  return result;
}

function createGraceNote(note: Note, params: CompositionParams): Note | null {
  const step = Math.random() > 0.5 ? 2 : -2;
  const gracePitch = nearestScaleNote(note.pitch + step, params.key, params.scale);
  if (gracePitch === note.pitch) return null;

  return {
    pitch: gracePitch,
    velocity: Math.round(note.velocity * 0.6),
    duration: 0.08,
    startBeat: Math.max(0, note.startBeat - 0.08),
    ornament: 'grace',
  };
}

function createAppoggiatura(
  note: Note,
  params: CompositionParams,
): { approach: Note; resolution: Note } | null {
  const step = Math.random() > 0.5 ? 2 : -2;
  const approachPitch = nearestScaleNote(note.pitch + step, params.key, params.scale);
  if (approachPitch === note.pitch) return null;

  const approachDur = Math.min(note.duration * 0.35, 0.5);
  const resolveDur = note.duration - approachDur;

  return {
    approach: {
      pitch: approachPitch,
      velocity: Math.round(note.velocity * 1.05),
      duration: approachDur,
      startBeat: note.startBeat,
      ornament: 'appoggiatura',
    },
    resolution: {
      pitch: note.pitch,
      velocity: Math.round(note.velocity * 0.85),
      duration: resolveDur,
      startBeat: note.startBeat + approachDur,
    },
  };
}

function createMordent(note: Note, params: CompositionParams): Note[] {
  const step = Math.random() > 0.5 ? 1 : -1;
  const auxPitch = nearestScaleNote(note.pitch + step, params.key, params.scale);
  const mordentDur = Math.min(0.1, note.duration * 0.15);

  if (auxPitch === note.pitch || note.duration < 0.3) {
    return [note];
  }

  return [
    { ...note, duration: mordentDur, ornament: 'mordent' },
    { pitch: auxPitch, velocity: Math.round(note.velocity * 0.8), duration: mordentDur, startBeat: note.startBeat + mordentDur, ornament: 'mordent' },
    { ...note, duration: note.duration - mordentDur * 2, startBeat: note.startBeat + mordentDur * 2 },
  ];
}

function createTurn(note: Note, params: CompositionParams): Note[] {
  const upper = nearestScaleNote(note.pitch + 2, params.key, params.scale);
  const lower = nearestScaleNote(note.pitch - 2, params.key, params.scale);
  const turnDur = Math.min(0.12, note.duration * 0.1);

  if (note.duration < 0.5 || upper === note.pitch || lower === note.pitch) {
    return [note];
  }

  const remainDur = note.duration - turnDur * 4;
  return [
    { ...note, duration: turnDur, ornament: 'turn' },
    { pitch: upper, velocity: Math.round(note.velocity * 0.85), duration: turnDur, startBeat: note.startBeat + turnDur, ornament: 'turn' },
    { ...note, duration: turnDur, startBeat: note.startBeat + turnDur * 2, ornament: 'turn' },
    { pitch: lower, velocity: Math.round(note.velocity * 0.8), duration: turnDur, startBeat: note.startBeat + turnDur * 3, ornament: 'turn' },
    { ...note, duration: remainDur, startBeat: note.startBeat + turnDur * 4 },
  ];
}

export function addPassingTones(notes: Note[], params: CompositionParams): Note[] {
  if (params.expressiveness < 5 || notes.length < 2) return notes;

  const passingChance = Math.min(0.25, (params.expressiveness - 4) * 0.04);
  const result: Note[] = [];

  for (let i = 0; i < notes.length; i++) {
    result.push(notes[i]);

    if (i < notes.length - 1 && Math.random() < passingChance) {
      const curr = notes[i];
      const next = notes[i + 1];
      const gap = next.startBeat - (curr.startBeat + curr.duration);
      const interval = Math.abs(next.pitch - curr.pitch);

      if (gap > 0.15 && interval >= 3 && interval <= 7) {
        const midPitch = nearestScaleNote(
          Math.round((curr.pitch + next.pitch) / 2),
          params.key,
          params.scale,
        );
        if (midPitch !== curr.pitch && midPitch !== next.pitch) {
          result.push({
            pitch: midPitch,
            velocity: Math.round(curr.velocity * 0.55),
            duration: Math.min(gap * 0.6, 0.2),
            startBeat: curr.startBeat + curr.duration,
          });
        }
      }
    }
  }

  return result;
}
