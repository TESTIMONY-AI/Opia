import { LIGHT_COLOR_PRESETS } from '../../core/lighting/lightColors';
import type { LightControl } from '../../types';

interface LightColorRowProps {
  label: string;
  control: LightControl;
  onChange: (patch: Partial<LightControl>) => void;
}

export function LightColorRow({ label, control, onChange }: LightColorRowProps) {
  return (
    <div className={`light-row ${control.enabled ? '' : 'light-row--off'}`}>
      <div className="light-row__head">
        <label className="light-row__enable">
          <input
            type="checkbox"
            checked={control.enabled}
            onChange={(e) => onChange({ enabled: e.target.checked })}
          />
          <span>{label}</span>
        </label>
        <input
          type="color"
          className="light-row__picker"
          value={control.color}
          disabled={!control.enabled}
          onChange={(e) => onChange({ color: e.target.value })}
        />
      </div>
      <div className="light-row__presets">
        {LIGHT_COLOR_PRESETS.map((p) => (
          <button
            key={p.name}
            type="button"
            className="light-preset"
            title={p.name}
            disabled={!control.enabled}
            style={{ background: p.color }}
            onClick={() => onChange({ color: p.color })}
          />
        ))}
      </div>
      <label className="light-row__intensity">
        <span>Intensity</span>
        <input
          type="range"
          min={0}
          max={2}
          step={0.05}
          value={control.intensity}
          disabled={!control.enabled}
          onChange={(e) => onChange({ intensity: parseFloat(e.target.value) })}
        />
        <em>{control.intensity.toFixed(2)}</em>
      </label>
    </div>
  );
}
