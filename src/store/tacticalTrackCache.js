// TACTICAL-CRITICAL: this module must work offline
const DB_NAME = 'vp-tactical';
const DB_VERSION = 1;
const STORE = 'cached-tracks';

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function cacheTacticalTrack(track) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, 'readwrite');
    t.objectStore(STORE).put({
      id: track.id,
      name: track.name,
      points: track.points,
      cachedAt: new Date().toISOString(),
    });
    t.oncomplete = resolve;
    t.onerror = () => reject(t.error);
  });
}

export async function loadTacticalTracks() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, 'readonly').objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result ?? []);
    req.onerror = () => reject(req.error);
  });
}

export async function clearTacticalTracks() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, 'readwrite');
    t.objectStore(STORE).clear();
    t.oncomplete = resolve;
    t.onerror = () => reject(t.error);
  });
}
