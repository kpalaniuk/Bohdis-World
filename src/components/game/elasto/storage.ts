export interface StoredLevel {
  sha256: string;
  fileName: string;
  bytes: ArrayBuffer;
}

const DB_NAME = 'bohdi-elasto-levels';
const STORE = 'levels';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: 'sha256' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveGuestLevels(levels: StoredLevel[]): Promise<void> {
  try {
    const db = await openDb();
    const transaction = db.transaction(STORE, 'readwrite');
    for (const level of levels) transaction.objectStore(STORE).put(level);
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    db.close();
  } catch {
    // Private browsing and locked-down school devices may disable IndexedDB.
  }
}

export async function loadGuestLevels(): Promise<StoredLevel[]> {
  try {
    const db = await openDb();
    const request = db.transaction(STORE, 'readonly').objectStore(STORE).getAll();
    const levels = await new Promise<StoredLevel[]>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result as StoredLevel[]);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return levels;
  } catch { return []; }
}

export async function clearGuestLevels(): Promise<void> {
  try {
    const db = await openDb();
    const request = db.transaction(STORE, 'readwrite').objectStore(STORE).clear();
    await new Promise<void>((resolve, reject) => {
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    db.close();
  } catch {
    // Guest storage is optional and may be unavailable.
  }
}
