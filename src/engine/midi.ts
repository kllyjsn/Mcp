import type { Composition, Track } from '../types/music';

/**
 * Minimal MIDI file writer — produces a multi-track Standard MIDI File (format 1).
 * No external library required.
 */

function toVarLen(value: number): number[] {
  const bytes: number[] = [];
  let v = value & 0x0FFFFFFF;
  bytes.unshift(v & 0x7F);
  while ((v >>= 7) > 0) {
    bytes.unshift((v & 0x7F) | 0x80);
  }
  return bytes;
}

function writeUint16(value: number): number[] {
  return [(value >> 8) & 0xFF, value & 0xFF];
}

function writeUint32(value: number): number[] {
  return [
    (value >> 24) & 0xFF,
    (value >> 16) & 0xFF,
    (value >> 8) & 0xFF,
    value & 0xFF,
  ];
}

function writeString(s: string): number[] {
  return Array.from(s).map(c => c.charCodeAt(0));
}

function buildTempoEvent(bpm: number): number[] {
  const microsecondsPerBeat = Math.round(60000000 / bpm);
  return [
    ...toVarLen(0), // delta-time = 0
    0xFF, 0x51, 0x03, // meta event: set tempo
    (microsecondsPerBeat >> 16) & 0xFF,
    (microsecondsPerBeat >> 8) & 0xFF,
    microsecondsPerBeat & 0xFF,
  ];
}

function buildTimeSignatureEvent(numerator: number, denominator: number): number[] {
  const denLog2 = Math.round(Math.log2(denominator));
  return [
    ...toVarLen(0), // delta-time
    0xFF, 0x58, 0x04, // meta event: time signature
    numerator,
    denLog2,
    24, // MIDI clocks per metronome click
    8,  // 32nd notes per quarter note
  ];
}

function buildTrackNameEvent(name: string): number[] {
  const nameBytes = writeString(name);
  return [
    ...toVarLen(0),
    0xFF, 0x03,
    ...toVarLen(nameBytes.length),
    ...nameBytes,
  ];
}

function buildEndOfTrack(): number[] {
  return [...toVarLen(0), 0xFF, 0x2F, 0x00];
}

const TICKS_PER_BEAT = 480;

function buildNoteEvents(track: Track, channel: number): number[] {
  const events: Array<{ tick: number; data: number[] }> = [];

  const ch = track.name === 'Drums' ? 9 : channel;

  for (const note of track.notes) {
    const startTick = Math.max(0, Math.round(note.startBeat * TICKS_PER_BEAT));
    const durTicks = Math.max(1, Math.round(note.duration * TICKS_PER_BEAT));
    const pitch = Math.max(0, Math.min(127, note.pitch));
    const velocity = Math.max(1, Math.min(127, note.velocity));

    events.push({
      tick: startTick,
      data: [0x90 | ch, pitch, velocity], // note on
    });
    events.push({
      tick: startTick + durTicks,
      data: [0x80 | ch, pitch, 0], // note off
    });
  }

  // Sort by tick, then note-off before note-on at same tick
  events.sort((a, b) => {
    if (a.tick !== b.tick) return a.tick - b.tick;
    const aIsOff = (a.data[0] & 0xF0) === 0x80 ? 0 : 1;
    const bIsOff = (b.data[0] & 0xF0) === 0x80 ? 0 : 1;
    return aIsOff - bIsOff;
  });

  const bytes: number[] = [];
  let lastTick = 0;

  for (const evt of events) {
    const delta = Math.max(0, evt.tick - lastTick);
    bytes.push(...toVarLen(delta));
    bytes.push(...evt.data);
    lastTick = evt.tick;
  }

  return bytes;
}

export function compositionToMidi(composition: Composition): Uint8Array {
  const tracks: number[][] = [];

  // Track 0: tempo track
  const tempoTrack: number[] = [
    ...buildTrackNameEvent(composition.name),
    ...buildTimeSignatureEvent(composition.params.timeSignature[0], composition.params.timeSignature[1]),
    ...buildTempoEvent(composition.params.tempo),
    ...buildEndOfTrack(),
  ];
  tracks.push(tempoTrack);

  // Track 1-N: instrument tracks (each gets a unique MIDI channel, skipping ch 9 = drums)
  let midiChannel = 0;
  for (const track of composition.tracks) {
    const ch = track.name === 'Drums' ? 9 : midiChannel++;
    if (midiChannel === 9) midiChannel = 10; // skip drum channel for melodic tracks
    const trackBytes: number[] = [
      ...buildTrackNameEvent(track.name),
      ...buildNoteEvents(track, ch),
      ...buildEndOfTrack(),
    ];
    tracks.push(trackBytes);
  }

  // Assemble MIDI file
  const header: number[] = [
    ...writeString('MThd'),
    ...writeUint32(6),
    ...writeUint16(1), // format 1
    ...writeUint16(tracks.length),
    ...writeUint16(TICKS_PER_BEAT),
  ];

  const allBytes: number[] = [...header];

  for (const trackData of tracks) {
    allBytes.push(...writeString('MTrk'));
    allBytes.push(...writeUint32(trackData.length));
    allBytes.push(...trackData);
  }

  return new Uint8Array(allBytes);
}

export function downloadMidi(composition: Composition): void {
  const data = compositionToMidi(composition);
  const blob = new Blob([data.buffer as ArrayBuffer], { type: 'audio/midi' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${composition.name.replace(/\s+/g, '_')}.mid`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
