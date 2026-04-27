import type { Note, Chord, CompositionParams, FormSection } from '../types/music';
import { getScaleNotesMultiOctave, nearestScaleNote } from './scales';
import { getSectionAtBeat } from './form';

export function generateCountermelody(
  params: CompositionParams,
  chords: Chord[],
  mainMelody: Note[],
  form: FormSection[],
): Note[] {
  const scaleNotes = getScaleNotesMultiOctave(params.key, params.scale, 3, 5);
  const totalBeats = params.measures * params.timeSignature[0];
  const beatsPerMeasure = params.timeSignature[0];
  const notes: Note[] = [];

  const technique = pickTechnique(params);

  switch (technique) {
    case 'contrary':
      return generateContraryMotion(params, chords, mainMelody, scaleNotes, totalBeats, beatsPerMeasure, form);
    case 'oblique':
      return generateObliqueMotion(params, chords, mainMelody, scaleNotes, totalBeats, beatsPerMeasure, form);
    case 'callResponse':
      return generateCallResponse(params, chords, mainMelody, scaleNotes, totalBeats, beatsPerMeasure, form);
    default:
      return notes;
  }
}

type CounterTechnique = 'contrary' | 'oblique' | 'callResponse';

function pickTechnique(params: CompositionParams): CounterTechnique {
  if (params.style === 'jazz' || params.style === 'neo_soul' || params.style === 'gospel') return 'callResponse';
  if (params.style === 'classical' || params.style === 'romantic') return 'contrary';
  if (params.style === 'afrobeat') return 'callResponse';
  if (params.expressiveness >= 7) return 'contrary';
  return 'oblique';
}

function generateContraryMotion(
  params: CompositionParams,
  chords: Chord[],
  mainMelody: Note[],
  _scaleNotes: number[],
  _totalBeats: number,
  beatsPerMeasure: number,
  form: FormSection[],
): Note[] {
  const notes: Note[] = [];
  const centerPitch = _scaleNotes[Math.floor(_scaleNotes.length / 2)];

  for (const melNote of mainMelody) {
    const section = getSectionAtBeat(form, melNote.startBeat, beatsPerMeasure);
    if (section && !section.activeTracks.includes('Counter')) continue;

    const melodicOffset = melNote.pitch - centerPitch;
    let counterPitch = centerPitch - melodicOffset;
    counterPitch = nearestScaleNote(counterPitch, params.key, params.scale);

    const activeChord = chords.find(c => c.startBeat <= melNote.startBeat && c.startBeat + c.duration > melNote.startBeat);
    if (activeChord) {
      counterPitch = snapToChordIfClose(counterPitch, activeChord, 4);
    }

    counterPitch = Math.max(48, Math.min(72, counterPitch));

    if (Math.abs(counterPitch - melNote.pitch) < 3) continue;

    if (Math.random() > 0.2) {
      notes.push({
        pitch: counterPitch,
        velocity: Math.round(melNote.velocity * 0.65),
        duration: melNote.duration * (0.7 + Math.random() * 0.25),
        startBeat: melNote.startBeat,
      });
    }
  }

  return notes;
}

function generateObliqueMotion(
  params: CompositionParams,
  chords: Chord[],
  _mainMelody: Note[],
  scaleNotes: number[],
  totalBeats: number,
  beatsPerMeasure: number,
  form: FormSection[],
): Note[] {
  const notes: Note[] = [];
  let currentBeat = 0;

  while (currentBeat < totalBeats) {
    const section = getSectionAtBeat(form, currentBeat, beatsPerMeasure);
    if (section && !section.activeTracks.includes('Counter')) {
      currentBeat += beatsPerMeasure;
      continue;
    }

    const activeChord = chords.find(c => c.startBeat <= currentBeat && c.startBeat + c.duration > currentBeat);
    if (!activeChord) { currentBeat += 1; continue; }

    const chordDur = Math.min(activeChord.duration, totalBeats - currentBeat);
    const pedalNote = activeChord.voicing[Math.floor(activeChord.voicing.length / 2)];

    const numNotes = Math.max(1, Math.floor(chordDur * (params.melodicDensity / 15)));
    const noteDur = chordDur / numNotes;

    for (let i = 0; i < numNotes; i++) {
      if (Math.random() > 0.3) {
        let pitch = pedalNote;
        if (i > 0 && Math.random() > 0.6) {
          const idx = Math.floor(Math.random() * scaleNotes.length);
          pitch = scaleNotes[idx];
          pitch = Math.max(48, Math.min(72, pitch));
        }

        notes.push({
          pitch,
          velocity: 40 + Math.floor(Math.random() * 25),
          duration: noteDur * 0.8,
          startBeat: currentBeat + i * noteDur,
        });
      }
    }

    currentBeat += chordDur;
  }

  return notes;
}

function generateCallResponse(
  params: CompositionParams,
  chords: Chord[],
  mainMelody: Note[],
  _scaleNotes: number[],
  totalBeats: number,
  beatsPerMeasure: number,
  form: FormSection[],
): Note[] {
  const notes: Note[] = [];
  const phraseLength = beatsPerMeasure * 2;
  let currentBeat = 0;

  while (currentBeat < totalBeats) {
    const section = getSectionAtBeat(form, currentBeat, beatsPerMeasure);
    if (section && !section.activeTracks.includes('Counter')) {
      currentBeat += phraseLength;
      continue;
    }

    const isResponsePhrase = Math.floor(currentBeat / phraseLength) % 2 === 1;

    if (isResponsePhrase) {
      const callNotes = mainMelody.filter(
        n => n.startBeat >= currentBeat - phraseLength && n.startBeat < currentBeat,
      );

      for (const callNote of callNotes) {
        const activeChord = chords.find(c => c.startBeat <= currentBeat && c.startBeat + c.duration > currentBeat);
        let responsePitch = nearestScaleNote(callNote.pitch - 5, params.key, params.scale);
        responsePitch = Math.max(48, Math.min(72, responsePitch));

        if (activeChord) {
          responsePitch = snapToChordIfClose(responsePitch, activeChord, 3);
        }

        const responseStart = currentBeat + (callNote.startBeat - (currentBeat - phraseLength));
        if (responseStart >= totalBeats) break;

        if (Math.random() > 0.25) {
          notes.push({
            pitch: responsePitch,
            velocity: Math.round(callNote.velocity * 0.6),
            duration: callNote.duration * (0.8 + Math.random() * 0.2),
            startBeat: responseStart,
          });
        }
      }
    }

    currentBeat += phraseLength;
  }

  return notes;
}

function snapToChordIfClose(pitch: number, chord: { voicing: number[] }, maxDist: number): number {
  const chordPitches = chord.voicing.flatMap(v => [v, v + 12, v - 12]);
  let best = pitch;
  let bestDist = Infinity;

  for (const cp of chordPitches) {
    const d = Math.abs(cp - pitch);
    if (d < bestDist && d <= maxDist) {
      bestDist = d;
      best = cp;
    }
  }
  return best;
}
