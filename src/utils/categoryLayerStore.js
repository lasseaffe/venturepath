import { openVpDB } from './vpIntelligenceDB';
import { CATEGORY_IDS } from './poiCategories';

const STORE  = 'category_layers';
const KEY    = 'global';
const DEFAULT = { activeLayers: CATEGORY_IDS, presets: [] };

function idbGet(db) {
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(KEY);
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror   = () => reject(req.error);
  });
}

function idbPut(db, record) {
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, 'readwrite').objectStore(STORE).put(record);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

export async function loadLayers() {
  try {
    const db     = await openVpDB();
    const record = await idbGet(db);
    if (!record) return { ...DEFAULT };
    return { activeLayers: record.activeLayers, presets: record.presets };
  } catch {
    return { ...DEFAULT };
  }
}

export async function saveLayers(activeLayers, presets) {
  try {
    const db = await openVpDB();
    await idbPut(db, { id: KEY, activeLayers, presets });
  } catch {
    // non-fatal
  }
}
