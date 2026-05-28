export function downloadPng(dataUrl: string, fileName: string): void {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = fileName.endsWith('.png') ? fileName : `${fileName}.png`;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export function buildScreenshotName(
  view: string,
  options?: { event?: string; scene?: string },
): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const safe = (s: string) =>
    s
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-zA-Z0-9._-]/g, '')
      .slice(0, 48) || 'shot';
  const parts = ['opia', view];
  if (options?.event) parts.push(safe(options.event));
  if (options?.scene) parts.push(safe(options.scene));
  parts.push(stamp);
  return `${parts.join('-')}.png`;
}
