import type { CompositionParams, CompositionStyle, Section, TensionCurve, TensionPoint } from '../types/music';

export interface StyleTensionPoint {
  beat: number;
  tension: number;
  harmonicDensity: number;
  rhythmicActivity: number;
  dynamicLevel: number;
}

interface TensionProfile {
  curve: (t: number) => number;
  climaxPoint: number;
}

const STYLE_TENSION: Record<CompositionStyle, TensionProfile> = {
  classical: {
    curve: (t) => {
      if (t < 0.3) return 0.3 + t * 0.5;
      if (t < 0.7) return 0.45 + Math.sin((t - 0.3) / 0.4 * Math.PI) * 0.55;
      return 0.45 - (t - 0.7) * 1.5;
    },
    climaxPoint: 0.6,
  },
  romantic: {
    curve: (t) => 0.2 + 0.6 * Math.pow(Math.sin(t * Math.PI * 0.85), 1.5) + t * 0.2,
    climaxPoint: 0.75,
  },
  impressionist: {
    curve: (t) => 0.3 + 0.25 * Math.sin(t * Math.PI * 2) + 0.15 * Math.sin(t * Math.PI * 3.7),
    climaxPoint: 0.5,
  },
  jazz: {
    curve: (t) => {
      if (t < 0.25) return 0.3 + t * 0.8;
      if (t < 0.75) return 0.5 + Math.sin((t - 0.25) * Math.PI * 2) * 0.3;
      return 0.6 - (t - 0.75) * 1.2;
    },
    climaxPoint: 0.55,
  },
  neo_soul: {
    curve: (t) => 0.35 + 0.3 * Math.sin(t * Math.PI) + 0.1 * Math.sin(t * Math.PI * 3),
    climaxPoint: 0.5,
  },
  ambient: {
    curve: (t) => 0.2 + 0.15 * Math.sin(t * Math.PI * 0.8) + 0.05 * Math.cos(t * Math.PI * 2.3),
    climaxPoint: 0.4,
  },
  minimalist: {
    curve: (t) => 0.15 + t * 0.65,
    climaxPoint: 0.85,
  },
  cinematic: {
    curve: (t) => {
      if (t < 0.15) return 0.1 + t * 2;
      if (t < 0.65) return 0.4 + (t - 0.15) * 1.0;
      if (t < 0.8) return 0.9 + Math.sin((t - 0.65) / 0.15 * Math.PI * 0.5) * 0.1;
      return 1.0 - (t - 0.8) * 3.5;
    },
    climaxPoint: 0.78,
  },
  electronic: {
    curve: (t) => {
      const cycle = t * 2;
      if (cycle < 1) return 0.3 + cycle * 0.7;
      return 0.4 + (cycle - 1) * 0.6;
    },
    climaxPoint: 0.5,
  },
  bossa_nova: {
    curve: (t) => 0.3 + 0.15 * Math.sin(t * Math.PI * 1.5) + 0.05 * Math.cos(t * Math.PI * 4),
    climaxPoint: 0.4,
  },
  lo_fi: {
    curve: (t) => 0.2 + 0.12 * Math.sin(t * Math.PI * 2) + 0.08 * Math.cos(t * Math.PI * 3.5),
    climaxPoint: 0.35,
  },
  gospel: {
    curve: (t) => {
      if (t < 0.3) return 0.3 + t * 1.5;
      if (t < 0.7) return 0.75 + Math.sin((t - 0.3) / 0.4 * Math.PI) * 0.25;
      return 0.7 + (1 - t) * 0.3;
    },
    climaxPoint: 0.65,
  },
  late_night: {
    curve: (t) => 0.25 + 0.2 * Math.sin(t * Math.PI) + 0.1 * Math.sin(t * Math.PI * 2.5),
    climaxPoint: 0.45,
  },
  afrobeat: {
    curve: (t) => {
      if (t < 0.2) return 0.4 + t * 1.5;
      if (t < 0.6) return 0.7;
      if (t < 0.85) return 0.7 + (t - 0.6) * 1.2;
      return 0.95 - (t - 0.85) * 2;
    },
    climaxPoint: 0.8,
  },
  contemporary_rnb: {
    curve: (t) => {
      if (t < 0.3) return 0.3 + t * 0.5;
      if (t < 0.5) return 0.45 + (t - 0.3) * 2;
      if (t < 0.75) return 0.85;
      return 0.85 - (t - 0.75) * 2;
    },
    climaxPoint: 0.6,
  },
};

export function generateTensionArc(params: CompositionParams): StyleTensionPoint[] {
  const totalBeats = params.measures * params.timeSignature[0];
  const profile = STYLE_TENSION[params.style] ?? STYLE_TENSION.classical;
  const points: StyleTensionPoint[] = [];

  const resolution = 0.5;

  for (let beat = 0; beat < totalBeats; beat += resolution) {
    const t = beat / totalBeats;
    const baseTension = profile.curve(t);
    const expressScale = params.expressiveness / 10;
    const tension = Math.max(0, Math.min(1, baseTension));
    const harmonicDensity = 0.6 + tension * 0.8 * expressScale;
    const rhythmicActivity = 0.5 + tension * 1.0 * expressScale;
    const dynamicLevel = 0.5 + tension * 0.8 * expressScale;

    points.push({ beat, tension, harmonicDensity, rhythmicActivity, dynamicLevel });
  }

  return points;
}

export function getTensionAt(arc: StyleTensionPoint[], beat: number): StyleTensionPoint {
  if (arc.length === 0) {
    return { beat, tension: 0.5, harmonicDensity: 1, rhythmicActivity: 1, dynamicLevel: 1 };
  }

  let low = 0;
  let high = arc.length - 1;
  while (low < high - 1) {
    const mid = Math.floor((low + high) / 2);
    if (arc[mid].beat <= beat) low = mid;
    else high = mid;
  }

  if (high >= arc.length) return arc[arc.length - 1];
  if (arc[low].beat === beat) return arc[low];

  const a = arc[low];
  const b = arc[high];
  const frac = (beat - a.beat) / (b.beat - a.beat);

  return {
    beat,
    tension: a.tension + (b.tension - a.tension) * frac,
    harmonicDensity: a.harmonicDensity + (b.harmonicDensity - a.harmonicDensity) * frac,
    rhythmicActivity: a.rhythmicActivity + (b.rhythmicActivity - a.rhythmicActivity) * frac,
    dynamicLevel: a.dynamicLevel + (b.dynamicLevel - a.dynamicLevel) * frac,
  };
}

// Section-based tension curve (used by sections.ts / countermelody.ts)

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
      const t = (beat - a.beat) / (b.beat - a.beat);
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
