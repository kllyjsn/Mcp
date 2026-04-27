import { Play, Pause, Square, RotateCcw, Repeat, SkipBack } from 'lucide-react';
import { useStore } from '../stores/useStore';
import { motion } from 'framer-motion';
import { SpectrumAnalyser } from './SpectrumAnalyser';

export function TransportBar() {
  const {
    transport,
    composition,
    params,
    togglePlay,
    stopPlayback,
    generate,
    isGenerating,
    toggleLoop,
    setTempo,
  } = useStore();

  return (
    <div className="flex items-center gap-3 px-6 py-3 bg-zinc-900/80 border-b border-zinc-800/50 backdrop-blur-sm">
      <div className="flex items-center gap-1.5">
        <button
          onClick={stopPlayback}
          className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
          title="Stop"
        >
          <Square size={16} fill="currentColor" />
        </button>
        <button
          onClick={stopPlayback}
          className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
          title="Rewind"
        >
          <SkipBack size={16} />
        </button>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={togglePlay}
          disabled={!composition}
          className={`p-3 rounded-xl transition-all ${
            transport.isPlaying
              ? 'bg-amber-600/20 text-amber-400 hover:bg-amber-600/30'
              : 'bg-amber-600 text-zinc-900 hover:bg-amber-500 disabled:opacity-30'
          }`}
          title={transport.isPlaying ? 'Pause' : 'Play'}
        >
          {transport.isPlaying ? <Pause size={18} /> : <Play size={18} fill="currentColor" />}
        </motion.button>
        <button
          onClick={toggleLoop}
          className={`p-2 rounded-lg transition-colors ${
            transport.loop
              ? 'bg-amber-600/20 text-amber-400'
              : 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'
          }`}
          title="Loop"
        >
          <Repeat size={16} />
        </button>
      </div>

      <div className="h-6 w-px bg-zinc-800 mx-1" />

      <div className="flex items-center gap-2">
        <span className="text-[11px] text-zinc-500 uppercase tracking-wider font-medium">BPM</span>
        <input
          type="number"
          value={params.tempo}
          onChange={e => setTempo(Math.max(40, Math.min(240, +e.target.value)))}
          className="w-14 bg-zinc-800/60 border border-zinc-700/50 rounded-md px-2 py-1 text-sm text-zinc-200 text-center font-mono focus:outline-none focus:border-amber-600/50"
        />
      </div>

      <div className="flex items-center gap-2">
        <span className="text-[11px] text-zinc-500 uppercase tracking-wider font-medium">
          {params.timeSignature[0]}/{params.timeSignature[1]}
        </span>
      </div>

      <div className="flex-1 flex items-center justify-center">
        <SpectrumAnalyser />
      </div>

      <div className="flex items-center gap-2">
        {composition && (
          <span className="text-xs text-zinc-500 font-mono">
            {composition.name}
          </span>
        )}
      </div>

      <div className="h-6 w-px bg-zinc-800 mx-1" />

      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={() => generate()}
        disabled={isGenerating}
        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-zinc-900 rounded-lg text-sm font-semibold transition-all disabled:opacity-50"
      >
        <RotateCcw size={14} className={isGenerating ? 'animate-spin' : ''} />
        {isGenerating ? 'Composing...' : 'Compose'}
      </motion.button>
    </div>
  );
}
