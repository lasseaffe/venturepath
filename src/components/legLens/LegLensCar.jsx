import { useEffect } from 'react';
import { RouteVariantPicker } from './RouteVariantPicker.jsx';
import { WaypointCard } from './WaypointCard.jsx';
import { CampLens } from './CampLens.jsx';

const CAMP_KINDS = new Set(['camp', 'wild', 'shelter']);

export function LegLensCar({
  leg,
  nextStay,
  onVariantSelect,
  onWaypointConfirm,
  onWaypointBook,
  onWaypointDismiss,
  onHydrate,
}) {
  const carMeta = leg?.legMeta;
  const waypoints = leg?.waypoints ?? [];

  useEffect(() => {
    if (!carMeta && onHydrate) onHydrate(leg?.id);
  }, [leg?.id]);

  if (!carMeta) {
    return (
      <div style={{ fontFamily: 'JetBrains Mono, monospace', background: '#0E1012' }}>
        <div style={{ color: '#D9C5B2', padding: 16 }}>
          Calculating route intelligence…
        </div>
        {nextStay && CAMP_KINDS.has(nextStay.kind) && (
          <CampLens stay={nextStay} campMeta={nextStay.campMeta ?? {}} />
        )}
      </div>
    );
  }

  const tollTotal = carMeta.tolls?.totalEst ?? 0;
  const byCountry = carMeta.tolls?.byCountry ?? {};

  return (
    <div style={{ fontFamily: 'JetBrains Mono, monospace', background: '#0E1012', color: '#D9C5B2' }}>
      {/* Route Variants */}
      <section style={{ padding: '12px 16px', borderBottom: '1px solid #1f1f1f' }}>
        <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: 8, color: '#666' }}>
          Route Variant
        </div>
        <RouteVariantPicker
          routeVariants={carMeta.routeVariants ?? []}
          activeVariant={carMeta.activeVariant ?? 'fastest'}
          onSelect={v => onVariantSelect(leg.id, v)}
        />
      </section>

      {/* Toll Summary */}
      {tollTotal > 0 && (
        <section style={{ padding: '12px 16px', borderBottom: '1px solid #1f1f1f' }}>
          <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: 6, color: '#666' }}>
            Tolls
          </div>
          <div style={{ color: '#F2A900', fontWeight: 600 }}>
            Total: €{tollTotal.toFixed(2)}
          </div>
          {Object.entries(byCountry).map(([country, amount]) => (
            <div key={country} style={{ fontSize: '0.8rem', marginTop: 2 }}>
              {country}: €{amount.toFixed(2)}
            </div>
          ))}
        </section>
      )}

      {/* Waypoints */}
      {waypoints.length > 0 && (
        <section style={{ padding: '12px 16px' }}>
          <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: 8, color: '#666' }}>
            Waypoints
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {waypoints.map(wp => (
              <WaypointCard
                key={wp.id}
                waypoint={wp}
                onConfirm={onWaypointConfirm}
                onBook={onWaypointBook}
                onDismiss={onWaypointDismiss}
              />
            ))}
          </div>
        </section>
      )}

      {nextStay && CAMP_KINDS.has(nextStay.kind) && (
        <CampLens stay={nextStay} campMeta={nextStay.campMeta ?? {}} />
      )}
    </div>
  );
}
