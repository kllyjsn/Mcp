import { useState } from 'react';
import { useStore } from '../stores/useStore';
import { PRESETS } from '../engine/presets';
import type { Preset } from '../engine/presets';
import { Bookmark, Music, Headphones, Clapperboard, Heart, ChevronDown, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CATEGORY_META: Record<string, { label: string; icon: typeof Music }> = {
  listening_room: { label: 'Listening Room', icon: Headphones },
  classical: { label: 'Classical', icon: Music },
  production: { label: 'Production', icon: Clapperboard },
  mood: { label: 'Mood', icon: Heart },
};

function PresetCard({ preset, onSelect }: { preset: Preset; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      className="w-full text-left p-2.5 rounded-lg bg-zinc-800/30 border border-zinc-700/20 hover:border-amber-600/30 hover:bg-zinc-800/50 transition-all group"
    >
      <div className="text-[11px] text-amber-400/90 font-semibold group-hover:text-amber-400 transition-colors">
        {preset.name}
      </div>
      <div className="text-[9px] text-zinc-500 mt-0.5 leading-relaxed line-clamp-2">
        {preset.description}
      </div>
    </button>
  );
}

export function PresetsPanel() {
  const { setParam, generate } = useStore();
  const [expandedCategory, setExpandedCategory] = useState<string | null>('listening_room');

  const applyPreset = (preset: Preset) => {
    const entries = Object.entries(preset.params) as [keyof typeof preset.params, unknown][];
    for (const [key, value] of entries) {
      if (value !== undefined) {
        setParam(key, value as never);
      }
    }
    setTimeout(() => generate(), 50);
  };

  const categories = [...new Set(PRESETS.map(p => p.category))];

  return (
    <div className="space-y-2">
      <h3 className="text-xs text-zinc-500 uppercase tracking-widest font-semibold flex items-center gap-2">
        <Bookmark size={12} /> Presets
      </h3>
      <div className="space-y-1">
        {categories.map(cat => {
          const meta = CATEGORY_META[cat] ?? { label: cat, icon: Music };
          const Icon = meta.icon;
          const isExpanded = expandedCategory === cat;
          const presets = PRESETS.filter(p => p.category === cat);

          return (
            <div key={cat}>
              <button
                onClick={() => setExpandedCategory(isExpanded ? null : cat)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[11px] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 transition-colors"
              >
                <Icon size={11} />
                <span className="font-medium">{meta.label}</span>
                <span className="text-zinc-600 text-[9px]">({presets.length})</span>
                <div className="flex-1" />
                {isExpanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
              </button>
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-1 pl-2 pt-1 pb-2">
                      {presets.map(p => (
                        <PresetCard
                          key={p.name}
                          preset={p}
                          onSelect={() => applyPreset(p)}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
