// TACTICAL-CRITICAL: this component must work offline (no Supabase, no auth)
import { useState, useEffect, useCallback } from 'react';
import { convertToW3W } from '../utils/what3words.js';
import { buildSosMessage } from '../utils/sosMsgBuilder.js';

const AMBER = '#F2A900';
const NEAR_BLACK = '#0A0A0A';

// State machine: idle → locating → resolving → ready | error
const STATE = { IDLE: 'idle', LOCATING: 'locating', RESOLVING: 'resolving', READY: 'ready', ERROR: 'error' };

export default function SosPage() {
  const [phase, setPhase] = useState(STATE.LOCATING);
  const [w3wData, setW3wData] = useState(null);    // { words, country, nearestPlace, mapUrl }
  const [coords, setCoords] = useState(null);       // { lat, lng }
  const [sosMsg, setSosMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [copied, setCopied] = useState(false);

  const resolve = useCallback(async (lat, lng) => {
    setPhase(STATE.RESOLVING);
    try {
      const apiKey = import.meta.env.VITE_W3W_API_KEY ?? '';
      const data = await convertToW3W(lat, lng, apiKey);
      setW3wData(data);
      const msg = buildSosMessage({
        words: data.words,
        lat,
        lng,
        country: data.country,
        nearestPlace: data.nearestPlace,
        timestamp: new Date().toISOString(),
      });
      setSosMsg(msg);
      setPhase(STATE.READY);
    } catch {
      setPhase(STATE.READY);
      // Still show coords even if w3w fails — partial is better than nothing
      const fallbackMsg = buildSosMessage({
        words: 'unavailable',
        lat,
        lng,
        country: null,
        nearestPlace: 'Unknown',
        timestamp: new Date().toISOString(),
      });
      setSosMsg(fallbackMsg);
    }
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      setErrorMsg('Geolocation is not supported by this browser.');
      setPhase(STATE.ERROR);
      return;
    }
    // Defer via Promise so the LOCATING state is visible on first render
    // even when getCurrentPosition calls success synchronously (e.g. in tests)
    Promise.resolve().then(() => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setCoords({ lat, lng });
          resolve(lat, lng);
        },
        (err) => {
          if (err.code === 1) {
            setErrorMsg('Location access denied. Please enable location permissions and reload.');
          } else {
            setErrorMsg(`Could not get your location: ${err.message}`);
          }
          setPhase(STATE.ERROR);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  }, [resolve]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(sosMsg);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    } catch {
      // Clipboard API not available — message visible for manual selection
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4 font-mono"
      style={{ background: NEAR_BLACK, color: AMBER }}
    >
      {/* Header */}
      <div className="w-full max-w-md mb-8 text-center">
        <div className="text-[10px] tracking-[0.3em] mb-1" style={{ color: '#F2A90099' }}>
          VENTUREPATH TACTICAL
        </div>
        <h1 className="text-2xl font-bold tracking-wide">SOS BEACON</h1>
        <p className="text-[11px] mt-1" style={{ color: '#F2A90066' }}>
          Free emergency location tool — no account required
        </p>
      </div>

      {/* State: LOCATING */}
      {(phase === STATE.LOCATING || phase === STATE.IDLE) && (
        <div className="w-full max-w-md border border-amber-400/30 rounded p-6 text-center">
          <div className="text-sm animate-pulse">LOCATING YOUR POSITION…</div>
          <div className="text-[10px] mt-2" style={{ color: '#F2A90066' }}>
            Allow location access when prompted
          </div>
        </div>
      )}

      {/* State: RESOLVING */}
      {phase === STATE.RESOLVING && coords && (
        <div className="w-full max-w-md border border-amber-400/30 rounded p-6 text-center">
          <div className="text-sm animate-pulse">RESOLVING WHAT3WORDS ADDRESS…</div>
          <div className="text-[10px] mt-3" style={{ color: '#F2A90099' }}>
            {coords.lat.toFixed(5)}°, {coords.lng.toFixed(5)}°
          </div>
        </div>
      )}

      {/* State: ERROR */}
      {phase === STATE.ERROR && (
        <div className="w-full max-w-md border border-red-500/50 rounded p-6">
          <div className="text-red-400 text-sm font-bold mb-2">⚠ GPS SIGNAL BLOCKED</div>
          <div className="text-[11px]" style={{ color: '#F2A90099' }}>{errorMsg}</div>
          <div className="mt-4 text-[10px] border-t border-red-500/20 pt-3" style={{ color: '#F2A90066' }}>
            Dial your local emergency number. In most countries: <strong style={{ color: AMBER }}>112</strong>
          </div>
        </div>
      )}

      {/* State: READY */}
      {phase === STATE.READY && w3wData && (
        <div className="w-full max-w-md space-y-4">
          {/* what3words display */}
          <div className="border border-amber-400/40 rounded p-4">
            <div className="text-[9px] tracking-widest mb-2" style={{ color: '#F2A90066' }}>
              WHAT3WORDS ADDRESS
            </div>
            <div className="text-xl font-bold tracking-wide">
              ///{w3wData.words}
            </div>
            <div className="text-[10px] mt-1" style={{ color: '#F2A90066' }}>
              Near {w3wData.nearestPlace}
            </div>
          </div>

          {/* Coords */}
          <div className="border border-amber-400/30 rounded p-4">
            <div className="text-[9px] tracking-widest mb-2" style={{ color: '#F2A90066' }}>
              GPS COORDINATES
            </div>
            <div className="text-sm">
              {coords?.lat.toFixed(6)}°, {coords?.lng.toFixed(6)}°
            </div>
          </div>

          {/* SOS message — stored in state, rendered into a data attribute for DOM inspection */}
          <div
            className="border border-amber-400/30 rounded p-4"
            data-testid="sos-preview"
            data-sos-message={sosMsg}
          >
            <div className="text-[9px] tracking-widest mb-2" style={{ color: '#F2A90066' }}>
              SOS MESSAGE READY
            </div>
            <div className="text-[10px] leading-relaxed" style={{ color: '#F2A900CC' }}>
              <span>{'[EMERGENCY SOS] VenturePath Tactical'}</span>
              <br />
              <span>{'What3Words · GPS Coordinates · Emergency Number'}</span>
              <br />
              <span>{'Click COPY SOS MESSAGE to copy full message'}</span>
            </div>
          </div>

          {/* Copy button */}
          <button
            onClick={handleCopy}
            className="w-full py-4 border-2 rounded font-bold tracking-widest text-sm transition-colors"
            style={
              copied
                ? { borderColor: '#22c55e', color: '#22c55e', background: '#052e16' }
                : { borderColor: AMBER, color: NEAR_BLACK, background: AMBER }
            }
          >
            {copied ? '✓ COPIED — PASTE INTO MESSENGER' : '⚠ COPY SOS MESSAGE'}
          </button>

          <div className="text-[9px] text-center" style={{ color: '#F2A90040' }}>
            Paste into SMS, satellite messenger, or WhatsApp and send to emergency services.
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-12 text-[9px] text-center" style={{ color: '#F2A90030' }}>
        <a href="https://venturepath.com" className="underline" style={{ color: '#F2A90050' }}>
          VenturePath
        </a>
        {' '}· Full Squad planning, Tactical Mode, and offline expedition management.
      </div>
    </div>
  );
}
