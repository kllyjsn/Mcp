import type { Note } from '../types/music';

function gaussianRandom(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

export function humanize(notes: Note[], amount: number): Note[] {
  if (amount <= 0) return notes;

  const factor = amount / 10;
  const timingJitter = 0.04 * factor;
  const velocitySpread = 12 * factor;
  const durationVariance = 0.06 * factor;
  const legatoThreshold = 0.12;

  return notes.map((note, i) => {
    const timeOffset = gaussianRandom() * timingJitter;
    const velOffset = Math.round(gaussianRandom() * velocitySpread);
    const durScale = 1 + gaussianRandom() * durationVariance;

    let startBeat = Math.max(0, note.startBeat + timeOffset);

    const isOnDownbeat = Math.abs(note.startBeat - Math.round(note.startBeat)) < 0.01;
    if (isOnDownbeat && Math.random() > 0.5) {
      startBeat = note.startBeat + Math.abs(timeOffset) * 0.3;
    }

    let velocity = Math.max(20, Math.min(127, note.velocity + velOffset));

    const beatPos = note.startBeat % 4;
    if (beatPos < 0.01) velocity = Math.min(127, velocity + Math.round(4 * factor));
    else if (Math.abs(beatPos - 2) < 0.01) velocity = Math.min(127, velocity + Math.round(2 * factor));

    let duration = note.duration * durScale;

    if (i < notes.length - 1) {
      const gap = notes[i + 1].startBeat - (startBeat + duration);
      if (gap > 0 && gap < legatoThreshold * factor) {
        duration += gap * 0.7;
      }
    }

    return {
      ...note,
      startBeat,
      velocity,
      duration: Math.max(0.05, duration),
    };
  });
}
