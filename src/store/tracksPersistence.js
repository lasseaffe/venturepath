const DB_NAME = 'vp-studio';
const DB_VERSION = 1;
const STORE = 'tracks';
const KEY = 'all';

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx(mode, fn) {
  return openDb().then(db => new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const store = t.objectStore(STORE);
    const req = fn(store);
    t.oncomplete = () => resolve(req?.result ?? undefined);
    t.onerror = () => reject(t.error);
  }));
}

export async function saveTracks(tracks) {
  return tx('readwrite', store => store.put(tracks, KEY));
}

export async function loadTracks() {
  let result;
  await openDb().then(db => new Promise((resolve, reject) => {
    const t = db.transaction(STORE, 'readonly');
    const req = t.objectStore(STORE).get(KEY);
    req.onsuccess = () => { result = req.result; resolve(); };
    req.onerror = () => reject(req.error);
  }));
  return result ?? [];
}

export async function clearTracks() {
  return tx('readwrite', store => store.delete(KEY));
}
