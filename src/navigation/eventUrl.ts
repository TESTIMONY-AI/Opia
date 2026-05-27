export function getEventIdFromUrl(): string | null {
  return new URLSearchParams(window.location.search).get('event');
}

export function setEventIdInUrl(eventId: string | null): void {
  const url = new URL(window.location.href);
  if (eventId) url.searchParams.set('event', eventId);
  else url.searchParams.delete('event');
  window.history.replaceState({}, '', url);
}
