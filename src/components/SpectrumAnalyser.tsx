import { useEffect, useRef } from 'react';
import { useStore } from '../stores/useStore';
import { getAnalyserNode, getWaveformNode } from '../engine/audio';

export function SpectrumAnalyser() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const { transport } = useStore();

  useEffect(() => {
    function draw() {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      try {
        const analyser = getAnalyserNode();
        const waveform = getWaveformNode();
        const fftValues = analyser.getValue() as Float32Array;
        const waveValues = waveform.getValue() as Float32Array;

        ctx.fillStyle = 'rgba(9, 9, 11, 0.6)';
        ctx.fillRect(0, 0, w, h);

        const barCount = fftValues.length;
        const barWidth = (w / barCount) * 0.7;
        const gap = (w / barCount) * 0.3;

        for (let i = 0; i < barCount; i++) {
          const db = fftValues[i] as number;
          const normalised = Math.max(0, (db + 100) / 100);
          const barH = normalised * h * 0.85;

          const x = i * (barWidth + gap);
          const hue = 30 + (i / barCount) * 15;

          const gradient = ctx.createLinearGradient(x, h, x, h - barH);
          gradient.addColorStop(0, `hsla(${hue}, 80%, 55%, 0.9)`);
          gradient.addColorStop(0.6, `hsla(${hue}, 70%, 50%, 0.6)`);
          gradient.addColorStop(1, `hsla(${hue}, 60%, 45%, 0.2)`);

          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.roundRect(x, h - barH, barWidth, barH, 1.5);
          ctx.fill();
        }

        ctx.beginPath();
        ctx.strokeStyle = 'rgba(200, 169, 126, 0.35)';
        ctx.lineWidth = 1.2;
        for (let i = 0; i < waveValues.length; i++) {
          const x = (i / waveValues.length) * w;
          const y = ((waveValues[i] as number) + 1) / 2 * h;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();

      } catch {
        // analyser not ready yet
      }

      rafRef.current = requestAnimationFrame(draw);
    }

    if (transport.isPlaying) {
      rafRef.current = requestAnimationFrame(draw);
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [transport.isPlaying]);

  return (
    <canvas
      ref={canvasRef}
      width={320}
      height={48}
      className="rounded-lg opacity-80"
    />
  );
}
