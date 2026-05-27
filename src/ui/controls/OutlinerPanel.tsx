import type { MediaScreenId } from '../../systems/media/MediaManager';
import { STAGE_SHADE_PRESETS } from '../../types';
import type { PrevisState } from '../../types';

export type MediaLoadStatus = Partial<Record<MediaScreenId, string>>;

interface OutlinerPanelProps {
  state: PrevisState;
  onChange: (partial: Partial<PrevisState>) => void;
  onMedia: (screen: MediaScreenId, file: File) => void;
  mediaStatus: MediaLoadStatus;
  mediaError: string | null;
}

const MEDIA_INPUTS: Array<{ id: MediaScreenId; label: string; hint?: string }> =
  [
    { id: 'main', label: 'Main center LED (6×4)' },
    {
      id: 'sides',
      label: 'All side LEDs',
      hint: 'One video — splits: L end | L 2×5 | R 2×5 | R end',
    },
    {
      id: 'tvs',
      label: 'Side TVs (both)',
      hint: 'One video — same image on L and R pole screens',
    },
  ];

const ACCEPT =
  'image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm,video/quicktime,.png,.jpg,.jpeg,.webp,.mp4,.mov,.webm';

export function OutlinerPanel({
  state,
  onChange,
  onMedia,
  mediaStatus,
  mediaError,
}: OutlinerPanelProps) {
  const patchStage = (patch: Partial<PrevisState['stage']>) =>
    onChange({ stage: { ...state.stage, ...patch } });

  return (
    <aside className="outliner">
      <h2 className="panel-title">Outliner</h2>

      <section className="outliner-section">
        <h3 className="section-title">Media per screen</h3>
        {MEDIA_INPUTS.map((input) => (
          <div key={input.id} className="media-slot">
            <span className="media-slot__label">{input.label}</span>
            {input.hint && (
              <p className="outliner-status outliner-status--dim">{input.hint}</p>
            )}
            <label className="file-drop file-drop--compact">
              <input
                type="file"
                accept={ACCEPT}
                hidden
                disabled={
                  (input.id === 'sides' && !state.stage.sideScreens) ||
                  (input.id === 'tvs' && !state.stage.sideTvs)
                }
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onMedia(input.id, f);
                  e.target.value = '';
                }}
              />
              Upload
            </label>
            {mediaStatus[input.id] && (
              <p className="outliner-status outliner-status--ok">
                {mediaStatus[input.id]}
              </p>
            )}
            {input.id === 'sides' && !state.stage.sideScreens && (
              <p className="outliner-status outliner-status--dim">
                Enable side screens below
              </p>
            )}
            {input.id === 'tvs' && !state.stage.sideTvs && (
              <p className="outliner-status outliner-status--dim">
                Enable side TVs below
              </p>
            )}
          </div>
        ))}
        {mediaError && (
          <p className="outliner-status outliner-status--err">{mediaError}</p>
        )}
      </section>

      <section className="outliner-section">
        <h3 className="section-title">Stage shade</h3>
        <div className="stage-presets">
          {STAGE_SHADE_PRESETS.map((p) => (
            <button
              key={p.name}
              type="button"
              className="stage-preset-btn"
              onClick={() => patchStage(p.stage)}
            >
              {p.name}
            </button>
          ))}
        </div>
        <label className="color-field">
          <span>Backdrop</span>
          <input
            type="color"
            value={state.stage.backgroundColor}
            onChange={(e) => patchStage({ backgroundColor: e.target.value })}
          />
        </label>
        <label className="color-field">
          <span>Floor</span>
          <input
            type="color"
            value={state.stage.floorColor}
            onChange={(e) => patchStage({ floorColor: e.target.value })}
          />
        </label>
        <label className="color-field">
          <span>Riser</span>
          <input
            type="color"
            value={state.stage.riserColor}
            onChange={(e) => patchStage({ riserColor: e.target.value })}
          />
        </label>
      </section>

      <section className="outliner-section">
        <h3 className="section-title">LED walls</h3>
        <ul className="outliner-tree">
          <li className="outliner-tree__item outliner-tree__item--active">
            Main LED (6×4)
          </li>
          {state.stage.sideScreens && (
            <>
              <li className="outliner-tree__item">Side LEDs (shared feed)</li>
              <li className="outliner-tree__item">L end · L 2×5 · R 2×5 · R end</li>
            </>
          )}
          {state.stage.sideTvs && (
            <li className="outliner-tree__item">Side TVs (outside L/R end caps)</li>
          )}
        </ul>
        <label className="toggle-row">
          <span>Side screens</span>
          <input
            type="checkbox"
            checked={state.stage.sideScreens}
            onChange={(e) => patchStage({ sideScreens: e.target.checked })}
          />
        </label>
        <label className="toggle-row">
          <span>Side instruments</span>
          <input
            type="checkbox"
            checked={state.stage.instruments}
            disabled={!state.stage.sideScreens}
            onChange={(e) => patchStage({ instruments: e.target.checked })}
          />
        </label>
        {state.stage.instruments && state.stage.sideScreens && (
          <p className="outliner-status outliner-status--dim">
            Drums (L) · Keyboard (R) — scaled to 2×5 side bays
          </p>
        )}
        <label className="toggle-row">
          <span>Side TVs (IMAG)</span>
          <input
            type="checkbox"
            checked={state.stage.sideTvs}
            onChange={(e) => patchStage({ sideTvs: e.target.checked })}
          />
        </label>
        {state.stage.sideTvs && (
          <p className="outliner-status outliner-status--dim">
            Large flat screens on poles — height matches side LEDs
          </p>
        )}
      </section>
    </aside>
  );
}
