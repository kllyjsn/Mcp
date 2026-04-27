import type { CompositionStyle, Section, SectionKind } from '../types/music';

interface SectionTemplate {
  kind: SectionKind;
  /** fraction of total measures (summed later to normalize) */
  weight: number;
  tension: number;
  trackPresence: Record<string, number>;
}

const TRACK_NAMES = ['Melody', 'Harmony', 'Bass', 'Arpeggio', 'CounterMelody', 'Drums'] as const;

function tp(melody: number, harmony: number, bass: number, arp: number, counter: number, drums: number): Record<string, number> {
  return { Melody: melody, Harmony: harmony, Bass: bass, Arpeggio: arp, CounterMelody: counter, Drums: drums };
}

const STYLE_ARCS: Record<CompositionStyle, SectionTemplate[]> = {
  classical: [
    { kind: 'intro',     weight: 1, tension: 0.2, trackPresence: tp(0, 0.5, 0, 0, 0, 0) },
    { kind: 'verse',     weight: 2, tension: 0.4, trackPresence: tp(1, 0.8, 0.5, 0, 0, 0.3) },
    { kind: 'build',     weight: 1, tension: 0.6, trackPresence: tp(1, 1, 0.8, 0.5, 0.5, 0.6) },
    { kind: 'climax',    weight: 2, tension: 0.9, trackPresence: tp(1, 1, 1, 1, 1, 0.8) },
    { kind: 'outro',     weight: 2, tension: 0.3, trackPresence: tp(0.8, 0.6, 0.5, 0.3, 0, 0.3) },
  ],
  romantic: [
    { kind: 'intro',     weight: 1, tension: 0.15, trackPresence: tp(0.5, 0.3, 0, 0, 0, 0) },
    { kind: 'verse',     weight: 2, tension: 0.4,  trackPresence: tp(1, 0.7, 0.5, 0.3, 0, 0.2) },
    { kind: 'build',     weight: 2, tension: 0.7,  trackPresence: tp(1, 1, 0.8, 0.6, 0.5, 0.5) },
    { kind: 'climax',    weight: 2, tension: 1.0,  trackPresence: tp(1, 1, 1, 1, 1, 0.8) },
    { kind: 'breakdown', weight: 1, tension: 0.3,  trackPresence: tp(0.6, 0.5, 0, 0.3, 0, 0) },
    { kind: 'outro',     weight: 1, tension: 0.15, trackPresence: tp(0.5, 0.4, 0, 0, 0, 0) },
  ],
  impressionist: [
    { kind: 'intro',     weight: 2, tension: 0.15, trackPresence: tp(0, 0.5, 0, 0.5, 0, 0) },
    { kind: 'verse',     weight: 2, tension: 0.35, trackPresence: tp(0.8, 0.7, 0.4, 0.6, 0, 0.2) },
    { kind: 'build',     weight: 2, tension: 0.6,  trackPresence: tp(1, 1, 0.6, 0.8, 0.5, 0.4) },
    { kind: 'climax',    weight: 1, tension: 0.75, trackPresence: tp(1, 1, 0.8, 1, 0.7, 0.5) },
    { kind: 'outro',     weight: 2, tension: 0.1,  trackPresence: tp(0.4, 0.6, 0, 0.5, 0, 0) },
  ],
  jazz: [
    { kind: 'intro',     weight: 1, tension: 0.2,  trackPresence: tp(0, 0.5, 0.5, 0, 0, 0.6) },
    { kind: 'verse',     weight: 2, tension: 0.45, trackPresence: tp(1, 0.6, 1, 0.3, 0, 0.8) },
    { kind: 'climax',    weight: 2, tension: 0.8,  trackPresence: tp(1, 0.8, 1, 0.6, 0.7, 1) },
    { kind: 'breakdown', weight: 1, tension: 0.3,  trackPresence: tp(0.5, 0.5, 1, 0, 0.5, 0.5) },
    { kind: 'outro',     weight: 1, tension: 0.2,  trackPresence: tp(0.6, 0.5, 0.8, 0, 0, 0.5) },
  ],
  neo_soul: [
    { kind: 'intro',     weight: 1, tension: 0.15, trackPresence: tp(0, 0.6, 0.4, 0, 0, 0.4) },
    { kind: 'verse',     weight: 2, tension: 0.4,  trackPresence: tp(0.8, 0.7, 0.8, 0.3, 0, 0.7) },
    { kind: 'build',     weight: 1, tension: 0.65, trackPresence: tp(1, 0.9, 1, 0.6, 0.5, 0.9) },
    { kind: 'climax',    weight: 2, tension: 0.85, trackPresence: tp(1, 1, 1, 0.8, 0.8, 1) },
    { kind: 'breakdown', weight: 1, tension: 0.3,  trackPresence: tp(0.5, 0.5, 0.6, 0.3, 0, 0.3) },
    { kind: 'outro',     weight: 1, tension: 0.2,  trackPresence: tp(0.6, 0.6, 0.5, 0, 0, 0.4) },
  ],
  ambient: [
    { kind: 'intro',     weight: 2, tension: 0.05, trackPresence: tp(0, 0.4, 0, 0.3, 0, 0) },
    { kind: 'verse',     weight: 3, tension: 0.25, trackPresence: tp(0.5, 0.7, 0.3, 0.6, 0, 0.1) },
    { kind: 'climax',    weight: 2, tension: 0.5,  trackPresence: tp(0.7, 1, 0.5, 0.8, 0.4, 0.2) },
    { kind: 'outro',     weight: 2, tension: 0.1,  trackPresence: tp(0.3, 0.5, 0, 0.5, 0, 0) },
  ],
  minimalist: [
    { kind: 'intro',     weight: 1, tension: 0.1,  trackPresence: tp(0.5, 0, 0, 0, 0, 0) },
    { kind: 'verse',     weight: 3, tension: 0.3,  trackPresence: tp(1, 0.4, 0.5, 0.6, 0, 0.3) },
    { kind: 'build',     weight: 2, tension: 0.55, trackPresence: tp(1, 0.7, 0.7, 0.8, 0.5, 0.5) },
    { kind: 'climax',    weight: 2, tension: 0.7,  trackPresence: tp(1, 1, 0.8, 1, 0.7, 0.6) },
    { kind: 'outro',     weight: 1, tension: 0.15, trackPresence: tp(0.6, 0.3, 0, 0.4, 0, 0) },
  ],
  cinematic: [
    { kind: 'intro',     weight: 1, tension: 0.1,  trackPresence: tp(0, 0.3, 0, 0, 0, 0) },
    { kind: 'build',     weight: 2, tension: 0.5,  trackPresence: tp(0.6, 0.7, 0.5, 0.4, 0, 0.4) },
    { kind: 'climax',    weight: 3, tension: 0.95, trackPresence: tp(1, 1, 1, 0.8, 0.8, 1) },
    { kind: 'breakdown', weight: 1, tension: 0.2,  trackPresence: tp(0.3, 0.5, 0, 0, 0, 0) },
    { kind: 'outro',     weight: 1, tension: 0.1,  trackPresence: tp(0.5, 0.6, 0.3, 0, 0, 0.2) },
  ],
  electronic: [
    { kind: 'intro',     weight: 1, tension: 0.15, trackPresence: tp(0, 0, 0.5, 0, 0, 0.6) },
    { kind: 'build',     weight: 2, tension: 0.6,  trackPresence: tp(0.5, 0.5, 0.8, 0.6, 0, 0.9) },
    { kind: 'climax',    weight: 2, tension: 0.9,  trackPresence: tp(1, 0.8, 1, 1, 0.5, 1) },
    { kind: 'breakdown', weight: 1, tension: 0.15, trackPresence: tp(0.3, 0.5, 0, 0.3, 0, 0) },
    { kind: 'build',     weight: 1, tension: 0.7,  trackPresence: tp(0.7, 0.6, 0.8, 0.8, 0, 0.9) },
    { kind: 'climax',    weight: 1, tension: 0.95, trackPresence: tp(1, 1, 1, 1, 0.7, 1) },
  ],
  bossa_nova: [
    { kind: 'intro',     weight: 1, tension: 0.1,  trackPresence: tp(0, 0.5, 0.5, 0, 0, 0.5) },
    { kind: 'verse',     weight: 3, tension: 0.35, trackPresence: tp(1, 0.7, 0.8, 0.4, 0, 0.7) },
    { kind: 'climax',    weight: 2, tension: 0.6,  trackPresence: tp(1, 0.9, 1, 0.7, 0.5, 0.9) },
    { kind: 'outro',     weight: 2, tension: 0.15, trackPresence: tp(0.6, 0.5, 0.6, 0.3, 0, 0.4) },
  ],
  lo_fi: [
    { kind: 'intro',     weight: 1, tension: 0.1,  trackPresence: tp(0, 0.4, 0, 0.3, 0, 0.4) },
    { kind: 'verse',     weight: 3, tension: 0.3,  trackPresence: tp(0.8, 0.7, 0.7, 0.5, 0, 0.7) },
    { kind: 'build',     weight: 1, tension: 0.5,  trackPresence: tp(1, 0.8, 0.9, 0.7, 0.4, 0.8) },
    { kind: 'climax',    weight: 2, tension: 0.6,  trackPresence: tp(1, 1, 1, 0.8, 0.6, 0.9) },
    { kind: 'outro',     weight: 1, tension: 0.1,  trackPresence: tp(0.5, 0.5, 0.4, 0.3, 0, 0.3) },
  ],
  gospel: [
    { kind: 'intro',     weight: 1, tension: 0.15, trackPresence: tp(0, 0.6, 0, 0, 0, 0.3) },
    { kind: 'verse',     weight: 2, tension: 0.4,  trackPresence: tp(0.8, 0.8, 0.6, 0.3, 0, 0.6) },
    { kind: 'build',     weight: 1, tension: 0.7,  trackPresence: tp(1, 1, 0.9, 0.5, 0.5, 0.8) },
    { kind: 'climax',    weight: 2, tension: 1.0,  trackPresence: tp(1, 1, 1, 0.8, 1, 1) },
    { kind: 'breakdown', weight: 1, tension: 0.25, trackPresence: tp(0.6, 0.7, 0, 0, 0, 0.2) },
    { kind: 'outro',     weight: 1, tension: 0.3,  trackPresence: tp(0.8, 0.8, 0.5, 0.3, 0, 0.5) },
  ],
};

export function generateSections(
  style: CompositionStyle,
  measures: number,
): Section[] {
  const templates = STYLE_ARCS[style];
  const totalWeight = templates.reduce((s, t) => s + t.weight, 0);

  const sections: Section[] = [];
  let currentMeasure = 0;
  let measuresLeft = measures;

  for (let i = 0; i < templates.length; i++) {
    const t = templates[i];
    const isLast = i === templates.length - 1;
    const idealLength = Math.round((t.weight / totalWeight) * measures);
    const length = isLast
      ? measuresLeft
      : Math.max(1, Math.min(idealLength, measuresLeft - (templates.length - i - 1)));

    if (length <= 0) continue;

    sections.push({
      kind: t.kind,
      startMeasure: currentMeasure,
      lengthMeasures: length,
      trackPresence: { ...t.trackPresence },
      tension: t.tension,
    });

    currentMeasure += length;
    measuresLeft -= length;
  }

  return sections;
}

export function getSectionAtMeasure(sections: Section[], measure: number): Section | undefined {
  return sections.find(
    s => measure >= s.startMeasure && measure < s.startMeasure + s.lengthMeasures,
  );
}

export function getSectionAtBeat(sections: Section[], beat: number, beatsPerMeasure: number): Section | undefined {
  const measure = Math.floor(beat / beatsPerMeasure);
  return getSectionAtMeasure(sections, measure);
}

export function getTrackPresenceAtBeat(
  sections: Section[],
  trackName: string,
  beat: number,
  beatsPerMeasure: number,
): number {
  const section = getSectionAtBeat(sections, beat, beatsPerMeasure);
  if (!section) return 1;
  return section.trackPresence[trackName] ?? 1;
}

export function isSectionBoundary(sections: Section[], measure: number): boolean {
  return sections.some(s => s.startMeasure === measure && s.startMeasure > 0);
}

export { TRACK_NAMES };
