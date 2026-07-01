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
  onReorderScenes: (orderedIds: string[]) => void;
}

function reorderById<T extends { id: string }>(
  items: T[],
  draggedId: string,
  targetId: string,
): T[] {
  const from = items.findIndex((s) => s.id === draggedId);
  const to = items.findIndex((s) => s.id === targetId);
  if (from < 0 || to < 0 || from === to) return items;
  const next = [...items];
  const [removed] = next.splice(from, 1);
  next.splice(to, 0, removed);
  return next;
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
  onReorderScenes,
}: SceneStripProps) {
  const [orderedScenes, setOrderedScenes] = useState(scenes);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const chipRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    setOrderedScenes(scenes);
  }, [scenes]);

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

  const canDrag = !editingId && !saveBusy && orderedScenes.length > 1;

  const finishDrag = useCallback(
    (targetId: string | null) => {
      if (!draggedId || !targetId || draggedId === targetId) {
        setDraggedId(null);
        setDropTargetId(null);
        return;
      }
      const next = reorderById(orderedScenes, draggedId, targetId);
      setOrderedScenes(next);
      onReorderScenes(next.map((s) => s.id));
      setDraggedId(null);
      setDropTargetId(null);
    },
    [draggedId, orderedScenes, onReorderScenes],
  );

  const setChipRef = useCallback((id: string, el: HTMLDivElement | null) => {
    if (el) chipRefs.current.set(id, el);
    else chipRefs.current.delete(id);
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
        {saveBusy ? 'Creating…' : '+ New scene'}
      </button>
      <div className="scene-strip__scroll">
        {orderedScenes.length === 0 && (
          <span className="scene-strip__empty">
            No scenes yet — load media, then save a scene
          </span>
        )}
        {orderedScenes.map((scene) => {
          const active = scene.id === activeSceneId;
          const editing = editingId === scene.id;
          const dragging = draggedId === scene.id;
          const dropTarget = dropTargetId === scene.id && draggedId !== scene.id;

          return (
            <div
              key={scene.id}
              ref={(el) => setChipRef(scene.id, el)}
              className={[
                'scene-chip',
                active ? 'scene-chip--active' : '',
                dragging ? 'scene-chip--dragging' : '',
                dropTarget ? 'scene-chip--drop-target' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onDragOver={(e) => {
                if (!draggedId || draggedId === scene.id) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                setDropTargetId(scene.id);
              }}
              onDragLeave={(e) => {
                if (
                  e.currentTarget.contains(e.relatedTarget as Node | null)
                ) {
                  return;
                }
                if (dropTargetId === scene.id) setDropTargetId(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                finishDrag(scene.id);
              }}
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
                  <span
                    className="scene-chip__drag"
                    draggable={canDrag}
                    aria-label={`Drag to reorder ${scene.name}`}
                    title="Drag to reorder"
                    onDragStart={(e) => {
                      if (!canDrag) {
                        e.preventDefault();
                        return;
                      }
                      const chip = chipRefs.current.get(scene.id);
                      if (chip) {
                        e.dataTransfer.setDragImage(chip, 24, 20);
                      }
                      e.dataTransfer.effectAllowed = 'move';
                      e.dataTransfer.setData('text/plain', scene.id);
                      setDraggedId(scene.id);
                    }}
                    onDragEnd={() => {
                      setDraggedId(null);
                      setDropTargetId(null);
                    }}
                  >
                    ⠿
                  </span>
                  <button
                    type="button"
                    className="scene-chip__main"
                    disabled={
                      !engineReady || loadingSceneId === scene.id
                    }
                    onClick={() => onApplyScene(scene.id)}
                    title="Switch to this scene"
                  >
                    {loadingSceneId === scene.id
                      ? 'Loading…'
                      : scene.name}
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
