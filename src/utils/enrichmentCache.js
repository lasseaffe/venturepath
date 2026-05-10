import { createClient } from '../lib/supabase/client';

const DB_NAME    = 'vp_intelligence';
const STORE_NAME = 'poi_enrichment';
const FRESHNESS_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export function _isFresh(record) {
  if (!record?.fetched_at) return false;
  return Date.now() - new Date(record.fetched_at).getTime() < FRESHNESS_MS;
}

export function _buildRecord(poi_id, enrichment) {
  return {
    poi_id,
    wikidata_qid: enrichment.qid,
    description:  enrichment.description,
    image_url:    enrichment.image_url,
    instance_of:  enrichment.instance_of,
    fetched_at:   new Date().toISOString(),
  };
}

let _db = null;

function openDb() {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = (e) => {
      e.target.result.createObjectStore(STORE_NAME, { keyPath: 'poi_id' });
    };
    req.onsuccess = (e) => { _db = e.target.result; resolve(_db); };
    req.onerror   = () => reject(req.error);
  });
}

async function idbGet(poi_id) {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx  = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(poi_id);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror   = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

async function idbSet(record) {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx  = db.transaction(STORE_NAME, 'readwrite');
      const req = tx.objectStore(STORE_NAME).put(record);
      req.onsuccess = () => resolve();
      req.onerror   = () => reject(req.error);
    });
  } catch {
    // Never throw — cache write failure is non-fatal
  }
}

async function supabaseGet(poi_id) {
  try {
    const supabase = createClient();
    const { data } = await supabase
      .from('poi_enrichment')
      .select('*')
      .eq('poi_id', poi_id)
      .maybeSingle();
    return data ?? null;
  } catch {
    return null;
  }
}

async function supabaseUpsert(record) {
  try {
    const supabase = createClient();
    await supabase.from('poi_enrichment').upsert(record, {
      onConflict: 'poi_id',
      ignoreDuplicates: false,
    });
  } catch {
    // Non-fatal — offline or quota
  }
}

export async function get(poi_id) {
  const local = await idbGet(poi_id);
  if (local && _isFresh(local)) return local;

  const remote = await supabaseGet(poi_id);
  if (remote && _isFresh(remote)) {
    await idbSet(remote);
    return remote;
  }

  return null;
}

export async function set(poi_id, enrichment) {
  const record = _buildRecord(poi_id, enrichment);
  await idbSet(record);
  await supabaseUpsert(record);
}
