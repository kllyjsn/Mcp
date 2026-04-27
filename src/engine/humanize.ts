import type { Note, CompositionStyle } from '../types/music';

interface HumanizeOptions {
  timingJitter: number;     // max beat offset (e.g. 0.02 = subtle, 0.06 = loose)
  velocitySpread: number;   // random velocity variation range
  swingAmount: number;      // 0 = straight, 0.5 = hard swing (offbeat delay)
  driftRate: number;        // slow tempo micro-drift per phrase
  accentDownbeats: boolean; // slightly louder on beats 1 & 3
  ghostNoteChance: number;  // probability of converting weak-beat notes to ghost velocity
  rubato: number;           // 0 = metronomic, 0.05 = romantic push/pull
  breathPhraseLen: number;  // natural phrasing breath every N beats (0 = disabled)
  laidBack: number;         // 0 = on top, 0.03 = behind the beat (pocket feel)
}

const STYLE_HUMANIZE: Record<CompositionStyle, HumanizeOptions> = {
  classical:     { timingJitter: 0.012, velocitySpread: 8,  swingAmount: 0,    driftRate: 0.003, accentDownbeats: true,  ghostNoteChance: 0,    rubato: 0.02,  breathPhraseLen: 8,  laidBack: 0 },
  romantic:      { timingJitter: 0.02,  velocitySpread: 14, swingAmount: 0,    driftRate: 0.006, accentDownbeats: true,  ghostNoteChance: 0,    rubato: 0.045, breathPhraseLen: 4,  laidBack: 0 },
  impressionist: { timingJitter: 0.025, velocitySpread: 12, swingAmount: 0,    driftRate: 0.008, accentDownbeats: false, ghostNoteChance: 0,    rubato: 0.035, breathPhraseLen: 8,  laidBack: 0.01 },
  jazz:          { timingJitter: 0.03,  velocitySpread: 18, swingAmount: 0.33, driftRate: 0.004, accentDownbeats: false, ghostNoteChance: 0.15, rubato: 0.01,  breathPhraseLen: 0,  laidBack: 0.02 },
  neo_soul:      { timingJitter: 0.035, velocitySpread: 16, swingAmount: 0.25, driftRate: 0.005, accentDownbeats: false, ghostNoteChance: 0.12, rubato: 0,     breathPhraseLen: 0,  laidBack: 0.025 },
  ambient:       { timingJitter: 0.04,  velocitySpread: 10, swingAmount: 0,    driftRate: 0.01,  accentDownbeats: false, ghostNoteChance: 0,    rubato: 0.05,  breathPhraseLen: 16, laidBack: 0 },
  minimalist:    { timingJitter: 0.008, velocitySpread: 6,  swingAmount: 0,    driftRate: 0.002, accentDownbeats: false, ghostNoteChance: 0,    rubato: 0.005, breathPhraseLen: 0,  laidBack: 0 },
  cinematic:     { timingJitter: 0.018, velocitySpread: 12, swingAmount: 0,    driftRate: 0.005, accentDownbeats: true,  ghostNoteChance: 0,    rubato: 0.03,  breathPhraseLen: 8,  laidBack: 0 },
  electronic:    { timingJitter: 0.005, velocitySpread: 4,  swingAmount: 0,    driftRate: 0.001, accentDownbeats: false, ghostNoteChance: 0,    rubato: 0,     breathPhraseLen: 0,  laidBack: 0 },
  bossa_nova:    { timingJitter: 0.025, velocitySpread: 14, swingAmount: 0.18, driftRate: 0.004, accentDownbeats: false, ghostNoteChance: 0.1,  rubato: 0.015, breathPhraseLen: 0,  laidBack: 0.015 },
  lo_fi:         { timingJitter: 0.04,  velocitySpread: 20, swingAmount: 0.28, driftRate: 0.008, accentDownbeats: false, ghostNoteChance: 0.18, rubato: 0.01,  breathPhraseLen: 0,  laidBack: 0.03 },
  gospel:        { timingJitter: 0.02,  velocitySpread: 16, swingAmount: 0.15, driftRate: 0.004, accentDownbeats: true,  ghostNoteChance: 0.08, rubato: 0.01,  breathPhraseLen: 0,  laidBack: 0.01 },
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

export function humanizeTrack(
  notes: Note[],
  style: CompositionStyle,
  trackName: string,
  beatsPerBar: number = 4,
): Note[] {
  const opts = STYLE_HUMANIZE[style] ?? STYLE_HUMANIZE.classical;

  if (trackName === 'Drums') {
    return humanizeDrums(notes, opts, beatsPerBar);
  }

  let phraseDrift = 0;
  const rubatoPhase = Math.random() * Math.PI * 2;

  return notes.map((note, i) => {
    if (i % 16 === 0) {
      phraseDrift = gaussianRandom() * opts.driftRate;
    }

    // Rubato — gentle push/pull that follows a sinusoidal curve over phrases
    let rubatoOffset = 0;
    if (opts.rubato > 0) {
      const phrasePos = opts.breathPhraseLen > 0
        ? (note.startBeat % opts.breathPhraseLen) / opts.breathPhraseLen
        : note.startBeat / (beatsPerBar * 4);
      rubatoOffset = Math.sin(phrasePos * Math.PI * 2 + rubatoPhase) * opts.rubato;
    }

    let newStart = note.startBeat + gaussianRandom() * opts.timingJitter + phraseDrift + rubatoOffset + opts.laidBack;
    newStart = applySwing(newStart, opts.swingAmount, beatsPerBar);
    newStart = Math.max(0, newStart);

    let newVelocity = note.velocity + Math.round(gaussianRandom() * opts.velocitySpread);

    if (opts.accentDownbeats) {
      const barPos = note.startBeat % beatsPerBar;
      if (barPos < 0.1) newVelocity += 8;
      else if (Math.abs(barPos - 2) < 0.1) newVelocity += 4;
    }

    // Phrase breathing — slight diminuendo at phrase boundaries
    if (opts.breathPhraseLen > 0) {
      const posInPhrase = note.startBeat % opts.breathPhraseLen;
      const nearEnd = posInPhrase > opts.breathPhraseLen * 0.85;
      if (nearEnd) {
        newVelocity = Math.round(newVelocity * 0.88);
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

    const durationJitter = 1 + gaussianRandom() * 0.03;
    const newDuration = Math.max(0.05, note.duration * durationJitter);

    return {
      ...note,
      startBeat: newStart,
      velocity: newVelocity,
      duration: newDuration,
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
