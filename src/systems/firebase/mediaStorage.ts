import {
  deleteObject,
  getBytes,
  getDownloadURL,
  ref,
  uploadBytes,
} from 'firebase/storage';
import type { MediaScreenId } from '../media/MediaManager';
import type { SceneMediaAsset, SceneMediaMap } from '../scenes/lookScenes';
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

function isVideoContentType(contentType: string): boolean {
  return contentType.startsWith('video/');
}

function guessContentType(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (/\.(mp4|mov|m4v)$/.test(lower)) return 'video/mp4';
  if (/\.webm$/.test(lower)) return 'video/webm';
  if (/\.ogg$/.test(lower)) return 'video/ogg';
  if (/\.png$/.test(lower)) return 'image/png';
  if (/\.jpe?g$/.test(lower)) return 'image/jpeg';
  if (/\.webp$/.test(lower)) return 'image/webp';
  return '';
}

function isVideoFile(fileName: string): boolean {
  return isVideoContentType(guessContentType(fileName));
}

async function uploadScreen(
  eventId: string,
  sceneId: string,
  screen: MediaScreenId,
  asset: SceneMediaAsset,
): Promise<StoredMediaRef> {
  const blob = asset.blob;
  if (!blob) {
    throw new Error(`Missing media data for ${SCREEN_LABELS[screen]}`);
  }
  const path = sceneSlotStoragePath(eventId, sceneId, screen);
  const label = SCREEN_LABELS[screen];
  try {
    const storageRef = ref(getStorageBucket(), path);
    await uploadBytes(storageRef, blob, {
      contentType: blob.type || 'application/octet-stream',
      customMetadata: { fileName: asset.fileName },
    });
    return {
      storagePath: path,
      fileName: asset.fileName,
      contentType: blob.type || 'application/octet-stream',
    };
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    throw new Error(`Upload failed for ${label} (${asset.fileName}): ${detail}`);
  }
}

export async function uploadSceneMedia(
  eventId: string,
  sceneId: string,
  media: SceneMediaMap,
): Promise<StoredMediaMap> {
  const entries = await Promise.all(
    MEDIA_SCREENS.map(async (screen) => {
      const asset = media[screen];
      if (!asset) return [screen, null] as const;
      if (asset.blob) {
        const stored = await uploadScreen(eventId, sceneId, screen, asset);
        return [screen, stored] as const;
      }
      // Asset already in Firebase Storage — reuse the existing reference.
      if (asset.storagePath) {
        const contentType = guessContentType(asset.fileName) || 'application/octet-stream';
        return [screen, { storagePath: asset.storagePath, fileName: asset.fileName, contentType }] as const;
      }
      return [screen, null] as const;
    }),
  );
  const stored = {} as StoredMediaMap;
  for (const [screen, refData] of entries) {
    stored[screen] = refData;
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
  await Promise.all(
    MEDIA_SCREENS.map(async (screen) => {
      const path = sceneSlotStoragePath(eventId, sceneId, screen);
      const label = SCREEN_LABELS[screen];
      try {
        await deleteObject(ref(getStorageBucket(), path));
      } catch (e) {
        if (isStorageNotFound(e)) return;
        const detail = e instanceof Error ? e.message : String(e);
        throw new Error(`Delete failed for ${label}: ${detail}`);
      }
    }),
  );
}

async function downloadScreen(
  screen: MediaScreenId,
  refData: StoredMediaRef,
): Promise<SceneMediaAsset> {
  const label = SCREEN_LABELS[screen];
  const storageRef = ref(getStorageBucket(), refData.storagePath);
  const contentType = refData.contentType || 'application/octet-stream';

  try {
    if (isVideoContentType(contentType)) {
      const sourceUrl = await getDownloadURL(storageRef);
      return { fileName: refData.fileName, sourceUrl, storagePath: refData.storagePath };
    }
    const bytes = await getBytes(storageRef);
    return {
      fileName: refData.fileName,
      blob: new Blob([bytes], { type: contentType }),
      storagePath: refData.storagePath,
    };
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    throw new Error(`Download failed for ${label}: ${detail}`);
  }
}

export async function downloadStoredMedia(
  stored: StoredMediaMap,
): Promise<SceneMediaMap> {
  const entries = await Promise.all(
    MEDIA_SCREENS.map(async (screen) => {
      const refData = stored[screen];
      if (!refData) return [screen, null] as const;
      const asset = await downloadScreen(screen, refData);
      return [screen, asset] as const;
    }),
  );
  const media = {} as SceneMediaMap;
  for (const [screen, asset] of entries) {
    media[screen] = asset;
  }
  return media;
}
