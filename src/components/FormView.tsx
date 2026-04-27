import { useStore } from '../stores/useStore';
import { motion } from 'framer-motion';

const SECTION_COLORS: Record<string, string> = {
  intro: '#6B7280',
  A: '#C8A97E',
  B: '#7E9CC8',
  A_prime: '#D4B896',
  bridge: '#8B7EC8',
  climax: '#C87E7E',
  outro: '#6B7280',
  development: '#7EC87E',
};

export function FormView() {
  const { composition } = useStore();

  if (!composition?.form || composition.form.length === 0) return null;

  const totalMeasures = composition.params.measures;

  return (
    <div className="px-4 py-2 bg-zinc-900/30 border-b border-zinc-800/30">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">Form</span>
      </div>
      <div className="flex gap-0.5 h-6">
        {composition.form.map((section, i) => {
          const widthPercent = (section.length / totalMeasures) * 100;
          const color = SECTION_COLORS[section.type] ?? '#6B7280';

          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              transition={{ delay: i * 0.05, duration: 0.2 }}
              className="relative rounded flex items-center justify-center group cursor-default"
              style={{
                width: `${widthPercent}%`,
                backgroundColor: `${color}20`,
                border: `1px solid ${color}40`,
                transformOrigin: 'left',
              }}
              title={`${section.label} (m.${section.startMeasure + 1}–${section.startMeasure + section.length}) intensity: ${Math.round(section.intensity * 100)}%`}
            >
              <span
                className="text-[9px] font-medium truncate px-1"
                style={{ color }}
              >
                {section.label}
              </span>
              <div
                className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b"
                style={{
                  backgroundColor: color,
                  opacity: section.intensity * 0.6,
                }}
              />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
