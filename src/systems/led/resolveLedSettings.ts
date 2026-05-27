import type { LedSettings, StageSettings } from '../../types';
import { computeLedResolution } from './ledResolution';

export function resolveLedSettings(
  led: LedSettings,
  stage: StageSettings,
): LedSettings {
  if (!led.autoResolution) return led;
  const { cols, rows } = computeLedResolution(
    stage.wallWidth,
    stage.wallHeight,
    led.pitchMm,
  );
  return { ...led, ledCols: cols, ledRows: rows };
}
