export async function hydrateBoatLeg(leg) {
  const seed = leg?.meta ?? {};
  const legMeta = {
    mode: 'boat',
    marina: seed.marina ?? null,
    anchorages: seed.anchorages ?? [],
    portFees: seed.portFees ?? null,
    weatherWindowDate: seed.weatherWindowDate ?? null,
    tidesUrl: seed.tidesUrl ?? null,
    lastHydratedAt: new Date().toISOString(),
  };
  return { legMeta, waypoints: [] };
}
