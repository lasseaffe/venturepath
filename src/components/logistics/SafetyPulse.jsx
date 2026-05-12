import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchSafetyIncidents, SEVERITY_COLORS } from '../../utils/safetyEngine';
import 'leaflet/dist/leaflet.css';

const REFRESH_MS = 30_000;

export default function SafetyPulse({ destinationId = 'default', center = [20.0, 0.0], zoom = 9 }) {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);
  const intervalRef = useRef(null);

  async function load() {
    const data = await fetchSafetyIncidents(destinationId);
    setIncidents(data);
    setLastRefresh(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
    setLoading(false);
  }

  useEffect(() => {
    load();
    intervalRef.current = setInterval(load, REFRESH_MS);
    return () => clearInterval(intervalRef.current);
  }, [destinationId]);

  const hasRed   = incidents.some(i => i.severity === 'red');
  const hasAmber = incidents.some(i => i.severity === 'amber');
  const statusLevel = hasRed ? 'red' : hasAmber ? 'amber' : 'green';
  const { label: statusLabel, ring: statusRing } = SEVERITY_COLORS[statusLevel];

  return (
    <div className="tactical-panel p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="label-tag">Safety Pulse</div>
          <div className="text-[10px] text-[var(--text-muted)] font-mono mt-0.5">
            Real-time local incident monitoring
          </div>
        </div>
        <div className={`flex items-center gap-2 border rounded px-2.5 py-1 ${statusRing}`}>
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: SEVERITY_COLORS[statusLevel].hex }}
          />
          <span className="text-[9px] font-mono text-[var(--text-secondary)] tracking-widest">{statusLabel.toUpperCase()}</span>
        </div>
      </div>

      {/* Map */}
      {!loading && (
        <div className="rounded-lg overflow-hidden border border-[#2a2f36]" style={{ height: 280 }}>
          <MapContainer
            center={center}
            zoom={zoom}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={false}
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://carto.com">CARTO</a>'
            />
            {incidents.map(inc => (
              <CircleMarker
                key={inc.id}
                center={[inc.lat, inc.lng]}
                radius={12}
                pathOptions={{
                  color: SEVERITY_COLORS[inc.severity].hex,
                  fillColor: SEVERITY_COLORS[inc.severity].hex,
                  fillOpacity: 0.35,
                  weight: 2,
                }}
              >
                <Popup>
                  <div style={{ fontFamily: 'monospace', fontSize: 11, minWidth: 160 }}>
                    <strong>{inc.type}</strong><br />
                    {inc.description}
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>
      )}

      {loading && (
        <div className="h-48 bg-[#0E1012] rounded-lg border border-[#1e2328] flex items-center justify-center">
          <span className="text-[var(--text-muted)] font-mono text-xs animate-pulse">Loading incident data…</span>
        </div>
      )}

      {/* Alert ticker */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="text-[9px] font-mono text-[var(--text-muted)] tracking-widest">INCIDENT FEED</div>
          {lastRefresh && (
            <div className="text-[9px] font-mono text-[var(--text-muted)]">Last updated {lastRefresh}</div>
          )}
        </div>
        <AnimatePresence>
          {incidents.map(inc => (
            <motion.div
              key={inc.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-start gap-3 bg-[#0E1012] rounded p-2.5 border border-[#1e2328]"
            >
              <span
                className="w-2 h-2 rounded-full mt-1 shrink-0"
                style={{ backgroundColor: SEVERITY_COLORS[inc.severity].hex }}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-[var(--text-secondary)] font-semibold">{inc.type}</span>
                  <span className="text-[9px] font-mono text-[var(--text-muted)]">{inc.timestamp}</span>
                </div>
                <div className="text-[10px] font-mono text-[var(--text-muted)] mt-0.5 leading-relaxed">{inc.description}</div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <button
        onClick={() => { setLoading(true); load(); }}
        className="w-full py-2 border border-dashed border-[#2a2f36] text-[var(--text-muted)] text-[10px] font-mono hover:text-[var(--text-secondary)] hover:border-[#E67E22]/30 rounded transition-colors"
      >
        ↻ REFRESH NOW
      </button>
    </div>
  );
}
