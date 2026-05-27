/** Map physical pitch (mm) + wall size to simulated LED pixel grid for previs. */
export function computeLedResolution(
  wallWidth: number,
  wallHeight: number,
  pitchMm: number,
): { cols: number; rows: number } {
  const refPitch = 3.9;
  const baseCols = 384;
  const scale = refPitch / Math.max(pitchMm, 1.5);
  const cols = Math.round(baseCols * (wallWidth / 16) * scale);
  const rows = Math.round(cols * (wallHeight / wallWidth));
  return {
    cols: Math.min(512, Math.max(72, cols)),
    rows: Math.min(288, Math.max(40, rows)),
  };
}
