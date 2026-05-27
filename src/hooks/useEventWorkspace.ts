import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getEventIdFromUrl, setEventIdInUrl } from '../navigation/eventUrl';
import { isFirebaseConfigured } from '../systems/firebase/config';
import {
  createEvent,
  renameEvent,
  subscribeEvents,
} from '../systems/firebase/eventsRepository';
import { downloadStoredMedia } from '../systems/firebase/mediaStorage';
import {
  createScene,
  renameScene,
  subscribeScenes,
  updateSceneMedia,
} from '../systems/firebase/scenesRepository';
import type { StoredEvent, StoredScene } from '../systems/firebase/types';
import {
  createLocalEvent,
  loadLocalEvents,
  renameLocalEvent,
  touchLocalEvent,
} from '../systems/events/localEvents';
import {
  createLookScene,
  mediaStatusFromScene,
  type LookScene,
  type SceneMediaMap,
} from '../systems/scenes/lookScenes';

export type MediaLoadStatus = Partial<
  Record<'main' | 'sides' | 'tvs', string>
>;

interface CachedSceneMedia {
  updatedAt: number;
  media: SceneMediaMap;
}

export interface SceneListItem {
  id: string;
  name: string;
  updatedAt: number;
}

function lookScenesToList(scenes: LookScene[]): SceneListItem[] {
  return scenes.map((s) => ({
    id: s.id,
    name: s.name,
    updatedAt: Date.now(),
  }));
}

export function useEventWorkspace() {
  const configured = isFirebaseConfigured();
  const [events, setEvents] = useState<StoredEvent[]>(() =>
    configured ? [] : loadLocalEvents(),
  );
  const [eventsReady, setEventsReady] = useState(!configured);
  const [activeEventId, setActiveEventId] = useState<string | null>(null);
  const [storedScenes, setStoredScenes] = useState<StoredScene[]>([]);
  const [localScenesByEvent, setLocalScenesByEvent] = useState<
    Map<string, LookScene[]>
  >(() => new Map());
  const [mediaCache, setMediaCache] = useState<Map<string, CachedSceneMedia>>(
    () => new Map(),
  );
  const cacheRef = useRef<Map<string, CachedSceneMedia>>(new Map());
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadingSceneId, setLoadingSceneId] = useState<string | null>(null);
  const mediaUpdateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingMediaUpdate = useRef<{
    eventId: string;
    sceneId: string;
    media: SceneMediaMap;
  } | null>(null);

  const activeEvent = events.find((e) => e.id === activeEventId) ?? null;

  const localScenes = useMemo(
    () =>
      activeEventId ? (localScenesByEvent.get(activeEventId) ?? []) : [],
    [activeEventId, localScenesByEvent],
  );

  const scenes: SceneListItem[] = configured
    ? storedScenes.map((s) => ({
        id: s.id,
        name: s.name,
        updatedAt: s.updatedAt,
      }))
    : lookScenesToList(localScenes);

  useEffect(() => {
    if (!configured) return;

    let unsub: (() => void) | undefined;
    const readyTimeout = window.setTimeout(() => {
      setEventsReady(true);
    }, 8000);

    try {
      unsub = subscribeEvents(
        (next) => {
          setEvents(next);
          setEventsReady(true);
          setSyncError(null);
        },
        (err) => {
          setSyncError(err.message);
          setEventsReady(true);
        },
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Firebase failed to start';
      queueMicrotask(() => {
        setSyncError(msg);
        setEventsReady(true);
      });
    }

    return () => {
      window.clearTimeout(readyTimeout);
      unsub?.();
    };
  }, [configured]);

  useEffect(() => {
    if (events.length === 0) return;
    const urlEvent = getEventIdFromUrl();
    queueMicrotask(() => {
      if (urlEvent && events.some((e) => e.id === urlEvent)) {
        setActiveEventId(urlEvent);
        return;
      }
      if (activeEventId && events.some((e) => e.id === activeEventId)) return;
    });
  }, [events, activeEventId]);

  useEffect(() => {
    if (!configured) return;
    if (!activeEventId) {
      queueMicrotask(() => {
        setStoredScenes([]);
        setActiveSceneId(null);
        cacheRef.current = new Map();
        setMediaCache(new Map());
      });
      return;
    }
    /* eslint-disable react-hooks/set-state-in-effect */
    setActiveSceneId(null);
    cacheRef.current = new Map();
    setMediaCache(new Map());
    /* eslint-enable react-hooks/set-state-in-effect */
    return subscribeScenes(
      activeEventId,
      setStoredScenes,
      (err) => setSyncError(err.message),
    );
  }, [configured, activeEventId]);

  useEffect(() => {
    if (!configured) {
      queueMicrotask(() => setActiveSceneId(null));
      return;
    }
    if (!activeEventId) return;
    let cancelled = false;

    void (async () => {
      for (const scene of storedScenes) {
        if (cancelled) return;
        const cached = cacheRef.current.get(scene.id);
        if (cached && cached.updatedAt === scene.updatedAt) continue;

        try {
          const media = await downloadStoredMedia(scene.media);
          if (cancelled) return;
          const entry = { updatedAt: scene.updatedAt, media };
          cacheRef.current.set(scene.id, entry);
          setMediaCache(new Map(cacheRef.current));
        } catch (e) {
          console.error('[OPIA] scene media preload', scene.id, e);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [configured, activeEventId, storedScenes]);

  const flushMediaUpdate = useCallback(async () => {
    if (!configured) return;
    const pending = pendingMediaUpdate.current;
    pendingMediaUpdate.current = null;
    if (!pending) return;
    try {
      await updateSceneMedia(
        pending.eventId,
        pending.sceneId,
        pending.media,
      );
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : 'Failed to sync scene media';
      setSyncError(msg);
      console.error('[OPIA] scene media sync', e);
    }
  }, [configured]);

  const flushPendingMediaSync = useCallback(() => {
    if (mediaUpdateTimer.current) {
      clearTimeout(mediaUpdateTimer.current);
      mediaUpdateTimer.current = null;
    }
    void flushMediaUpdate();
  }, [flushMediaUpdate]);

  const selectEvent = useCallback(
    (id: string) => {
      flushPendingMediaSync();
      setActiveEventId(id);
      setEventIdInUrl(id);
      setActiveSceneId(null);
      setSyncError(null);
    },
    [flushPendingMediaSync],
  );

  const exitEventWorkspace = useCallback(() => {
    flushPendingMediaSync();
    setActiveEventId(null);
    setEventIdInUrl(null);
    setActiveSceneId(null);
    cacheRef.current = new Map();
    setMediaCache(new Map());
    setStoredScenes([]);
    setSyncError(null);
  }, [flushPendingMediaSync]);

  const scheduleSceneMediaSync = useCallback(
    (eventId: string, sceneId: string, media: SceneMediaMap) => {
      if (!configured) return;
      pendingMediaUpdate.current = { eventId, sceneId, media };
      if (mediaUpdateTimer.current) clearTimeout(mediaUpdateTimer.current);
      mediaUpdateTimer.current = setTimeout(() => {
        void flushMediaUpdate();
      }, 1200);
    },
    [configured, flushMediaUpdate],
  );

  const onCreateEvent = useCallback(
    async (name: string) => {
      setBusy(true);
      setSyncError(null);
      const label = name.trim() || 'Untitled event';
      try {
        if (configured) {
          const event = await createEvent(label);
          setEvents((prev) => [event, ...prev.filter((e) => e.id !== event.id)]);
          selectEvent(event.id);
          return event;
        }
        const event = createLocalEvent(label);
        setEvents(loadLocalEvents());
        selectEvent(event.id);
        return event;
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to create event';
        setSyncError(msg);
        throw e;
      } finally {
        setBusy(false);
      }
    },
    [configured, selectEvent],
  );

  const onRenameEvent = useCallback(
    async (id: string, name: string) => {
      setSyncError(null);
      const label = name.trim() || 'Untitled event';
      try {
        if (configured) {
          await renameEvent(id, label);
          return;
        }
        renameLocalEvent(id, label);
        setEvents(loadLocalEvents());
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to rename event';
        setSyncError(msg);
        throw e;
      }
    },
    [configured],
  );

  const onSaveScene = useCallback(
    async (media: SceneMediaMap) => {
      if (!activeEventId) return null;
      setBusy(true);
      setSyncError(null);
      try {
        if (!configured) {
          const scene = createLookScene(`Scene ${localScenes.length + 1}`);
          scene.media = media;
          setLocalScenesByEvent((prev) => {
            const next = new Map(prev);
            next.set(activeEventId, [...(next.get(activeEventId) ?? []), scene]);
            return next;
          });
          touchLocalEvent(activeEventId);
          setEvents(loadLocalEvents());
          setActiveSceneId(scene.id);
          return scene.id;
        }
        const order =
          storedScenes.length > 0
            ? Math.max(...storedScenes.map((s) => s.order)) + 1
            : 0;
        const name = `Scene ${storedScenes.length + 1}`;
        const scene = await createScene(activeEventId, name, media, order);
        cacheRef.current.set(scene.id, {
          updatedAt: scene.updatedAt,
          media,
        });
        setMediaCache(new Map(cacheRef.current));
        setActiveSceneId(scene.id);
        return scene.id;
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to save scene';
        setSyncError(msg);
        throw e;
      } finally {
        setBusy(false);
      }
    },
    [activeEventId, configured, localScenes.length, storedScenes],
  );

  const onRenameScene = useCallback(
    async (sceneId: string, name: string) => {
      if (!activeEventId) return;
      setSyncError(null);
      try {
        if (!configured) {
          setLocalScenesByEvent((prev) => {
            const next = new Map(prev);
            const list = next.get(activeEventId) ?? [];
            next.set(
              activeEventId,
              list.map((s) => (s.id === sceneId ? { ...s, name } : s)),
            );
            return next;
          });
          touchLocalEvent(activeEventId);
          setEvents(loadLocalEvents());
          return;
        }
        await renameScene(activeEventId, sceneId, name);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to rename scene';
        setSyncError(msg);
        throw e;
      }
    },
    [activeEventId, configured],
  );

  const loadSceneMedia = useCallback(
    async (sceneId: string): Promise<SceneMediaMap> => {
      if (!configured) {
        const scene = localScenes.find((s) => s.id === sceneId);
        if (!scene) throw new Error('Scene not found');
        return scene.media;
      }
      const stored = storedScenes.find((s) => s.id === sceneId);
      if (!stored) throw new Error('Scene not found');

      const cached = cacheRef.current.get(sceneId);
      if (cached && cached.updatedAt === stored.updatedAt) {
        return cached.media;
      }

      setLoadingSceneId(sceneId);
      try {
        const media = await downloadStoredMedia(stored.media);
        const entry = { updatedAt: stored.updatedAt, media };
        cacheRef.current.set(sceneId, entry);
        setMediaCache(new Map(cacheRef.current));
        return media;
      } finally {
        setLoadingSceneId(null);
      }
    },
    [configured, localScenes, storedScenes],
  );

  const onSceneMediaChanged = useCallback(
    (media: SceneMediaMap) => {
      if (!activeEventId || !activeSceneId) return;
      if (!configured) {
        setLocalScenesByEvent((prev) => {
          const next = new Map(prev);
          const list = next.get(activeEventId) ?? [];
          next.set(
            activeEventId,
            list.map((s) =>
              s.id === activeSceneId ? { ...s, media } : s,
            ),
          );
          return next;
        });
        touchLocalEvent(activeEventId);
        setEvents(loadLocalEvents());
        return;
      }
      const stored = storedScenes.find((s) => s.id === activeSceneId);
      const updatedAt = stored?.updatedAt ?? Date.now();
      cacheRef.current.set(activeSceneId, { updatedAt, media });
      setMediaCache(new Map(cacheRef.current));
      scheduleSceneMediaSync(activeEventId, activeSceneId, media);
    },
    [
      activeEventId,
      activeSceneId,
      configured,
      storedScenes,
      scheduleSceneMediaSync,
    ],
  );

  const mediaStatus = useMemo((): MediaLoadStatus => {
    if (!activeSceneId) return {};
    if (!configured) {
      const scene = localScenes.find((s) => s.id === activeSceneId);
      if (!scene) return {};
      return mediaStatusFromScene(scene.media);
    }
    const cached = mediaCache.get(activeSceneId);
    if (!cached) return {};
    return mediaStatusFromScene(cached.media);
  }, [activeSceneId, configured, localScenes, mediaCache]);

  useEffect(
    () => () => {
      flushPendingMediaSync();
    },
    [flushPendingMediaSync],
  );

  return useMemo(
    () => ({
      configured,
      eventsReady,
      events,
      activeEvent,
      activeEventId,
      scenes,
      activeSceneId,
      setActiveSceneId,
      syncError,
      busy,
      loadingSceneId,
      selectEvent,
      exitEventWorkspace,
      createEvent: onCreateEvent,
      renameEvent: onRenameEvent,
      saveScene: onSaveScene,
      renameScene: onRenameScene,
      loadSceneMedia,
      onSceneMediaChanged,
      mediaStatus,
      flushPendingMediaSync,
    }),
    [
      configured,
      eventsReady,
      events,
      activeEvent,
      activeEventId,
      scenes,
      activeSceneId,
      syncError,
      busy,
      loadingSceneId,
      selectEvent,
      exitEventWorkspace,
      onCreateEvent,
      onRenameEvent,
      onSaveScene,
      onRenameScene,
      loadSceneMedia,
      onSceneMediaChanged,
      mediaStatus,
      flushPendingMediaSync,
    ],
  );
}

export type EventWorkspace = ReturnType<typeof useEventWorkspace>;
