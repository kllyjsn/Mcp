import type { Note, CompositionStyle } from '../types/music';
import type { TensionCurve } from './tension';
import { tensionAtBeat } from './tension';

interface HumanizeOptions {
  timingJitter: number;     // max beat offset (e.g. 0.02 = subtle, 0.06 = loose)
  velocitySpread: number;   // random velocity variation range
  swingAmount: number;      // 0 = straight, 0.5 = hard swing (offbeat delay)
  driftRate: number;        // slow tempo micro-drift per phrase
  accentDownbeats: boolean; // slightly louder on beats 1 & 3
  ghostNoteChance: number;  // probability of converting weak-beat notes to ghost velocity
  rubato: number;           // 0-1 expressive timing push/pull within phrases
  articulationVariance: number; // 0-1 variation in note length (legato ↔ staccato)
}

const STYLE_HUMANIZE: Record<CompositionStyle, HumanizeOptions> = {
  classical:     { timingJitter: 0.012, velocitySpread: 8,  swingAmount: 0,    driftRate: 0.003, accentDownbeats: true,  ghostNoteChance: 0,    rubato: 0.15, articulationVariance: 0.1 },
  romantic:      { timingJitter: 0.02,  velocitySpread: 14, swingAmount: 0,    driftRate: 0.006, accentDownbeats: true,  ghostNoteChance: 0,    rubato: 0.35, articulationVariance: 0.2 },
  impressionist: { timingJitter: 0.025, velocitySpread: 12, swingAmount: 0,    driftRate: 0.008, accentDownbeats: false, ghostNoteChance: 0,    rubato: 0.3,  articulationVariance: 0.25 },
  jazz:          { timingJitter: 0.03,  velocitySpread: 18, swingAmount: 0.33, driftRate: 0.004, accentDownbeats: false, ghostNoteChance: 0.15, rubato: 0.2,  articulationVariance: 0.15 },
  neo_soul:      { timingJitter: 0.035, velocitySpread: 16, swingAmount: 0.25, driftRate: 0.005, accentDownbeats: false, ghostNoteChance: 0.12, rubato: 0.25, articulationVariance: 0.18 },
  ambient:       { timingJitter: 0.04,  velocitySpread: 10, swingAmount: 0,    driftRate: 0.01,  accentDownbeats: false, ghostNoteChance: 0,    rubato: 0.4,  articulationVariance: 0.3 },
  minimalist:    { timingJitter: 0.008, velocitySpread: 6,  swingAmount: 0,    driftRate: 0.002, accentDownbeats: false, ghostNoteChance: 0,    rubato: 0.05, articulationVariance: 0.05 },
  cinematic:     { timingJitter: 0.018, velocitySpread: 12, swingAmount: 0,    driftRate: 0.005, accentDownbeats: true,  ghostNoteChance: 0,    rubato: 0.25, articulationVariance: 0.2 },
  electronic:    { timingJitter: 0.005, velocitySpread: 4,  swingAmount: 0,    driftRate: 0.001, accentDownbeats: false, ghostNoteChance: 0,    rubato: 0.02, articulationVariance: 0.03 },
  bossa_nova:    { timingJitter: 0.025, velocitySpread: 14, swingAmount: 0.18, driftRate: 0.004, accentDownbeats: false, ghostNoteChance: 0.1,  rubato: 0.2,  articulationVariance: 0.12 },
  lo_fi:         { timingJitter: 0.04,  velocitySpread: 20, swingAmount: 0.28, driftRate: 0.008, accentDownbeats: false, ghostNoteChance: 0.18, rubato: 0.35, articulationVariance: 0.22 },
  gospel:        { timingJitter: 0.02,  velocitySpread: 16, swingAmount: 0.15, driftRate: 0.004, accentDownbeats: true,  ghostNoteChance: 0.08, rubato: 0.18, articulationVariance: 0.12 },
};

function gaussianRandom(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function applySwing(startBeat: number, swingAmount: number, beatsPerBar: number): number {
  if (swingAmount === 0) return startBeat;

  const posInBeat = startBeat % 1;
  const isOffbeat = posInBeat >= 0.4 && posInBeat <= 0.6;

  if (isOffbeat) {
    const barPos = startBeat % beatsPerBar;
    const isWeakBeat = barPos >= 1 && barPos < 2 || barPos >= 3;
    const swing = isWeakBeat ? swingAmount * 0.15 : swingAmount * 0.12;
    return startBeat + swing;
  }

  return startBeat;
}

/**
 * Rubato: expressive push/pull around the beat. Phrases lean forward
 * at high tension and settle back at low tension.
 */
function applyRubato(
  startBeat: number,
  rubatoAmount: number,
  tension: TensionCurve | undefined,
  phraseLength: number,
): number {
  if (rubatoAmount === 0 || !tension) return startBeat;

  const t = tensionAtBeat(tension, startBeat);
  const phrasePos = (startBeat % phraseLength) / phraseLength;

  // Push forward (anticipate) at high tension, lay back at low tension
  const push = (t - 0.5) * rubatoAmount * 0.04;

  // Slight deceleration toward phrase ends (ritardando feel)
  const ritard = phrasePos > 0.8 ? (phrasePos - 0.8) * rubatoAmount * 0.02 : 0;

  return startBeat + push + ritard;
}

export function humanizeTrack(
  notes: Note[],
  style: CompositionStyle,
  trackName: string,
  beatsPerBar: number = 4,
  tension?: TensionCurve,
): Note[] {
  const opts = STYLE_HUMANIZE[style] ?? STYLE_HUMANIZE.classical;

  if (trackName === 'Drums') {
    return humanizeDrums(notes, opts, beatsPerBar, tension);
  }

  let phraseDrift = 0;
  const phraseLength = beatsPerBar * 4;

  return notes.map((note, i) => {
    if (i % 16 === 0) {
      phraseDrift = gaussianRandom() * opts.driftRate;
    }

    let newStart = note.startBeat + gaussianRandom() * opts.timingJitter + phraseDrift;
    newStart = applySwing(newStart, opts.swingAmount, beatsPerBar);
    newStart = applyRubato(newStart, opts.rubato, tension, phraseLength);
    newStart = Math.max(0, newStart);

    let newVelocity = note.velocity + Math.round(gaussianRandom() * opts.velocitySpread);

    if (opts.accentDownbeats) {
      const barPos = note.startBeat % beatsPerBar;
      if (barPos < 0.1) newVelocity += 8;
      else if (Math.abs(barPos - 2) < 0.1) newVelocity += 4;
    }

    // Melodic peak accent: if this note is higher than neighbors, accent it
    if (i > 0 && i < notes.length - 1) {
      if (note.pitch > notes[i - 1].pitch && note.pitch > notes[i + 1].pitch) {
        newVelocity += 6;
      }
    }

    if (opts.ghostNoteChance > 0) {
      const barPos = note.startBeat % 1;
      const isWeak = barPos > 0.2 && barPos < 0.8;
      if (isWeak && Math.random() < opts.ghostNoteChance) {
        newVelocity = Math.round(newVelocity * 0.45);
      }
    }

    newVelocity = Math.max(20, Math.min(127, newVelocity));

    // Articulation variance: slightly longer/shorter notes for natural feel
    const artVariance = 1 + gaussianRandom() * opts.articulationVariance * 0.15;
    const durationJitter = 1 + gaussianRandom() * 0.03;
    const newDuration = Math.max(0.05, note.duration * durationJitter * artVariance);

    return {
      ...note,
      startBeat: newStart,
      velocity: newVelocity,
      duration: newDuration,
    };
  });
}

function humanizeDrums(
  notes: Note[],
  opts: HumanizeOptions,
  beatsPerBar: number,
  tension?: TensionCurve,
): Note[] {
  const KICK = 36;
  const SNARE = 38;
  const HIHAT_CLOSED = 42;

  return notes.map(note => {
    const jitterScale = note.pitch === KICK ? 0.4 : note.pitch === SNARE ? 0.6 : 1.0;
    let newStart = note.startBeat + gaussianRandom() * opts.timingJitter * jitterScale;
    newStart = applySwing(newStart, opts.swingAmount, beatsPerBar);
    newStart = Math.max(0, newStart);

    let newVelocity = note.velocity + Math.round(gaussianRandom() * opts.velocitySpread * 0.7);

    if (note.pitch === HIHAT_CLOSED) {
      const isOffbeat = note.startBeat % 1 > 0.3;
      if (isOffbeat) newVelocity = Math.round(newVelocity * 0.7);
    }

    // Tension-aware drum dynamics: build intensity
    if (tension) {
      const t = tensionAtBeat(tension, note.startBeat);
      newVelocity += Math.round((t - 0.5) * 10);
    }

    newVelocity = Math.max(15, Math.min(127, newVelocity));

    return { ...note, startBeat: newStart, velocity: newVelocity };
  });
}
