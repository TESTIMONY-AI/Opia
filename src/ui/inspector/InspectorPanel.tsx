import { computeLedResolution } from '../../systems/led/ledResolution';
import { LightColorRow } from '../controls/LightColorRow';
import type {
  CameraId,
  LedSettings,
  LightId,
  LightingSettings,
  PrevisState,
} from '../../types';
import { LIGHT_IDS, LIGHT_LABELS } from '../../types';

interface InspectorPanelProps {
  state: PrevisState;
  onChange: (partial: Partial<PrevisState>) => void;
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
}) {
  return (
    <label className="inspector-row">
      <span className="inspector-row__label">
        {label}
        <em>{format ? format(value) : value.toFixed(2)}</em>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </label>
  );
}

export function InspectorPanel({ state, onChange }: InspectorPanelProps) {
  const patchLed = (patch: Partial<LedSettings>) =>
    onChange({ led: { ...state.led, ...patch } });

  const patchLight = (patch: Partial<LightingSettings>) =>
    onChange({ lighting: { ...state.lighting, ...patch } });

  const patchLightId = (id: LightId, patch: Partial<LightingSettings['lights'][LightId]>) =>
    onChange({
      lighting: {
        ...state.lighting,
        lights: {
          ...state.lighting.lights,
          [id]: { ...state.lighting.lights[id], ...patch },
        },
      },
    });

  const patchCam = (patch: Partial<PrevisState['cameras'][CameraId]>) =>
    onChange({
      cameras: {
        ...state.cameras,
        [state.activeCamera]: {
          ...state.cameras[state.activeCamera],
          ...patch,
        },
      },
    });

  const cam = state.cameras[state.activeCamera];
  const resolved = state.led.autoResolution
    ? computeLedResolution(
        state.stage.wallWidth,
        state.stage.wallHeight,
        state.led.pitchMm,
      )
    : { cols: state.led.ledCols, rows: state.led.ledRows };

  return (
    <aside className="inspector">
      <h2 className="panel-title">Properties</h2>

      <section className="inspector-section">
        <h3 className="section-title">LED Wall · Video</h3>
        <p className="inspector-hint">
          Simulated {resolved.cols}×{resolved.rows} pixels
          {state.led.autoResolution ? ' (from pitch)' : ''}
        </p>
        <SliderRow
          label="Pitch (mm)"
          value={state.led.pitchMm}
          min={2.5}
          max={10}
          step={0.1}
          format={(v) => `${v.toFixed(1)} mm`}
          onChange={(v) => patchLed({ pitchMm: v })}
        />
        <SliderRow
          label="Brightness"
          value={state.led.brightness}
          min={0.8}
          max={2.5}
          step={0.05}
          onChange={(v) => patchLed({ brightness: v })}
        />
        <SliderRow
          label="Contrast"
          value={state.led.contrast}
          min={0.8}
          max={1.4}
          step={0.02}
          onChange={(v) => patchLed({ contrast: v })}
        />
        <SliderRow
          label="Diode size"
          value={state.led.diodeSize}
          min={0.4}
          max={0.95}
          step={0.01}
          onChange={(v) => patchLed({ diodeSize: v })}
        />
        <SliderRow
          label="Bloom"
          value={state.led.bloomIntensity}
          min={0}
          max={0.8}
          step={0.02}
          onChange={(v) => patchLed({ bloomIntensity: v })}
        />
        <SliderRow
          label="Scanlines"
          value={state.led.scanlineAmount}
          min={0}
          max={0.6}
          step={0.02}
          onChange={(v) => patchLed({ scanlineAmount: v })}
        />
        <label className="toggle-row">
          <span>Flip media vertical</span>
          <input
            type="checkbox"
            checked={state.led.flipMediaY >= 0.5}
            onChange={(e) => patchLed({ flipMediaY: e.target.checked ? 1 : 0 })}
          />
        </label>
        <label className="toggle-row">
          <span>Auto resolution from pitch</span>
          <input
            type="checkbox"
            checked={state.led.autoResolution}
            onChange={(e) => patchLed({ autoResolution: e.target.checked })}
          />
        </label>
        {!state.led.autoResolution && (
          <>
            <SliderRow
              label="LED cols"
              value={state.led.ledCols}
              min={72}
              max={512}
              step={8}
              format={(v) => String(Math.round(v))}
              onChange={(v) => patchLed({ ledCols: Math.round(v) })}
            />
            <SliderRow
              label="LED rows"
              value={state.led.ledRows}
              min={40}
              max={288}
              step={4}
              format={(v) => String(Math.round(v))}
              onChange={(v) => patchLed({ ledRows: Math.round(v) })}
            />
          </>
        )}
      </section>

      <section className="inspector-section">
        <h3 className="section-title">Light Rig</h3>
        <SliderRow
          label="Master"
          value={state.lighting.master}
          min={0}
          max={1.5}
          step={0.05}
          onChange={(v) => patchLight({ master: v })}
        />
        <SliderRow
          label="Haze"
          value={state.lighting.haze}
          min={0}
          max={0.03}
          step={0.001}
          format={(v) => v.toFixed(3)}
          onChange={(v) => patchLight({ haze: v })}
        />
        <label className="toggle-row">
          <span>Back light shadows</span>
          <input
            type="checkbox"
            checked={state.lighting.shadows}
            onChange={(e) => patchLight({ shadows: e.target.checked })}
          />
        </label>
        <p className="inspector-hint inspector-hint--dim">
          Lights use real WebGL illumination — color hits the stage floor and
          riser. LED walls are self-lit (like real panels).
        </p>
        <div className="light-rig-list">
          {LIGHT_IDS.map((id) => (
            <LightColorRow
              key={id}
              label={LIGHT_LABELS[id]}
              control={state.lighting.lights[id]}
              onChange={(patch) => patchLightId(id, patch)}
            />
          ))}
        </div>
      </section>

      <section className="inspector-section">
        <h3 className="section-title">Camera · {state.activeCamera}</h3>
        <SliderRow
          label="Exposure"
          value={cam.exposure}
          min={0.5}
          max={2.5}
          step={0.05}
          onChange={(v) => patchCam({ exposure: v })}
        />
        <SliderRow
          label="ISO"
          value={cam.iso}
          min={100}
          max={6400}
          step={100}
          format={(v) => String(Math.round(v))}
          onChange={(v) => patchCam({ iso: Math.round(v) })}
        />
        <SliderRow
          label="Aperture"
          value={cam.aperture}
          min={1.4}
          max={11}
          step={0.1}
          onChange={(v) => patchCam({ aperture: v })}
        />
      </section>
    </aside>
  );
}
