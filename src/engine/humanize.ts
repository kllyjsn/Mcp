import type { Note, CompositionStyle } from '../types/music';

interface HumanizeOptions {
  timingJitter: number;
  velocitySpread: number;
  swingAmount: number;
  driftRate: number;
  accentDownbeats: boolean;
  ghostNoteChance: number;
  rubatoAmount: number;
  articulationVariety: number;
}

const STYLE_HUMANIZE: Record<CompositionStyle, HumanizeOptions> = {
  classical:     { timingJitter: 0.012, velocitySpread: 8,  swingAmount: 0,    driftRate: 0.003, accentDownbeats: true,  ghostNoteChance: 0,    rubatoAmount: 0.02,  articulationVariety: 0.3 },
  romantic:      { timingJitter: 0.02,  velocitySpread: 14, swingAmount: 0,    driftRate: 0.006, accentDownbeats: true,  ghostNoteChance: 0,    rubatoAmount: 0.06,  articulationVariety: 0.5 },
  impressionist: { timingJitter: 0.025, velocitySpread: 12, swingAmount: 0,    driftRate: 0.008, accentDownbeats: false, ghostNoteChance: 0,    rubatoAmount: 0.05,  articulationVariety: 0.4 },
  jazz:          { timingJitter: 0.03,  velocitySpread: 18, swingAmount: 0.33, driftRate: 0.004, accentDownbeats: false, ghostNoteChance: 0.15, rubatoAmount: 0.03,  articulationVariety: 0.6 },
  neo_soul:      { timingJitter: 0.035, velocitySpread: 16, swingAmount: 0.25, driftRate: 0.005, accentDownbeats: false, ghostNoteChance: 0.12, rubatoAmount: 0.04,  articulationVariety: 0.5 },
  ambient:       { timingJitter: 0.04,  velocitySpread: 10, swingAmount: 0,    driftRate: 0.01,  accentDownbeats: false, ghostNoteChance: 0,    rubatoAmount: 0.08,  articulationVariety: 0.2 },
  minimalist:    { timingJitter: 0.008, velocitySpread: 6,  swingAmount: 0,    driftRate: 0.002, accentDownbeats: false, ghostNoteChance: 0,    rubatoAmount: 0.01,  articulationVariety: 0.1 },
  cinematic:     { timingJitter: 0.018, velocitySpread: 12, swingAmount: 0,    driftRate: 0.005, accentDownbeats: true,  ghostNoteChance: 0,    rubatoAmount: 0.04,  articulationVariety: 0.4 },
  electronic:    { timingJitter: 0.005, velocitySpread: 4,  swingAmount: 0,    driftRate: 0.001, accentDownbeats: false, ghostNoteChance: 0,    rubatoAmount: 0,     articulationVariety: 0.1 },
  bossa_nova:    { timingJitter: 0.025, velocitySpread: 14, swingAmount: 0.18, driftRate: 0.004, accentDownbeats: false, ghostNoteChance: 0.1,  rubatoAmount: 0.03,  articulationVariety: 0.4 },
  lo_fi:         { timingJitter: 0.04,  velocitySpread: 20, swingAmount: 0.28, driftRate: 0.008, accentDownbeats: false, ghostNoteChance: 0.18, rubatoAmount: 0.05,  articulationVariety: 0.3 },
  gospel:        { timingJitter: 0.02,  velocitySpread: 16, swingAmount: 0.15, driftRate: 0.004, accentDownbeats: true,  ghostNoteChance: 0.08, rubatoAmount: 0.03,  articulationVariety: 0.5 },
  listening_room:{ timingJitter: 0.028, velocitySpread: 20, swingAmount: 0.2,  driftRate: 0.006, accentDownbeats: false, ghostNoteChance: 0.12, rubatoAmount: 0.07,  articulationVariety: 0.7 },
  modal_jazz:    { timingJitter: 0.03,  velocitySpread: 22, swingAmount: 0.3,  driftRate: 0.005, accentDownbeats: false, ghostNoteChance: 0.18, rubatoAmount: 0.05,  articulationVariety: 0.6 },
  chamber:       { timingJitter: 0.015, velocitySpread: 10, swingAmount: 0,    driftRate: 0.004, accentDownbeats: true,  ghostNoteChance: 0,    rubatoAmount: 0.06,  articulationVariety: 0.5 },
  trip_hop:      { timingJitter: 0.035, velocitySpread: 14, swingAmount: 0.22, driftRate: 0.007, accentDownbeats: false, ghostNoteChance: 0.15, rubatoAmount: 0.04,  articulationVariety: 0.3 },
  r_and_b:       { timingJitter: 0.025, velocitySpread: 16, swingAmount: 0.2,  driftRate: 0.004, accentDownbeats: true,  ghostNoteChance: 0.1,  rubatoAmount: 0.03,  articulationVariety: 0.5 },
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

function applyRubato(startBeat: number, _totalBeats: number, rubatoAmount: number): number {
  if (rubatoAmount === 0) return startBeat;
  const phrasePos = (startBeat % 16) / 16;
  const rubatoWave = Math.sin(phrasePos * Math.PI * 2) * rubatoAmount;
  const cadenceSlowdown = phrasePos > 0.85 ? rubatoAmount * 0.5 * (phrasePos - 0.85) / 0.15 : 0;
  return startBeat + rubatoWave + cadenceSlowdown + gaussianRandom() * rubatoAmount * 0.2;
}

type Articulation = 'legato' | 'staccato' | 'tenuto' | 'accent' | 'normal';

function chooseArticulation(
  beatPos: number,
  variety: number,
  beatsPerBar: number,
): Articulation {
  if (Math.random() > variety) return 'normal';

  const barPos = beatPos % beatsPerBar;
  const r = Math.random();

  if (barPos < 0.1 && r > 0.6) return 'accent';
  if (r < 0.15) return 'staccato';
  if (r < 0.35) return 'tenuto';
  if (r < 0.55) return 'legato';
  return 'normal';
}

function articulationDurationMod(art: Articulation): number {
  switch (art) {
    case 'staccato': return 0.45;
    case 'tenuto': return 1.1;
    case 'legato': return 1.05;
    case 'accent': return 0.85;
    default: return 1.0;
  }
}

function articulationVelocityMod(art: Articulation): number {
  switch (art) {
    case 'staccato': return 0.85;
    case 'accent': return 1.2;
    case 'tenuto': return 1.05;
    default: return 1.0;
  }
}

export function humanizeTrack(
  notes: Note[],
  style: CompositionStyle,
  trackName: string,
  beatsPerBar: number = 4,
): Note[] {
  const opts = STYLE_HUMANIZE[style] ?? STYLE_HUMANIZE.classical;
  const totalBeats = notes.length > 0
    ? Math.max(...notes.map(n => n.startBeat + n.duration))
    : 0;

  if (trackName === 'Drums') {
    return humanizeDrums(notes, opts, beatsPerBar);
  }

  let phraseDrift = 0;

  return notes.map((note, i) => {
    if (i % 16 === 0) {
      phraseDrift = gaussianRandom() * opts.driftRate;
    }

    let newStart = note.startBeat + gaussianRandom() * opts.timingJitter + phraseDrift;
    newStart = applySwing(newStart, opts.swingAmount, beatsPerBar);
    newStart = applyRubato(newStart, totalBeats, opts.rubatoAmount);
    newStart = Math.max(0, newStart);

    let newVelocity = note.velocity + Math.round(gaussianRandom() * opts.velocitySpread);

    if (opts.accentDownbeats) {
      const barPos = note.startBeat % beatsPerBar;
      if (barPos < 0.1) newVelocity += 8;
      else if (Math.abs(barPos - 2) < 0.1) newVelocity += 4;
    }

    if (opts.ghostNoteChance > 0) {
      const barPos = note.startBeat % 1;
      const isWeak = barPos > 0.2 && barPos < 0.8;
      if (isWeak && Math.random() < opts.ghostNoteChance) {
        newVelocity = Math.round(newVelocity * 0.45);
      }
    }

    const art = chooseArticulation(note.startBeat, opts.articulationVariety, beatsPerBar);
    newVelocity = Math.round(newVelocity * articulationVelocityMod(art));
    newVelocity = Math.max(20, Math.min(127, newVelocity));

    const baseDurJitter = 1 + gaussianRandom() * 0.03;
    const artMod = articulationDurationMod(art);
    const newDuration = Math.max(0.05, note.duration * baseDurJitter * artMod);

    return {
      ...note,
      startBeat: newStart,
      velocity: newVelocity,
      duration: newDuration,
      articulation: art,
    };
  });
}

function humanizeDrums(notes: Note[], opts: HumanizeOptions, beatsPerBar: number): Note[] {
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

    newVelocity = Math.max(15, Math.min(127, newVelocity));

    return { ...note, startBeat: newStart, velocity: newVelocity };
  });
}
