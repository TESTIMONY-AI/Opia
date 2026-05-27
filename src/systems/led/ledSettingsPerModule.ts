import type { LedSettings } from '../../types';
import {
  MAIN_GRID_COLS,
  MAIN_GRID_ROWS,
  moduleSizeFromMain,
} from '../../core/stage/moduleGrid';
import { computeLedResolution } from './ledResolution';

/** LED shader resolution for one physical cabinet in the module grid. */
export function ledSettingsForModule(
  led: LedSettings,
  wallWidth: number,
  wallHeight: number,
  moduleCols: number,
  moduleRows: number,
): LedSettings {
  const mod = moduleSizeFromMain(wallWidth, wallHeight);
  const physW = mod.width * moduleCols;
  const physH = mod.height * moduleRows;

  if (!led.autoResolution) {
    return {
      ...led,
      ledCols: Math.max(
        16,
        Math.round((led.ledCols / MAIN_GRID_COLS) * moduleCols),
      ),
      ledRows: Math.max(
        10,
        Math.round((led.ledRows / MAIN_GRID_ROWS) * moduleRows),
      ),
    };
  }

  const { cols, rows } = computeLedResolution(physW, physH, led.pitchMm);
  return { ...led, ledCols: cols, ledRows: rows };
}
