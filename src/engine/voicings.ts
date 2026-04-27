import type { ChordQuality, NoteName } from '../types/music';
import { noteNameToMidi } from './scales';
import { CHORD_INTERVALS } from './chords';

export function buildDrop2Voicing(root: NoteName, quality: ChordQuality, octave: number): number[] {
  const rootMidi = noteNameToMidi(root, octave);
  const intervals = CHORD_INTERVALS[quality] ?? CHORD_INTERVALS.major;
  const close = intervals.map(i => rootMidi + i);

  if (close.length < 4) return close;

  const sorted = [...close].sort((a, b) => a - b);
  const secondFromTop = sorted[sorted.length - 2];
  return sorted.map(n => n === secondFromTop ? n - 12 : n).sort((a, b) => a - b);
}

export function buildRootlessVoicingA(root: NoteName, quality: ChordQuality, octave: number): number[] {
  const rootMidi = noteNameToMidi(root, octave);
  const q = quality;

  if (q === 'dominant7') {
    return [rootMidi + 4, rootMidi + 7, rootMidi + 10, rootMidi + 14];
  }
  if (q === 'major7') {
    return [rootMidi + 4, rootMidi + 7, rootMidi + 11, rootMidi + 14];
  }
  if (q === 'minor7') {
    return [rootMidi + 3, rootMidi + 7, rootMidi + 10, rootMidi + 14];
  }
  if (q === 'major9') {
    return [rootMidi + 4, rootMidi + 7, rootMidi + 11, rootMidi + 14];
  }
  if (q === 'minor9') {
    return [rootMidi + 3, rootMidi + 7, rootMidi + 10, rootMidi + 14];
  }
  return buildDrop2Voicing(root, quality, octave);
}

export function buildRootlessVoicingB(root: NoteName, quality: ChordQuality, octave: number): number[] {
  const rootMidi = noteNameToMidi(root, octave);
  const q = quality;

  if (q === 'dominant7') {
    return [rootMidi + 10, rootMidi + 14, rootMidi + 16, rootMidi + 19];
  }
  if (q === 'major7') {
    return [rootMidi + 11, rootMidi + 14, rootMidi + 16, rootMidi + 19];
  }
  if (q === 'minor7') {
    return [rootMidi + 10, rootMidi + 14, rootMidi + 15, rootMidi + 19];
  }
  return buildDrop2Voicing(root, quality, octave);
}

export function buildShellVoicing(root: NoteName, quality: ChordQuality, octave: number): number[] {
  const rootMidi = noteNameToMidi(root, octave);
  const intervals = CHORD_INTERVALS[quality] ?? CHORD_INTERVALS.major;

  const shell = [rootMidi];
  if (intervals.length >= 2) shell.push(rootMidi + intervals[1]);
  if (intervals.length >= 4) shell.push(rootMidi + intervals[3]);
  else if (intervals.length >= 3) shell.push(rootMidi + intervals[2]);
  return shell;
}

export function buildUpperStructureTriad(root: NoteName, quality: ChordQuality, octave: number): number[] {
  const rootMidi = noteNameToMidi(root, octave);

  if (quality === 'dominant7') {
    const triRoot = rootMidi + 2;
    return [rootMidi + 4, rootMidi + 10, triRoot + 12, triRoot + 16, triRoot + 19];
  }
  if (quality === 'major7' || quality === 'major9') {
    return [rootMidi + 4, rootMidi + 11, rootMidi + 16, rootMidi + 19, rootMidi + 23];
  }
  return buildDrop2Voicing(root, quality, octave);
}

export function selectVoicing(
  root: NoteName,
  quality: ChordQuality,
  octave: number,
  complexity: number,
  prevVoicing: number[],
): number[] {
  let voicing: number[];

  if (complexity >= 9) {
    const r = Math.random();
    if (r < 0.3) voicing = buildRootlessVoicingA(root, quality, octave);
    else if (r < 0.6) voicing = buildRootlessVoicingB(root, quality, octave);
    else voicing = buildUpperStructureTriad(root, quality, octave);
  } else if (complexity >= 7) {
    voicing = Math.random() > 0.5
      ? buildDrop2Voicing(root, quality, octave)
      : buildRootlessVoicingA(root, quality, octave);
  } else if (complexity >= 5) {
    voicing = buildDrop2Voicing(root, quality, octave);
  } else {
    voicing = buildShellVoicing(root, quality, octave);
  }

  if (prevVoicing.length > 0) {
    const avgPrev = prevVoicing.reduce((a, b) => a + b, 0) / prevVoicing.length;
    const avgNew = voicing.reduce((a, b) => a + b, 0) / voicing.length;
    if (Math.abs(avgNew - avgPrev) > 8) {
      const shift = avgNew > avgPrev ? -12 : 12;
      voicing = voicing.map(n => n + shift);
    }
  }

  return voicing.filter(n => n >= 36 && n <= 84);
}
