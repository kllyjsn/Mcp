import type { CompositionParams, CompositionStyle, FormSection, SectionType } from '../types/music';

interface FormTemplate {
  sections: { type: SectionType; lengthRatio: number; intensity: number }[];
}

const STYLE_FORMS: Record<CompositionStyle, FormTemplate[]> = {
  classical: [
    { sections: [
      { type: 'intro', lengthRatio: 0.125, intensity: 0.3 },
      { type: 'A', lengthRatio: 0.25, intensity: 0.6 },
      { type: 'B', lengthRatio: 0.25, intensity: 0.75 },
      { type: 'A', lengthRatio: 0.25, intensity: 0.85 },
      { type: 'outro', lengthRatio: 0.125, intensity: 0.4 },
    ]},
    { sections: [
      { type: 'A', lengthRatio: 0.3, intensity: 0.6 },
      { type: 'bridge', lengthRatio: 0.2, intensity: 0.5 },
      { type: 'climax', lengthRatio: 0.25, intensity: 0.95 },
      { type: 'outro', lengthRatio: 0.25, intensity: 0.3 },
    ]},
  ],
  romantic: [
    { sections: [
      { type: 'intro', lengthRatio: 0.15, intensity: 0.25 },
      { type: 'A', lengthRatio: 0.25, intensity: 0.55 },
      { type: 'B', lengthRatio: 0.2, intensity: 0.7 },
      { type: 'climax', lengthRatio: 0.2, intensity: 1.0 },
      { type: 'outro', lengthRatio: 0.2, intensity: 0.3 },
    ]},
  ],
  impressionist: [
    { sections: [
      { type: 'intro', lengthRatio: 0.2, intensity: 0.2 },
      { type: 'A', lengthRatio: 0.3, intensity: 0.5 },
      { type: 'B', lengthRatio: 0.3, intensity: 0.65 },
      { type: 'outro', lengthRatio: 0.2, intensity: 0.25 },
    ]},
  ],
  jazz: [
    { sections: [
      { type: 'intro', lengthRatio: 0.1, intensity: 0.4 },
      { type: 'A', lengthRatio: 0.25, intensity: 0.6 },
      { type: 'A', lengthRatio: 0.25, intensity: 0.7 },
      { type: 'B', lengthRatio: 0.25, intensity: 0.8 },
      { type: 'outro', lengthRatio: 0.15, intensity: 0.5 },
    ]},
  ],
  neo_soul: [
    { sections: [
      { type: 'intro', lengthRatio: 0.15, intensity: 0.3 },
      { type: 'A', lengthRatio: 0.3, intensity: 0.6 },
      { type: 'B', lengthRatio: 0.3, intensity: 0.8 },
      { type: 'outro', lengthRatio: 0.25, intensity: 0.45 },
    ]},
  ],
  ambient: [
    { sections: [
      { type: 'intro', lengthRatio: 0.25, intensity: 0.15 },
      { type: 'A', lengthRatio: 0.35, intensity: 0.4 },
      { type: 'climax', lengthRatio: 0.15, intensity: 0.6 },
      { type: 'outro', lengthRatio: 0.25, intensity: 0.2 },
    ]},
  ],
  minimalist: [
    { sections: [
      { type: 'A', lengthRatio: 0.4, intensity: 0.4 },
      { type: 'B', lengthRatio: 0.35, intensity: 0.55 },
      { type: 'A', lengthRatio: 0.25, intensity: 0.35 },
    ]},
  ],
  cinematic: [
    { sections: [
      { type: 'intro', lengthRatio: 0.15, intensity: 0.2 },
      { type: 'A', lengthRatio: 0.2, intensity: 0.5 },
      { type: 'bridge', lengthRatio: 0.15, intensity: 0.65 },
      { type: 'climax', lengthRatio: 0.3, intensity: 1.0 },
      { type: 'outro', lengthRatio: 0.2, intensity: 0.25 },
    ]},
  ],
  electronic: [
    { sections: [
      { type: 'intro', lengthRatio: 0.15, intensity: 0.3 },
      { type: 'A', lengthRatio: 0.25, intensity: 0.7 },
      { type: 'bridge', lengthRatio: 0.1, intensity: 0.4 },
      { type: 'climax', lengthRatio: 0.3, intensity: 0.95 },
      { type: 'outro', lengthRatio: 0.2, intensity: 0.5 },
    ]},
  ],
  bossa_nova: [
    { sections: [
      { type: 'intro', lengthRatio: 0.15, intensity: 0.3 },
      { type: 'A', lengthRatio: 0.3, intensity: 0.55 },
      { type: 'B', lengthRatio: 0.3, intensity: 0.65 },
      { type: 'outro', lengthRatio: 0.25, intensity: 0.4 },
    ]},
  ],
  lo_fi: [
    { sections: [
      { type: 'intro', lengthRatio: 0.2, intensity: 0.25 },
      { type: 'A', lengthRatio: 0.35, intensity: 0.5 },
      { type: 'B', lengthRatio: 0.25, intensity: 0.6 },
      { type: 'outro', lengthRatio: 0.2, intensity: 0.3 },
    ]},
  ],
  gospel: [
    { sections: [
      { type: 'intro', lengthRatio: 0.1, intensity: 0.4 },
      { type: 'A', lengthRatio: 0.25, intensity: 0.6 },
      { type: 'B', lengthRatio: 0.25, intensity: 0.75 },
      { type: 'climax', lengthRatio: 0.25, intensity: 1.0 },
      { type: 'outro', lengthRatio: 0.15, intensity: 0.5 },
    ]},
  ],
  afrobeat: [
    { sections: [
      { type: 'intro', lengthRatio: 0.15, intensity: 0.35 },
      { type: 'A', lengthRatio: 0.25, intensity: 0.65 },
      { type: 'B', lengthRatio: 0.25, intensity: 0.8 },
      { type: 'climax', lengthRatio: 0.2, intensity: 0.95 },
      { type: 'outro', lengthRatio: 0.15, intensity: 0.5 },
    ]},
  ],
  uk_garage: [
    { sections: [
      { type: 'intro', lengthRatio: 0.15, intensity: 0.3 },
      { type: 'A', lengthRatio: 0.25, intensity: 0.7 },
      { type: 'bridge', lengthRatio: 0.1, intensity: 0.4 },
      { type: 'climax', lengthRatio: 0.3, intensity: 0.9 },
      { type: 'outro', lengthRatio: 0.2, intensity: 0.45 },
    ]},
  ],
};

const SECTION_TRACK_PROFILES: Record<SectionType, string[][]> = {
  intro:  [['Melody', 'Harmony'], ['Harmony', 'Arpeggio'], ['Melody', 'Bass']],
  A:      [['Melody', 'Harmony', 'Bass', 'Drums'], ['Melody', 'Harmony', 'Bass', 'Arpeggio', 'Drums']],
  B:      [['Melody', 'Harmony', 'Bass', 'Arpeggio', 'Drums'], ['Melody', 'Harmony', 'Bass', 'Arpeggio', 'Drums', 'Counter']],
  bridge: [['Harmony', 'Bass', 'Arpeggio'], ['Melody', 'Harmony', 'Bass']],
  climax: [['Melody', 'Harmony', 'Bass', 'Arpeggio', 'Drums', 'Counter']],
  outro:  [['Melody', 'Harmony'], ['Harmony', 'Arpeggio', 'Bass'], ['Melody', 'Bass']],
};

export function generateForm(params: CompositionParams): FormSection[] {
  const templates = STYLE_FORMS[params.style] ?? STYLE_FORMS.classical;
  const template = templates[Math.floor(Math.random() * templates.length)];

  const sections: FormSection[] = [];
  let currentMeasure = 0;

  for (const sec of template.sections) {
    const rawLength = params.measures * sec.lengthRatio;
    const length = Math.max(1, Math.round(rawLength));

    const profiles = SECTION_TRACK_PROFILES[sec.type];
    const activeTracks = profiles[Math.floor(Math.random() * profiles.length)];

    sections.push({
      type: sec.type,
      startMeasure: currentMeasure,
      lengthMeasures: length,
      intensity: sec.intensity,
      activeTracks,
    });

    currentMeasure += length;
  }

  // Drop excess sections when there are more sections than measures
  while (sections.length > params.measures) {
    sections.pop();
  }

  const totalAssigned = sections.reduce((s, sec) => s + sec.lengthMeasures, 0);
  let diff = params.measures - totalAssigned;

  // Distribute surplus/deficit iteratively, never letting any section drop below 1
  while (diff !== 0 && sections.length > 0) {
    if (diff > 0) {
      const longestIdx = sections.reduce((best, sec, i) =>
        sec.lengthMeasures >= sections[best].lengthMeasures ? i : best, 0);
      sections[longestIdx].lengthMeasures += 1;
      diff -= 1;
    } else {
      const longestIdx = sections.reduce((best, sec, i) =>
        sec.lengthMeasures > sections[best].lengthMeasures ? i : best, 0);
      if (sections[longestIdx].lengthMeasures <= 1) break;
      sections[longestIdx].lengthMeasures -= 1;
      diff += 1;
    }
  }

  // Recalculate start measures
  if (sections.length > 0) {
    let recalc = 0;
    for (const sec of sections) {
      sec.startMeasure = recalc;
      recalc += sec.lengthMeasures;
    }
  }

  return sections;
}

export function getSectionAtMeasure(form: FormSection[], measure: number): FormSection | undefined {
  return form.find(s => measure >= s.startMeasure && measure < s.startMeasure + s.lengthMeasures);
}

export function getSectionAtBeat(form: FormSection[], beat: number, beatsPerMeasure: number): FormSection | undefined {
  const measure = Math.floor(beat / beatsPerMeasure);
  return getSectionAtMeasure(form, measure);
}

export function getIntensityAtBeat(form: FormSection[], beat: number, beatsPerMeasure: number): number {
  const section = getSectionAtBeat(form, beat, beatsPerMeasure);
  return section?.intensity ?? 0.5;
}

export function isTrackActiveAtBeat(
  form: FormSection[],
  trackName: string,
  beat: number,
  beatsPerMeasure: number,
): boolean {
  const section = getSectionAtBeat(form, beat, beatsPerMeasure);
  if (!section) return true;
  return section.activeTracks.includes(trackName);
}
