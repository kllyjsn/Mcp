import type { Section, TensionCurve, TensionPoint } from '../types/music';

export function generateTensionCurve(
  sections: Section[],
  beatsPerMeasure: number,
): TensionCurve {
  const points: TensionPoint[] = [];

  for (const section of sections) {
    const startBeat = section.startMeasure * beatsPerMeasure;
    const endBeat = (section.startMeasure + section.lengthMeasures) * beatsPerMeasure;
    const sectionBeats = endBeat - startBeat;

    const prevTension = points.length > 0 ? points[points.length - 1].tension : 0;
    const targetTension = section.tension;

    const resolution = Math.max(1, Math.floor(sectionBeats / 4));
    for (let i = 0; i <= resolution; i++) {
      const t = i / resolution;
      const beat = startBeat + t * sectionBeats;
      const tension = smoothStep(prevTension, targetTension, t);
      points.push({ beat, tension });
    }
  }

  return points;
}

function smoothStep(a: number, b: number, t: number): number {
  const s = t * t * (3 - 2 * t);
  return a + (b - a) * s;
}

export function getTensionAtBeat(curve: TensionCurve, beat: number): number {
  if (curve.length === 0) return 0.5;
  if (beat <= curve[0].beat) return curve[0].tension;
  if (beat >= curve[curve.length - 1].beat) return curve[curve.length - 1].tension;

  for (let i = 0; i < curve.length - 1; i++) {
    const a = curve[i];
    const b = curve[i + 1];
    if (beat >= a.beat && beat <= b.beat) {
      const range = b.beat - a.beat;
      const t = range === 0 ? 0 : (beat - a.beat) / range;
      return a.tension + (b.tension - a.tension) * t;
    }
  }

  return curve[curve.length - 1].tension;
}

export function tensionToVelocityMod(tension: number): number {
  return 0.55 + tension * 0.45;
}

export function tensionToRegisterShift(tension: number): number {
  return Math.round((tension - 0.5) * 4);
}

export function tensionToDensityScale(tension: number): number {
  return 0.6 + tension * 0.6;
}
