const TG_KEY = () => import.meta.env.VITE_TOLLGURU_KEY ?? '';
const TG_BASE = 'https://apis.tollguru.com/toll/v2/origin-destination-waypoints';

// Returns a normalized toll bundle ready to be turned into Waypoints + budget items.
// Always returns a valid object so callers don't need null checks.
export async function fetchTolls(fromCoords, toCoords, opts = {}) {
  const key = TG_KEY();
  const empty = { totalEst: 0, currency: 'EUR', byCountry: [], gantries: [], available: false };
  if (!key) return empty;
  try {
    const res = await fetch(TG_BASE, {
      method: 'POST',
      headers: { 'x-api-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from:    { lat: fromCoords.lat, lng: fromCoords.lng },
        to:      { lat: toCoords.lat,   lng: toCoords.lng   },
        vehicle: { type: opts.vehicleType ?? '2AxlesAuto' },
        serviceProvider: 'here',
      }),
    });
    if (!res.ok) return empty;
    const json = await res.json();
    const tolls = json.route?.tolls ?? [];
    const gantries = tolls.map(t => ({
      name:      t.name ?? 'Toll',
      coords:    [t.lat, t.lng],
      kmFromStart: typeof t.distance === 'number' ? Math.round(t.distance / 1000) : 0,
      estCost:   t.tagCost ?? t.cashCost ?? 0,
      country:   t.country ?? null,
      currency:  t.currency ?? 'EUR',
    }));
    const totalEst = gantries.reduce((s, g) => s + (g.estCost ?? 0), 0);
    const currency = gantries[0]?.currency ?? 'EUR';
    const byCountry = Object.values(gantries.reduce((acc, g) => {
      const cc = g.country ?? 'XX';
      acc[cc] = acc[cc] ?? { cc, amount: 0, currency: g.currency };
      acc[cc].amount += g.estCost ?? 0;
      return acc;
    }, {}));
    return { totalEst, currency, byCountry, gantries, available: true };
  } catch {
    return empty;
  }
}
