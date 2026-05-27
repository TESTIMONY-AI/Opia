interface TopBarProps {
  eventName: string | null;
  cloudSync: boolean;
  syncError: string | null;
  onBackToEvents: () => void;
}

export function TopBar({
  eventName,
  cloudSync,
  syncError,
  onBackToEvents,
}: TopBarProps) {
  return (
    <header className="top-bar">
      <div className="top-bar__brand">
        <button type="button" className="top-bar__back" onClick={onBackToEvents}>
          ← Events
        </button>
        <div className="top-bar__brand-text">
          <span className="top-bar__logo">OPIA</span>
          <span className="top-bar__sub">Stage Visualization</span>
        </div>
      </div>

      <div className="top-bar__center">
        {eventName && (
          <span className="top-bar__event-name" title={eventName}>
            {eventName}
          </span>
        )}
        {syncError && (
          <span className="top-bar__sync-error" title={syncError}>
            Sync: {syncError}
          </span>
        )}
      </div>

      <div className="top-bar__status">
        <span className="status-pill status-pill--live">PREVIEW</span>
        <span className="top-bar__meta">
          {cloudSync ? 'Cloud sync' : 'Local · this device'}
        </span>
      </div>
    </header>
  );
}
