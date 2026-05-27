import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  type Unsubscribe,
} from 'firebase/firestore';
import { getDb } from './config';
import type { StoredEvent } from './types';

function parseEvent(id: string, data: Record<string, unknown>): StoredEvent {
  return {
    id,
    name: String(data.name ?? 'Untitled event'),
    createdAt: Number(data.createdAt ?? Date.now()),
    updatedAt: Number(data.updatedAt ?? Date.now()),
  };
}

export function subscribeEvents(
  onData: (events: StoredEvent[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  const q = query(collection(getDb(), 'events'), orderBy('updatedAt', 'desc'));
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => parseEvent(d.id, d.data())));
    },
    (err) => onError?.(err),
  );
}

export async function createEvent(name: string): Promise<StoredEvent> {
  const id = crypto.randomUUID();
  const now = Date.now();
  const payload = { name, createdAt: now, updatedAt: now };
  await setDoc(doc(getDb(), 'events', id), payload);
  return { id, ...payload };
}

export async function renameEvent(id: string, name: string): Promise<void> {
  const now = Date.now();
  await updateDoc(doc(getDb(), 'events', id), { name, updatedAt: now });
}

export async function touchEvent(id: string): Promise<void> {
  await updateDoc(doc(getDb(), 'events', id), { updatedAt: Date.now() });
}
