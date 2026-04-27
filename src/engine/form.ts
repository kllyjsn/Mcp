import type { CompositionParams, CompositionStyle, FormSection, SectionType } from '../types/music';

interface FormTemplate {
  sections: { type: SectionType; proportion: number; intensity: number; label: string }[];
  styles: CompositionStyle[];
}

const FORM_TEMPLATES: FormTemplate[] = [
  {
    sections: [
      { type: 'intro', proportion: 0.125, intensity: 0.3, label: 'Intro' },
      { type: 'A', proportion: 0.25, intensity: 0.6, label: 'Theme A' },
      { type: 'B', proportion: 0.25, intensity: 0.75, label: 'Theme B' },
      { type: 'A_prime', proportion: 0.25, intensity: 0.8, label: "A'" },
      { type: 'outro', proportion: 0.125, intensity: 0.4, label: 'Outro' },
    ],
    styles: ['classical', 'romantic', 'chamber', 'late_romantic'],
  },
  {
    sections: [
      { type: 'A', proportion: 0.25, intensity: 0.5, label: 'Head' },
      { type: 'B', proportion: 0.25, intensity: 0.7, label: 'Solo' },
      { type: 'development', proportion: 0.25, intensity: 0.85, label: 'Development' },
      { type: 'A_prime', proportion: 0.25, intensity: 0.6, label: 'Head Out' },
    ],
    styles: ['jazz', 'post_bop', 'bossa_nova'],
  },
  {
    sections: [
      { type: 'intro', proportion: 0.15, intensity: 0.25, label: 'Atmosphere' },
      { type: 'A', proportion: 0.35, intensity: 0.5, label: 'Main Theme' },
      { type: 'climax', proportion: 0.2, intensity: 0.9, label: 'Climax' },
      { type: 'outro', proportion: 0.3, intensity: 0.3, label: 'Dissolve' },
    ],
    styles: ['cinematic', 'film_noir'],
  },
  {
    sections: [
      { type: 'intro', proportion: 0.2, intensity: 0.2, label: 'Drift In' },
      { type: 'A', proportion: 0.4, intensity: 0.4, label: 'Texture' },
      { type: 'A_prime', proportion: 0.25, intensity: 0.5, label: 'Evolution' },
      { type: 'outro', proportion: 0.15, intensity: 0.15, label: 'Fade' },
    ],
    styles: ['ambient', 'minimalist'],
  },
  {
    sections: [
      { type: 'A', proportion: 0.3, intensity: 0.6, label: 'Verse' },
      { type: 'B', proportion: 0.25, intensity: 0.8, label: 'Chorus' },
      { type: 'bridge', proportion: 0.2, intensity: 0.7, label: 'Bridge' },
      { type: 'B', proportion: 0.25, intensity: 0.85, label: 'Final Chorus' },
    ],
    styles: ['neo_soul', 'gospel', 'lo_fi', 'electronic'],
  },
  {
    sections: [
      { type: 'intro', proportion: 0.1, intensity: 0.3, label: 'Colour' },
      { type: 'A', proportion: 0.3, intensity: 0.5, label: 'First Image' },
      { type: 'B', proportion: 0.3, intensity: 0.6, label: 'Second Image' },
      { type: 'A_prime', proportion: 0.2, intensity: 0.55, label: 'Reflection' },
      { type: 'outro', proportion: 0.1, intensity: 0.25, label: 'Mist' },
    ],
    styles: ['impressionist'],
  },
];

export function generateForm(params: CompositionParams): FormSection[] {
  const template = FORM_TEMPLATES.find(t => t.styles.includes(params.style))
    ?? FORM_TEMPLATES[0];

  let currentMeasure = 0;
  const sections: FormSection[] = [];

  for (const sec of template.sections) {
    const length = Math.max(1, Math.round(params.measures * sec.proportion));
    sections.push({
      type: sec.type,
      startMeasure: currentMeasure,
      length,
      intensity: sec.intensity,
      label: sec.label,
    });
    currentMeasure += length;
  }

  const totalAssigned = sections.reduce((s, sec) => s + sec.length, 0);
  if (totalAssigned < params.measures) {
    sections[sections.length - 1].length += params.measures - totalAssigned;
  } else if (totalAssigned > params.measures) {
    const excess = totalAssigned - params.measures;
    const lastIdx = sections.length - 1;
    sections[lastIdx].length = Math.max(1, sections[lastIdx].length - excess);
  }

  return sections;
}

export function getSectionAtMeasure(form: FormSection[], measure: number): FormSection | undefined {
  return form.find(s => measure >= s.startMeasure && measure < s.startMeasure + s.length);
}

export function getIntensityAtBeat(form: FormSection[], beat: number, beatsPerMeasure: number): number {
  const measure = Math.floor(beat / beatsPerMeasure);
  const section = getSectionAtMeasure(form, measure);
  if (!section) return 0.5;

  const posInSection = (measure - section.startMeasure) / Math.max(1, section.length - 1);

  if (section.type === 'intro') return section.intensity * (0.5 + posInSection * 0.5);
  if (section.type === 'outro') return section.intensity * (1 - posInSection * 0.7);
  if (section.type === 'climax') return section.intensity * (0.8 + Math.sin(posInSection * Math.PI) * 0.2);
  if (section.type === 'development') return section.intensity * (0.7 + posInSection * 0.3);

  return section.intensity;
}

export function getVelocityScale(form: FormSection[], beat: number, beatsPerMeasure: number): number {
  const intensity = getIntensityAtBeat(form, beat, beatsPerMeasure);
  return 0.5 + intensity * 0.5;
}

export function getDensityScale(form: FormSection[], beat: number, beatsPerMeasure: number): number {
  const intensity = getIntensityAtBeat(form, beat, beatsPerMeasure);
  return 0.4 + intensity * 0.6;
}
