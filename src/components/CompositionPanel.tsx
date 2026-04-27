import { useState } from 'react';
import { useStore } from '../stores/useStore';
import type { NoteName, ScaleType, CompositionStyle, DynamicCurve } from '../types/music';
import { NOTE_NAMES } from '../engine/scales';
import { LISTENING_ROOM_PRESETS } from '../engine/presets';
import { Music, Waves, Zap, Heart, Sparkles, Coffee, Disc3, Church, Crown, Flame, Theater, Moon, Bookmark } from 'lucide-react';

const SCALES: { value: ScaleType; label: string }[] = [
  { value: 'major', label: 'Major (Ionian)' },
  { value: 'natural_minor', label: 'Natural Minor' },
  { value: 'harmonic_minor', label: 'Harmonic Minor' },
  { value: 'melodic_minor', label: 'Melodic Minor' },
  { value: 'dorian', label: 'Dorian' },
  { value: 'phrygian', label: 'Phrygian' },
  { value: 'lydian', label: 'Lydian' },
  { value: 'mixolydian', label: 'Mixolydian' },
  { value: 'pentatonic_major', label: 'Pentatonic Major' },
  { value: 'pentatonic_minor', label: 'Pentatonic Minor' },
  { value: 'blues', label: 'Blues' },
  { value: 'whole_tone', label: 'Whole Tone' },
  { value: 'locrian', label: 'Locrian' },
  { value: 'diminished', label: 'Diminished' },
];

const STYLES: { value: CompositionStyle; label: string; icon: typeof Music }[] = [
  { value: 'classical', label: 'Classical', icon: Music },
  { value: 'romantic', label: 'Romantic', icon: Heart },
  { value: 'late_romantic', label: 'Late Romantic', icon: Crown },
  { value: 'impressionist', label: 'Impressionist', icon: Waves },
  { value: 'chamber', label: 'Chamber', icon: Theater },
  { value: 'jazz', label: 'Jazz', icon: Sparkles },
  { value: 'post_bop', label: 'Post-Bop', icon: Flame },
  { value: 'neo_soul', label: 'Neo Soul', icon: Sparkles },
  { value: 'bossa_nova', label: 'Bossa Nova', icon: Disc3 },
  { value: 'lo_fi', label: 'Lo-Fi', icon: Coffee },
  { value: 'gospel', label: 'Gospel', icon: Church },
  { value: 'film_noir', label: 'Film Noir', icon: Moon },
  { value: 'ambient', label: 'Ambient', icon: Waves },
  { value: 'minimalist', label: 'Minimalist', icon: Zap },
  { value: 'cinematic', label: 'Cinematic', icon: Music },
  { value: 'electronic', label: 'Electronic', icon: Zap },
];

const DYNAMICS: { value: DynamicCurve; label: string }[] = [
  { value: 'crescendo', label: 'Crescendo' },
  { value: 'decrescendo', label: 'Decrescendo' },
  { value: 'swell', label: 'Swell' },
  { value: 'terraced', label: 'Terraced' },
  { value: 'flat', label: 'Flat' },
  { value: 'dramatic', label: 'Dramatic' },
];

const PRESET_CATEGORIES = [
  { key: 'jazz_club' as const, label: 'Jazz Club' },
  { key: 'concert_hall' as const, label: 'Concert Hall' },
  { key: 'salon' as const, label: 'Salon' },
  { key: 'late_night' as const, label: 'Late Night' },
  { key: 'studio' as const, label: 'Studio' },
];

function SliderParam({ label, value, onChange, min = 1, max = 10 }: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <span className="text-[11px] text-zinc-400 uppercase tracking-wider font-medium">{label}</span>
        <span className="text-xs text-amber-500 font-mono font-medium">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={e => onChange(+e.target.value)}
        className="w-full h-1.5 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-amber-600
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5
          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-amber-500 [&::-webkit-slider-thumb]:shadow-lg
          [&::-webkit-slider-thumb]:shadow-amber-600/30 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-amber-400/50"
      />
    </div>
  );
}

export function CompositionPanel() {
  const { params, setParam } = useStore();
  const [showPresets, setShowPresets] = useState(false);
  const [presetCategory, setPresetCategory] = useState<typeof PRESET_CATEGORIES[number]['key']>('jazz_club');

  function applyPreset(preset: typeof LISTENING_ROOM_PRESETS[number]) {
    const p = preset.params;
    if (p.key) setParam('key', p.key);
    if (p.scale) setParam('scale', p.scale);
    if (p.tempo) setParam('tempo', p.tempo);
    if (p.style) setParam('style', p.style);
    if (p.dynamics) setParam('dynamics', p.dynamics);
    if (p.harmonicComplexity) setParam('harmonicComplexity', p.harmonicComplexity);
    if (p.melodicDensity) setParam('melodicDensity', p.melodicDensity);
    if (p.rhythmicVariety) setParam('rhythmicVariety', p.rhythmicVariety);
    if (p.expressiveness) setParam('expressiveness', p.expressiveness);
    if (p.measures) setParam('measures', p.measures);
    setShowPresets(false);
  }

  const filteredPresets = LISTENING_ROOM_PRESETS.filter(p => p.category === presetCategory);

  return (
    <div className="w-72 bg-zinc-900/60 border-r border-zinc-800/50 overflow-y-auto custom-scrollbar">
      <div className="p-4 space-y-5">
        {/* Presets toggle */}
        <button
          onClick={() => setShowPresets(!showPresets)}
          className={`w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
            showPresets
              ? 'bg-amber-600/20 text-amber-400 border border-amber-600/30'
              : 'bg-zinc-800/60 text-zinc-300 border border-zinc-700/40 hover:bg-zinc-800 hover:text-amber-400'
          }`}
        >
          <Bookmark size={13} />
          Listening Room Presets
        </button>

        {showPresets && (
          <div className="space-y-3 animate-in fade-in">
            <div className="flex flex-wrap gap-1">
              {PRESET_CATEGORIES.map(cat => (
                <button
                  key={cat.key}
                  onClick={() => setPresetCategory(cat.key)}
                  className={`px-2 py-1 rounded text-[10px] font-medium transition-all ${
                    presetCategory === cat.key
                      ? 'bg-amber-600/20 text-amber-400'
                      : 'bg-zinc-800/40 text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar">
              {filteredPresets.map(preset => (
                <button
                  key={preset.name}
                  onClick={() => applyPreset(preset)}
                  className="w-full text-left px-3 py-2.5 rounded-lg bg-zinc-800/30 border border-zinc-700/30 hover:bg-zinc-800/60 hover:border-amber-600/20 transition-all group"
                >
                  <div className="text-xs text-zinc-200 font-medium group-hover:text-amber-400 transition-colors">
                    {preset.name}
                  </div>
                  <div className="text-[10px] text-zinc-500 mt-0.5 leading-tight">
                    {preset.description}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="h-px bg-zinc-800/50" />

        <div>
          <h3 className="text-xs text-zinc-500 uppercase tracking-widest font-semibold mb-3 flex items-center gap-2">
            <Music size={12} /> Tonality
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] text-zinc-400 uppercase tracking-wider font-medium mb-1 block">Key</label>
              <select
                value={params.key}
                onChange={e => setParam('key', e.target.value as NoteName)}
                className="w-full bg-zinc-800/60 border border-zinc-700/50 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-amber-600/50"
              >
                {NOTE_NAMES.map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] text-zinc-400 uppercase tracking-wider font-medium mb-1 block">Measures</label>
              <select
                value={params.measures}
                onChange={e => setParam('measures', +e.target.value)}
                className="w-full bg-zinc-800/60 border border-zinc-700/50 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-amber-600/50"
              >
                {[4, 8, 12, 16, 24, 32].map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-2">
            <label className="text-[11px] text-zinc-400 uppercase tracking-wider font-medium mb-1 block">Scale / Mode</label>
            <select
              value={params.scale}
              onChange={e => setParam('scale', e.target.value as ScaleType)}
              className="w-full bg-zinc-800/60 border border-zinc-700/50 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-amber-600/50"
            >
              {SCALES.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="h-px bg-zinc-800/50" />

        <div>
          <h3 className="text-xs text-zinc-500 uppercase tracking-widest font-semibold mb-3">Style</h3>
          <div className="grid grid-cols-3 gap-1.5">
            {STYLES.map(s => (
              <button
                key={s.value}
                onClick={() => setParam('style', s.value)}
                className={`px-2 py-2 rounded-lg text-[11px] font-medium transition-all ${
                  params.style === s.value
                    ? 'bg-amber-600/20 text-amber-400 border border-amber-600/30'
                    : 'bg-zinc-800/40 text-zinc-400 border border-zinc-700/30 hover:bg-zinc-800/70 hover:text-zinc-300'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="h-px bg-zinc-800/50" />

        <div>
          <h3 className="text-xs text-zinc-500 uppercase tracking-widest font-semibold mb-3">Dynamics</h3>
          <div className="grid grid-cols-3 gap-1.5">
            {DYNAMICS.map(d => (
              <button
                key={d.value}
                onClick={() => setParam('dynamics', d.value)}
                className={`px-2 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                  params.dynamics === d.value
                    ? 'bg-amber-600/20 text-amber-400 border border-amber-600/30'
                    : 'bg-zinc-800/40 text-zinc-400 border border-zinc-700/30 hover:bg-zinc-800/70 hover:text-zinc-300'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        <div className="h-px bg-zinc-800/50" />

        <div className="space-y-3">
          <h3 className="text-xs text-zinc-500 uppercase tracking-widest font-semibold flex items-center gap-2">
            <Sparkles size={12} /> Expression
          </h3>
          <SliderParam
            label="Harmonic Complexity"
            value={params.harmonicComplexity}
            onChange={v => setParam('harmonicComplexity', v)}
          />
          <SliderParam
            label="Melodic Density"
            value={params.melodicDensity}
            onChange={v => setParam('melodicDensity', v)}
          />
          <SliderParam
            label="Rhythmic Variety"
            value={params.rhythmicVariety}
            onChange={v => setParam('rhythmicVariety', v)}
          />
          <SliderParam
            label="Expressiveness"
            value={params.expressiveness}
            onChange={v => setParam('expressiveness', v)}
          />
        </div>
      </div>
    </div>
  );
}
