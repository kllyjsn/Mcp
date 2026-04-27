import { useEffect } from 'react';
import { useStore } from '../stores/useStore';
import { Play, Pause, Square, SkipBack, Repeat, Loader2, Download } from 'lucide-react';
import { SpectrumAnalyser } from './SpectrumAnalyser';
import { downloadMidi } from '../engine/midi';

export function TransportBar() {
  const {
    transport, composition, isGenerating,
    togglePlay, stopPlayback, generate, setParam,
  } = useStore();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'SELECT') return;

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          togglePlay();
          break;
        case 'Escape':
          stopPlayback();
          break;
        case 'KeyG':
          if ((e.ctrlKey || e.metaKey) && !isGenerating) {
            e.preventDefault();
            generate();
          }
          break;
        case 'KeyM':
          if ((e.ctrlKey || e.metaKey) && composition) {
            e.preventDefault();
            downloadMidi(composition);
          }
          break;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, stopPlayback, generate, isGenerating, composition]);

  return (
    <div className="flex items-center gap-4 px-6 py-3 bg-zinc-900/80 border-b border-zinc-800/50 backdrop-blur-sm">
      <div className="flex items-center gap-1.5">
        <button
          onClick={stopPlayback}
          className="p-2 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 transition-all"
          title="Stop (Esc)"
        >
          <SkipBack size={16} />
        </button>

        <button
          onClick={togglePlay}
          className={`p-2.5 rounded-xl transition-all ${
            transport.isPlaying
              ? 'bg-amber-600/20 text-amber-400 hover:bg-amber-600/30'
              : 'bg-zinc-800/60 text-zinc-300 hover:bg-zinc-800 hover:text-amber-400'
          }`}
          title="Play/Pause (Space)"
        >
          {transport.isPlaying ? <Pause size={18} /> : <Play size={18} />}
        </button>

        <button
          onClick={stopPlayback}
          className="p-2 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 transition-all"
          title="Stop"
        >
          <Square size={16} />
        </button>

        <button
          className={`p-2 rounded-lg transition-all ${
            transport.loop
              ? 'text-amber-400 bg-amber-600/15'
              : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
          }`}
          title="Loop"
        >
          <Repeat size={15} />
        </button>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">BPM</span>
        <input
          type="number"
          min={40}
          max={240}
          value={useStore.getState().params.tempo}
          onChange={e => setParam('tempo', Math.max(40, Math.min(240, +e.target.value)))}
          className="w-14 bg-zinc-800/60 border border-zinc-700/50 rounded-lg px-2 py-1 text-sm text-amber-400 font-mono text-center focus:outline-none focus:border-amber-600/50"
        />
      </div>

      <div className="flex-1 flex justify-center">
        <SpectrumAnalyser />
      </div>

      <div className="flex items-center gap-2">
        {composition && (
          <button
            onClick={() => downloadMidi(composition)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-800/50 text-zinc-300 hover:bg-zinc-800 hover:text-amber-400 transition-all text-xs font-medium border border-zinc-700/30"
            title="Export MIDI (Ctrl+M)"
          >
            <Download size={13} />
            MIDI
          </button>
        )}

        <button
          onClick={generate}
          disabled={isGenerating}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 text-zinc-950 font-semibold text-sm hover:from-amber-500 hover:to-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-amber-600/20"
          title="Generate (Ctrl+G)"
        >
          {isGenerating ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Composing...
            </>
          ) : (
            'Compose'
          )}
        </button>
      </div>
    </div>
  );
}
