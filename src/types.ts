export type CameraId = 'program' | 'cam1' | 'cam2' | 'wide' | 'audience';

export type LightId = 'washL' | 'washR' | 'back';

export interface LightControl {
  color: string;
  intensity: number;
  enabled: boolean;
}

export interface LedSettings {
  pitchMm: number;
  diodeSize: number;
  brightness: number;
  contrast: number;
  bloomIntensity: number;
  panelGap: number;
  scanlineAmount: number;
  ledCols: number;
  ledRows: number;
  autoResolution: boolean;
  flipMediaY: number;
}

export interface LightingSettings {
  master: number;
  haze: number;
  shadows: boolean;
  lights: Record<LightId, LightControl>;
}

export interface CameraSettings {
  exposure: number;
  iso: number;
  aperture: number;
  focusSoftness: number;
  whiteBalance: number;
  sharpness: number;
  rollingShutter: number;
}

export interface StageSettings {
  wallWidth: number;
  wallHeight: number;
  sideScreens: boolean;
  /** Placeholder kit in front of L/R side inner LEDs */
  instruments: boolean;
  /** IMAG monitors flanking main center LED */
  sideTvs: boolean;
  backgroundColor: string;
  floorColor: string;
  riserColor: string;
}

export interface PrevisState {
  led: LedSettings;
  lighting: LightingSettings;
  cameras: Record<CameraId, CameraSettings>;
  stage: StageSettings;
  activeCamera: CameraId;
}

export const LIGHT_IDS: LightId[] = ['washL', 'washR', 'back'];

export const LIGHT_LABELS: Record<LightId, string> = {
  washL: 'Wash Left',
  washR: 'Wash Right',
  back: 'Back (house)',
};

export const STAGE_SHADE_PRESETS: Array<{ name: string; stage: Partial<StageSettings> }> = [
  {
    name: 'Light grey',
    stage: {
      backgroundColor: '#3a4048',
      floorColor: '#5c6570',
      riserColor: '#666f7a',
    },
  },
  {
    name: 'Mid grey',
    stage: {
      backgroundColor: '#2e3339',
      floorColor: '#4a5260',
      riserColor: '#556070',
    },
  },
  {
    name: 'Warm grey',
    stage: {
      backgroundColor: '#36322e',
      floorColor: '#5a554d',
      riserColor: '#656058',
    },
  },
  {
    name: 'Dark grey',
    stage: {
      backgroundColor: '#1e2228',
      floorColor: '#353b45',
      riserColor: '#3d4450',
    },
  },
];

export const DEFAULT_LED: LedSettings = {
  pitchMm: 3.9,
  diodeSize: 0.72,
  brightness: 1.65,
  contrast: 1.08,
  bloomIntensity: 0.28,
  panelGap: 0.003,
  scanlineAmount: 0.15,
  ledCols: 384,
  ledRows: 216,
  autoResolution: true,
  flipMediaY: 1,
};

export const DEFAULT_LIGHTING: LightingSettings = {
  master: 1,
  haze: 0.004,
  shadows: true,
  lights: {
    washL: { color: '#9ec8ff', intensity: 1, enabled: true },
    washR: { color: '#9ec8ff', intensity: 1, enabled: true },
    back: { color: '#e8eeff', intensity: 0.85, enabled: true },
  },
};

export const DEFAULT_CAMERA: CameraSettings = {
  exposure: 1.15,
  iso: 800,
  aperture: 2.8,
  focusSoftness: 0,
  whiteBalance: 5600,
  sharpness: 0.5,
  rollingShutter: 0,
};

export const DEFAULT_STAGE: StageSettings = {
  wallWidth: 16,
  wallHeight: 9,
  sideScreens: true,
  instruments: true,
  sideTvs: true,
  backgroundColor: '#2e3339',
  floorColor: '#4a5260',
  riserColor: '#556070',
};
