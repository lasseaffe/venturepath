/**
 * simulatorEngine.js
 * Delay ripple calculator for booking contingency modeling.
 * Simulates cascade effects when a leg is delayed.
 */

export function simulateDelay(legs, triggerLegId, delayHours) {
  const triggerIndex = legs.findIndex(l => l.id === triggerLegId);
  if (triggerIndex === -1) return [];

  const downstream = legs.slice(triggerIndex + 1);
  let cumulativeDelayMs = delayHours * 3_600_000;

  return downstream.map(leg => {
    const originalStart = new Date(leg.startISO).getTime();
    const shiftedStart = originalStart + cumulativeDelayMs;
    const prevLeg = legs[legs.indexOf(leg) - 1];
    const prevShiftedEnd = new Date(prevLeg.endISO).getTime() + cumulativeDelayMs;
    const bufferMs = originalStart - prevShiftedEnd;
    const buffer_hours = parseFloat((bufferMs / 3_600_000).toFixed(2));

    let status;
    if (buffer_hours < 0) status = 'MISSED';
    else if (buffer_hours < 2) status = 'TIGHT';
    else status = 'SAFE';

    if (buffer_hours < 0) cumulativeDelayMs += Math.abs(bufferMs);

    return {
      leg_id: leg.id,
      original_start: leg.startISO,
      shifted_start: new Date(shiftedStart).toISOString(),
      buffer_hours,
      status,
    };
  });
}
