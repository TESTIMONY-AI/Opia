import { useState } from 'react';
import type { StoredEvent } from '../../systems/firebase/types';

interface EventHubProps {
  events: StoredEvent[];
  eventsReady: boolean;
  syncError: string | null;
  busy: boolean;
  cloudSync: boolean;
  onSelectEvent: (id: string) => void;
  onCreateEvent: (name: string) => Promise<void>;
}

function formatEventDate(ms: number): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(ms));
  } catch {
    return '';
  }
}

export function EventHub({
  events,
  eventsReady,
  syncError,
  busy,
  cloudSync,
  onSelectEvent,
  onCreateEvent,
}: EventHubProps) {
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');

  const filtered = events.filter((e) =>
    e.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  const submitCreate = async () => {
    const name = newName.trim() || 'Untitled event';
    await onCreateEvent(name);
    setNewName('');
    setCreating(false);
  };

  return (
    <div className="event-hub">
      <div className="event-hub__panel">
        <header className="event-hub__header">
          <h1 className="event-hub__title">OPIA</h1>
          <p className="event-hub__tagline">Stage visualization</p>
        </header>

        {syncError && (
          <p className="event-hub__error" role="alert">
            {syncError}
          </p>
        )}

        <p className="event-hub__intro">
          Choose an event to open the stage, or create a new one for your next
          show.
          {!cloudSync && (
            <>
              {' '}
              <span className="event-hub__intro-note">
                Events save on this device only until Firebase is connected.
              </span>
            </>
          )}
        </p>

        <div className="event-hub__search-row">
          <input
            className="event-hub__search"
            type="search"
            placeholder="Search events…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search events"
            disabled={!eventsReady}
          />
        </div>

        <ul className="event-hub__list" aria-label="Events">
          {!eventsReady && (
            <li className="event-hub__empty event-hub__empty--loading">
              Loading events…
            </li>
          )}
          {eventsReady && filtered.length === 0 && (
            <li className="event-hub__empty">
              {events.length === 0
                ? 'No events yet — create one below.'
                : 'No events match your search.'}
            </li>
          )}
          {eventsReady &&
            filtered.map((event) => (
              <li key={event.id}>
                <button
                  type="button"
                  className="event-hub__row"
                  disabled={busy}
                  onClick={() => onSelectEvent(event.id)}
                >
                  <span className="event-hub__row-name">{event.name}</span>
                  <span className="event-hub__row-meta">
                    Updated {formatEventDate(event.updatedAt)}
                  </span>
                </button>
              </li>
            ))}
        </ul>

        <div className="event-hub__footer">
          {creating ? (
            <div className="event-hub__create-form">
              <input
                className="event-hub__input"
                placeholder="Event name"
                value={newName}
                autoFocus
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void submitCreate();
                  if (e.key === 'Escape') setCreating(false);
                }}
              />
              <button
                type="button"
                className="event-hub__btn event-hub__btn--primary"
                disabled={busy}
                onClick={() => void submitCreate()}
              >
                Create
              </button>
              <button
                type="button"
                className="event-hub__btn"
                onClick={() => setCreating(false)}
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="event-hub__btn event-hub__btn--primary event-hub__btn--block"
              disabled={busy || !eventsReady}
              onClick={() => setCreating(true)}
            >
              + New event
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
