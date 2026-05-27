import type * as THREE from 'three';
import { MediaSlot } from './MediaSlot';
import type { SceneMediaMap } from '../scenes/lookScenes';
import { MEDIA_SCREENS } from '../scenes/lookScenes';

export type MediaScreenId = 'main' | 'sides' | 'tvs';

export interface StageMediaTextures {
  main: THREE.Texture;
  /** Shared by all side walls — UV split L end | L inner | R inner | R end */
  sides: THREE.Texture;
  /** Shared by both side IMAG TVs */
  tvs: THREE.Texture;
}

const LABELS: Record<MediaScreenId, string> = {
  main: 'MAIN LED (6×4) — upload media',
  sides: 'ALL SIDE LEDs — one feed, split across screens',
  tvs: 'SIDE TVs — one feed, both screens',
};

export class MediaManager {
  private readonly slots: Record<MediaScreenId, MediaSlot> = {
    main: new MediaSlot(LABELS.main),
    sides: new MediaSlot(LABELS.sides, { splitPreview: true }),
    tvs: new MediaSlot(LABELS.tvs),
  };

  /** @deprecated use getTextures().main */
  get texture() {
    return this.slots.main.texture;
  }

  getTextures(): StageMediaTextures {
    return {
      main: this.slots.main.texture,
      sides: this.slots.sides.texture,
      tvs: this.slots.tvs.texture,
    };
  }

  async loadFile(screen: MediaScreenId, file: File): Promise<void> {
    await this.slots[screen].loadFile(file);
  }

  getFileName(screen: MediaScreenId): string {
    return this.slots[screen].fileName;
  }

  captureSceneMedia(): SceneMediaMap {
    const media = {} as SceneMediaMap;
    for (const id of MEDIA_SCREENS) {
      media[id] = this.slots[id].getAsset();
    }
    return media;
  }

  async applySceneMedia(media: SceneMediaMap): Promise<void> {
    for (const id of MEDIA_SCREENS) {
      const asset = media[id];
      if (asset) {
        const file = new File([asset.blob], asset.fileName, {
          type: asset.blob.type || 'application/octet-stream',
        });
        await this.slots[id].loadFile(file);
      } else {
        this.slots[id].resetToPlaceholder();
      }
    }
  }

  update(): void {
    for (const slot of Object.values(this.slots)) {
      slot.update();
    }
  }

  dispose(): void {
    for (const slot of Object.values(this.slots)) {
      slot.dispose();
    }
  }
}
