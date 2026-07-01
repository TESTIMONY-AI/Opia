import type { MediaScreenId } from '../media/MediaManager';

export interface SceneMediaAsset {
  fileName: string;
  /** Local bytes — used for uploads and offline scenes. */
  blob?: Blob;
  /** Firebase download URL — videos load progressively without a full download. */
  sourceUrl?: string;
  /** Firebase Storage path — present when the asset already lives in Storage, so it can be reused without re-uploading. */
  storagePath?: string;
}

export type SceneMediaMap = Record<MediaScreenId, SceneMediaAsset | null>;

export interface LookScene {
  id: string;
  name: string;
  media: SceneMediaMap;
}

export const MEDIA_SCREENS: MediaScreenId[] = ['main', 'sides', 'tvs'];

export function emptySceneMedia(): SceneMediaMap {
  return { main: null, sides: null, tvs: null };
}

export function createLookScene(name: string): LookScene {
  return {
    id: crypto.randomUUID(),
    name,
    media: emptySceneMedia(),
  };
}

export function mediaStatusFromScene(
  media: SceneMediaMap,
): Partial<Record<MediaScreenId, string>> {
  const status: Partial<Record<MediaScreenId, string>> = {};
  for (const id of MEDIA_SCREENS) {
    const asset = media[id];
    if (asset) status[id] = asset.fileName;
  }
  return status;
}
