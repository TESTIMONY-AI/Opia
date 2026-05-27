import * as THREE from 'three';

/** Physical depth of LED wall cabinet — visible when the camera is at an angle. */
export const LED_CABINET_DEPTH = 0.45;

let sharedCabinetMaterial: THREE.MeshStandardMaterial | null = null;

export function getLedCabinetMaterial(): THREE.MeshStandardMaterial {
  if (!sharedCabinetMaterial) {
    sharedCabinetMaterial = new THREE.MeshStandardMaterial({
      color: '#14181f',
      roughness: 0.55,
      metalness: 0.35,
    });
  }
  return sharedCabinetMaterial;
}

export interface LedCabinetBuild {
  root: THREE.Group;
  ledMaterial: THREE.ShaderMaterial;
}

/**
 * Simple box: LED shader on the front (+Z toward audience), dark housing elsewhere.
 * Depth reads from perspective / orbit — no bezel or frame geometry.
 */
export function createLedCabinet(
  width: number,
  height: number,
  ledMaterial: THREE.ShaderMaterial,
  depth: number = LED_CABINET_DEPTH,
): LedCabinetBuild {
  const cabinet = getLedCabinetMaterial();
  const root = new THREE.Group();
  root.name = 'LedCabinet';

  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    [
      cabinet, // +X
      cabinet, // -X
      cabinet, // +Y
      cabinet, // -Y
      ledMaterial, // +Z front
      cabinet, // -Z back
    ],
  );
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  root.add(mesh);

  return { root, ledMaterial };
}

/**
 * Straight row: no lookAt — all walls face +Z in parallel.
 * Back of cabinet sits on wallZ; bottom of wall at y = 0 when y = height/2.
 */
export function placeCabinetStraight(
  root: THREE.Object3D,
  x: number,
  y: number,
  wallZ: number,
  depth: number = LED_CABINET_DEPTH,
): void {
  root.rotation.set(0, 0, 0);
  root.position.set(x, y, wallZ + depth * 0.5);
}

export function disposeLedCabinet(root: THREE.Group, ledMaterial: THREE.Material): void {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.geometry?.dispose();
  });
  ledMaterial.dispose();
}
