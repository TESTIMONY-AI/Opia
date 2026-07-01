import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { PrevisEngine } from '../../core/renderer/PrevisEngine';
import type { PrevisState } from '../../types';
import {
  DEFAULT_CAMERA,
  DEFAULT_LED,
  DEFAULT_LIGHTING,
  DEFAULT_STAGE,
} from '../../types';
import { OutlinerPanel, type MediaLoadStatus } from '../controls/OutlinerPanel';
import type { MediaScreenId } from '../../systems/media/MediaManager';
import { emptySceneMedia, MEDIA_SCREENS } from '../../systems/scenes/lookScenes';
import { InspectorPanel } from '../inspector/InspectorPanel';
import { useWorkspacePanels } from '../../hooks/useWorkspacePanels';
import { TopBar } from './TopBar';
import { PanelRail } from './PanelRail';
import { SceneStrip } from './SceneStrip';
import { StageViewport } from './StageViewport';
import type { EventWorkspace } from '../../hooks/useEventWorkspace';
import { formatFirebaseError } from '../../systems/firebase/formatFirebaseError';
import { buildScreenshotName, downloadPng } from '../../utils/downloadImage';

function mediaStatusFromEngine(engine: PrevisEngine): MediaLoadStatus {
  const out: MediaLoadStatus = {};
  for (const id of MEDIA_SCREENS) {
    const n = engine.getMediaFileName(id);
    if (n) out[id] = n;
  }
  return out;
}

function buildInitialState(): PrevisState {
  return {
    led: { ...DEFAULT_LED },
    lighting: { ...DEFAULT_LIGHTING },
    stage: { ...DEFAULT_STAGE },
    activeCamera: 'program',
    cameras: {
      program: { ...DEFAULT_CAMERA },
      cam1: { ...DEFAULT_CAMERA },
      cam2: { ...DEFAULT_CAMERA },
      wide: { ...DEFAULT_CAMERA, aperture: 4 },
      audience: { ...DEFAULT_CAMERA, exposure: 0.85 },
    },
  };
}

interface ProductionLayoutProps {
  workspace: EventWorkspace;
  onBackToEvents: () => void;
}

export function ProductionLayout({
  workspace: ws,
  onBackToEvents,
}: ProductionLayoutProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<PrevisEngine | null>(null);
  const [engine, setEngine] = useState<PrevisEngine | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<PrevisState>(buildInitialState);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [mediaTick, setMediaTick] = useState(0);
  const { collapsed: panels, toggle: togglePanel } = useWorkspacePanels();

  const bumpMedia = useCallback(() => {
    setMediaTick((t) => t + 1);
  }, []);

  const slotMediaStatus = useMemo((): MediaLoadStatus => {
    void mediaTick;
    if (engine) return mediaStatusFromEngine(engine);
    return ws.mediaStatus;
  }, [engine, ws.mediaStatus, mediaTick]);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let instance: PrevisEngine | null = null;
    try {
      instance = new PrevisEngine(canvas);
      instance.setState(buildInitialState());
      instance.start();
      engineRef.current = instance;
      setEngine(instance);
      setError(null);
      queueMicrotask(() => bumpMedia());
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to start 3D engine';
      setError(msg);
      console.error('[OPIA]', e);
    }

    return () => {
      instance?.dispose();
      engineRef.current = null;
      setEngine(null);
    };
  }, [bumpMedia]);

  useEffect(() => {
    engineRef.current?.setState(state);
  }, [state]);

  const onMedia = useCallback(
    async (screen: MediaScreenId, file: File) => {
      setMediaError(null);
      try {
        await engineRef.current?.loadMedia(screen, file);
        if (ws.activeSceneId) {
          const media = engineRef.current?.captureSceneMedia();
          if (media) ws.onSceneMediaChanged(media);
        }
        bumpMedia();
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Upload failed';
        setMediaError(msg);
        console.error('[OPIA] media', e);
      }
    },
    [ws, bumpMedia],
  );

  const onSaveScene = useCallback(async () => {
    if (!ws.activeEventId) {
      setMediaError('No active event.');
      return;
    }
    setMediaError(null);
    try {
      await ws.saveScene(emptySceneMedia());
      bumpMedia();
    } catch (e) {
      setMediaError(formatFirebaseError(e));
      console.error('[OPIA] save scene', e);
    }
  }, [ws, bumpMedia]);

  const onApplyScene = useCallback(
    async (id: string) => {
      if (id === ws.activeSceneId) return;
      setMediaError(null);
      try {
        const media = await ws.loadSceneMedia(id);
        await engineRef.current?.applySceneMedia(media);
        ws.setActiveSceneId(id);
        bumpMedia();
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to apply scene';
        setMediaError(msg);
        console.error('[OPIA] scene', e);
      }
    },
    [ws, bumpMedia],
  );

  const onRenameScene = useCallback(
    async (id: string, name: string) => {
      await ws.renameScene(id, name);
    },
    [ws],
  );

  const onDeleteScene = useCallback(
    async (id: string) => {
      setMediaError(null);
      try {
        await ws.deleteScene(id);
        bumpMedia();
      } catch (e) {
        setMediaError(formatFirebaseError(e));
        console.error('[OPIA] delete scene', e);
      }
    },
    [ws, bumpMedia],
  );

  const onReorderScenes = useCallback(
    (orderedIds: string[]) => {
      setMediaError(null);
      void ws.reorderScenes(orderedIds).catch((e) => {
        setMediaError(formatFirebaseError(e));
        console.error('[OPIA] reorder scenes', e);
      });
    },
    [ws],
  );

  const onSnapFromProgramLabel = useCallback(() => {
    const eng = engineRef.current;
    if (!eng) return;
    setMediaError(null);
    try {
      const dataUrl = eng.captureMainViewPng();
      const fileName = buildScreenshotName('program', {
        event: ws.activeEvent?.name,
        scene: ws.scenes.find((s) => s.id === ws.activeSceneId)?.name,
      });
      downloadPng(dataUrl, fileName);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Screenshot failed';
      setMediaError(msg);
      console.error('[OPIA] screenshot', e);
    }
  }, [ws.activeEvent?.name, ws.activeSceneId, ws.scenes]);

  const combinedError =
    [mediaError, ws.syncError]
      .filter((m): m is string => Boolean(m && String(m).trim()))
      .join(' · ') || null;

  if (error) {
    return (
      <div className="boot boot--error">
        <h2>3D engine failed to start</h2>
        <p>{error}</p>
        <p className="boot__hint">
          Use Chrome or Edge with hardware acceleration enabled.
        </p>
      </div>
    );
  }

  const workspaceClass = [
    'opia-workspace',
    panels.outliner ? 'opia-workspace--outliner-collapsed' : '',
    panels.inspector ? 'opia-workspace--inspector-collapsed' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const centerClass = [
    'opia-center',
    panels.sceneStrip ? 'opia-center--scene-collapsed' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={`opia-shell${panels.topBar ? ' opia-shell--top-collapsed' : ''}`}
    >
      {panels.topBar ? (
        <div className="top-bar-mini">
          <button
            type="button"
            className="top-bar-mini__expand"
            onClick={() => togglePanel('topBar')}
            aria-label="Show top bar"
            title="Show top bar"
          >
            ▼ Top bar
          </button>
          {ws.activeEvent?.name && (
            <span className="top-bar-mini__event">{ws.activeEvent.name}</span>
          )}
        </div>
      ) : (
        <TopBar
          eventName={ws.activeEvent?.name ?? null}
          cloudSync={ws.configured}
          syncError={ws.syncError}
          onBackToEvents={onBackToEvents}
          onToggleCollapse={() => togglePanel('topBar')}
        />
      )}
      <div className={workspaceClass}>
        <PanelRail
          side="left"
          title="Outliner"
          collapsed={panels.outliner}
          onToggle={() => togglePanel('outliner')}
        >
          <OutlinerPanel
            state={state}
            onChange={(partial) => setState((s) => ({ ...s, ...partial }))}
            onMedia={onMedia}
            mediaStatus={slotMediaStatus}
            mediaError={combinedError}
          />
        </PanelRail>

        <div className={centerClass}>
          <div className="viewport-stack">
            <StageViewport
              canvasRef={canvasRef}
              engine={engine}
              activeCamera={state.activeCamera}
              onSnapFromLabel={onSnapFromProgramLabel}
            />
          </div>
          <div
            className={`scene-strip-shell${panels.sceneStrip ? ' scene-strip-shell--collapsed' : ''}`}
          >
            <button
              type="button"
              className="scene-strip-shell__toggle"
              onClick={() => togglePanel('sceneStrip')}
              aria-expanded={!panels.sceneStrip}
              aria-label={
                panels.sceneStrip ? 'Show scene strip' : 'Hide scene strip'
              }
              title={
                panels.sceneStrip ? 'Show scene strip' : 'Hide scene strip'
              }
            >
              {panels.sceneStrip ? '▲ Scenes' : '▼'}
            </button>
            {!panels.sceneStrip && (
              <SceneStrip
                engineReady={engine !== null}
                saveDisabled={!ws.activeEventId || Boolean(ws.savingSceneId)}
                saveBusy={Boolean(ws.savingSceneId)}
                stripError={mediaError}
                scenes={ws.scenes}
                activeSceneId={ws.activeSceneId}
                loadingSceneId={ws.loadingSceneId}
                onSaveScene={() => void onSaveScene()}
                onApplyScene={(id) => void onApplyScene(id)}
                onRenameScene={(id, name) => void onRenameScene(id, name)}
                onDeleteScene={(id) => void onDeleteScene(id)}
                onReorderScenes={onReorderScenes}
              />
            )}
          </div>
        </div>

        <PanelRail
          side="right"
          title="Properties"
          collapsed={panels.inspector}
          onToggle={() => togglePanel('inspector')}
        >
          <InspectorPanel
            state={state}
            onChange={(partial) => setState((s) => ({ ...s, ...partial }))}
          />
        </PanelRail>
      </div>
      {!engine && <div className="boot-overlay">Loading 3D engine…</div>}
    </div>
  );
}
