// src/components/itinerary/ItineraryMap.jsx
import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useCategoryLayers } from '../../utils/useCategoryLayers';
import MapLayerController from '../map/MapLayerController';
import RadarHUD from '../map/RadarHUD';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const CATEGORY_COLORS = {
  transport: '#3B82F6',
  logistics: '#EAB308',
  food:      '#22C55E',
  activity:  '#E67E22',
  rest:      '#64748B',
  default:   '#64748B',
};

function makePin(num, color, isActive) {
  return L.divIcon({
    className: '',
    iconAnchor: [18, 36],
    popupAnchor: [0, -40],
    html: `
      <div style="
        width:36px;height:36px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);
        background:${color};display:flex;align-items:center;justify-content:center;
        box-shadow:0 2px 8px rgba(0,0,0,${isActive ? 0.9 : 0.5});
        border:${isActive ? '2px solid #fff' : 'none'};
        transition:all 0.2s;
      ">
        <span style="transform:rotate(45deg);font-size:13px;font-weight:700;color:#0d1b2a;">${num}</span>
      </div>`,
  });
}

function MapController({ activeStopId, coords, markerRefs }) {
  const map = useMap();
  const fittedRef = useRef(false);

  // One-time fit to all resolved stops on mount
  useEffect(() => {
    if (fittedRef.current) return;
    const points = Object.values(coords).filter(Array.isArray);
    if (points.length === 0) return;
    fittedRef.current = true;
    if (points.length === 1) {
      map.setView(points[0], 13);
    } else {
      const bounds = points.reduce(
        (b, p) => b.extend(p),
        L.latLngBounds(points[0], points[0])
      );
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
    }
  }, [coords, map]);

  // Fly to active stop when selected
  useEffect(() => {
    if (!activeStopId) return;
    const latLng = coords[activeStopId];
    if (!latLng) return;
    map.flyTo(latLng, 14, { duration: 1.0 });
    const markerRef = markerRefs.current.get(activeStopId);
    if (markerRef) markerRef.openPopup();
  }, [activeStopId, coords, map, markerRefs]);

  return null;
}

export default function ItineraryMap({ days, coords, activeStopId, onPinClick, pois = [] }) {
  const markerRefs = useRef(new Map());
  const { activeLayers } = useCategoryLayers();

  // Flatten all blocks with a sequential global number
  const allBlocks = [];
  let num = 1;
  for (const day of days) {
    for (const block of day.blocks) {
      allBlocks.push({ block, num, day });
      num++;
    }
  }

  // Blocks that have resolved coordinates
  const mappable = allBlocks.filter(({ block }) => Array.isArray(coords[block.id]));

  const hasAny = mappable.length > 0;

  // Determine current center: active stop's coords, or first mappable stop, or world center
  const currentLegCoords =
    (activeStopId && Array.isArray(coords[activeStopId]) ? coords[activeStopId] : null) ??
    (mappable.length > 0 ? coords[mappable[0].block.id] : null) ??
    [20, 0];

  return (
    <div style={{ marginTop: '16px', position: 'relative', isolation: 'isolate', overflow: 'hidden' }}>
      <div
        className="label-tag mb-2"
        style={{ color: 'var(--text-muted)', fontSize: '10px', fontFamily: 'monospace', letterSpacing: '0.1em' }}
      >
        STOP MAP
      </div>
      <div
        style={{
          height: '380px',
          borderRadius: '8px',
          overflow: 'hidden',
          border: '1px solid #1e2328',
          background: '#0E1012',
          position: 'relative',
        }}
      >
        {!hasAny && (
          <div
            style={{
              position: 'absolute', inset: 0, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-secondary)', fontFamily: 'monospace', fontSize: '11px',
              letterSpacing: '0.1em', zIndex: 1000, pointerEvents: 'none',
            }}
          >
            RESOLVING LOCATIONS…
          </div>
        )}
        <MapContainer
          center={[20, 0]}
          zoom={2}
          style={{ height: '100%', width: '100%', background: '#0E1012' }}
          zoomControl={true}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          />
          <MapController
            activeStopId={activeStopId}
            coords={coords}
            markerRefs={markerRefs}
          />
          <MapLayerController pois={pois} activeLayers={activeLayers} />
          {mappable.map(({ block, num: n }) => {
            const latLng = coords[block.id];
            const color = CATEGORY_COLORS[block.category] ?? CATEGORY_COLORS.default;
            const isActive = block.id === activeStopId;
            return (
              <Marker
                key={block.id}
                position={latLng}
                icon={makePin(n, color, isActive)}
                ref={el => {
                  if (el) markerRefs.current.set(block.id, el);
                  else markerRefs.current.delete(block.id);
                }}
                eventHandlers={{ click: () => onPinClick(block.id) }}
              >
                <Popup>
                  <div style={{ fontFamily: 'monospace', fontSize: '12px', color: '#0d1b2a', minWidth: '120px' }}>
                    <div style={{ fontWeight: 700 }}>{block.icon} {block.title}</div>
                    {block.time && <div style={{ color: 'var(--text-muted)', marginTop: '2px' }}>{block.time}</div>}
                    {block.notes && <div style={{ color: 'var(--text-muted)', marginTop: '2px' }}>{block.notes}</div>}
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
        <RadarHUD pois={pois} center={currentLegCoords} activeLayers={activeLayers} />
      </div>
    </div>
  );
}
