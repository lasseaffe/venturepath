import { useState, useEffect } from 'react';
import { useTripStore } from '../../store/useTripStore';
import { useTheme } from '../../context/ThemeContext';
import CompassRing from '../tactical/CompassRing';

const CACHED_MESSAGES = [
  'Scout: River crossing waist-deep as of 07:30',
  'Lead: Summit bid confirmed for 05:00',
  'Medic: Full first aid kit in pack',
];

export default function TacticalMode({ onExit }) {
  const { trip, legs } = useTripStore();
  const { setTheme } = useTheme();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    setTheme('tactical');
    return () => setTheme('default');
  }, [setTheme]);
  const [coords] = useState({ lat: -50.9423, lng: -73.4068 });
  const [freshness] = useState('14 min ago');
  const [sosReady, setSosReady] = useState(false);
  const [sosCopied, setSosCopied] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const activeLeg = legs.find(l => l.status === 'pending') ?? legs[0];

  const sosText = [
    `[SOS] VenturePath Emergency Beacon`,
    `Time: ${time.toISOString()}`,
    `Coords: ${coords.lat}, ${coords.lng}`,
    `Trip: ${trip.name}`,
    `Active Leg: ${activeLeg?.from} → ${activeLeg?.to}`,
    `Status: EMERGENCY — REQUIRES ASSISTANCE`,
  ].join('\n');

  const handleSOS = () => {
    setSosReady(true);
    navigator.clipboard?.writeText(sosText).then(() => setSosCopied(true));
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
  };

  return (
    <div className="min-h-screen bg-black text-amber-400 font-mono p-4 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-amber-400/30">
        <div>
          <div className="text-[10px] tracking-widest text-amber-600">TACTICAL MODE — OFFLINE</div>
          <div className="text-xl font-bold text-amber-400">{time.toLocaleTimeString()}</div>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-amber-600">DATA FRESHNESS</div>
          <div className="text-sm text-amber-400">{freshness}</div>
        </div>
      </div>

      {/* Coords + compass */}
      <div className="mb-4 p-3 border border-amber-400/30 rounded">
        <div className="text-[10px] text-amber-600 mb-1">POSITION</div>
        <div className="text-lg">{coords.lat}° S, {Math.abs(coords.lng)}° W</div>
        <div className="flex gap-4 mt-2 text-sm text-amber-600">
          <span>HDG: 042°</span>
          <span>ALT: 1,240m</span>
          <span>GPS: LOCKED</span>
        </div>
      </div>

      {/* Active leg */}
      <div className="mb-4 p-3 border border-amber-400/30 rounded">
        <div className="text-[10px] text-amber-600 mb-1">CURRENT OBJECTIVE</div>
        {activeLeg ? (
          <>
            <div className="text-base font-bold">{activeLeg.from} → {activeLeg.to}</div>
            <div className="text-sm text-amber-600 mt-1">
              {activeLeg.distanceKm} km · {activeLeg.durationH}h estimated
            </div>
          </>
        ) : (
          <div className="text-sm text-amber-600">No active leg</div>
        )}
      </div>

      {/* Cached squad comms */}
      <div className="mb-4 p-3 border border-amber-400/30 rounded flex-1">
        <div className="text-[10px] text-amber-600 mb-2">SQUAD COMMS — CACHED</div>
        <div className="space-y-2">
          {CACHED_MESSAGES.map((m, i) => (
            <div key={i} className="text-xs text-amber-300 border-l-2 border-amber-400/40 pl-2">{m}</div>
          ))}
        </div>
      </div>

      {/* SOS */}
      <div className="mt-auto space-y-3">
        {sosReady && (
          <div className="p-3 border border-amber-400/50 rounded text-xs whitespace-pre-wrap text-amber-300">
            {sosText}
            {sosCopied && <div className="mt-2 text-green-400">✓ Copied to clipboard — paste into satellite messenger</div>}
          </div>
        )}
        <button
          onClick={handleSOS}
          className="w-full py-4 bg-red-900 hover:bg-red-800 border-2 border-red-500 text-red-300 font-bold tracking-widest text-sm rounded transition-colors"
        >
          ⚠ SOS EMERGENCY BEACON
        </button>
        {/* TACTICAL-CRITICAL: CompassRing uses navigator.geolocation — works offline */}
        <div className="flex justify-center mt-6">
          <CompassRing
            stops={legs.map(l => ({ label: `${l.from ?? ''} → ${l.to ?? ''}`, lat: null, lng: null }))}
          />
        </div>
        <button
          onClick={onExit}
          className="w-full py-2 border border-amber-400/30 text-amber-600 text-xs tracking-widest rounded hover:border-amber-400/60 transition-colors"
        >
          EXIT TACTICAL MODE
        </button>
      </div>
    </div>
  );
}
