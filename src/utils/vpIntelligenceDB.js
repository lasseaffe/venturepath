let _db = null;

export function openVpDB() {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('vp_intelligence', 2);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('poi_enrichment')) {
        db.createObjectStore('poi_enrichment', { keyPath: 'poi_id' });
      }
      if (!db.objectStoreNames.contains('category_layers')) {
        db.createObjectStore('category_layers', { keyPath: 'id' });
      }
    };
    req.onsuccess = (e) => { _db = e.target.result; resolve(_db); };
    req.onerror   = () => reject(req.error);
  });
}

// For tests: reset the cached db instance
export function _resetDbCache() { _db = null; }
