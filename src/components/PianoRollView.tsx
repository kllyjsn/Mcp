import { useStore } from '../stores/useStore';
import { midiNoteToString } from '../engine/scales';
import { motion } from 'framer-motion';

const PIANO_RANGE = { low: 36, high: 96 };
const NOTE_HEIGHT = 10;
const BLACK_KEYS = [1, 3, 6, 8, 10];

export function PianoRollView() {
  const { composition, selectedTrackId } = useStore();

  const track = composition?.tracks.find(t => t.id === selectedTrackId);

  if (!composition || !track) {
    return (
      <div className="flex-1 flex items-center justify-center bg-zinc-950/50">
        <p className="text-zinc-500">Select a track to view its piano roll</p>
      </div>
    );
  }

  const totalBeats = composition.params.measures * composition.params.timeSignature[0];
  const totalNotes = PIANO_RANGE.high - PIANO_RANGE.low;
  const gridHeight = totalNotes * NOTE_HEIGHT;
  const gridWidth = Math.max(800, totalBeats * 30);

  return (
    <div className="flex-1 flex overflow-hidden bg-zinc-950/30">
      {/* Piano keyboard */}
      <div className="w-14 shrink-0 overflow-y-auto custom-scrollbar border-r border-zinc-800/50">
        <div style={{ height: gridHeight }}>
          {Array.from({ length: totalNotes }, (_, i) => {
            const midi = PIANO_RANGE.high - i;
            const isBlack = BLACK_KEYS.includes(midi % 12);
            const noteStr = midiNoteToString(midi);
            return (
              <div
                key={midi}
                className={`flex items-center justify-end pr-1.5 text-[8px] font-mono border-b ${
                  isBlack
                    ? 'bg-zinc-900 border-zinc-800/30 text-zinc-500'
                    : 'bg-zinc-850 border-zinc-800/20 text-zinc-400'
                }`}
                style={{ height: NOTE_HEIGHT }}
              >
                {midi % 12 === 0 ? noteStr : ''}
              </div>
            );
          })}
        </div>
      </div>

      {/* Grid + notes */}
      <div className="flex-1 overflow-auto custom-scrollbar">
        <div className="relative" style={{ width: gridWidth, height: gridHeight }}>
          {/* Horizontal lines */}
          {Array.from({ length: totalNotes }, (_, i) => {
            const midi = PIANO_RANGE.high - i;
            const isBlack = BLACK_KEYS.includes(midi % 12);
            return (
              <div
                key={i}
                className={`absolute left-0 right-0 border-b ${
                  isBlack ? 'bg-zinc-900/30 border-zinc-800/20' : 'border-zinc-800/10'
                }`}
                style={{ top: i * NOTE_HEIGHT, height: NOTE_HEIGHT }}
              />
            );
          })}

          {/* Beat lines */}
          {Array.from({ length: totalBeats }, (_, i) => (
            <div
              key={i}
              className={`absolute top-0 bottom-0 ${
                i % composition.params.timeSignature[0] === 0
                  ? 'border-l border-zinc-700/40'
                  : 'border-l border-zinc-800/20'
              }`}
              style={{ left: (i / totalBeats) * gridWidth }}
            />
          ))}

          {/* Note blocks */}
          {track.notes.map((note, i) => {
            if (note.pitch < PIANO_RANGE.low || note.pitch > PIANO_RANGE.high) return null;

            const x = (note.startBeat / totalBeats) * gridWidth;
            const y = (PIANO_RANGE.high - note.pitch) * NOTE_HEIGHT;
            const w = Math.max(3, (note.duration / totalBeats) * gridWidth);
            const opacity = 0.5 + (note.velocity / 127) * 0.5;

            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, scaleX: 0 }}
                animate={{ opacity, scaleX: 1 }}
                transition={{ delay: i * 0.002, duration: 0.2 }}
                className="absolute rounded-sm"
                style={{
                  left: x,
                  top: y,
                  width: w,
                  height: NOTE_HEIGHT - 1,
                  backgroundColor: track.color,
                  transformOrigin: 'left',
                }}
                title={`${midiNoteToString(note.pitch)} vel:${note.velocity}`}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
