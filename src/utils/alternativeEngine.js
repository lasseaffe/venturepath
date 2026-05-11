import { resolveStop } from './transitEngine';

const ROME2RIO_BASE = 'https://free.rome2rio.com/api/1.4/json';
const DB_REST       = 'https://v6.db.transport.rest';
const DB_HEADERS    = { 'Accept-Language': 'en' };

const CO2_G_PER_KM = { plane: 255, train: 14, bus: 68, ferry: 19, car: 170, tram: 22 };

function minsToHuman(mins) {
  const h = Math.floor(Math.abs(mins) / 60);
  const m = Math.abs(mins) % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function dbProductToMode(product) {
  const map = {
    nationalExpress: 'train', national: 'train', regional: 'train',
    regionalExpress: 'train', suburban: 'train',
    bus: 'bus', tram: 'tram', ferry: 'ferry',
  };
  return map[product] ?? 'train';
}

async function fallbackDbRest(fromCoords, toCoords, isoDate) {
  const [fromStop, toStop] = await Promise.all([
    resolveStop(fromCoords.lat, fromCoords.lng),
    resolveStop(toCoords.lat, toCoords.lng),
  ]);
  if (!fromStop || !toStop) return [];

  const url  = `${DB_REST}/journeys?from=${fromStop.id}&to=${toStop.id}&departure=${encodeURIComponent(isoDate)}&results=4`;
  const res  = await fetch(url, { headers: DB_HEADERS });
  const data = await res.json();

  return (data.journeys ?? []).map((j, i) => {
    const first = j.legs[0];
    const last  = j.legs[j.legs.length - 1];
    const durationMins = Math.round((new Date(last.arrival) - new Date(first.departure)) / 60000);
    const modes = [...new Set(j.legs.map(l => dbProductToMode(l.line?.product)))];

    return {
      id:       `db-${i}`,
      label:    j.legs.map(l => l.line?.name ?? '?').join(' + '),
      modes,
      segments: j.legs.map(l => ({ mode: dbProductToMode(l.line?.product), carrier: l.line?.name ?? '—', duration: '' })),
      duration: minsToHuman(durationMins),
      price:    j.price?.amount ?? null,
      co2:      0,
      departs:  first.departure,
      arrives:  last.arrival,
      source:   'db-rest',
    };
  });
}

// Find cross-modal alternatives for a disrupted leg.
// Tries Rome2rio first; falls back to DB-Rest journeys on quota or failure.
export async function findAlternatives(fromCoords, toCoords, isoDate) {
  const key = import.meta.env.VITE_ROME2RIO_KEY;

  try {
    const url = `${ROME2RIO_BASE}/Search?key=${key}&sLat=${fromCoords.lat}&sLng=${fromCoords.lng}&dLat=${toCoords.lat}&dLng=${toCoords.lng}&currencyCode=EUR`;
    const res = await fetch(url);
    if (res.status === 429) throw new Error('quota');

    const data = await res.json();
    return (data.routes ?? []).slice(0, 4).map((r, i) => ({
      id:       `r2r-${i}`,
      label:    r.name,
      modes:    [...new Set((r.segments ?? []).map(s => s.kind).concat(r.kind))],
      segments: (r.segments ?? []).map(s => ({ mode: s.kind, carrier: s.name, duration: minsToHuman(s.duration) })),
      duration: minsToHuman(r.duration),
      price:    r.indicativePrice?.price ?? null,
      co2:      Math.round((r.distance ?? 0) * (CO2_G_PER_KM[r.kind] ?? 50) / 1000),
      departs:  isoDate,
      arrives:  null,
      source:   'rome2rio',
    }));
  } catch {
    try {
      return await fallbackDbRest(fromCoords, toCoords, isoDate);
    } catch {
      return [];
    }
  }
}
