import type { Note, CompositionParams } from '../types/music';

export interface HumanizeOptions {
  swing: number;        // 0-1: shuffle feel (0.5 = straight, 0.67 = triplet swing)
  timingJitter: number; // ms of random timing deviation
  velocitySpread: number; // random velocity variance
  accentDownbeats: boolean;
}

const STYLE_FEEL: Record<string, HumanizeOptions> = {
  classical:     { swing: 0, timingJitter: 0.008, velocitySpread: 8, accentDownbeats: true },
  romantic:      { swing: 0, timingJitter: 0.015, velocitySpread: 14, accentDownbeats: true },
  impressionist: { swing: 0, timingJitter: 0.02, velocitySpread: 12, accentDownbeats: false },
  jazz:          { swing: 0.62, timingJitter: 0.025, velocitySpread: 18, accentDownbeats: false },
  neo_soul:      { swing: 0.58, timingJitter: 0.02, velocitySpread: 16, accentDownbeats: false },
  ambient:       { swing: 0, timingJitter: 0.03, velocitySpread: 10, accentDownbeats: false },
  minimalist:    { swing: 0, timingJitter: 0.005, velocitySpread: 4, accentDownbeats: true },
  cinematic:     { swing: 0, timingJitter: 0.012, velocitySpread: 12, accentDownbeats: true },
  electronic:    { swing: 0.52, timingJitter: 0.01, velocitySpread: 6, accentDownbeats: true },
};

function gaussianRandom(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

export function getStyleFeel(style: string): HumanizeOptions {
  return STYLE_FEEL[style] ?? STYLE_FEEL.classical;
}

export function humanizeNotes(
  notes: Note[],
  params: CompositionParams,
  options?: Partial<HumanizeOptions>,
): Note[] {
  const feel = { ...getStyleFeel(params.style), ...options };
  const expressScale = params.expressiveness / 10;

  return notes.map(note => {
    let { startBeat, velocity, duration } = note;

    // Swing: push offbeat eighth notes later
    if (feel.swing > 0) {
      const beatFrac = startBeat % 1;
      if (Math.abs(beatFrac - 0.5) < 0.01) {
        const swingOffset = (feel.swing - 0.5) * 0.5;
        startBeat += swingOffset * expressScale;
      }
    }

    // Micro-timing jitter (Gaussian for natural clustering)
    const jitter = gaussianRandom() * feel.timingJitter * expressScale;
    startBeat = Math.max(0, startBeat + jitter);

    // Velocity humanization
    const velJitter = Math.round(gaussianRandom() * feel.velocitySpread * expressScale);
    velocity = Math.max(20, Math.min(127, velocity + velJitter));

    // Downbeat accents
    if (feel.accentDownbeats && startBeat % params.timeSignature[0] < 0.05) {
      velocity = Math.min(127, velocity + Math.round(8 * expressScale));
    }

    // Slight duration variation for legato/staccato feel
    const durVariation = 1 + gaussianRandom() * 0.05 * expressScale;
    duration = Math.max(0.05, duration * durVariation);

    return { ...note, startBeat, velocity, duration };
  });
}

export function humanizeDrums(
  notes: Note[],
  params: CompositionParams,
): Note[] {
  const feel = getStyleFeel(params.style);
  const expressScale = params.expressiveness / 10;

  return notes.map(note => {
    let { startBeat, velocity } = note;

    // Drums get tighter timing than melodic instruments
    const jitter = gaussianRandom() * feel.timingJitter * 0.5 * expressScale;
    startBeat = Math.max(0, startBeat + jitter);

    // Ghost notes: hihat gets more velocity variance
    const isHihat = note.pitch === 42 || note.pitch === 46;
    const isKick = note.pitch === 36;
    const velSpread = isHihat ? feel.velocitySpread * 1.3 : feel.velocitySpread;
    const velJitter = Math.round(gaussianRandom() * velSpread * expressScale);
    velocity = Math.max(15, Math.min(127, velocity + velJitter));

    // Kick stays tight to grid; snare pushes slightly behind for groove
    if (!isKick && feel.swing > 0) {
      const pushBack = 0.01 * expressScale;
      startBeat += pushBack;
    }

    return { ...note, startBeat, velocity, duration: note.duration };
  });
}
