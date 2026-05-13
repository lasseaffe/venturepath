export async function hydrateTrainLeg(leg) {
  const seed = leg?.meta ?? {};
  const legMeta = {
    mode: 'train',
    carrier: seed.carrier ?? null,
    trainNumber: seed.trainNumber ?? null,
    departureStation: seed.departureStation ?? null,
    departurePlatform: seed.departurePlatform ?? null,
    arrivalStation: seed.arrivalStation ?? null,
    arrivalPlatform: seed.arrivalPlatform ?? null,
    classRef: seed.classRef ?? null,
    seat: seed.seat ?? null,
    transfers: seed.transfers ?? [],
    lastHydratedAt: new Date().toISOString(),
  };
  return { legMeta, waypoints: [] };
}
