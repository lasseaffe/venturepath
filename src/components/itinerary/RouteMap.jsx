import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useTripStore } from '../../store/useTripStore';

// Fix Leaflet default icon path issue with Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const MODE_COLOR = {
  flight: '#64a0ff',
  bus:    '#ffc850',
  foot:   '#64dc82',
  boat:   '#a78bfa',
};
const DEFAULT_COLOR = '#E67E22';

// Static coordinate lookup for default Operation Patagonia legs
const DEFAULT_COORDS = {
  1: [-33.4569, -70.6483], // SCL (Santiago)
  2: [-53.1638, -70.9171], // PUQ (Punta Arenas)
  3: [-51.0,    -72.9   ], // Trailhead Camp
  4: [-50.94,   -73.41  ], // Torres del Paine
  5: [-33.4569, -70.6483], // Back to SCL
};

function modeIcon(mode) {
  return { flight: '✈', bus: '🚌', foot: '🥾', boat: '⛵' }[mode] ?? '📍';
}

function makePin(num, color) {
  return L.divIcon({
    className: '',
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
    html: `
      <div style="
        width:36px;height:36px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);
        background:${color};display:flex;align-items:center;justify-content:center;
        box-shadow:0 2px 8px rgba(0,0,0,0.5);
      ">
        <span style="transform:rotate(45deg);font-size:13px;font-weight:700;color:#0d1b2a;">${num}</span>
      </div>`,
  });
}

function MapFlyTo({ coords }) {
  const map = useMap();
  useEffect(() => {
    if (coords) map.flyTo(coords, 10, { duration: 1.2 });
  }, [coords, map]);
  return null;
}

export default function RouteMap({ className = '' }) {
  const { legs } = useTripStore();
  const [selectedLegId, setSelectedLegId] = useState(null);

  const coords = legs.map(l => l.coords ?? DEFAULT_COORDS[l.id] ?? null).filter(Boolean);

  const selectedCoords = (() => {
    const leg = legs.find(l => l.id === selectedLegId);
    if (!leg) return null;
    return leg.coords ?? DEFAULT_COORDS[leg.id] ?? null;
  })();

  const center = coords.length ? coords[0] : [-51, -72];
  const bounds = coords.length >= 2 ? coords : null;

  return (
    <div className={`tactical-panel flex overflow-hidden ${className}`} style={{ height: 460 }}>
      {/* Sidebar */}
      <div className="hidden md:block w-44 shrink-0 overflow-y-auto border-r border-[#2a2f36] p-2 space-y-1">
        <div className="label-tag text-[10px] px-1 mb-2">EXPEDITION STOPS</div>
        {legs.map(l => {
          const color = MODE_COLOR[l.mode] ?? DEFAULT_COLOR;
          const active = l.id === selectedLegId;
          return (
            <button
              key={l.id}
              onClick={() => setSelectedLegId(l.id)}
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
                <div className="text-slate-200 truncate">{l.to}</div>
                <div className="text-slate-500 text-[10px] mt-0.5">{modeIcon(l.mode)} {l.durationH}h</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <MapContainer
          center={center}
          zoom={5}
          style={{ height: '100%', width: '100%', background: '#0d1b2a' }}
          bounds={bounds}
          boundsOptions={{ padding: [40, 40] }}
        >
          <TileLayer
            url="https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://stadiamaps.com/">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> &copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
            maxZoom={20}
          />

          {selectedCoords && <MapFlyTo coords={selectedCoords} />}

          <Polyline
            positions={coords}
            pathOptions={{ color: '#E67E22', weight: 2, dashArray: '6 4', opacity: 0.75 }}
          />

          {legs.map(l => {
            const pos = l.coords ?? DEFAULT_COORDS[l.id];
            if (!pos) return null;
            const color = MODE_COLOR[l.mode] ?? DEFAULT_COLOR;
            return (
              <Marker
                key={l.id}
                position={pos}
                icon={makePin(l.id, color)}
                eventHandlers={{ click: () => setSelectedLegId(l.id) }}
              >
                <Popup>
                  <div style={{ fontFamily: 'monospace', fontSize: 12, minWidth: 140 }}>
                    <div style={{ fontWeight: 700, color: '#E67E22', marginBottom: 4 }}>
                      {modeIcon(l.mode)} {l.to}
                    </div>
                    <div style={{ color: '#ccc' }}>{l.from} → {l.to}</div>
                    <div style={{ color: '#888', marginTop: 4 }}>
                      {l.durationH}h · {l.distanceKm} km
                    </div>
                    <div style={{
                      marginTop: 4,
                      display: 'inline-block',
                      padding: '2px 6px',
                      borderRadius: 3,
                      fontSize: 10,
                      background: l.status === 'confirmed' ? 'rgba(100,220,130,0.2)' : 'rgba(255,200,80,0.15)',
                      color: l.status === 'confirmed' ? '#64dc82' : '#ffc850',
                    }}>
                      {l.status.toUpperCase()}
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
}
