import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  type Unsubscribe,
} from 'firebase/firestore';
import type { MediaScreenId } from '../media/MediaManager';
import type { SceneMediaMap } from '../scenes/lookScenes';
import { getDb } from './config';
import { deleteSceneMedia, uploadSceneMedia } from './mediaStorage';
import { touchEvent } from './eventsRepository';
import type { StoredMediaMap, StoredScene } from './types';

function parseMedia(data: unknown): StoredMediaMap {
  const raw = (data ?? {}) as Record<string, unknown>;
  const screens: MediaScreenId[] = ['main', 'sides', 'tvs'];
  const media = {} as StoredMediaMap;
  for (const screen of screens) {
    const slot = raw[screen];
    if (!slot || typeof slot !== 'object') {
      media[screen] = null;
      continue;
    }
    const ref = slot as Record<string, unknown>;
    if (!ref.storagePath) {
      media[screen] = null;
      continue;
    }
    media[screen] = {
      storagePath: String(ref.storagePath),
      fileName: String(ref.fileName ?? 'media'),
      contentType: String(ref.contentType ?? 'application/octet-stream'),
    };
  }
  return media;
}

function parseScene(id: string, data: Record<string, unknown>): StoredScene {
  return {
    id,
    name: String(data.name ?? 'Untitled'),
    order: Number(data.order ?? 0),
    updatedAt: Number(data.updatedAt ?? Date.now()),
    media: parseMedia(data.media),
  };
}

export function subscribeScenes(
  eventId: string,
  onData: (scenes: StoredScene[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  const q = query(
    collection(getDb(), 'events', eventId, 'scenes'),
    orderBy('order', 'asc'),
  );
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => parseScene(d.id, d.data())));
    },
    (err) => onError?.(err),
  );
}

export async function createScene(
  eventId: string,
  name: string,
  media: SceneMediaMap,
  order: number,
  sceneId: string = crypto.randomUUID(),
): Promise<StoredScene> {
  const id = sceneId;
  const now = Date.now();
  const storedMedia = await uploadSceneMedia(eventId, id, media);
  const payload = {
    name,
    order,
    updatedAt: now,
    media: storedMedia,
  };
  await setDoc(doc(getDb(), 'events', eventId, 'scenes', id), payload);
  await touchEvent(eventId);
  return { id, ...payload };
}

export async function renameScene(
  eventId: string,
  sceneId: string,
  name: string,
): Promise<void> {
  const now = Date.now();
  await updateDoc(doc(getDb(), 'events', eventId, 'scenes', sceneId), {
    name,
    updatedAt: now,
  });
  await touchEvent(eventId);
}

export async function updateSceneMedia(
  eventId: string,
  sceneId: string,
  media: SceneMediaMap,
): Promise<void> {
  const storedMedia = await uploadSceneMedia(eventId, sceneId, media);
  const now = Date.now();
  await updateDoc(doc(getDb(), 'events', eventId, 'scenes', sceneId), {
    media: storedMedia,
    updatedAt: now,
  });
  await touchEvent(eventId);
}

export async function deleteScene(
  eventId: string,
  sceneId: string,
): Promise<void> {
  await deleteSceneMedia(eventId, sceneId);
  await deleteDoc(doc(getDb(), 'events', eventId, 'scenes', sceneId));
  await touchEvent(eventId);
}
