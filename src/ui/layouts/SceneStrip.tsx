import { useCallback, useEffect, useRef, useState } from 'react';

export interface SceneTab {
  id: string;
  name: string;
}

interface SceneStripProps {
  engineReady: boolean;
  saveDisabled?: boolean;
  saveBusy?: boolean;
  stripError?: string | null;
  loadingSceneId?: string | null;
  scenes: SceneTab[];
  activeSceneId: string | null;
  onSaveScene: () => void;
  onApplyScene: (id: string) => void;
  onRenameScene: (id: string, name: string) => void;
  onDeleteScene: (id: string) => void;
}

export function SceneStrip({
  engineReady,
  saveDisabled = false,
  saveBusy = false,
  stripError = null,
  loadingSceneId = null,
  scenes,
  activeSceneId,
  onSaveScene,
  onApplyScene,
  onRenameScene,
  onDeleteScene,
}: SceneStripProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  const commitRename = useCallback(() => {
    if (!editingId) return;
    const name = editValue.trim() || 'Untitled';
    onRenameScene(editingId, name);
    setEditingId(null);
  }, [editingId, editValue, onRenameScene]);

  const cancelRename = useCallback(() => {
    setEditingId(null);
  }, []);

  return (
    <div className="scene-strip">
      {stripError && (
        <p className="scene-strip__hint" role="alert">
          {stripError}
        </p>
      )}
      <button
        type="button"
        className="scene-strip__save"
        disabled={!engineReady || saveDisabled}
        onClick={onSaveScene}
        title="Save current media on all screens as a new scene"
      >
        {saveBusy ? 'Saving…' : '+ Save scene'}
      </button>
      <div className="scene-strip__scroll">
        {scenes.length === 0 && (
          <span className="scene-strip__empty">
            No scenes yet — load media, then save a scene
          </span>
        )}
        {scenes.map((scene) => {
          const active = scene.id === activeSceneId;
          const editing = editingId === scene.id;

          return (
            <div
              key={scene.id}
              className={`scene-chip ${active ? 'scene-chip--active' : ''}`}
            >
              {editing ? (
                <input
                  ref={inputRef}
                  className="scene-chip__input"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      commitRename();
                    }
                    if (e.key === 'Escape') {
                      e.preventDefault();
                      cancelRename();
                    }
                  }}
                />
              ) : (
                <>
                  <button
                    type="button"
                    className="scene-chip__main"
                    disabled={
                      !engineReady || loadingSceneId === scene.id
                    }
                    onClick={() => onApplyScene(scene.id)}
                    title="Switch to this scene"
                  >
                    {scene.name}
                  </button>
                  <button
                    type="button"
                    className="scene-chip__rename"
                    aria-label={`Rename ${scene.name}`}
                    title="Rename scene"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingId(scene.id);
                      setEditValue(scene.name);
                    }}
                  >
                    ✎
                  </button>
                  <button
                    type="button"
                    className="scene-chip__delete"
                    aria-label={`Delete ${scene.name}`}
                    title="Delete scene"
                    disabled={saveBusy}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (
                        window.confirm(
                          `Delete scene "${scene.name}"? This cannot be undone.`,
                        )
                      ) {
                        onDeleteScene(scene.id);
                      }
                    }}
                  >
                    ×
                  </button>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
