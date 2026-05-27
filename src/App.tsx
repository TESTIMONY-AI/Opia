import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { getEventIdFromUrl } from './navigation/eventUrl';
import { useEventWorkspace } from './hooks/useEventWorkspace';
import { EventHub } from './ui/layouts/EventHub';
import './ui/theme/tokens.css';
import './App.css';

const ProductionLayout = lazy(() =>
  import('./ui/layouts/ProductionLayout').then((m) => ({
    default: m.ProductionLayout,
  })),
);

export default function App() {
  const workspace = useEventWorkspace();
  const [inStudio, setInStudio] = useState(false);
  const openedFromShareUrl = useRef(false);

  useEffect(() => {
    if (!workspace.eventsReady) return;
    if (workspace.events.length === 0) return;
    if (openedFromShareUrl.current) return;
    const id = getEventIdFromUrl();
    if (id && workspace.events.some((e) => e.id === id)) {
      openedFromShareUrl.current = true;
      queueMicrotask(() => {
        workspace.selectEvent(id);
        setInStudio(true);
      });
    }
  }, [workspace]);

  if (!inStudio) {
    return (
      <EventHub
        events={workspace.events}
        eventsReady={workspace.eventsReady}
        syncError={workspace.syncError}
        busy={workspace.busy}
        cloudSync={workspace.configured}
        onSelectEvent={(id) => {
          workspace.selectEvent(id);
          setInStudio(true);
        }}
        onCreateEvent={async (name) => {
          try {
            await workspace.createEvent(name);
            setInStudio(true);
          } catch {
            throw new Error(
              workspace.syncError ?? 'Could not create event. Check Firebase.',
            );
          }
        }}
      />
    );
  }

  return (
    <Suspense
      fallback={
        <div className="boot-overlay" role="status">
          Loading stage…
        </div>
      }
    >
      <ProductionLayout
        workspace={workspace}
        onBackToEvents={() => {
          workspace.exitEventWorkspace();
          openedFromShareUrl.current = false;
          setInStudio(false);
        }}
      />
    </Suspense>
  );
}
