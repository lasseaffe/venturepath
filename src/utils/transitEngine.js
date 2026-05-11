const DB_REST = 'https://v6.db.transport.rest';
const HEADERS = { 'Accept-Language': 'en' };

// DB-Rest product filter strings per mode
const PRODUCT_PARAMS = {
  train: 'bus=false&tram=false&ferry=false&taxi=false',
  bus:   'tram=false&ferry=false&taxi=false&national=false&nationalExpress=false&regional=false&regionalExpress=false&suburban=false',
  tram:  'bus=false&ferry=false&taxi=false&national=false&nationalExpress=false&regional=false&regionalExpress=false&suburban=false',
};

function minsToHuman(mins) {
  const h = Math.floor(Math.abs(mins) / 60);
  const m = Math.abs(mins) % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function co2ForMode(mode, distanceKm) {
  const factors = { train: 14, bus: 68, tram: 22 };
  return Math.round((factors[mode] ?? 30) * distanceKm / 1000);
}

// Resolve nearest Hafas stop to a lat/lng coordinate.
export async function resolveStop(lat, lng) {
  try {
    const res = await fetch(
      `${DB_REST}/stops/nearby?latitude=${lat}&longitude=${lng}&results=1&distance=500`,
      { headers: HEADERS }
    );
    const data = await res.json();
    return data[0] ?? null;
  } catch {
    return null;
  }
}

// Fetch up to 3 connection options for a leg.
// fromId / toId are Hafas stop IDs from resolveStop.
export async function searchConnections(fromId, toId, isoDate, mode) {
  if (!fromId || !toId) return [];
  const params = PRODUCT_PARAMS[mode] ?? PRODUCT_PARAMS.train;
  try {
    const url = `${DB_REST}/journeys?from=${fromId}&to=${toId}&departure=${encodeURIComponent(isoDate)}&results=3&stopovers=false&${params}`;
    const res  = await fetch(url, { headers: HEADERS });
    const data = await res.json();

    return (data.journeys ?? []).map((j, i) => {
      const firstLeg = j.legs[0];
      const lastLeg  = j.legs[j.legs.length - 1];
      const deptMs   = new Date(firstLeg.departure).getTime();
      const arrvMs   = new Date(lastLeg.arrival).getTime();
      const durationMins = Math.round((arrvMs - deptMs) / 60000);

      return {
        id:        `conn-${i}`,
        carrier:   firstLeg.line?.name ?? (firstLeg.walking ? 'Walk' : '—'),
        departure: firstLeg.departure,
        arrival:   lastLeg.arrival,
        duration:  minsToHuman(durationMins),
        price:     j.price?.amount ?? null,
        co2:       co2ForMode(mode, durationMins * 1),
        platform:  firstLeg.departurePlatform ?? null,
        realtime:  !!(firstLeg.tripId || firstLeg.departureDelay != null || firstLeg.currentTripPosition),
        tripId:    firstLeg.tripId ?? null,
        hafasFromId: fromId,
        hafasToId:   toId,
        label:     j.legs.length > 1
          ? j.legs.map(l => l.line?.name ?? '?').join(' + ')
          : (firstLeg.line?.name ?? 'Direct'),
      };
    });
  } catch {
    return [];
  }
}
