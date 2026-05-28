import { useEffect, useRef } from 'react';
import type { PrevisEngine } from '../../core/renderer/PrevisEngine';
import type { CameraId } from '../../types';
import { ViewSnapButton } from './ViewSnapButton';

interface ViewportMonitorProps {
  engine: PrevisEngine;
  id: CameraId;
  label: string;
  active?: boolean;
  snapDisabled?: boolean;
  onSelect?: () => void;
  onSnap: () => void;
}

export function ViewportMonitor({
  engine,
  id,
  label,
  active = false,
  snapDisabled = false,
  onSelect,
  onSnap,
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
    <div
      className={[
        'monitor',
        active ? 'monitor--on-air' : '',
        onSelect ? 'monitor--selectable' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      role={onSelect ? 'button' : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onClick={onSelect}
      onKeyDown={
        onSelect
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelect();
              }
            }
          : undefined
      }
    >
      <span className="monitor__label">{label}</span>
      <ViewSnapButton
        label="SNAP"
        title={`Save ${label} screenshot`}
        disabled={snapDisabled}
        onSnap={onSnap}
      />
      <canvas ref={canvasRef} className="monitor__canvas" />
    </div>
  );
}
