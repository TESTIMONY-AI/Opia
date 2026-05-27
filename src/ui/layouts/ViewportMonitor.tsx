import { useEffect, useRef } from 'react';
import type { PrevisEngine } from '../../core/renderer/PrevisEngine';
import type { CameraId } from '../../types';

interface ViewportMonitorProps {
  engine: PrevisEngine;
  id: CameraId;
  label: string;
  active: boolean;
  onSelect: () => void;
}

export function ViewportMonitor({
  engine,
  id,
  label,
  active,
  onSelect,
}: ViewportMonitorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ro = new ResizeObserver(() => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (w > 0 && h > 0) engine.resizeMonitor(w, h, id);
    });
    ro.observe(canvas);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (w > 0 && h > 0) engine.resizeMonitor(w, h, id);

    let frame = 0;
    const paint = () => {
      frame = requestAnimationFrame(paint);
      engine.paintMonitor(id, canvas);
    };
    paint();

    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
    };
  }, [engine, id]);

  return (
    <button
      type="button"
      className={`monitor ${active ? 'monitor--on-air' : ''}`}
      onClick={onSelect}
    >
      <span className="monitor__label">{label}</span>
      <canvas ref={canvasRef} className="monitor__canvas" />
    </button>
  );
}
