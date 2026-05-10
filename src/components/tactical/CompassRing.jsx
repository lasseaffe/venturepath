// src/components/tactical/CompassRing.jsx
// TACTICAL-CRITICAL: this component must work offline
import { useState, useEffect, useRef } from 'react';
import { bearing, cardinalLabel, haversineKm } from '../../utils/compassEngine';

export default function CompassRing({ stops }) {
  const [currentPos, setCurrentPos] = useState(null);
  const [stopIndex, setStopIndex] = useState(0);
  const watchRef = useRef(null);

  useEffect(() => {
    if (!navigator.geolocation) return;
    watchRef.current = navigator.geolocation.watchPosition(
      pos => setCurrentPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      null,
      { maximumAge: 5000 }
    );
    return () => navigator.geolocation.clearWatch(watchRef.current);
  }, []);

  if (!navigator.geolocation) {
    return (
      <div className="flex items-center justify-center w-40 h-40 rounded-full border-2 border-[#F2A900]/30 text-[#F2A900] font-mono text-xs text-center">
        GPS unavailable
      </div>
    );
  }

  if (!currentPos || stops.length === 0) {
    return (
      <div className="flex items-center justify-center w-40 h-40 rounded-full border-2 border-[#F2A900]/30 text-[#F2A900] font-mono text-xs text-center animate-pulse">
        Acquiring GPS...
      </div>
    );
  }

  const stop = stops[stopIndex % stops.length];
  const stopCoords = stop.coords ?? { lat: stop.lat, lng: stop.lng };
  const deg = bearing(currentPos, stopCoords);
  const distKm = haversineKm(currentPos, stopCoords);
  const cardinal = cardinalLabel(deg);

  return (
    <button
      onClick={() => setStopIndex(i => i + 1)}
      className="relative flex items-center justify-center w-40 h-40 rounded-full border-2 border-[#F2A900]/60 bg-black/60 select-none"
      title="Tap to cycle to next stop"
      aria-label={`Compass: ${cardinal}, ${distKm < 1 ? `${(distKm * 1000).toFixed(0)}m` : `${distKm.toFixed(1)}km`} to ${stop.label ?? stop.to}`}
    >
      {/* Rotating needle */}
      <div
        className="absolute w-1 h-16 bg-[#F2A900] rounded origin-bottom"
        style={{ transform: `rotate(${deg}deg)`, bottom: '50%', left: 'calc(50% - 2px)' }}
      />
      {/* Center info */}
      <div className="z-10 text-center">
        <p className="text-[#F2A900] font-mono text-xs">{cardinal}</p>
        <p className="text-[#F2A900] font-mono text-lg font-bold">{distKm < 1 ? `${(distKm * 1000).toFixed(0)}m` : `${distKm.toFixed(1)}km`}</p>
        <p className="text-[#F2A900]/60 font-mono text-[10px] max-w-[80px] truncate">{stop.label ?? stop.to}</p>
      </div>
    </button>
  );
}
