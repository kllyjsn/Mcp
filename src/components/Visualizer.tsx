import { useEffect, useRef } from 'react';
import { useStore } from '../stores/useStore';
import { getAnalyser } from '../engine/audio';

export function Visualizer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const { transport } = useStore();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const analyser = getAnalyser();

    const draw = () => {
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      const waveform = analyser.getValue() as Float32Array;

      // Background gradient
      const gradient = ctx.createLinearGradient(0, 0, width, 0);
      gradient.addColorStop(0, 'rgba(217, 119, 6, 0.05)');
      gradient.addColorStop(0.5, 'rgba(217, 119, 6, 0.1)');
      gradient.addColorStop(1, 'rgba(217, 119, 6, 0.05)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Center line
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(113, 113, 122, 0.15)';
      ctx.lineWidth = 0.5;
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();

      // Waveform
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(217, 119, 6, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.lineJoin = 'round';

      const sliceWidth = width / waveform.length;
      let x = 0;

      for (let i = 0; i < waveform.length; i++) {
        const v = (waveform[i] as number) * 0.5 + 0.5;
        const y = v * height;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        x += sliceWidth;
      }

      ctx.stroke();

      // Glow effect
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(217, 119, 6, 0.15)';
      ctx.lineWidth = 4;
      ctx.lineJoin = 'round';
      x = 0;
      for (let i = 0; i < waveform.length; i++) {
        const v = (waveform[i] as number) * 0.5 + 0.5;
        const y = v * height;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        x += sliceWidth;
      }
      ctx.stroke();

      animationRef.current = requestAnimationFrame(draw);
    };

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    animationRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [transport.isPlaying]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-8 rounded-md"
      style={{ imageRendering: 'auto' }}
    />
  );
}
