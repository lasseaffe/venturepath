const DB_REST = 'https://v6.db.transport.rest';
const HEADERS = { 'Accept-Language': 'en' };

// Fetch live delay data for one leg from DB-Rest GTFS-RT trip details.
export async function fetchAlerts(leg) {
  const tripId = leg.selectedOption?.tripId;
  if (!tripId) return null;

  try {
    const res  = await fetch(`${DB_REST}/trips/${encodeURIComponent(tripId)}?stopovers=true`, { headers: HEADERS });
    const data = await res.json();

    const stopover    = data.stopovers?.find(s => s.stop?.id === leg.stopFromId);
    const delaySecs   = stopover?.departureDelay ?? 0;
    const delayMinutes = Math.round(delaySecs / 60);
    if (delayMinutes <= 0) return null;

    const severity = delayMinutes >= 60 ? 'critical' : delayMinutes >= 20 ? 'medium' : 'low';
    const product  = data.line?.product ?? '';
    const isLongDistance = product === 'nationalExpress' || product === 'national';
    const type = isLongDistance && delayMinutes >= 60 ? 'cancellation' : 'delay';

    return {
      type,
      severity,
      delayMinutes,
      message: `${delayMinutes}m delay on ${data.line?.name ?? 'service'}`,
      source: 'db-rt',
    };
  } catch {
    return null;
  }
}

// Detect cascade risk across an ordered array of legs.
// Returns one CascadeResult per endangered leg.
export function checkCascade(legs) {
  const confirmed = legs.filter(l => l.selectedOption?.departure && l.selectedOption?.arrival);
  if (confirmed.length < 2) return [];

  const results = [];
  let propagatedDelayMinutes = 0;

  for (let i = 0; i < confirmed.length - 1; i++) {
    const curr = confirmed[i];
    const next = confirmed[i + 1];

    const arrivalMs   = new Date(curr.selectedOption.arrival).getTime();
    const departureMs = new Date(next.selectedOption.departure).getTime();
    const bufferMins  = (departureMs - arrivalMs) / 60000;

    const ownDelay   = curr.disruption?.delayMinutes ?? 0;
    const totalDelay = Math.max(ownDelay, propagatedDelayMinutes);
    const remaining  = Math.round(bufferMins - totalDelay);

    if (remaining < 30) {
      const severity = remaining < 0 ? 'red' : 'amber';
      results.push({ legId: next.id, upstreamLegId: curr.id, severity, remainingMinutes: remaining });
      propagatedDelayMinutes = remaining < 0 ? Math.abs(remaining) : 0;
    } else {
      propagatedDelayMinutes = 0;
    }
  }

  return results;
}
