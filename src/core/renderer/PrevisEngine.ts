import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { applyCameraPost, createCameraRig, type VirtualCamera } from '../cameras/CameraRig';
import { StageScene } from '../stage/StageScene';
import { MediaManager, type MediaScreenId } from '../../systems/media/MediaManager';
import type { SceneMediaMap } from '../../systems/scenes/lookScenes';
import type { CameraId, PrevisState } from '../../types';
import {
  DEFAULT_CAMERA,
  DEFAULT_LED,
  DEFAULT_LIGHTING,
  DEFAULT_STAGE,
} from '../../types';
import { MonitorBlitter } from './MonitorBlitter';

const ALL_CAMERAS: CameraId[] = [
  'program',
  'cam1',
  'cam2',
  'wide',
  'audience',
];

const DEFAULT_TARGET_W = 480;
const DEFAULT_TARGET_H = 270;

export class PrevisEngine {
  readonly media = new MediaManager();
  private readonly mainCanvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  /** Interactive 3D view — separate from fixed broadcast cameras */
  private viewportCamera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private stage = new StageScene();
  private cameras: VirtualCamera[];
  private targets = new Map<CameraId, THREE.WebGLRenderTarget>();
  private blitterCanvas: HTMLCanvasElement;
  private blitter: MonitorBlitter;
  private clock = new THREE.Clock();
  private state: PrevisState = {
    led: { ...DEFAULT_LED },
    lighting: { ...DEFAULT_LIGHTING },
    stage: { ...DEFAULT_STAGE },
    cameras: buildDefaultCameras(),
    activeCamera: 'program',
  };
  private raf = 0;
  private mounted = false;

  constructor(mainCanvas: HTMLCanvasElement) {
    this.mainCanvas = mainCanvas;

    const probe = document.createElement('canvas').getContext('webgl2');
    if (!probe) {
      throw new Error('WebGL2 is required. Try Chrome or enable hardware acceleration.');
    }

    this.renderer = new THREE.WebGLRenderer({
      canvas: mainCanvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.debug.checkShaderErrors = true;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.viewportCamera = new THREE.PerspectiveCamera(50, 16 / 9, 0.1, 200);
    this.viewportCamera.position.set(0, 5, 18);
    this.viewportCamera.lookAt(0, 3, 1.5);

    this.controls = new OrbitControls(this.viewportCamera, mainCanvas);
    this.controls.target.set(0, 3, 1.5);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.maxPolarAngle = Math.PI * 0.49;
    this.controls.minDistance = 4;
    this.controls.maxDistance = 40;

    this.cameras = createCameraRig(16 / 9, buildDefaultCameras());
    this.ensureAllTargets();

    this.blitterCanvas = document.createElement('canvas');
    this.blitter = new MonitorBlitter(this.blitterCanvas);

    this.stage.rebuild(
      this.media.getTextures(),
      this.state.led,
      this.state.stage,
      this.state.lighting,
    );
    this.fitMainCanvas();
  }

  getState(): PrevisState {
    return this.state;
  }

  setState(partial: Partial<PrevisState>): void {
    const prevSide = this.state.stage.sideScreens;
    const prevInstruments = this.state.stage.instruments;
    const prevSideTvs = this.state.stage.sideTvs;
    const prevPitch = this.state.led.pitchMm;
    const prevAuto = this.state.led.autoResolution;
    this.state = { ...this.state, ...partial };

    if (partial.lighting) {
      this.stage.applyLighting(this.state.lighting, this.state.stage);
    }

    if (partial.stage) {
      this.stage.applyAppearance(this.state.stage);
    }

    const ledPatch = partial.led;
    const needsRebuild =
      (partial.stage &&
        (partial.stage.sideScreens !== prevSide ||
          partial.stage.instruments !== prevInstruments ||
          partial.stage.sideTvs !== prevSideTvs)) ||
      (ledPatch &&
        ((ledPatch.pitchMm !== undefined && ledPatch.pitchMm !== prevPitch) ||
          (ledPatch.autoResolution !== undefined &&
            ledPatch.autoResolution !== prevAuto)));

    if (needsRebuild) {
      this.stage.rebuild(
        this.media.getTextures(),
        this.state.led,
        this.state.stage,
        this.state.lighting,
      );
    } else if (partial.led) {
      this.stage.update(
        this.media.getTextures(),
        this.state.led,
        this.state.stage,
        this.clock.getElapsedTime(),
      );
    }

    if (partial.cameras) {
      for (const vc of this.cameras) {
        vc.settings = this.state.cameras[vc.id];
      }
    }
  }

  resizeMain(width: number, height: number): void {
    const w = Math.max(Math.floor(width), 2);
    const h = Math.max(Math.floor(height), 2);
    this.renderer.setSize(w, h, false);
    this.viewportCamera.aspect = w / h;
    this.viewportCamera.updateProjectionMatrix();
  }

  resizeMonitor(width: number, height: number, id: CameraId): void {
    const w = Math.max(Math.floor(width), 2);
    const h = Math.max(Math.floor(height), 2);
    let target = this.targets.get(id);
    if (!target) {
      target = new THREE.WebGLRenderTarget(w, h);
      this.targets.set(id, target);
    } else {
      target.setSize(w, h);
    }
  }

  getTargetTexture(id: CameraId): THREE.Texture | null {
    return this.targets.get(id)?.texture ?? null;
  }

  paintMonitor(id: CameraId, displayCanvas: HTMLCanvasElement): void {
    const tex = this.getTargetTexture(id);
    const w = displayCanvas.clientWidth;
    const h = displayCanvas.clientHeight;
    if (!tex || w < 2 || h < 2) return;

    try {
      this.blitter.draw(tex, w, h);
      const ctx = displayCanvas.getContext('2d');
      if (!ctx) return;
      if (displayCanvas.width !== w) displayCanvas.width = w;
      if (displayCanvas.height !== h) displayCanvas.height = h;
      ctx.drawImage(this.blitterCanvas, 0, 0, w, h);
    } catch {
      /* blitter can fail if too many GL contexts — main view still works */
    }
  }

  async loadMedia(screen: MediaScreenId, file: File): Promise<void> {
    await this.media.loadFile(screen, file);
    if (this.stage.ledMeshes.length > 0) {
      this.stage.refreshMedia(
        this.media.getTextures(),
        this.state.led,
        this.state.stage,
      );
    } else {
      this.stage.rebuild(
        this.media.getTextures(),
        this.state.led,
        this.state.stage,
        this.state.lighting,
      );
    }
  }

  getMediaFileName(screen: MediaScreenId): string {
    return this.media.getFileName(screen);
  }

  captureSceneMedia(): SceneMediaMap {
    return this.media.captureSceneMedia();
  }

  async applySceneMedia(media: SceneMediaMap): Promise<void> {
    await this.media.applySceneMedia(media);
    if (this.stage.ledMeshes.length > 0) {
      this.stage.refreshMedia(
        this.media.getTextures(),
        this.state.led,
        this.state.stage,
      );
    } else {
      this.stage.rebuild(
        this.media.getTextures(),
        this.state.led,
        this.state.stage,
        this.state.lighting,
      );
    }
  }

  start(): void {
    if (this.mounted) return;
    this.mounted = true;
    const loop = () => {
      this.raf = requestAnimationFrame(loop);
      this.tick();
    };
    loop();
  }

  stop(): void {
    cancelAnimationFrame(this.raf);
    this.mounted = false;
  }

  dispose(): void {
    this.stop();
    this.controls.dispose();
    for (const t of this.targets.values()) t.dispose();
    this.targets.clear();
    this.blitter.dispose();
    this.media.dispose();
    this.renderer.dispose();
  }

  private fitMainCanvas(): void {
    const parent = this.mainCanvas.parentElement;
    const w = this.mainCanvas.clientWidth || parent?.clientWidth || 800;
    const h = this.mainCanvas.clientHeight || parent?.clientHeight || 600;
    this.resizeMain(w, h);
  }

  private ensureAllTargets(): void {
    for (const id of ALL_CAMERAS) {
      if (!this.targets.has(id)) {
        this.targets.set(
          id,
          new THREE.WebGLRenderTarget(DEFAULT_TARGET_W, DEFAULT_TARGET_H),
        );
      }
    }
  }

  private tick(): void {
    const t = this.clock.getElapsedTime();
    this.media.update();
    this.stage.update(this.media.getTextures(), this.state.led, this.state.stage, t);
    this.controls.update();

    if (this.mainCanvas.clientWidth < 2) {
      this.fitMainCanvas();
    }

    const active = this.state.cameras[this.state.activeCamera];
    this.renderer.setRenderTarget(null);
    this.renderer.toneMappingExposure = active.exposure * (800 / active.iso);
    this.renderer.render(this.stage.scene, this.viewportCamera);

    for (const vc of this.cameras) {
      const target = this.targets.get(vc.id);
      if (target) {
        applyCameraPost(this.renderer, this.stage.scene, vc, target);
      }
    }
  }
}

function buildDefaultCameras(): PrevisState['cameras'] {
  return {
    program: { ...DEFAULT_CAMERA },
    cam1: { ...DEFAULT_CAMERA, exposure: 0.95 },
    cam2: { ...DEFAULT_CAMERA, exposure: 1.05 },
    wide: { ...DEFAULT_CAMERA, exposure: 1.1, aperture: 4 },
    audience: { ...DEFAULT_CAMERA, exposure: 0.85 },
  };
}
