import type { Composition, Note } from '../types/music';

function writeVarLength(value: number): number[] {
  const bytes: number[] = [];
  let v = value;
  bytes.unshift(v & 0x7f);
  v >>= 7;
  while (v > 0) {
    bytes.unshift((v & 0x7f) | 0x80);
    v >>= 7;
  }
  return bytes;
}

function writeUint16(value: number): number[] {
  return [(value >> 8) & 0xff, value & 0xff];
}

function writeUint32(value: number): number[] {
  return [(value >> 24) & 0xff, (value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff];
}

function stringToBytes(s: string): number[] {
  return Array.from(s).map(c => c.charCodeAt(0));
}

function beatsToTicks(beats: number, ticksPerBeat: number): number {
  return Math.round(beats * ticksPerBeat);
}

function buildTrackChunk(notes: Note[], trackName: string, channel: number, ticksPerBeat: number): number[] {
  const events: { tick: number; data: number[] }[] = [];

  const nameBytes = stringToBytes(trackName);
  events.push({ tick: 0, data: [0xff, 0x03, nameBytes.length, ...nameBytes] });

  const sorted = [...notes].sort((a, b) => a.startBeat - b.startBeat);

  for (const note of sorted) {
    const startTick = beatsToTicks(note.startBeat, ticksPerBeat);
    const endTick = beatsToTicks(note.startBeat + note.duration, ticksPerBeat);
    const vel = Math.max(1, Math.min(127, Math.round(note.velocity)));
    const pitch = Math.max(0, Math.min(127, note.pitch));

    events.push({ tick: startTick, data: [0x90 | channel, pitch, vel] });
    events.push({ tick: endTick, data: [0x80 | channel, pitch, 0] });
  }

  events.sort((a, b) => a.tick - b.tick);

  events.push({ tick: events.length > 0 ? events[events.length - 1].tick + ticksPerBeat : 0, data: [0xff, 0x2f, 0x00] });

  const trackData: number[] = [];
  let lastTick = 0;
  for (const ev of events) {
    const delta = Math.max(0, ev.tick - lastTick);
    trackData.push(...writeVarLength(delta));
    trackData.push(...ev.data);
    lastTick = ev.tick;
  }

  return [
    ...stringToBytes('MTrk'),
    ...writeUint32(trackData.length),
    ...trackData,
  ];
}

function buildTempoTrack(tempo: number, timeSignature: [number, number], ticksPerBeat: number): number[] {
  const events: number[] = [];

  const microsecondsPerBeat = Math.round(60_000_000 / tempo);
  events.push(
    ...writeVarLength(0),
    0xff, 0x51, 0x03,
    (microsecondsPerBeat >> 16) & 0xff,
    (microsecondsPerBeat >> 8) & 0xff,
    microsecondsPerBeat & 0xff,
  );

  const [num, denom] = timeSignature;
  const denomPow = Math.round(Math.log2(denom));
  events.push(
    ...writeVarLength(0),
    0xff, 0x58, 0x04,
    num,
    denomPow,
    24,
    8,
  );

  const titleBytes = stringToBytes('MCP Composition');
  events.push(
    ...writeVarLength(0),
    0xff, 0x03, titleBytes.length, ...titleBytes,
  );

  events.push(...writeVarLength(ticksPerBeat), 0xff, 0x2f, 0x00);

  return [
    ...stringToBytes('MTrk'),
    ...writeUint32(events.length),
    ...events,
  ];
}

export function compositionToMidi(composition: Composition): Uint8Array {
  const ticksPerBeat = 480;
  const numTracks = composition.tracks.length + 1;

  const header = [
    ...stringToBytes('MThd'),
    ...writeUint32(6),
    ...writeUint16(1),
    ...writeUint16(numTracks),
    ...writeUint16(ticksPerBeat),
  ];

  const tempoTrack = buildTempoTrack(
    composition.params.tempo,
    composition.params.timeSignature,
    ticksPerBeat,
  );

  const trackChunks: number[][] = [];
  const channelMap: Record<string, number> = {
    Melody: 0,
    Harmony: 1,
    Bass: 2,
    Arpeggio: 3,
    Drums: 9,
  };

  for (const track of composition.tracks) {
    const channel = channelMap[track.name] ?? trackChunks.length;
    trackChunks.push(buildTrackChunk(track.notes, track.name, channel, ticksPerBeat));
  }

  const allBytes = [
    ...header,
    ...tempoTrack,
    ...trackChunks.flat(),
  ];

  return new Uint8Array(allBytes);
}

export function downloadMidi(composition: Composition): void {
  const data = compositionToMidi(composition);
  const blob = new Blob([data.buffer as ArrayBuffer], { type: 'audio/midi' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `${composition.name.replace(/[^a-zA-Z0-9 ]/g, '')}.mid`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
