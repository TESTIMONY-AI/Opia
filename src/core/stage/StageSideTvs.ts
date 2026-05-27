import * as THREE from 'three';
import type { StageSettings } from '../../types';
import { STAGE } from './stageLayout';
import { innerWallDimensions, straightWallRowLayout } from './moduleGrid';

const MOUNT_Z = STAGE.wallZ + 1.85;
const POLE_GAP = 0.75;

const POLE = new THREE.MeshStandardMaterial({
  color: 0x3a4048,
  metalness: 0.75,
  roughness: 0.35,
});
const BEZEL = new THREE.MeshStandardMaterial({
  color: 0x121418,
  metalness: 0.4,
  roughness: 0.5,
});

/** Same vertical flip as LED panels (media uses flipY=false). */
function bindTvTexture(
  mat: THREE.MeshStandardMaterial,
  texture: THREE.Texture,
): void {
  texture.repeat.set(1, -1);
  texture.offset.set(0, 1);
  mat.map = texture;
  mat.emissiveMap = texture;
  mat.needsUpdate = true;
}

function createScreenMaterial(texture: THREE.Texture): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({
    emissive: 0xffffff,
    emissiveIntensity: 0.22,
    roughness: 0.88,
    metalness: 0.04,
  });
  bindTvTexture(mat, texture);
  return mat;
}

export function updateSideTvScreens(
  screens: THREE.MeshStandardMaterial[],
  texture: THREE.Texture,
): void {
  for (const mat of screens) {
    bindTvTexture(mat, texture);
  }
}

function createPoleTv(
  poleHeight: number,
  texture: THREE.Texture,
): { unit: THREE.Group; screenMat: THREE.MeshStandardMaterial } {
  const unit = new THREE.Group();
  unit.name = 'SideTv';

  const screenH = poleHeight * 0.44;
  const screenW = (screenH * 16) / 9;
  const screenTop = poleHeight - 0.15;
  const screenCenterY = screenTop - screenH * 0.5;

  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.055, 0.07, poleHeight, 10),
    POLE,
  );
  pole.position.y = poleHeight * 0.5;
  pole.castShadow = true;
  pole.receiveShadow = true;
  unit.add(pole);

  const screenMat = createScreenMaterial(texture);
  const panel = new THREE.Mesh(
    new THREE.BoxGeometry(screenW, screenH, 0.035),
    screenMat,
  );
  panel.position.set(0, screenCenterY, 0.06);
  unit.add(panel);

  const bezel = new THREE.Mesh(
    new THREE.BoxGeometry(screenW + 0.06, screenH + 0.06, 0.02),
    BEZEL,
  );
  bezel.position.set(0, screenCenterY, 0.04);
  unit.add(bezel);

  return { unit, screenMat };
}

export function createStageSideTvs(
  stage: StageSettings,
  texture: THREE.Texture,
): { root: THREE.Group; screens: THREE.MeshStandardMaterial[] } | null {
  if (!stage.sideTvs) return null;

  const row = straightWallRowLayout(stage.wallWidth, stage.wallHeight);
  const sideLedH = stage.sideScreens
    ? innerWallDimensions(stage.wallWidth, stage.wallHeight).height
    : stage.wallHeight;

  const root = new THREE.Group();
  root.name = 'StageSideTvs';
  const screens: THREE.MeshStandardMaterial[] = [];

  const screenW = (sideLedH * 0.44 * 16) / 9;
  let leftX: number;
  let rightX: number;

  if (stage.sideScreens) {
    const leftEdge = row.leftEnd.x - row.leftEnd.width * 0.5;
    const rightEdge = row.rightEnd.x + row.rightEnd.width * 0.5;
    leftX = leftEdge - POLE_GAP - screenW * 0.5;
    rightX = rightEdge + POLE_GAP + screenW * 0.5;
  } else {
    const leftEdge = row.main.x - row.main.width * 0.5;
    const rightEdge = row.main.x + row.main.width * 0.5;
    leftX = leftEdge - POLE_GAP - screenW * 0.5;
    rightX = rightEdge + POLE_GAP + screenW * 0.5;
  }

  const left = createPoleTv(sideLedH, texture);
  left.unit.position.set(leftX, 0, MOUNT_Z);
  root.add(left.unit);
  screens.push(left.screenMat);

  const right = createPoleTv(sideLedH, texture);
  right.unit.position.set(rightX, 0, MOUNT_Z);
  root.add(right.unit);
  screens.push(right.screenMat);

  return { root, screens };
}

export function disposeStageSideTvs(
  root: THREE.Group,
  screens: THREE.MeshStandardMaterial[],
): void {
  for (const mat of screens) {
    mat.dispose();
  }
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    mesh.geometry?.dispose();
  });
}
