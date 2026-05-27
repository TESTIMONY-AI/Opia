import * as THREE from 'three';
import type { StageSettings } from '../../types';
import { STAGE } from './stageLayout';
import { innerWallDimensions, straightWallRowLayout } from './moduleGrid';

const DOWNSTAGE_OF_WALL = 2.8;

/** Unscaled width (m) before scaling to the 2×5 bay */
const DRUM_WIDTH = 2.2;
const KEYS_WIDTH = 1.35;

const SOLID = new THREE.MeshStandardMaterial({
  color: 0x6d7178,
  metalness: 0.04,
  roughness: 0.88,
});
const SOLID_DARK = new THREE.MeshStandardMaterial({
  color: 0x52565c,
  metalness: 0.06,
  roughness: 0.9,
});

function addMesh(
  parent: THREE.Group,
  geo: THREE.BufferGeometry,
  mat: THREE.Material,
  pos: [number, number, number],
  rot?: [number, number, number],
): THREE.Mesh {
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(...pos);
  if (rot) mesh.rotation.set(rot[0], rot[1], rot[2]);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

/** Life-size drum kit (meters). */
function createDrumKit(): THREE.Group {
  const kit = new THREE.Group();
  kit.name = 'DrumKit';

  addMesh(
    kit,
    new THREE.CylinderGeometry(0.28, 0.29, 0.48, 16),
    SOLID,
    [0, 0.28, 0.55],
    [0, 0, Math.PI / 2],
  );
  addMesh(kit, new THREE.CylinderGeometry(0.18, 0.18, 0.14, 16), SOLID, [
    -0.45, 0.78, 0.05,
  ]);
  addMesh(kit, new THREE.CylinderGeometry(0.02, 0.02, 0.78, 8), SOLID_DARK, [
    -0.45, 0.39, 0.05,
  ]);
  addMesh(kit, new THREE.CylinderGeometry(0.2, 0.21, 0.42, 16), SOLID, [
    0.55, 0.21, 0.35,
  ]);
  addMesh(kit, new THREE.CylinderGeometry(0.15, 0.15, 0.28, 16), SOLID, [
    -0.15, 0.95, 0.45,
  ]);
  addMesh(kit, new THREE.CylinderGeometry(0.14, 0.14, 0.26, 16), SOLID, [
    0.25, 1.02, 0.35,
  ]);
  addMesh(kit, new THREE.CylinderGeometry(0.02, 0.02, 1.05, 8), SOLID_DARK, [
    -0.85, 0.52, 0.25,
  ]);
  addMesh(
    kit,
    new THREE.CylinderGeometry(0.175, 0.175, 0.03, 16),
    SOLID,
    [-0.85, 1.08, 0.25],
    [Math.PI / 2, 0, 0],
  );
  addMesh(kit, new THREE.CylinderGeometry(0.02, 0.02, 1.35, 8), SOLID_DARK, [
    -1.05, 0.67, -0.15,
  ]);
  addMesh(
    kit,
    new THREE.CylinderGeometry(0.23, 0.23, 0.03, 16),
    SOLID,
    [-1.05, 1.38, -0.15],
    [Math.PI / 2, 0, 0],
  );
  addMesh(kit, new THREE.CylinderGeometry(0.02, 0.02, 1.25, 8), SOLID_DARK, [
    1.05, 0.62, -0.25,
  ]);
  addMesh(
    kit,
    new THREE.CylinderGeometry(0.25, 0.25, 0.03, 16),
    SOLID,
    [1.05, 1.28, -0.25],
    [Math.PI / 2, 0, 0],
  );
  addMesh(kit, new THREE.CylinderGeometry(0.02, 0.02, 0.48, 8), SOLID_DARK, [
    0.05, 0.24, -0.75,
  ]);
  addMesh(kit, new THREE.CylinderGeometry(0.22, 0.22, 0.06, 12), SOLID, [
    0.05, 0.52, -0.75,
  ]);

  return kit;
}

/** Life-size 88-key keyboard on stand (meters). */
function createKeyboard(): THREE.Group {
  const rig = new THREE.Group();
  rig.name = 'Keyboard';

  addMesh(rig, new THREE.BoxGeometry(1.35, 0.12, 0.48), SOLID, [0, 0.82, 0]);
  addMesh(rig, new THREE.BoxGeometry(0.1, 0.78, 0.42), SOLID_DARK, [-0.52, 0.39, 0.04]);
  addMesh(rig, new THREE.BoxGeometry(0.1, 0.78, 0.42), SOLID_DARK, [0.52, 0.39, 0.04]);
  addMesh(rig, new THREE.BoxGeometry(0.65, 0.05, 0.38), SOLID_DARK, [0, 0.025, 0.04]);

  return rig;
}

function scaleToBay(
  group: THREE.Group,
  bayWidth: number,
  footprintWidth: number,
  widthFill: number,
): void {
  group.scale.setScalar((bayWidth * widthFill) / footprintWidth);
}

export function createStageInstruments(stage: StageSettings): THREE.Group | null {
  if (!stage.sideScreens || !stage.instruments) return null;

  const row = straightWallRowLayout(stage.wallWidth, stage.wallHeight);
  const bay = innerWallDimensions(stage.wallWidth, stage.wallHeight);
  const z = STAGE.wallZ + DOWNSTAGE_OF_WALL;
  const root = new THREE.Group();
  root.name = 'StageInstruments';

  const drums = createDrumKit();
  drums.rotation.y = Math.PI * 0.06;
  scaleToBay(drums, bay.width, DRUM_WIDTH, 0.82);
  drums.position.set(row.leftInner.x, 0, z);
  root.add(drums);

  const keys = createKeyboard();
  keys.rotation.y = Math.PI;
  scaleToBay(keys, bay.width, KEYS_WIDTH, 0.72);
  keys.position.set(row.rightInner.x, 0, z);
  root.add(keys);

  return root;
}

export function disposeStageInstruments(root: THREE.Group): void {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    mesh.geometry?.dispose();
  });
}
