// src/components/journey/StatOverlay.jsx
import { useEffect, useState } from 'react';
import { fetchElevations } from '../../utils/elevationService';

export default function StatOverlay({ photo }) {
  const [altitude, setAltitude] = useState(photo.altitude ?? null);

  useEffect(() => {
    setAltitude(photo.altitude ?? null);
    if (photo.altitude != null) return;
    if (!photo.coords?.[0]) return;
    let cancelled = false;
    fetchElevations([{ lat: photo.coords[0], lng: photo.coords[1] }])
      .then(([elev]) => { if (!cancelled) setAltitude(elev); });
    return () => { cancelled = true; };
  }, [photo]);

  const stats = [
    { label: 'ALT', value: altitude != null ? `${altitude}m` : '—' },
    { label: 'HR', value: photo.heart_rate != null ? `${photo.heart_rate}bpm` : '—' },
    { label: 'TEMP', value: photo.temp != null ? `${photo.temp}°C` : '—' },
    { label: 'TIME', value: photo.timestamp ? new Date(photo.timestamp).toLocaleTimeString() : '—' },
  ];

  return (
    <div className="absolute bottom-3 left-3 flex gap-3 flex-wrap">
      {stats.map(s => (
        <div key={s.label} className="bg-black/70 rounded px-2 py-1 font-mono text-xs">
          <span className="text-[#E67E22]">{s.label} </span>
          <span className="text-white">{s.value}</span>
        </div>
      ))}
    </div>
  );
}
