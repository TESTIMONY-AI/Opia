import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { stageRigTowerX } from '../stage/moduleGrid';
import type { LightId, LightingSettings, StageSettings } from '../../types';
import { DEFAULT_STAGE } from '../../types';
import { hexToThreeColor } from './lightColors';

let rectAreaInitialized = false;

function ensureRectAreaSupport(): void {
  if (!rectAreaInitialized) {
    RectAreaLightUniformsLib.init();
    rectAreaInitialized = true;
  }
}

type LightKind = 'area' | 'spot';

interface LightLayout {
  id: LightId;
  kind: LightKind;
  position: [number, number, number];
  target: [number, number, number];
  /** Spot: outer cone angle. Area: ignored */
  angle: number;
  penumbra: number;
  distance: number;
  basePower: number;
  /** Area wash width × height (meters) */
  areaSize?: [number, number];
  castShadow?: boolean;
}

const RIG_HEIGHT = 12.5;
const RIG_DOWNSTAGE_Z = 5;

function layoutsForStage(stage: StageSettings): LightLayout[] {
  const { leftX, rightX } = stageRigTowerX(
    stage.wallWidth,
    stage.wallHeight,
    stage.sideScreens,
  );
  return [
    {
      id: 'washL',
      kind: 'area',
      position: [leftX, RIG_HEIGHT, RIG_DOWNSTAGE_Z],
      target: [0, 2, 2.5],
      angle: 0,
      penumbra: 0,
      distance: 40,
      basePower: 2,
      areaSize: [3.5, 1.8],
    },
    {
      id: 'washR',
      kind: 'area',
      position: [rightX, RIG_HEIGHT, RIG_DOWNSTAGE_Z],
      target: [0, 2, 2.5],
      angle: 0,
      penumbra: 0,
      distance: 40,
      basePower: 2,
      areaSize: [3.5, 1.8],
    },
    {
      id: 'back',
      kind: 'spot',
      position: [0, RIG_HEIGHT, -14],
      target: [0, 2.5, 2.5],
      angle: Math.PI / 2.5,
      penumbra: 0.7,
      distance: 45,
      basePower: 2.5,
      castShadow: true,
    },
  ];
}

interface RigEntry {
  lights: THREE.Light[];
  target?: THREE.Object3D;
  fixture: THREE.Group;
}

/**
 * Stage lighting — real Three.js lights + PAR fixture meshes (no truss bar).
 */
export class StageLightRig {
  readonly group = new THREE.Group();
  private entries: RigEntry[] = [];
  private hemi: THREE.HemisphereLight | null = null;

  constructor() {
    ensureRectAreaSupport();
    this.group.name = 'LightRig';
  }

  apply(
    settings: LightingSettings,
    shadowsEnabled: boolean,
    stage: StageSettings = DEFAULT_STAGE,
  ): void {
    this.clearEntries();
    const master = settings.master;

    this.hemi = new THREE.HemisphereLight(0x7a8aa8, 0x3a4048, 0.28 * master);
    this.group.add(this.hemi);

    for (const layout of layoutsForStage(stage)) {
      const ctrl = settings.lights[layout.id];
      if (!ctrl.enabled) continue;

      const color = hexToThreeColor(ctrl.color);
      const power = layout.basePower * ctrl.intensity * master;
      const pos = new THREE.Vector3(...layout.position);
      const tgt = new THREE.Vector3(...layout.target);

      const lights: THREE.Light[] = [];
      let target: THREE.Object3D | undefined;

      if (layout.kind === 'area' && layout.areaSize) {
        const [w, h] = layout.areaSize;
        const area = new THREE.RectAreaLight(color, power * 28, w, h);
        area.position.copy(pos);
        area.lookAt(tgt);
        lights.push(area);
      } else {
        const spot = new THREE.SpotLight(
          color,
          power,
          layout.distance,
          layout.angle,
          layout.penumbra,
          2,
        );
        spot.position.copy(pos);
        spot.decay = 2;
        spot.castShadow =
          shadowsEnabled && layout.id === 'back' && (layout.castShadow ?? false);
        if (spot.castShadow) {
          spot.shadow.mapSize.set(2048, 2048);
          spot.shadow.bias = -0.00015;
          spot.shadow.normalBias = 0.02;
          spot.shadow.radius = 3;
          spot.shadow.camera.near = 2;
          spot.shadow.camera.far = 50;
        }

        target = new THREE.Object3D();
        target.position.copy(tgt);
        spot.target = target;
        lights.push(spot);
      }

      const fixture = createParCanFixture(color, power, layout.kind);

      for (const light of lights) {
        this.group.add(light);
      }
      if (target) this.group.add(target);
      this.group.add(fixture);

      fixture.position.copy(pos);
      fixture.lookAt(tgt);

      this.entries.push({ lights, target, fixture });
    }
  }

  setHaze(scene: THREE.Scene, amount: number): void {
    scene.fog = amount < 0.001 ? null : new THREE.FogExp2(0x0c0e11, amount);
  }

  dispose(): void {
    this.clearEntries();
    if (this.hemi) this.hemi.dispose();
  }

  private clearEntries(): void {
    for (const e of this.entries) {
      for (const light of e.lights) {
        this.group.remove(light);
        light.dispose();
      }
      if (e.target) this.group.remove(e.target);
      this.group.remove(e.fixture);
      e.fixture.traverse(disposeMesh);
    }
    this.entries.length = 0;
    if (this.hemi) {
      this.group.remove(this.hemi);
      this.hemi.dispose();
      this.hemi = null;
    }
  }
}

/** PAR-style can — visual only; illumination comes from Three.js lights */
function createParCanFixture(
  color: number,
  power: number,
  kind: LightKind,
): THREE.Group {
  const root = new THREE.Group();
  const lensGlow = Math.min(0.15 + power * 0.04, 0.85);

  const yoke = new THREE.Mesh(
    new THREE.BoxGeometry(0.35, 0.12, 0.35),
    new THREE.MeshStandardMaterial({
      color: 0x0a0a0c,
      metalness: 0.85,
      roughness: 0.4,
    }),
  );
  yoke.position.y = -0.2;
  yoke.castShadow = true;
  root.add(yoke);

  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.26, 0.55, 16),
    new THREE.MeshStandardMaterial({
      color: 0x0d0d10,
      metalness: 0.9,
      roughness: 0.25,
    }),
  );
  body.rotation.x = Math.PI / 2;
  body.position.z = 0.05;
  body.castShadow = true;
  root.add(body);

  const lens = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.16, 0.04, 16),
    new THREE.MeshStandardMaterial({
      color: 0x111111,
      emissive: color,
      emissiveIntensity: lensGlow,
      metalness: 0.2,
      roughness: 0.1,
      transparent: true,
      opacity: 0.95,
    }),
  );
  lens.rotation.x = Math.PI / 2;
  lens.position.z = 0.32;
  root.add(lens);

  if (kind === 'area') {
    const bar = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.12, 0.28),
      new THREE.MeshStandardMaterial({
        color: 0x151518,
        metalness: 0.7,
        roughness: 0.35,
      }),
    );
    bar.position.y = -0.28;
    root.add(bar);
  }

  return root;
}

function disposeMesh(o: THREE.Object3D): void {
  const mesh = o as THREE.Mesh;
  mesh.geometry?.dispose();
  const m = mesh.material;
  if (m) {
    (Array.isArray(m) ? m : [m]).forEach((mat) => mat.dispose());
  }
}
