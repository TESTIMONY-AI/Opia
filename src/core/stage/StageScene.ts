import * as THREE from 'three';
import { StageLightRig } from '../lighting/StageLightRig';
import type { StageMediaTextures } from '../../systems/media/MediaManager';
import { createLedMaterial, updateLedMaterial } from '../../systems/led/LedEmulator';
import { MEDIA_UV_FULL } from '../../systems/led/mediaUvCrop';
import { resolveLedSettings } from '../../systems/led/resolveLedSettings';
import { ledSettingsForModule } from '../../systems/led/ledSettingsPerModule';
import type { LedSettings, LightingSettings, StageSettings } from '../../types';
import { STAGE } from './stageLayout';
import { createLedCabinet, disposeLedCabinet, placeCabinetStraight } from './LedCabinet';
import {
  createStageInstruments,
  disposeStageInstruments,
} from './StageInstruments';
import {
  createStageSideTvs,
  disposeStageSideTvs,
  updateSideTvScreens,
} from './StageSideTvs';
import {
  END_GRID_COLS,
  END_GRID_ROWS,
  INNER_GRID_COLS,
  INNER_GRID_ROWS,
  sidesMediaUvCrops,
  straightWallRowLayout,
} from './moduleGrid';
import type { MediaUvCrop } from '../../systems/led/mediaUvCrop';

type ScreenRole = 'main' | 'sideL' | 'midL' | 'sideR' | 'midR';

interface LedPanelSlot {
  material: THREE.ShaderMaterial;
  crop: MediaUvCrop;
}

interface WallEntry {
  role: ScreenRole;
  root: THREE.Group;
  panels: LedPanelSlot[];
}

function textureForWall(
  role: ScreenRole,
  media: StageMediaTextures,
): THREE.Texture {
  return role === 'main' ? media.main : media.sides;
}

export class StageScene {
  readonly scene = new THREE.Scene();
  readonly lightRig = new StageLightRig();
  readonly ledMeshes: THREE.Mesh[] = [];
  private walls: WallEntry[] = [];
  private staticBuilt = false;
  private resolvedLed: LedSettings | null = null;
  private floorMat!: THREE.MeshStandardMaterial;
  private riserMat!: THREE.MeshStandardMaterial;
  private riserMesh!: THREE.Mesh;
  private instrumentsRoot: THREE.Group | null = null;
  private sideTvsRoot: THREE.Group | null = null;
  private sideTvScreens: THREE.MeshStandardMaterial[] = [];

  constructor() {
    this.scene.background = new THREE.Color('#2e3339');
    this.scene.add(this.lightRig.group);
    this.buildStaticStage();
  }

  rebuild(
    media: StageMediaTextures,
    led: LedSettings,
    stage: StageSettings,
    lighting: LightingSettings,
  ): void {
    this.resolvedLed = resolveLedSettings(led, stage);
    this.applyAppearance(stage);
    this.lightRig.apply(lighting, lighting.shadows ?? true, stage);
    this.lightRig.setHaze(this.scene, lighting.haze);

    this.clearWalls();
    this.rebuildInstruments(stage);
    this.rebuildSideTvs(stage, media);

    const row = straightWallRowLayout(stage.wallWidth, stage.wallHeight);

    const mainBuild = createLedCabinet(
      row.main.width,
      row.main.height,
      createLedMaterial(media.main, this.resolvedLed, MEDIA_UV_FULL),
    );
    placeCabinetStraight(mainBuild.root, row.main.x, row.main.y, STAGE.wallZ);
    this.registerWall('main', mainBuild.root, [
      { material: mainBuild.ledMaterial, crop: MEDIA_UV_FULL },
    ]);

    if (stage.sideScreens) {
      const innerLed = ledSettingsForModule(
        led,
        stage.wallWidth,
        stage.wallHeight,
        INNER_GRID_COLS,
        INNER_GRID_ROWS,
      );
      const endLed = ledSettingsForModule(
        led,
        stage.wallWidth,
        stage.wallHeight,
        END_GRID_COLS,
        END_GRID_ROWS,
      );
      const sideCrops = sidesMediaUvCrops(stage.wallWidth, stage.wallHeight);

      const leftInnerBuild = createLedCabinet(
        row.leftInner.width,
        row.leftInner.height,
        createLedMaterial(media.sides, innerLed, sideCrops.sideL),
      );
      placeCabinetStraight(
        leftInnerBuild.root,
        row.leftInner.x,
        row.leftInner.y,
        STAGE.wallZ,
      );
      this.registerWall('sideL', leftInnerBuild.root, [
        { material: leftInnerBuild.ledMaterial, crop: sideCrops.sideL },
      ]);

      const leftEndBuild = createLedCabinet(
        row.leftEnd.width,
        row.leftEnd.height,
        createLedMaterial(media.sides, endLed, sideCrops.midL),
      );
      placeCabinetStraight(
        leftEndBuild.root,
        row.leftEnd.x,
        row.leftEnd.y,
        STAGE.wallZ,
      );
      this.registerWall('midL', leftEndBuild.root, [
        { material: leftEndBuild.ledMaterial, crop: sideCrops.midL },
      ]);

      const rightInnerBuild = createLedCabinet(
        row.rightInner.width,
        row.rightInner.height,
        createLedMaterial(media.sides, innerLed, sideCrops.sideR),
      );
      placeCabinetStraight(
        rightInnerBuild.root,
        row.rightInner.x,
        row.rightInner.y,
        STAGE.wallZ,
      );
      this.registerWall('sideR', rightInnerBuild.root, [
        { material: rightInnerBuild.ledMaterial, crop: sideCrops.sideR },
      ]);

      const rightEndBuild = createLedCabinet(
        row.rightEnd.width,
        row.rightEnd.height,
        createLedMaterial(media.sides, endLed, sideCrops.midR),
      );
      placeCabinetStraight(
        rightEndBuild.root,
        row.rightEnd.x,
        row.rightEnd.y,
        STAGE.wallZ,
      );
      this.registerWall('midR', rightEndBuild.root, [
        { material: rightEndBuild.ledMaterial, crop: sideCrops.midR },
      ]);
    }
  }

  refreshMedia(
    media: StageMediaTextures,
    led: LedSettings,
    stage: StageSettings,
  ): void {
    this.resolvedLed = resolveLedSettings(led, stage);
    this.updateAllPanels(media, led, stage, 0);
    updateSideTvScreens(this.sideTvScreens, media.tvs);
  }

  update(
    media: StageMediaTextures,
    led: LedSettings,
    stage: StageSettings,
    time: number,
  ): void {
    const resolved = resolveLedSettings(led, stage);
    this.resolvedLed = resolved;
    this.updateAllPanels(media, led, stage, time);
    updateSideTvScreens(this.sideTvScreens, media.tvs);
  }

  private updateAllPanels(
    media: StageMediaTextures,
    led: LedSettings,
    stage: StageSettings,
    time: number,
  ): void {
    const resolvedMain = resolveLedSettings(led, stage);
    const resolvedInner = ledSettingsForModule(
      led,
      stage.wallWidth,
      stage.wallHeight,
      INNER_GRID_COLS,
      INNER_GRID_ROWS,
    );
    const resolvedEnd = ledSettingsForModule(
      led,
      stage.wallWidth,
      stage.wallHeight,
      END_GRID_COLS,
      END_GRID_ROWS,
    );

    for (const wall of this.walls) {
      const tex = textureForWall(wall.role, media);
      const settings =
        wall.role === 'sideL' || wall.role === 'sideR'
          ? resolvedInner
          : wall.role === 'midL' || wall.role === 'midR'
            ? resolvedEnd
            : resolvedMain;
      for (const panel of wall.panels) {
        updateLedMaterial(
          panel.material,
          tex,
          settings,
          time,
          panel.crop,
        );
      }
    }
  }

  applyAppearance(stage: StageSettings): void {
    this.scene.background = new THREE.Color(stage.backgroundColor);
    this.floorMat.color.set(stage.floorColor);
    this.riserMat.color.set(stage.riserColor);
    this.updateRiserSize(stage.wallWidth);
  }

  private updateRiserSize(wallWidth: number): void {
    const { riserDepth, riserHeight, riserZ } = STAGE;
    this.riserMesh.geometry.dispose();
    this.riserMesh.geometry = new THREE.BoxGeometry(
      wallWidth,
      riserHeight,
      riserDepth,
    );
    this.riserMesh.position.set(0, riserHeight * 0.5, riserZ);
  }

  applyLighting(lighting: LightingSettings, stage: StageSettings): void {
    this.lightRig.apply(lighting, lighting.shadows ?? true, stage);
    this.lightRig.setHaze(this.scene, lighting.haze);
  }

  private registerWall(
    role: ScreenRole,
    root: THREE.Group,
    panels: LedPanelSlot[],
  ): void {
    this.scene.add(root);
    this.ledMeshes.push(root as unknown as THREE.Mesh);
    this.walls.push({ role, root, panels });
  }

  private clearWalls(): void {
    for (const w of this.walls) {
      this.scene.remove(w.root);
      disposeLedCabinet(w.root, w.panels[0].material);
    }
    this.walls.length = 0;
    this.ledMeshes.length = 0;
  }

  private rebuildInstruments(stage: StageSettings): void {
    if (this.instrumentsRoot) {
      this.scene.remove(this.instrumentsRoot);
      disposeStageInstruments(this.instrumentsRoot);
      this.instrumentsRoot = null;
    }
    const group = createStageInstruments(stage);
    if (group) {
      this.instrumentsRoot = group;
      this.scene.add(group);
    }
  }

  private rebuildSideTvs(
    stage: StageSettings,
    media: StageMediaTextures,
  ): void {
    if (this.sideTvsRoot) {
      this.scene.remove(this.sideTvsRoot);
      disposeStageSideTvs(this.sideTvsRoot, this.sideTvScreens);
      this.sideTvsRoot = null;
      this.sideTvScreens = [];
    }
    const built = createStageSideTvs(stage, media.tvs);
    if (built) {
      this.sideTvsRoot = built.root;
      this.sideTvScreens = built.screens;
      this.scene.add(built.root);
    }
  }

  private buildStaticStage(): void {
    if (this.staticBuilt) return;
    this.staticBuilt = true;

    this.floorMat = new THREE.MeshStandardMaterial({
      color: '#4a5260',
      roughness: 0.82,
      metalness: 0.06,
    });
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(STAGE.floorWidth, STAGE.floorDepth),
      this.floorMat,
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    this.riserMat = new THREE.MeshStandardMaterial({
      color: '#556070',
      roughness: 0.7,
      metalness: 0.08,
    });
    this.riserMesh = new THREE.Mesh(
      new THREE.BoxGeometry(16, STAGE.riserHeight, STAGE.riserDepth),
      this.riserMat,
    );
    this.riserMesh.position.set(0, STAGE.riserHeight * 0.5, STAGE.riserZ);
    this.riserMesh.castShadow = true;
    this.riserMesh.receiveShadow = true;
    this.scene.add(this.riserMesh);
  }
}
