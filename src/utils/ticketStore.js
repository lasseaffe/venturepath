// src/utils/ticketStore.js
// TACTICAL-CRITICAL: this module must work offline — it is the sole data source
// for tickets in Tactical Mode when the store is unavailable.
import { openDB } from 'idb';

const DB_NAME = 'vp-passport-vault';
const STORE   = 'tickets';
const VERSION = 1;

function getDB() {
  return openDB(DB_NAME, VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    },
  });
}

/** Write tickets whose validFrom is within the next 48 hours to IndexedDB. */
export async function cacheSoonTickets(tickets) {
  const db = await getDB();
  const now = Date.now();
  const cutoff = now + 48 * 60 * 60 * 1000;
  const tx = db.transaction(STORE, 'readwrite');
  for (const ticket of tickets) {
    const ts = ticket.validFrom ? new Date(ticket.validFrom).getTime() : null;
    if (ts && ts >= now && ts <= cutoff) {
      await tx.store.put(ticket);
    }
  }
  await tx.done;
}

/** Read all cached tickets from IndexedDB (used in Tactical Mode). */
export async function getCachedTickets() {
  const db = await getDB();
  return db.getAll(STORE);
}

/** Remove a ticket from the cache (e.g. after it expires). */
export async function removeCachedTicket(id) {
  const db = await getDB();
  return db.delete(STORE, id);
}
