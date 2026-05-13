export async function hydrateFerryLeg(leg) {
  const seed = leg?.meta ?? {};
  const legMeta = {
    mode: 'ferry',
    carrier: seed.carrier ?? null,
    vesselName: seed.vesselName ?? null,
    departurePort: seed.departurePort ?? null,
    arrivalPort: seed.arrivalPort ?? null,
    cabinRef: seed.cabinRef ?? null,
    vehicleCarried: seed.vehicleCarried ?? false,
    customsAtPort: seed.customsAtPort ?? false,
    tideWindow: seed.tideWindow ?? null,
    lastHydratedAt: new Date().toISOString(),
  };
  return { legMeta, waypoints: [] };
}
