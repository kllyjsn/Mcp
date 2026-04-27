import { useStore } from '../stores/useStore';
import { RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { chordToString } from '../engine/chords';

function NoteBlock({ note, trackColor, totalBeats, viewWidth }: {
  note: { pitch: number; startBeat: number; duration: number; velocity: number };
  trackColor: string;
  totalBeats: number;
  viewWidth: number;
}) {
  const left = (note.startBeat / totalBeats) * viewWidth;
  const width = Math.max(2, (note.duration / totalBeats) * viewWidth);
  const opacity = 0.4 + (note.velocity / 127) * 0.6;

  return (
    <div
      className="absolute rounded-[2px]"
      style={{
        left: `${left}px`,
        width: `${width}px`,
        height: '3px',
        top: `${50 - ((note.pitch % 36) / 36) * 44}%`,
        backgroundColor: trackColor,
        opacity,
      }}
    />
  );
}

export function ArrangementView() {
  const { composition, selectedTrackId, setSelectedTrack, regenerateTrack } = useStore();

  if (!composition) {
    return (
      <div className="flex-1 flex items-center justify-center bg-zinc-950/50">
        <div className="text-center space-y-4">
          <div className="text-6xl opacity-20">🎼</div>
          <p className="text-zinc-500 text-lg font-light">Set your parameters and click <span className="text-amber-500 font-medium">Compose</span></p>
          <p className="text-zinc-600 text-sm">Choose a key, scale, style, and let the engine write</p>
        </div>
      </div>
    );
  }

  const totalBeats = composition.params.measures * composition.params.timeSignature[0];
  const viewWidth = 800;

  return (
    <div className="flex-1 overflow-auto custom-scrollbar bg-zinc-950/30">
      {/* Section markers */}
      {composition.sections.length > 0 && (
        <div className="sticky top-0 z-20 flex bg-zinc-900/95 border-b border-zinc-800/40 backdrop-blur-sm">
          <div className="w-44 shrink-0 px-3 py-1 border-r border-zinc-800/50">
            <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">Sections</span>
          </div>
          <div className="flex-1 relative" style={{ minWidth: viewWidth }}>
            <div className="flex h-full">
              {composition.sections.map((section, i) => {
                const left = (section.startMeasure / composition.params.measures) * 100;
                const width = (section.lengthMeasures / composition.params.measures) * 100;
                const tensionPct = Math.round(section.tension * 100);
                return (
                  <div
                    key={i}
                    className="flex items-center justify-center border-r border-zinc-700/40 text-[10px] py-1"
                    style={{
                      position: 'absolute',
                      left: `${left}%`,
                      width: `${width}%`,
                      height: '100%',
                      background: `linear-gradient(90deg, rgba(217,119,6,${section.tension * 0.12}) 0%, rgba(217,119,6,${section.tension * 0.06}) 100%)`,
                    }}
                  >
                    <span className="text-amber-300/80 font-semibold capitalize">{section.kind}</span>
                    <span className="text-zinc-500 ml-1.5 text-[9px]">{tensionPct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Chord progression header */}
      <div className="sticky top-[29px] z-10 flex bg-zinc-900/90 border-b border-zinc-800/50 backdrop-blur-sm">
        <div className="w-44 shrink-0 px-3 py-2 border-r border-zinc-800/50">
          <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">Chords</span>
        </div>
        <div className="flex-1 relative" style={{ minWidth: viewWidth }}>
          <div className="flex h-full">
            {composition.chordProgression.map((chord, i) => {
              const left = (chord.startBeat / totalBeats) * 100;
              const width = (chord.duration / totalBeats) * 100;
              return (
                <div
                  key={i}
                  className="flex items-center justify-center border-r border-zinc-800/30 text-xs font-mono"
                  style={{ position: 'absolute', left: `${left}%`, width: `${width}%`, height: '100%' }}
                >
                  <span className="text-amber-400/80 font-medium">{chordToString(chord)}</span>
                  <span className="text-zinc-600 ml-1.5 text-[10px]">{chord.romanNumeral}</span>
                </div>
              );
            })}
          </div>
          {/* Beat markers */}
          <div className="absolute bottom-0 left-0 right-0 flex">
            {Array.from({ length: composition.params.measures }, (_, i) => (
              <div
                key={i}
                className="border-r border-zinc-800/30 text-[9px] text-zinc-600 px-1"
                style={{ width: `${100 / composition.params.measures}%` }}
              >
                {i + 1}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tracks */}
      {composition.tracks.map((track, trackIndex) => (
        <motion.div
          key={track.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: trackIndex * 0.05 }}
          className={`flex border-b border-zinc-800/30 cursor-pointer transition-colors ${
            selectedTrackId === track.id ? 'bg-zinc-800/30' : 'hover:bg-zinc-800/10'
          }`}
          onClick={() => setSelectedTrack(track.id)}
        >
          {/* Track label */}
          <div className="w-44 shrink-0 px-3 py-3 border-r border-zinc-800/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: track.color }}
              />
              <div>
                <div className="text-sm text-zinc-200 font-medium">{track.name}</div>
                <div className="text-[10px] text-zinc-500">{track.instrument}</div>
              </div>
            </div>
            <button
              onClick={e => { e.stopPropagation(); regenerateTrack(trackIndex); }}
              className="p-1 rounded hover:bg-zinc-700/50 text-zinc-500 hover:text-amber-400 transition-colors"
              title="Regenerate this track"
            >
              <RefreshCw size={12} />
            </button>
          </div>

          {/* Note display */}
          <div className="flex-1 relative overflow-hidden" style={{ minWidth: viewWidth, minHeight: 56 }}>
            {/* Measure grid */}
            {Array.from({ length: composition.params.measures }, (_, i) => (
              <div
                key={i}
                className="absolute top-0 bottom-0 border-r border-zinc-800/20"
                style={{ left: `${((i + 1) / composition.params.measures) * 100}%` }}
              />
            ))}
            {/* Notes */}
            {track.notes.map((note, ni) => (
              <NoteBlock
                key={ni}
                note={note}
                trackColor={track.color}
                totalBeats={totalBeats}
                viewWidth={viewWidth}
              />
            ))}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
