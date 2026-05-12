import { useState, useEffect, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, Polyline, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useTripStore } from '../../store/useTripStore';
import StopEditor from '../trip/StopEditor';
import { geocodeLocation } from '../../utils/geocodeEngine';
import NearbyMapOverlay from '../nearby/NearbyMapOverlay';
import ScoutPinsLayer from '../map/ScoutPinsLayer';
import { getCategoryStyle } from '../../utils/legIntelligence/waypointCategories.js';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const MODE_COLOR = {
  flight: '#64a0ff',
  bus:    '#ffc850',
  foot:   '#64dc82',
  boat:   '#a78bfa',
};
const DEFAULT_COLOR = '#E67E22';

const MODE_ICON = { flight: 'AIR', bus: 'BUS', foot: 'FOOT', boat: 'SEA' };

// Static coordinates for the default Operation Patagonia legs
const DEFAULT_COORDS = {
  1: [-33.4569, -70.6483], // SCL — Santiago
  2: [-53.1638, -70.9171], // PUQ — Punta Arenas
  3: [-51.0,    -72.9   ], // Trailhead Camp
  4: [-50.94,   -73.41  ], // Torres del Paine
  5: [-33.4569, -70.6483], // Back to SCL
};

// Generate intermediate great-circle points for arced flight paths
function arcPoints(from, to, steps = 24) {
  const [lat1, lng1] = from.map(d => d * Math.PI / 180);
  const [lat2, lng2] = to.map(d => d * Math.PI / 180);
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const f = i / steps;
    const A = Math.sin((1 - f) * 1) / Math.sin(1); // simplified — use linear blend
    const lat = lat1 + (lat2 - lat1) * f;
    const lng = lng1 + (lng2 - lng1) * f;
    // Lift the midpoint to create a visible arc
    const lift = Math.sin(f * Math.PI) * 0.08 * Math.abs(lat2 - lat1 + (lng2 - lng1));
    pts.push([(lat + lift) * 180 / Math.PI, lng * 180 / Math.PI]);
  }
  return pts;
}

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

function makeWaypointPin(waypoint) {
  const { color, icon } = getCategoryStyle(waypoint.category);
  return L.divIcon({
    className: '',
    iconAnchor: [12, 12],
    popupAnchor: [0, -16],
    html: `<div style="
      width:24px;height:24px;border-radius:50%;
      background:${color};display:flex;align-items:center;justify-content:center;
      font-size:12px;box-shadow:0 1px 4px rgba(0,0,0,0.7);
      border:1px solid rgba(255,255,255,0.2);
    ">${icon}</div>`,
  });
}

function MapFlyTo({ coords }) {
  const map = useMap();
  useEffect(() => {
    if (coords) map.flyTo(coords, 10, { duration: 1.2 });
  }, [coords, map]);
  return null;
}

function FitBounds({ coords }) {
  const map = useMap();
  const fitted = useRef(false);
  useEffect(() => {
    if (!fitted.current && coords.length >= 2) {
      map.fitBounds(coords, { padding: [40, 40] });
      fitted.current = true;
    }
  }, [coords, map]);
  return null;
}

function FlyToDestination({ destination }) {
  const map = useMap();
  const lastDestination = useRef(null);
  useEffect(() => {
    if (!destination || destination === lastDestination.current) return;
    lastDestination.current = destination;
    geocodeLocation(destination).then(coords => {
      if (coords) map.flyTo([coords.lat, coords.lng], 8, { duration: 1.5 });
    });
  }, [destination, map]);
  return null;
}

function FlyToStop({ pois, dayLoops, selectedDate }) {
  const map = useMap();
  const prevStopCount = useRef(0);
  const prevDateRef = useRef(null);

  useEffect(() => {
    if (!selectedDate) {
      prevStopCount.current = 0;
      return;
    }

    const loop = dayLoops.find(dl => dl.date === selectedDate);
    const count = loop?.stopIds?.length ?? 0;

    // Reset baseline when date changes
    if (selectedDate !== prevDateRef.current) {
      prevStopCount.current = count;
      prevDateRef.current = selectedDate;
      return;
    }

    if (count > prevStopCount.current && loop?.stopIds?.length > 0) {
      const lastId = loop.stopIds[loop.stopIds.length - 1];
      const poi = pois.find(p => p.id === lastId);
      if (poi?.coords) map.flyTo(poi.coords, 14, { duration: 1 });
    }
    prevStopCount.current = count;
  }, [dayLoops, selectedDate, pois, map]);

  return null;
}

export default function RouteMap({ className = '', style, selectedDate, dayLoops = [], stays = [], pois = [] }) {
  const { legs, trip } = useTripStore();
  const [selectedLegId, setSelectedLegId] = useState(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingLeg, setEditingLeg] = useState(null); // null = add mode
  const [nearbyAnchorLeg, setNearbyAnchorLeg] = useState(null);
  const [scoutPinsVisible, setScoutPinsVisible] = useState(true);

  function openAdd() { setEditingLeg(null); setEditorOpen(true); }
  function openEdit(leg) { setEditingLeg(leg); setEditorOpen(true); }

  // Filter legs to the active day's loop if a day is selected
  const visibleLegs = selectedDate
    ? legs.filter(l => {
        const loop = dayLoops.find(dl => dl.date === selectedDate);
        return loop?.autoLegIds?.includes(l.id) || l.dayLoopId === loop?.id;
      })
    : legs;

  const resolvedCoords = visibleLegs.map(l => l.coords ?? DEFAULT_COORDS[l.id] ?? null);

  // Build per-leg segments: each segment connects leg[i] → leg[i+1]
  const segments = [];
  for (let i = 0; i < visibleLegs.length - 1; i++) {
    const from = resolvedCoords[i];
    const to   = resolvedCoords[i + 1];
    if (!from || !to) continue;
    const leg = visibleLegs[i];
    const color = MODE_COLOR[leg.mode] ?? DEFAULT_COLOR;
    const pending = leg.status !== 'confirmed';
    const positions = leg.mode === 'flight' ? arcPoints(from, to) : [from, to];
    segments.push({ leg, positions, color, pending });
  }

  const validCoords = resolvedCoords.filter(Boolean);
  const center = validCoords.length ? validCoords[0] : [-51, -72];

  const selectedCoords = (() => {
    const leg = visibleLegs.find(l => l.id === selectedLegId);
    if (!leg) return null;
    const idx = visibleLegs.indexOf(leg);
    return resolvedCoords[idx] ?? null;
  })();

  return (
    <>
    <AnimatePresence>
      {editorOpen && (
        <StopEditor
          leg={editingLeg}
          defaultFrom={legs.length ? legs[legs.length - 1].to : ''}
          onClose={() => setEditorOpen(false)}
        />
      )}
    </AnimatePresence>

    <div className={`tactical-panel flex overflow-hidden ${className}`} style={{ height: 460, ...style }}>
      {/* Sidebar */}
      <div className="hidden md:block w-44 shrink-0 overflow-y-auto border-r border-[#2a2f36] p-2 space-y-1">
        <div className="label-tag text-[10px] px-1 mb-2">EXPEDITION STOPS</div>
        {visibleLegs.map(l => {
          const color = MODE_COLOR[l.mode] ?? DEFAULT_COLOR;
          const active = l.id === selectedLegId;
          return (
            <button
              key={l.id}
              onClick={() => { setSelectedLegId(l.id); openEdit(l); }}
              className={`w-full text-left flex items-start gap-2 p-2 rounded transition-colors text-xs font-mono ${
                active
                  ? 'bg-[#E67E22]/10 border border-[#E67E22]/30'
                  : 'border border-transparent hover:bg-white/5'
              }`}
            >
              <span
                className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-[#0d1b2a]"
                style={{ background: color }}
              >
                {l.id}
              </span>
              <div className="min-w-0">
                <div className="text-[var(--text-primary)] truncate">{l.to}</div>
                <div className="text-[var(--text-muted)] text-[10px] mt-0.5">
                  <span className="font-mono text-[8px] tracking-widest">{MODE_ICON[l.mode] ?? 'LEG'}</span> {l.durationH}h
                </div>
                <div
                  className="text-[9px] mt-0.5 font-mono"
                  style={{ color: l.status === 'confirmed' ? '#64dc82' : '#ffc850' }}
                >
                  {l.status.toUpperCase()}
                </div>
              </div>
            </button>
          );
        })}

        {/* Add stop */}
        <button
          onClick={openAdd}
          className="w-full mt-1 py-1.5 text-xs font-mono rounded transition-colors"
          style={{ color: 'var(--accent)', border: '1px dashed var(--accent)', background: 'transparent' }}
        >
          + Add Stop
        </button>

        {/* Legend */}
        <div className="pt-3 border-t border-[#2a2f36] space-y-1">
          <div className="label-tag text-[10px] px-1 mb-1">MODE</div>
          {Object.entries(MODE_COLOR).map(([mode, color]) => (
            <div key={mode} className="flex items-center gap-1.5 px-1 text-[10px] font-mono text-[var(--text-secondary)]">
              <span className="w-3 h-0.5 rounded" style={{ background: color, display: 'inline-block' }} />
              {mode}
            </div>
          ))}
          <div className="pt-1 border-t border-[#2a2f36] space-y-0.5">
            <div className="flex items-center gap-1.5 px-1 text-[10px] font-mono text-[var(--text-secondary)]">
              <span className="w-3 h-px" style={{ background: '#aaa', display: 'inline-block' }} /> confirmed
            </div>
            <div className="flex items-center gap-1.5 px-1 text-[10px] font-mono text-[var(--text-secondary)]">
              <span className="w-3" style={{ display: 'inline-block', borderTop: '1px dashed #aaa' }} /> pending
            </div>
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative" style={{ marginRight: editorOpen ? 320 : 0, transition: 'margin 0.3s ease', minWidth: 0 }}>
        <MapContainer
          center={center}
          zoom={5}
          style={{ height: '100%', width: '100%', background: '#0d1b2a' }}
        >
          <TileLayer
            url="https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://stadiamaps.com/">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> &copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
            maxZoom={20}
          />

          {validCoords.length >= 2
            ? <FitBounds coords={validCoords} />
            : <FlyToDestination destination={trip?.destination} />
          }
          {selectedCoords && <MapFlyTo coords={selectedCoords} />}

          {/* Per-leg colored segments */}
          {segments.map(({ leg, positions, color, pending }) => (
            <Polyline
              key={leg.id}
              positions={positions}
              pathOptions={{
                color,
                weight: selectedLegId === leg.id ? 3 : 2,
                dashArray: pending ? '6 5' : null,
                opacity: selectedLegId && selectedLegId !== leg.id ? 0.35 : 0.85,
              }}
            />
          ))}

          {/* Markers */}
          {visibleLegs.map((l, i) => {
            const pos = resolvedCoords[i];
            if (!pos) return null;
            const color = MODE_COLOR[l.mode] ?? DEFAULT_COLOR;
            const isActive = l.id === selectedLegId;
            return (
              <Marker
                key={l.id}
                position={pos}
                icon={makePin(l.id, color, isActive)}
                eventHandlers={{ click: () => setSelectedLegId(l.id) }}
              >
                <Popup>
                  <div style={{ fontFamily: 'monospace', fontSize: 12, minWidth: 150 }}>
                    <div style={{ fontWeight: 700, color: '#E67E22', marginBottom: 4 }}>
                      <span className="font-mono text-[8px] tracking-widest">{MODE_ICON[l.mode] ?? 'LEG'}</span> {l.to}
                    </div>
                    <div style={{ color: '#ccc' }}>{l.from} → {l.to}</div>
                    <div style={{ color: '#888', marginTop: 4 }}>
                      {l.durationH}h · {l.distanceKm.toLocaleString()} km
                    </div>
                    <div style={{
                      marginTop: 6,
                      display: 'inline-block',
                      padding: '2px 6px',
                      borderRadius: 3,
                      fontSize: 10,
                      background: l.status === 'confirmed' ? 'rgba(100,220,130,0.2)' : 'rgba(255,200,80,0.15)',
                      color: l.status === 'confirmed' ? '#64dc82' : '#ffc850',
                    }}>
                      {l.status.toUpperCase()}
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); setNearbyAnchorLeg(l); }}
                      style={{
                        marginTop: 8,
                        background: 'transparent',
                        border: '1px solid #E67E22',
                        color: '#E67E22',
                        borderRadius: 4,
                        padding: '2px 8px',
                        fontSize: 11,
                        cursor: 'pointer',
                        fontFamily: 'monospace',
                        width: '100%',
                      }}
                    >
                      Find nearby
                    </button>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {/* Waypoint pins */}
          {visibleLegs.flatMap(l =>
            (l.waypoints ?? [])
              .filter(wp => wp.coords && wp.status !== 'skipped')
              .map(wp => (
                <Marker
                  key={wp.id}
                  position={wp.coords}
                  icon={makeWaypointPin(wp)}
                >
                  <Popup>
                    <div style={{ fontFamily: 'monospace', fontSize: 12, minWidth: 140 }}>
                      <div style={{ fontWeight: 700, color: getCategoryStyle(wp.category).color, marginBottom: 4 }}>
                        {getCategoryStyle(wp.category).icon} {wp.name}
                      </div>
                      {wp.kmFromStart != null && (
                        <div style={{ color: '#888' }}>{wp.kmFromStart} km from start</div>
                      )}
                      {wp.estCost != null && wp.estCost > 0 && (
                        <div style={{ color: getCategoryStyle(wp.category).color, marginTop: 2 }}>
                          Est. €{wp.estCost.toFixed(2)}
                        </div>
                      )}
                      <div style={{
                        marginTop: 4,
                        padding: '1px 5px',
                        display: 'inline-block',
                        borderRadius: 2,
                        fontSize: 10,
                        background: 'rgba(255,255,255,0.08)',
                        color: '#aaa',
                      }}>
                        {wp.status?.toUpperCase()}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))
          )}

          {/* Homebase distance ring for active day */}
          {selectedDate && (() => {
            const loop = dayLoops.find(dl => dl.date === selectedDate);
            const stay = stays.find(s => s.id === loop?.homebaseStayId);
            if (!stay?.coords) return null;
            return (
              <Circle
                center={stay.coords}
                radius={5000}
                pathOptions={{ color: '#5C9A6A', opacity: 0.08, fillOpacity: 0.03, dashArray: '4 6' }}
              />
            );
          })()}

          {/* Fly to newly added stop */}
          <FlyToStop pois={pois} dayLoops={dayLoops} selectedDate={selectedDate} />

          {/* Pulse ring on selected marker */}
          {selectedCoords && (
            <Circle
              center={selectedCoords}
              radius={35000}
              pathOptions={{ color: '#E67E22', fillColor: '#E67E22', fillOpacity: 0.08, weight: 1, opacity: 0.5 }}
            />
          )}
          {nearbyAnchorLeg && (
            <NearbyMapOverlay
              anchor={nearbyAnchorLeg.from}
              onClose={() => setNearbyAnchorLeg(null)}
            />
          )}
          <ScoutPinsLayer destination={trip?.destination} visible={scoutPinsVisible} />
        </MapContainer>

        {/* Scout Pins toggle */}
        <button
          onClick={() => setScoutPinsVisible(v => !v)}
          style={{
            position: 'absolute',
            bottom: 12,
            left: 12,
            zIndex: 800,
            background: scoutPinsVisible ? 'rgba(230,126,34,0.15)' : 'rgba(14,16,18,0.85)',
            border: `1px solid ${scoutPinsVisible ? '#E67E22' : '#2a2f36'}`,
            color: scoutPinsVisible ? '#E67E22' : '#8A8680',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 9,
            letterSpacing: '0.08em',
            padding: '4px 10px',
            borderRadius: 2,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: scoutPinsVisible ? '#E67E22' : '#484440', display: 'inline-block' }} />
          SCOUT PINS
        </button>
      </div>
    </div>
    </>
  );
}
