export async function hydrateBusLeg(leg) {
  const seed = leg?.meta ?? {};
  const legMeta = {
    mode: 'bus',
    carrier: seed.carrier ?? null,
    routeNumber: seed.routeNumber ?? null,
    departureStop: seed.departureStop ?? null,
    arrivalStop: seed.arrivalStop ?? null,
    seat: seed.seat ?? null,
    restroomBreaks: seed.restroomBreaks ?? null,
    lastHydratedAt: new Date().toISOString(),
  };
  return { legMeta, waypoints: [] };
}
