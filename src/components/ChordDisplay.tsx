import { useStore } from '../stores/useStore';
import { chordToString } from '../engine/chords';
import { motion } from 'framer-motion';
import { midiNoteToString } from '../engine/scales';

export function ChordDisplay() {
  const { composition } = useStore();

  if (!composition) return null;

  return (
    <div className="px-4 py-3 bg-zinc-900/40 border-t border-zinc-800/50">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">Chord Progression</span>
        <span className="text-[10px] text-zinc-600 font-mono">
          {composition.params.key} {composition.params.scale.replace('_', ' ')}
        </span>
      </div>
      <div className="flex gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
        {composition.chordProgression.map((chord, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.03 }}
            className="flex-shrink-0 bg-zinc-800/40 rounded-lg px-3 py-2 border border-zinc-700/30 hover:border-amber-600/30 transition-colors group"
          >
            <div className="text-sm text-amber-400 font-semibold font-mono">
              {chordToString(chord)}
            </div>
            <div className="text-[9px] text-zinc-500 font-mono mt-0.5">
              {chord.romanNumeral}
            </div>
            <div className="text-[8px] text-zinc-600 mt-1 hidden group-hover:block">
              {chord.voicing.map(v => midiNoteToString(v)).join(' ')}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
