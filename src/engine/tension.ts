import type { CompositionParams, CompositionStyle } from '../types/music';

export interface TensionPoint {
  beat: number;
  tension: number;       // 0-1: overall tension level
  harmonicDensity: number; // multiplier for chord complexity
  rhythmicActivity: number; // multiplier for note density
  dynamicLevel: number;    // multiplier for velocity
}

interface TensionProfile {
  curve: (t: number) => number;
  climaxPoint: number; // 0-1 position of peak tension
}

const STYLE_TENSION: Record<CompositionStyle, TensionProfile> = {
  classical: {
    curve: (t) => {
      // Sonata-form: exposition → development (tension rise) → recapitulation
      if (t < 0.3) return 0.3 + t * 0.5;
      if (t < 0.7) return 0.45 + Math.sin((t - 0.3) / 0.4 * Math.PI) * 0.55;
      return 0.8 - (t - 0.7) * 2;
    },
    climaxPoint: 0.6,
  },
  romantic: {
    curve: (t) => {
      // Long arc with dramatic climax at ~75%
      return 0.2 + 0.6 * Math.pow(Math.sin(t * Math.PI * 0.85), 1.5) + t * 0.2;
    },
    climaxPoint: 0.75,
  },
  impressionist: {
    curve: (t) => {
      // Gentle undulations, no dramatic peaks
      return 0.3 + 0.25 * Math.sin(t * Math.PI * 2) + 0.15 * Math.sin(t * Math.PI * 3.7);
    },
    climaxPoint: 0.5,
  },
  jazz: {
    curve: (t) => {
      // Loose tension — builds through the head, peaks in solo section
      if (t < 0.25) return 0.3 + t * 0.8;
      if (t < 0.75) return 0.5 + Math.sin((t - 0.25) * Math.PI * 2) * 0.3;
      return 0.6 - (t - 0.75) * 1.2;
    },
    climaxPoint: 0.55,
  },
  neo_soul: {
    curve: (t) => {
      // Laid-back groove with subtle build
      return 0.35 + 0.3 * Math.sin(t * Math.PI) + 0.1 * Math.sin(t * Math.PI * 3);
    },
    climaxPoint: 0.5,
  },
  ambient: {
    curve: (t) => {
      // Very gentle, almost flat with slow drift
      return 0.2 + 0.15 * Math.sin(t * Math.PI * 0.8) + 0.05 * Math.cos(t * Math.PI * 2.3);
    },
    climaxPoint: 0.4,
  },
  minimalist: {
    curve: (t) => {
      // Gradual, linear build — process music
      return 0.15 + t * 0.65;
    },
    climaxPoint: 0.85,
  },
  cinematic: {
    curve: (t) => {
      // Dramatic arc with powerful climax
      if (t < 0.15) return 0.1 + t * 2;
      if (t < 0.65) return 0.4 + (t - 0.15) * 1.0;
      if (t < 0.8) return 0.9 + Math.sin((t - 0.65) / 0.15 * Math.PI * 0.5) * 0.1;
      return 1.0 - (t - 0.8) * 3.5;
    },
    climaxPoint: 0.78,
  },
  electronic: {
    curve: (t) => {
      // Build-drop-build pattern
      const cycle = t * 2;
      if (cycle < 1) return 0.3 + cycle * 0.7;
      return 0.4 + (cycle - 1) * 0.6;
    },
    climaxPoint: 0.5,
  },
  bossa_nova: {
    curve: (t) => {
      // Relaxed, nearly constant with gentle sway
      return 0.3 + 0.15 * Math.sin(t * Math.PI * 1.5) + 0.05 * Math.cos(t * Math.PI * 4);
    },
    climaxPoint: 0.4,
  },
  lo_fi: {
    curve: (t) => {
      // Chill — low tension throughout, gentle waves
      return 0.2 + 0.12 * Math.sin(t * Math.PI * 2) + 0.08 * Math.cos(t * Math.PI * 3.5);
    },
    climaxPoint: 0.35,
  },
  gospel: {
    curve: (t) => {
      // Builds to joyful climax, stays elevated
      if (t < 0.3) return 0.3 + t * 1.5;
      if (t < 0.7) return 0.75 + Math.sin((t - 0.3) / 0.4 * Math.PI) * 0.25;
      return 0.7 + (1 - t) * 0.3;
    },
    climaxPoint: 0.65,
  },
  late_night: {
    curve: (t) => {
      // Intimate — starts warm, gentle ebb and flow, never too loud
      return 0.25 + 0.2 * Math.sin(t * Math.PI) + 0.1 * Math.sin(t * Math.PI * 2.5);
    },
    climaxPoint: 0.45,
  },
  afrobeat: {
    curve: (t) => {
      // Polyrhythmic energy build — relentless rise with plateaus
      if (t < 0.2) return 0.4 + t * 1.5;
      if (t < 0.6) return 0.7;
      if (t < 0.85) return 0.7 + (t - 0.6) * 1.2;
      return 0.95 - (t - 0.85) * 2;
    },
    climaxPoint: 0.8,
  },
  contemporary_rnb: {
    curve: (t) => {
      // Modern production arc — verse chill, chorus lift, bridge peak
      if (t < 0.3) return 0.3 + t * 0.5;
      if (t < 0.5) return 0.45 + (t - 0.3) * 2;
      if (t < 0.75) return 0.85;
      return 0.85 - (t - 0.75) * 2;
    },
    climaxPoint: 0.6,
  },
};

export function generateTensionArc(params: CompositionParams): TensionPoint[] {
  const totalBeats = params.measures * params.timeSignature[0];
  const profile = STYLE_TENSION[params.style] ?? STYLE_TENSION.classical;
  const points: TensionPoint[] = [];

  const resolution = 0.5; // tension point every half-beat

  for (let beat = 0; beat < totalBeats; beat += resolution) {
    const t = beat / totalBeats;
    const baseTension = profile.curve(t);

    // Expressiveness scales how much the tension arc actually affects output
    const expressScale = params.expressiveness / 10;

    const tension = Math.max(0, Math.min(1, baseTension));
    const harmonicDensity = 0.6 + tension * 0.8 * expressScale;
    const rhythmicActivity = 0.5 + tension * 1.0 * expressScale;
    const dynamicLevel = 0.5 + tension * 0.8 * expressScale;

    points.push({ beat, tension, harmonicDensity, rhythmicActivity, dynamicLevel });
  }

  return points;
}

export function getTensionAt(arc: TensionPoint[], beat: number): TensionPoint {
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

  // Linear interpolation between points
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
