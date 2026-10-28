/**
 * syncQueueService.ts
 *
 * Persistent offline queue using browser IndexedDB (with localStorage fallback).
 * Queues outgoing mutations (ADD_INTAKE, EDIT_INTAKE, DELETE_INTAKE, UPDATE_MARKS)
 * when Google Sheets or network is unavailable, and processes them with automatic
 * exponential backoff retry when connectivity is restored.
 */

export interface SyncQueueItem {
  id: string;
  type: 'ADD_INTAKE' | 'EDIT_INTAKE' | 'DELETE_INTAKE' | 'UPDATE_MARKS';
  endpoint?: string;
  payload: any;
  createdAt: string;
  attempts: number;
  lastAttempt?: string;
  lastError?: string;
  status: 'pending' | 'retrying' | 'failed';
  summary?: string;
  nextRetryAt?: number;
}

const DB_NAME = 'ignou_sync_db';
const DB_VERSION = 1;
const STORE_NAME = 'pending_sync_queue';
const FALLBACK_KEY = 'ignou_pending_sync_queue_fallback';

let dbInstance: IDBDatabase | null = null;
const listeners = new Set<(queue: SyncQueueItem[]) => void>();

function notifyListeners(queue: SyncQueueItem[]) {
  listeners.forEach((listener) => {
    try {
      listener(queue);
    } catch (err) {
      console.error('[syncQueueService listener error]:', err);
    }
  });
}

/**
 * Open IndexedDB connection with fallback detection
 */
async function getDb(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return null;
  }
  if (dbInstance) {
    return dbInstance;
  }

  return new Promise((resolve) => {
    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('status', 'status', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };

      request.onsuccess = (event: Event) => {
        dbInstance = (event.target as IDBOpenDBRequest).result;
        resolve(dbInstance);
      };

      request.onerror = () => {
        console.warn('[syncQueueService] IndexedDB unavailable, falling back to localStorage');
        resolve(null);
      };
    } catch {
      resolve(null);
    }
  });
}

/**
 * LocalStorage Fallback Helpers
 */
function getFallbackQueue(): SyncQueueItem[] {
  try {
    const raw = localStorage.getItem(FALLBACK_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveFallbackQueue(queue: SyncQueueItem[]): void {
  try {
    localStorage.setItem(FALLBACK_KEY, JSON.stringify(queue));
  } catch (err) {
    console.warn('[syncQueueService] LocalStorage save failed:', err);
  }
}

/**
 * Retrieve all pending sync queue items
 */
export async function getPendingSyncQueue(): Promise<SyncQueueItem[]> {
  const db = await getDb();
  if (!db) {
    return getFallbackQueue();
  }

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();

      req.onsuccess = () => {
        const items: SyncQueueItem[] = req.result || [];
        // Sort newest first
        items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        resolve(items);
      };

      req.onerror = () => {
        resolve(getFallbackQueue());
      };
    } catch {
      resolve(getFallbackQueue());
    }
  });
}

/**
 * Enqueue a new mutation to the offline queue
 */
export async function enqueueSyncMutation(mutation: {
  type: SyncQueueItem['type'];
  payload: any;
  summary?: string;
  endpoint?: string;
}): Promise<SyncQueueItem> {
  const id = `sync-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const newItem: SyncQueueItem = {
    id,
    type: mutation.type,
    endpoint: mutation.endpoint || '/api/sheets',
    payload: mutation.payload,
    createdAt: new Date().toISOString(),
    attempts: 0,
    status: 'pending',
    summary: mutation.summary || `${mutation.type} operation`,
    nextRetryAt: Date.now(),
  };

  const db = await getDb();
  if (!db) {
    const queue = getFallbackQueue();
    queue.push(newItem);
    saveFallbackQueue(queue);
    notifyListeners(queue);
    return newItem;
  }

  await new Promise<void>((resolve, reject) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(newItem);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    } catch (err) {
      reject(err);
    }
  }).catch(() => {
    const queue = getFallbackQueue();
    queue.push(newItem);
    saveFallbackQueue(queue);
  });

  const allItems = await getPendingSyncQueue();
  notifyListeners(allItems);
  return newItem;
}

/**
 * Remove an item from the pending queue (e.g., after success or user cancellation)
 */
export async function removeSyncItem(id: string): Promise<void> {
  const db = await getDb();
  if (!db) {
    const queue = getFallbackQueue().filter((item) => item.id !== id);
    saveFallbackQueue(queue);
    notifyListeners(queue);
    return;
  }

  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    } catch {
      resolve();
    }
  });

  const allItems = await getPendingSyncQueue();
  notifyListeners(allItems);
}

/**
 * Update an item in the queue (e.g. increment attempts, record error)
 */
export async function updateSyncItem(item: SyncQueueItem): Promise<void> {
  const db = await getDb();
  if (!db) {
    const queue = getFallbackQueue().map((i) => (i.id === item.id ? item : i));
    saveFallbackQueue(queue);
    notifyListeners(queue);
    return;
  }

  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(item);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    } catch {
      resolve();
    }
  });

  const allItems = await getPendingSyncQueue();
  notifyListeners(allItems);
}

/**
 * Clear the entire pending queue
 */
export async function clearPendingQueue(): Promise<void> {
  const db = await getDb();
  if (!db) {
    saveFallbackQueue([]);
    notifyListeners([]);
    return;
  }

  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    } catch {
      resolve();
    }
  });

  notifyListeners([]);
}

/**
 * Subscribe to pending sync queue updates
 */
export function subscribeSyncQueue(callback: (queue: SyncQueueItem[]) => void): () => void {
  listeners.add(callback);
  // Immediately provide current queue
  getPendingSyncQueue().then(callback);
  return () => {
    listeners.delete(callback);
  };
}

/**
 * Process all pending queue items with an executor function.
 * Implements exponential backoff: 2s -> 4s -> 8s -> 16s -> 32s -> max 60s.
 */
let isProcessingQueue = false;

export async function processPendingQueue(
  executor: (item: SyncQueueItem) => Promise<boolean>,
  forceAll: boolean = false
): Promise<{ processed: number; succeeded: number; failed: number }> {
  if (isProcessingQueue) {
    return { processed: 0, succeeded: 0, failed: 0 };
  }

  isProcessingQueue = true;
  let processed = 0;
  let succeeded = 0;
  let failed = 0;

  try {
    const queue = await getPendingSyncQueue();
    const now = Date.now();

    for (const item of queue) {
      // Respect backoff timestamp unless forced
      if (!forceAll && item.nextRetryAt && item.nextRetryAt > now) {
        continue;
      }

      processed++;
      item.status = 'retrying';
      item.attempts += 1;
      item.lastAttempt = new Date().toISOString();
      await updateSyncItem(item);

      try {
        const ok = await executor(item);
        if (ok) {
          succeeded++;
          await removeSyncItem(item.id);
        } else {
          failed++;
          const backoffDelay = Math.min(2000 * Math.pow(2, item.attempts), 60000);
          item.status = item.attempts >= 5 ? 'failed' : 'pending';
          item.lastError = 'Remote rejected or unavailable';
          item.nextRetryAt = Date.now() + backoffDelay;
          await updateSyncItem(item);
        }
      } catch (err: any) {
        failed++;
        const backoffDelay = Math.min(2000 * Math.pow(2, item.attempts), 60000);
        item.status = item.attempts >= 5 ? 'failed' : 'pending';
        item.lastError = err?.message || 'Network exception during sync retry';
        item.nextRetryAt = Date.now() + backoffDelay;
        await updateSyncItem(item);
      }
    }
  } finally {
    isProcessingQueue = false;
  }

  const finalQueue = await getPendingSyncQueue();
  notifyListeners(finalQueue);
  return { processed, succeeded, failed };
}

/**
 * Retry an individual item directly
 */
export async function retrySingleSyncItem(
  id: string,
  executor: (item: SyncQueueItem) => Promise<boolean>
): Promise<boolean> {
  const queue = await getPendingSyncQueue();
  const item = queue.find((i) => i.id === id);
  if (!item) return false;

  item.status = 'retrying';
  item.attempts += 1;
  item.lastAttempt = new Date().toISOString();
  await updateSyncItem(item);

  try {
    const ok = await executor(item);
    if (ok) {
      await removeSyncItem(item.id);
      return true;
    } else {
      item.status = 'failed';
      item.lastError = 'Manual retry failed';
      await updateSyncItem(item);
      return false;
    }
  } catch (err: any) {
    item.status = 'failed';
    item.lastError = err?.message || 'Manual retry error';
    await updateSyncItem(item);
    return false;
  }
}
