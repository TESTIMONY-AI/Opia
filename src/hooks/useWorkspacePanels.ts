import { useCallback, useState } from 'react';

const STORAGE_KEY = 'opia:panel-collapse';

export interface WorkspacePanelCollapse {
  outliner: boolean;
  inspector: boolean;
  sceneStrip: boolean;
  topBar: boolean;
}

const DEFAULTS: WorkspacePanelCollapse = {
  outliner: false,
  inspector: false,
  sceneStrip: false,
  topBar: false,
};

function loadPanelCollapse(): WorkspacePanelCollapse {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<WorkspacePanelCollapse>;
    return { ...DEFAULTS, ...parsed };
  } catch {
    return { ...DEFAULTS };
  }
}

function savePanelCollapse(state: WorkspacePanelCollapse): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore quota / private mode */
  }
}

export function useWorkspacePanels() {
  const [collapsed, setCollapsed] = useState<WorkspacePanelCollapse>(loadPanelCollapse);

  const toggle = useCallback((panel: keyof WorkspacePanelCollapse) => {
    setCollapsed((prev) => {
      const next = { ...prev, [panel]: !prev[panel] };
      savePanelCollapse(next);
      return next;
    });
  }, []);

  return { collapsed, toggle };
}
