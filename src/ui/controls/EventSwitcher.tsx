import { useEffect, useRef, useState } from 'react';
import type { StoredEvent } from '../../systems/firebase/types';

interface EventSwitcherProps {
  events: StoredEvent[];
  activeEvent: StoredEvent | null;
  busy: boolean;
  onSelect: (id: string) => void;
  onCreate: (name: string) => Promise<void>;
  onRename: (id: string, name: string) => Promise<void>;
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

export function EventSwitcher({
  events,
  activeEvent,
  busy,
  onSelect,
  onCreate,
  onRename,
}: EventSwitcherProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);

  const filtered = events.filter((e) =>
    e.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
        setCreating(false);
        setRenaming(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const submitCreate = async () => {
    const name = newName.trim() || 'Untitled event';
    await onCreate(name);
    setNewName('');
    setCreating(false);
    setOpen(false);
  };

  const submitRename = async () => {
    if (!activeEvent) return;
    await onRename(activeEvent.id, renameValue.trim() || 'Untitled event');
    setRenaming(false);
  };

  return (
    <div className="event-switcher" ref={panelRef}>
      <button
        type="button"
        className="event-switcher__trigger"
        onClick={() => setOpen((v) => !v)}
        disabled={busy}
        aria-expanded={open}
      >
        <span className="event-switcher__label">Event</span>
        <span className="event-switcher__name">
          {activeEvent?.name ?? 'Select event…'}
        </span>
        <span className="event-switcher__chev" aria-hidden>
          ▾
        </span>
      </button>

      {open && (
        <div className="event-switcher__panel">
          <div className="event-switcher__search-row">
            <input
              className="event-switcher__search"
              type="search"
              placeholder="Find event…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <ul className="event-switcher__list">
            {filtered.length === 0 && (
              <li className="event-switcher__empty">No events match</li>
            )}
            {filtered.map((event) => (
              <li key={event.id}>
                <button
                  type="button"
                  className={
                    event.id === activeEvent?.id
                      ? 'event-switcher__item event-switcher__item--active'
                      : 'event-switcher__item'
                  }
                  onClick={() => {
                    onSelect(event.id);
                    setOpen(false);
                  }}
                >
                  <span className="event-switcher__item-name">{event.name}</span>
                  <span className="event-switcher__item-date">
                    {formatEventDate(event.updatedAt)}
                  </span>
                </button>
              </li>
            ))}
          </ul>

          <div className="event-switcher__actions">
            {creating ? (
              <div className="event-switcher__inline-form">
                <input
                  className="event-switcher__input"
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
                  className="event-switcher__btn"
                  onClick={() => void submitCreate()}
                >
                  Create
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="event-switcher__btn event-switcher__btn--primary"
                onClick={() => {
                  setCreating(true);
                  setRenaming(false);
                }}
              >
                + New event
              </button>
            )}

            {activeEvent && !creating && (
              renaming ? (
                <div className="event-switcher__inline-form">
                  <input
                    className="event-switcher__input"
                    value={renameValue}
                    autoFocus
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void submitRename();
                      if (e.key === 'Escape') setRenaming(false);
                    }}
                  />
                  <button
                    type="button"
                    className="event-switcher__btn"
                    onClick={() => void submitRename()}
                  >
                    Save
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="event-switcher__btn"
                  onClick={() => {
                    setRenameValue(activeEvent.name);
                    setRenaming(true);
                  }}
                >
                  Rename event
                </button>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
