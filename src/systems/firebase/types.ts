import type { MediaScreenId } from '../media/MediaManager';

export interface StoredMediaRef {
  storagePath: string;
  fileName: string;
  contentType: string;
}

export type StoredMediaMap = Record<MediaScreenId, StoredMediaRef | null>;

export interface StoredEvent {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
}

export interface StoredScene {
  id: string;
  name: string;
  order: number;
  updatedAt: number;
  media: StoredMediaMap;
}
