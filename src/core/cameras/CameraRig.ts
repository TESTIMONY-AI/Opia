import * as THREE from 'three';
import type { CameraId, CameraSettings } from '../../types';

export interface VirtualCamera {
  id: CameraId;
  label: string;
  camera: THREE.PerspectiveCamera;
  settings: CameraSettings;
}

const CAMERA_LAYOUT: Array<{
  id: CameraId;
  label: string;
  position: [number, number, number];
  lookAt: [number, number, number];
  fov: number;
}> = [
  { id: 'program', label: 'PROGRAM', position: [0, 4, 14], lookAt: [0, 3, 1], fov: 42 },
  { id: 'cam1', label: 'CAM 1', position: [-10, 3.5, 10], lookAt: [0, 3, 1], fov: 38 },
  { id: 'cam2', label: 'CAM 2', position: [10, 3.5, 10], lookAt: [0, 3, 1], fov: 38 },
  { id: 'wide', label: 'WIDE', position: [0, 6, 22], lookAt: [0, 3.5, 0], fov: 55 },
  { id: 'audience', label: 'AUDIENCE', position: [0, 2.2, 18], lookAt: [0, 4, -3], fov: 48 },
];

export function createCameraRig(
  aspect: number,
  settingsMap: Record<CameraId, CameraSettings>,
): VirtualCamera[] {
  return CAMERA_LAYOUT.map((cfg) => {
    const cam = new THREE.PerspectiveCamera(cfg.fov, aspect, 0.1, 200);
    cam.position.set(...cfg.position);
    cam.lookAt(...cfg.lookAt);
    return {
      id: cfg.id,
      label: cfg.label,
      camera: cam,
      settings: settingsMap[cfg.id],
    };
  });
}

export function applyCameraPost(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  cam: VirtualCamera,
  target: THREE.WebGLRenderTarget,
): void {
  const { settings } = cam;
  cam.camera.fov = 42 - settings.aperture * 2 + settings.focusSoftness * 4;
  cam.camera.updateProjectionMatrix();

  renderer.setRenderTarget(target);
  renderer.toneMappingExposure = settings.exposure * (800 / settings.iso);
  renderer.render(scene, cam.camera);
  renderer.setRenderTarget(null);
}
