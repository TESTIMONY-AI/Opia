import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import type { MediaScreenId } from '../media/MediaManager';
import type { SceneMediaMap } from '../scenes/lookScenes';
import { MEDIA_SCREENS } from '../scenes/lookScenes';
import { getStorageBucket } from './config';
import type { StoredMediaMap, StoredMediaRef } from './types';

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
    const storageRef = ref(getStorageBucket(), path);
    await uploadBytes(storageRef, asset.blob, {
      contentType: asset.blob.type || 'application/octet-stream',
    });
    stored[screen] = {
      storagePath: path,
      fileName: asset.fileName,
      contentType: asset.blob.type || 'application/octet-stream',
    };
  }
  return stored;
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
    const storageRef = ref(getStorageBucket(), refData.storagePath);
    const url = await getDownloadURL(storageRef);
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to download ${refData.fileName}`);
    }
    const blob = await res.blob();
    media[screen] = {
      fileName: refData.fileName,
      blob,
    };
  }
  return media;
}
