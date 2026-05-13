export async function hydrateFlightLeg(leg) {
  const seed = leg?.meta ?? {};
  const legMeta = {
    mode: 'flight',
    carrier: seed.carrier ?? null,
    flightNumber: seed.flightNumber ?? null,
    departureTerminal: seed.departureTerminal ?? null,
    arrivalTerminal: seed.arrivalTerminal ?? null,
    departureGate: seed.departureGate ?? null,
    arrivalGate: seed.arrivalGate ?? null,
    seat: seed.seat ?? null,
    baggageAllowanceKg: seed.baggageAllowanceKg ?? null,
    layovers: seed.layovers ?? [],
    visaRequired: seed.visaRequired ?? false,
    lastHydratedAt: new Date().toISOString(),
  };
  return { legMeta, waypoints: [] };
}
