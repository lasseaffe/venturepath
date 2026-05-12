import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { watchProximity } from '../../utils/geolocationEngine';
import { DESTINATION_POIS } from '../../utils/destinationEngine';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

export default function ARGhostTours({ destinationId = 'default', center = [20.0, 0.0] }) {
  const [mode, setMode] = useState('idle'); // idle | requesting | ar | map | denied
  const [cameraError, setCameraError] = useState(false);
  const [nearbyPoi, setNearbyPoi] = useState(null);
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [activePoi, setActivePoi] = useState(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const stopWatchRef = useRef(null);

  const pois = DESTINATION_POIS[destinationId] ?? [];

  // Simulated nearby POI for demo (since user is unlikely to be in Patagonia)
  const [demoMode, setDemoMode] = useState(false);
  const demoPoi = pois[0];

  async function startAR() {
    setMode('requesting');
    setCameraError(false);

    // Start geolocation watch
    const { stop } = watchProximity(pois, poi => {
      setNearbyPoi(poi);
    });
    stopWatchRef.current = stop;

    // Request camera
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setMode('ar');
    } catch {
      setCameraError(true);
      setMode('map'); // graceful fallback
    }
  }

  function stopAR() {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    stopWatchRef.current?.();
    setMode('idle');
    setNearbyPoi(null);
    setOverlayOpen(false);
    setDemoMode(false);
  }

  function openOverlay(poi) {
    setActivePoi(poi);
    setOverlayOpen(true);
  }

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    stopWatchRef.current?.();
  }, []);

  const displayedNearby = demoMode ? demoPoi : nearbyPoi;

  if (mode === 'idle') {
    return (
      <div className="tactical-panel p-5 space-y-4">
        <div>
          <div className="label-tag">AR Ghost Tours</div>
          <div className="text-[10px] text-[var(--text-muted)] font-mono mt-0.5">
            Point your camera at historical sites to unlock stories
          </div>
        </div>

        {/* POI preview list */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {pois.map(poi => (
            <div
              key={poi.id}
              className="bg-[#0E1012] rounded-lg p-3 border border-[#1e2328] space-y-1.5 cursor-pointer hover:border-[#E67E22]/40 transition-colors"
              onClick={() => openOverlay(poi)}
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">{poi.icon}</span>
                <span className="text-white text-xs font-mono font-semibold">{poi.name}</span>
              </div>
              <div className="text-[9px] font-mono text-[var(--text-muted)] line-clamp-2">{poi.historicalNote}</div>
              <div className="text-[9px] font-mono text-pink-400">{poi.trendingSnippet.split(':')[0]}</div>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            onClick={startAR}
            className="px-5 py-2.5 bg-[#E2725B] text-white font-mono font-bold text-xs rounded hover:bg-[#E67E22] transition-colors flex items-center gap-2"
          >
            📷 Start AR Tour
          </button>
          <button
            onClick={() => { setMode('map'); }}
            className="px-5 py-2.5 border border-[#2a2f36] text-[var(--text-secondary)] font-mono text-xs rounded hover:border-[#E67E22]/50 hover:text-[var(--text-primary)] transition-colors"
          >
            🗺 Map View
          </button>
        </div>

        {/* POI detail overlay */}
        <AnimatePresence>
          {overlayOpen && activePoi && (
            <PoiOverlay poi={activePoi} onClose={() => setOverlayOpen(false)} />
          )}
        </AnimatePresence>
      </div>
    );
  }

  if (mode === 'requesting') {
    return (
      <div className="tactical-panel p-10 flex flex-col items-center justify-center gap-3">
        <span className="text-3xl animate-pulse">📷</span>
        <div className="text-white font-mono text-sm">Requesting camera access…</div>
        <div className="text-[var(--text-muted)] font-mono text-[10px]">Allow camera permission in your browser</div>
      </div>
    );
  }

  if (mode === 'map') {
    return (
      <div className="tactical-panel p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="label-tag">AR Ghost Tours — Map View</div>
            {cameraError && (
              <div className="text-[10px] text-amber-400 font-mono mt-0.5">📍 Camera unavailable — showing map fallback</div>
            )}
          </div>
          <button onClick={() => setMode('idle')} className="text-[var(--text-muted)] hover:text-white font-mono text-xs transition-colors">
            ✕ CLOSE
          </button>
        </div>
        <div className="rounded-lg overflow-hidden border border-[#2a2f36]" style={{ height: 320 }}>
          <MapContainer center={center} zoom={10} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
            <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
            {pois.map(poi => (
              <CircleMarker
                key={poi.id}
                center={[poi.coords.lat, poi.coords.lng]}
                radius={14}
                pathOptions={{ color: '#E2725B', fillColor: '#E2725B', fillOpacity: 0.5, weight: 2 }}
                eventHandlers={{ click: () => openOverlay(poi) }}
              >
                <Popup>
                  <div style={{ fontFamily: 'monospace', fontSize: 11 }}>
                    {poi.icon} <strong>{poi.name}</strong>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>
        <AnimatePresence>
          {overlayOpen && activePoi && <PoiOverlay poi={activePoi} onClose={() => setOverlayOpen(false)} />}
        </AnimatePresence>
      </div>
    );
  }

  // AR camera mode
  return (
    <div className="relative col-span-full rounded-lg overflow-hidden border border-[#2a2f36]" style={{ height: 480 }}>
      {/* Camera feed */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        muted
        playsInline
      />
      <div className="absolute inset-0 bg-black/20" />

      {/* HUD header */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 bg-gradient-to-b from-black/60 to-transparent">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#E2725B] animate-pulse" />
          <span className="text-white font-mono text-[10px] tracking-widest">AR GHOST TOUR — LIVE</span>
        </div>
        <button
          onClick={stopAR}
          className="text-white/70 hover:text-white font-mono text-xs"
        >
          ✕ EXIT
        </button>
      </div>

      {/* Demo toggle (since user isn't in Patagonia) */}
      <div className="absolute bottom-16 left-0 right-0 flex justify-center">
        {!demoMode && (
          <button
            onClick={() => setDemoMode(true)}
            className="bg-black/60 border border-white/20 text-white/70 font-mono text-[10px] px-3 py-1.5 rounded hover:bg-black/80 transition-colors"
          >
            📍 Simulate nearby POI (demo)
          </button>
        )}
      </div>

      {/* Terracotta Pearl — shows when near a POI */}
      <AnimatePresence>
        {displayedNearby && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <button
              className="pointer-events-auto relative flex items-center justify-center cursor-pointer"
              onClick={() => openOverlay(displayedNearby)}
              style={{ background: 'none', border: 'none', padding: 0 }}
            >
              {/* Pulsing ring */}
              <span className="absolute w-20 h-20 rounded-full border-2 border-[#E2725B]/60 animate-ping" />
              <span className="absolute w-16 h-16 rounded-full border border-[#E2725B]/40 animate-pulse" />
              {/* Pearl */}
              <span className="relative w-12 h-12 rounded-full bg-[#E2725B] flex items-center justify-center text-xl shadow-lg shadow-[#E2725B]/40">
                {displayedNearby.icon}
              </span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* No nearby indicator */}
      {!displayedNearby && (
        <div className="absolute bottom-4 left-0 right-0 flex justify-center">
          <div className="bg-black/60 border border-white/10 text-white/50 font-mono text-[10px] px-3 py-1.5 rounded">
            Move towards a POI to unlock its story
          </div>
        </div>
      )}

      <AnimatePresence>
        {overlayOpen && activePoi && <PoiOverlay poi={activePoi} onClose={() => setOverlayOpen(false)} floating />}
      </AnimatePresence>
    </div>
  );
}

function PoiOverlay({ poi, onClose, floating = false }) {
  return (
    <motion.div
      data-beacon="ar-tours"
      initial={{ opacity: 0, y: floating ? 20 : 0, scale: floating ? 0.95 : 1 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: floating ? 20 : 0 }}
      className={floating
        ? 'absolute inset-x-4 bottom-4 z-20 bg-black/80 backdrop-blur-md border border-[#E2725B]/40 rounded-xl p-5'
        : 'fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4'
      }
    >
      <div className={floating ? '' : 'bg-[#111316] border border-[#2a2f36] rounded-xl p-6 max-w-lg w-full'}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{poi.icon}</span>
            <div>
              <div className="text-white font-editorial text-lg">{poi.name}</div>
              <div className="text-[#E2725B] text-[10px] font-mono tracking-widest">LEGACY OVERLAY</div>
            </div>
          </div>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-white font-mono text-sm">✕</button>
        </div>

        <div className="bg-[#0E1012] rounded-lg p-4 border border-[#1e2328] mb-4">
          <div className="text-[9px] font-mono text-[#E67E22] tracking-widest mb-2">HISTORICAL NOTE</div>
          <p className="text-[var(--text-secondary)] text-xs font-mono leading-relaxed">{poi.historicalNote}</p>
        </div>

        <div className="bg-[#0E1012] rounded-lg p-4 border border-pink-500/20">
          <div className="text-[9px] font-mono text-pink-400 tracking-widest mb-2">TRENDING NOW</div>
          <p className="text-[var(--text-secondary)] text-xs font-mono leading-relaxed">{poi.trendingSnippet}</p>
          <div className="mt-3 w-full h-24 bg-[#1a1f24] rounded flex items-center justify-center border border-[#2a2f36]">
            <span className="text-[var(--text-muted)] text-[10px] font-mono">▶ Trending video placeholder</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
