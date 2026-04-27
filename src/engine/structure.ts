import type { CompositionStyle, Section } from '../types/music';

type FormType = 'aaba' | 'verse_chorus' | 'aba' | 'through' | 'rondo';

const STYLE_FORMS: Record<CompositionStyle, FormType> = {
  classical: 'aba',
  romantic: 'aba',
  impressionist: 'through',
  jazz: 'aaba',
  neo_soul: 'verse_chorus',
  bossa_nova: 'aaba',
  lo_fi: 'verse_chorus',
  gospel: 'verse_chorus',
  ambient: 'through',
  minimalist: 'through',
  cinematic: 'through',
  electronic: 'verse_chorus',
};

const ALL_VOICES_ON: Record<string, boolean> = {
  melody: true, harmony: true, bass: true,
  arpeggio: true, drums: true, counter: true,
};

function full(): Record<string, boolean> { return { ...ALL_VOICES_ON }; }

function sparse(extra?: Partial<Record<string, boolean>>): Record<string, boolean> {
  return { melody: true, harmony: false, bass: true, arpeggio: false, drums: false, counter: false, ...extra };
}

function medium(extra?: Partial<Record<string, boolean>>): Record<string, boolean> {
  return { melody: true, harmony: true, bass: true, arpeggio: false, drums: true, counter: false, ...extra };
}

function distribute(total: number, parts: number): number[] {
  const base = Math.floor(total / parts);
  const remainder = total % parts;
  return Array.from({ length: parts }, (_, i) => base + (i < remainder ? 1 : 0));
}

function buildAABA(totalMeasures: number): Section[] {
  const sections: Section[] = [];
  const [a1, a2, b, a3] = distribute(totalMeasures, 4);
  let m = 0;

  sections.push({ label: 'A', startMeasure: m, measures: a1, energy: 0.6, densityMod: 0.9, complexityMod: 1, activeVoices: medium() });
  m += a1;
  sections.push({ label: 'A\u2032', startMeasure: m, measures: a2, energy: 0.7, densityMod: 1, complexityMod: 1, activeVoices: medium({ arpeggio: true }) });
  m += a2;
  sections.push({ label: 'B', startMeasure: m, measures: b, energy: 0.85, densityMod: 1.1, complexityMod: 1.2, activeVoices: full() });
  m += b;
  sections.push({ label: 'A\u2033', startMeasure: m, measures: a3, energy: 0.65, densityMod: 0.95, complexityMod: 1, activeVoices: medium({ counter: true }) });

  return sections;
}

function buildVerseChorus(totalMeasures: number): Section[] {
  const sections: Section[] = [];

  if (totalMeasures <= 4) {
    sections.push({ label: 'Verse', startMeasure: 0, measures: Math.ceil(totalMeasures / 2), energy: 0.5, densityMod: 0.8, complexityMod: 0.9, activeVoices: sparse({ drums: true }) });
    sections.push({ label: 'Chorus', startMeasure: Math.ceil(totalMeasures / 2), measures: Math.floor(totalMeasures / 2), energy: 0.9, densityMod: 1.15, complexityMod: 1.1, activeVoices: full() });
    return sections;
  }

  const intro = Math.max(1, Math.floor(totalMeasures * 0.1));
  const remaining = totalMeasures - intro;
  const halfRemaining = Math.floor(remaining / 2);
  const v1 = Math.ceil(halfRemaining * 0.6);
  const c1 = halfRemaining - v1;
  const v2 = Math.ceil((remaining - halfRemaining) * 0.5);
  const c2 = remaining - halfRemaining - v2;

  let m = 0;
  sections.push({ label: 'Intro', startMeasure: m, measures: intro, energy: 0.3, densityMod: 0.6, complexityMod: 0.8, activeVoices: sparse() });
  m += intro;
  sections.push({ label: 'Verse', startMeasure: m, measures: v1, energy: 0.55, densityMod: 0.85, complexityMod: 0.9, activeVoices: medium() });
  m += v1;
  sections.push({ label: 'Chorus', startMeasure: m, measures: c1, energy: 0.85, densityMod: 1.1, complexityMod: 1.1, activeVoices: full() });
  m += c1;
  sections.push({ label: 'Verse 2', startMeasure: m, measures: v2, energy: 0.6, densityMod: 0.9, complexityMod: 1, activeVoices: medium({ arpeggio: true }) });
  m += v2;
  sections.push({ label: 'Chorus 2', startMeasure: m, measures: c2, energy: 0.95, densityMod: 1.2, complexityMod: 1.15, activeVoices: full() });

  return sections;
}

function buildABA(totalMeasures: number): Section[] {
  const sections: Section[] = [];
  const [a1, b, a2] = distribute(totalMeasures, 3);
  let m = 0;

  sections.push({ label: 'A', startMeasure: m, measures: a1, energy: 0.6, densityMod: 0.9, complexityMod: 1, activeVoices: medium() });
  m += a1;
  sections.push({ label: 'B', startMeasure: m, measures: b, energy: 0.85, densityMod: 1.15, complexityMod: 1.2, activeVoices: full() });
  m += b;
  sections.push({ label: 'A\u2032', startMeasure: m, measures: a2, energy: 0.55, densityMod: 0.85, complexityMod: 0.95, activeVoices: medium({ counter: true }) });

  return sections;
}

function buildRondo(totalMeasures: number): Section[] {
  const sections: Section[] = [];
  const parts = distribute(totalMeasures, 5);
  let m = 0;

  const labels = ['A', 'B', 'A\u2032', 'C', 'A\u2033'];
  const energies = [0.6, 0.75, 0.65, 0.9, 0.7];
  const voices = [medium(), medium({ arpeggio: true }), medium(), full(), medium({ counter: true })];

  for (let i = 0; i < 5; i++) {
    sections.push({
      label: labels[i], startMeasure: m, measures: parts[i],
      energy: energies[i], densityMod: 0.85 + energies[i] * 0.3,
      complexityMod: 0.9 + energies[i] * 0.2, activeVoices: voices[i],
    });
    m += parts[i];
  }

  return sections;
}

function buildThrough(totalMeasures: number): Section[] {
  const sections: Section[] = [];

  if (totalMeasures <= 4) {
    sections.push({ label: 'A', startMeasure: 0, measures: totalMeasures, energy: 0.7, densityMod: 1, complexityMod: 1, activeVoices: full() });
    return sections;
  }

  const third = Math.floor(totalMeasures / 3);
  const lastThird = totalMeasures - third * 2;

  let m = 0;
  sections.push({ label: 'Opening', startMeasure: m, measures: third, energy: 0.45, densityMod: 0.7, complexityMod: 0.85, activeVoices: sparse({ harmony: true }) });
  m += third;
  sections.push({ label: 'Development', startMeasure: m, measures: third, energy: 0.8, densityMod: 1.1, complexityMod: 1.2, activeVoices: full() });
  m += third;
  sections.push({ label: 'Resolution', startMeasure: m, measures: lastThird, energy: 0.55, densityMod: 0.85, complexityMod: 0.95, activeVoices: medium({ counter: true }) });

  return sections;
}

export function buildForm(totalMeasures: number, style: CompositionStyle): Section[] {
  const formType = STYLE_FORMS[style];
  switch (formType) {
    case 'aaba': return buildAABA(totalMeasures);
    case 'verse_chorus': return buildVerseChorus(totalMeasures);
    case 'aba': return buildABA(totalMeasures);
    case 'rondo': return buildRondo(totalMeasures);
    case 'through': return buildThrough(totalMeasures);
  }
}

export function getSectionAtMeasure(sections: Section[], measure: number): Section {
  for (let i = sections.length - 1; i >= 0; i--) {
    if (measure >= sections[i].startMeasure) return sections[i];
  }
  return sections[0];
}

export function getSectionAtBeat(sections: Section[], beat: number, beatsPerMeasure: number): Section {
  return getSectionAtMeasure(sections, Math.floor(beat / beatsPerMeasure));
}

export function applySectionEnergy(notes: Note[], sections: Section[], beatsPerMeasure: number): Note[] {
  return notes.map(note => {
    const section = getSectionAtBeat(sections, note.startBeat, beatsPerMeasure);
    const energyVelScale = 0.6 + section.energy * 0.4;
    return {
      ...note,
      velocity: Math.max(20, Math.min(127, Math.round(note.velocity * energyVelScale))),
    };
  });
}

export function muteInactiveSections(
  notes: Note[],
  trackName: string,
  sections: Section[],
  beatsPerMeasure: number,
): Note[] {
  const voiceKey = trackName.toLowerCase().replace(/\s+/g, '_');
  const keyMap: Record<string, string> = {
    melody: 'melody', harmony: 'harmony', bass: 'bass',
    arpeggio: 'arpeggio', drums: 'drums', counter: 'counter',
  };
  const key = keyMap[voiceKey] ?? voiceKey;

  return notes.filter(note => {
    const section = getSectionAtBeat(sections, note.startBeat, beatsPerMeasure);
    return section.activeVoices[key] !== false;
  });
}

import type { Note } from '../types/music';
