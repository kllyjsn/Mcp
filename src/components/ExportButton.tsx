import { useRef, useEffect } from 'react';
import { useStore } from '../stores/useStore';
import {
  startRecording,
  stopRecording,
  initAudio,
} from '../engine/audio';
import { Download, Circle } from 'lucide-react';

export function ExportButton() {
  const { composition, isExporting, setExporting, stopPlayback, togglePlay } = useStore();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleExport = async () => {
    if (!composition || isExporting) return;
    setExporting(true);

    try {
      await initAudio();

      stopPlayback();
      await startRecording();
      await togglePlay();

      const totalBeats = composition.params.measures * composition.params.timeSignature[0];
      const durationMs = (totalBeats / composition.params.tempo) * 60 * 1000 + 1500;

      timeoutRef.current = setTimeout(async () => {
        try {
          stopPlayback();
          const blob = await stopRecording();
          if (blob) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${composition.name.replace(/[^a-zA-Z0-9 ]/g, '')}.webm`;
            a.click();
            URL.revokeObjectURL(url);
          }
        } finally {
          setExporting(false);
        }
      }, durationMs);
    } catch {
      await stopRecording().catch(() => {});
      setExporting(false);
    }
  };

  if (!composition) return null;

  return (
    <button
      onClick={handleExport}
      disabled={isExporting}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
        isExporting
          ? 'bg-red-600/20 text-red-400 border border-red-600/30'
          : 'bg-zinc-800/60 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 border border-zinc-700/30'
      }`}
      title={isExporting ? 'Recording...' : 'Export audio'}
    >
      {isExporting ? (
        <>
          <Circle size={10} className="text-red-400 animate-pulse" fill="currentColor" />
          Recording...
        </>
      ) : (
        <>
          <Download size={12} />
          Export
        </>
      )}
    </button>
  );
}
