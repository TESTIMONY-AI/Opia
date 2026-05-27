import { useEffect, type RefObject } from 'react';
import type { PrevisEngine } from '../../core/renderer/PrevisEngine';
import type { CameraId } from '../../types';

interface StageViewportProps {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  engine: PrevisEngine | null;
  activeCamera: CameraId;
}

export function StageViewport({
  canvasRef,
  engine,
  activeCamera,
}: StageViewportProps) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !engine) return;

    const sync = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (w > 0 && h > 0) engine.resizeMain(w, h);
    };

    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(canvas);
    window.addEventListener('resize', sync);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', sync);
    };
  }, [canvasRef, engine]);

  return (
    <div className="stage-viewport">
      <div className="stage-viewport__hud">
        <span className="stage-viewport__badge">3D STAGE</span>
        <span className="stage-viewport__cam">{activeCamera.toUpperCase()}</span>
        <span className="stage-viewport__hint">drag to orbit · scroll to zoom</span>
      </div>
      <canvas ref={canvasRef} className="stage-viewport__canvas" />
    </div>
  );
}
