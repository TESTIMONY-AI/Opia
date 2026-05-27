export function hexToThreeColor(hex: string): number {
  const h = hex.replace('#', '').trim();
  return parseInt(h.length === 6 ? h : h.slice(0, 6), 16);
}

export const LIGHT_COLOR_PRESETS: Array<{ name: string; color: string }> = [
  { name: 'White', color: '#ffffff' },
  { name: 'Warm', color: '#ffe8cc' },
  { name: 'Red', color: '#ff3344' },
  { name: 'Blue', color: '#4488ff' },
  { name: 'Amber', color: '#ffaa33' },
  { name: 'Purple', color: '#aa55ff' },
  { name: 'Green', color: '#44dd88' },
  { name: 'Cyan', color: '#00ddff' },
];
