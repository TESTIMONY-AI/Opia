import type { StoredEvent } from '../firebase/types';

const STORAGE_KEY = 'opia_local_events';

export function loadLocalEvents(): StoredEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredEvent[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistLocalEvents(events: StoredEvent[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}

export function createLocalEvent(name: string): StoredEvent {
  const now = Date.now();
  const event: StoredEvent = {
    id: crypto.randomUUID(),
    name,
    createdAt: now,
    updatedAt: now,
  };
  const events = [event, ...loadLocalEvents()];
  persistLocalEvents(events);
  return event;
}

export function renameLocalEvent(id: string, name: string): StoredEvent | null {
  const events = loadLocalEvents();
  const idx = events.findIndex((e) => e.id === id);
  if (idx < 0) return null;
  const updated = {
    ...events[idx],
    name,
    updatedAt: Date.now(),
  };
  events[idx] = updated;
  persistLocalEvents(events);
  return updated;
}

export function touchLocalEvent(id: string): void {
  const events = loadLocalEvents();
  const idx = events.findIndex((e) => e.id === id);
  if (idx < 0) return;
  events[idx] = { ...events[idx], updatedAt: Date.now() };
  persistLocalEvents(events);
}
