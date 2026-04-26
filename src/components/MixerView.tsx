import { useStore } from '../stores/useStore';
import { Volume2, VolumeX } from 'lucide-react';
import { motion } from 'framer-motion';

function ChannelStrip({ trackId, trackIndex }: { trackId: string; trackIndex: number }) {
  const { composition, updateTrackVolume, updateTrackPan, toggleTrackMute, toggleTrackSolo } = useStore();
  const track = composition?.tracks.find(t => t.id === trackId);
  if (!track) return null;

  const dbValue = track.volume > 0 ? (20 * Math.log10(track.volume)).toFixed(1) : '-∞';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: trackIndex * 0.05 }}
      className="flex flex-col items-center gap-3 bg-zinc-900/40 rounded-xl p-4 border border-zinc-800/30 min-w-[100px]"
    >
      {/* Track name */}
      <div className="flex items-center gap-1.5">
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: track.color }} />
        <span className="text-xs text-zinc-300 font-medium">{track.name}</span>
      </div>

      {/* Pan knob */}
      <div className="space-y-1">
        <span className="text-[9px] text-zinc-500 uppercase tracking-wider block text-center">Pan</span>
        <input
          type="range"
          min={-100}
          max={100}
          value={Math.round(track.pan * 100)}
          onChange={e => updateTrackPan(trackId, +e.target.value / 100)}
          className="w-16 h-1 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-amber-600
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5
            [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-amber-500"
        />
        <div className="text-[9px] text-zinc-500 text-center font-mono">
          {track.pan === 0 ? 'C' : track.pan < 0 ? `L${Math.abs(Math.round(track.pan * 100))}` : `R${Math.round(track.pan * 100)}`}
        </div>
      </div>

      {/* Volume fader */}
      <div className="flex flex-col items-center gap-1 flex-1">
        <span className="text-[9px] text-zinc-500 uppercase tracking-wider">Vol</span>
        <div className="relative h-32 w-6 flex items-center justify-center">
          <div className="absolute inset-x-0 bg-zinc-800/80 rounded-full w-1.5 mx-auto h-full">
            <div
              className="absolute bottom-0 rounded-full w-full transition-all"
              style={{
                height: `${track.volume * 100}%`,
                backgroundColor: track.color,
                opacity: 0.6,
              }}
            />
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(track.volume * 100)}
            onChange={e => updateTrackVolume(trackId, +e.target.value / 100)}
            className="absolute w-full h-full opacity-0 cursor-pointer"
            style={{ writingMode: 'vertical-lr', direction: 'rtl' }}
          />
        </div>
        <span className="text-[10px] text-zinc-400 font-mono">{dbValue} dB</span>
      </div>

      {/* Mute / Solo */}
      <div className="flex gap-1.5">
        <button
          onClick={() => toggleTrackMute(trackId)}
          className={`px-2 py-1 rounded text-[10px] font-bold transition-colors ${
            track.muted
              ? 'bg-red-600/20 text-red-400'
              : 'bg-zinc-800/60 text-zinc-500 hover:text-zinc-300'
          }`}
        >
          M
        </button>
        <button
          onClick={() => toggleTrackSolo(trackId)}
          className={`px-2 py-1 rounded text-[10px] font-bold transition-colors ${
            track.solo
              ? 'bg-amber-600/20 text-amber-400'
              : 'bg-zinc-800/60 text-zinc-500 hover:text-zinc-300'
          }`}
        >
          S
        </button>
      </div>

      {/* Effects indicators */}
      <div className="flex flex-wrap gap-1 justify-center">
        {track.effects.map((fx, i) => (
          <span key={i} className="text-[8px] text-zinc-500 bg-zinc-800/40 rounded px-1 py-0.5 uppercase">
            {fx.type.slice(0, 3)}
          </span>
        ))}
      </div>
    </motion.div>
  );
}

export function MixerView() {
  const { composition } = useStore();

  if (!composition) {
    return (
      <div className="flex-1 flex items-center justify-center bg-zinc-950/50">
        <div className="text-center space-y-3">
          <Volume2 size={40} className="text-zinc-700 mx-auto" />
          <p className="text-zinc-500">Generate a composition to use the mixer</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-end justify-center gap-4 p-6 bg-zinc-950/30 overflow-x-auto">
      {composition.tracks.map((track, i) => (
        <ChannelStrip key={track.id} trackId={track.id} trackIndex={i} />
      ))}

      {/* Master channel */}
      <div className="flex flex-col items-center gap-3 bg-zinc-800/30 rounded-xl p-4 border border-amber-600/20 min-w-[100px]">
        <span className="text-xs text-amber-400 font-semibold">Master</span>
        <div className="flex items-center gap-2 mt-auto">
          <VolumeX size={14} className="text-zinc-500" />
          <Volume2 size={14} className="text-amber-500" />
        </div>
      </div>
    </div>
  );
}
