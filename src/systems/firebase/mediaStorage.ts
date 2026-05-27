import { deleteObject, getBytes, ref, uploadBytes } from 'firebase/storage';
import type { MediaScreenId } from '../media/MediaManager';
import type { SceneMediaMap } from '../scenes/lookScenes';
import { MEDIA_SCREENS } from '../scenes/lookScenes';
import { getStorageBucket } from './config';
import type { StoredMediaMap, StoredMediaRef } from './types';

const SCREEN_LABELS: Record<MediaScreenId, string> = {
  main: 'Main LED',
  sides: 'Side LEDs',
  tvs: 'Side TVs',
};

export function sceneSlotStoragePath(
  eventId: string,
  sceneId: string,
  screen: MediaScreenId,
): string {
  return `events/${eventId}/scenes/${sceneId}/${screen}`;
}

export async function uploadSceneMedia(
  eventId: string,
  sceneId: string,
  media: SceneMediaMap,
): Promise<StoredMediaMap> {
  const stored = {} as StoredMediaMap;
  for (const screen of MEDIA_SCREENS) {
    const asset = media[screen];
    if (!asset) {
      stored[screen] = null;
      continue;
    }
    const path = sceneSlotStoragePath(eventId, sceneId, screen);
    const label = SCREEN_LABELS[screen];
    try {
      const storageRef = ref(getStorageBucket(), path);
      await uploadBytes(storageRef, asset.blob, {
        contentType: asset.blob.type || 'application/octet-stream',
        customMetadata: { fileName: asset.fileName },
      });
      stored[screen] = {
        storagePath: path,
        fileName: asset.fileName,
        contentType: asset.blob.type || 'application/octet-stream',
      };
    } catch (e) {
      const detail = e instanceof Error ? e.message : String(e);
      throw new Error(`Upload failed for ${label} (${asset.fileName}): ${detail}`);
    }
  }
  return stored;
}

function isStorageNotFound(err: unknown): boolean {
  const code =
    err && typeof err === 'object' && 'code' in err
      ? String((err as { code: string }).code)
      : '';
  return code === 'storage/object-not-found';
}

export async function deleteSceneMedia(
  eventId: string,
  sceneId: string,
): Promise<void> {
  for (const screen of MEDIA_SCREENS) {
    const path = sceneSlotStoragePath(eventId, sceneId, screen);
    const label = SCREEN_LABELS[screen];
    try {
      await deleteObject(ref(getStorageBucket(), path));
    } catch (e) {
      if (isStorageNotFound(e)) continue;
      const detail = e instanceof Error ? e.message : String(e);
      throw new Error(`Delete failed for ${label}: ${detail}`);
    }
  }
}

export async function downloadStoredMedia(
  stored: StoredMediaMap,
): Promise<SceneMediaMap> {
  const media = {} as SceneMediaMap;
  for (const screen of MEDIA_SCREENS) {
    const refData: StoredMediaRef | null = stored[screen];
    if (!refData) {
      media[screen] = null;
      continue;
    }
    const label = SCREEN_LABELS[screen];
    try {
      const storageRef = ref(getStorageBucket(), refData.storagePath);
      const bytes = await getBytes(storageRef);
      media[screen] = {
        fileName: refData.fileName,
        blob: new Blob([bytes], {
          type: refData.contentType || 'application/octet-stream',
        }),
      };
    } catch (e) {
      const detail = e instanceof Error ? e.message : String(e);
      throw new Error(`Download failed for ${label}: ${detail}`);
    }
  }
  return media;
}
