// src/components/journey/GpxImporter.jsx
import { useState } from 'react';
import { parseGpx, matchGpxToPhotos } from '../../utils/gpxParser';
import { useTripStore } from '../../store/useTripStore';
import sentinelBus from '../../utils/sentinelBus';
import { BREADCRUMB_UPDATED } from '../../utils/sentinelBusEvents';

export default function GpxImporter() {
  const { journeyData, dispatch } = useTripStore();
  const [matchReport, setMatchReport] = useState(null);
  const [error, setError] = useState(null);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      const text = await file.text();
      const trackPoints = parseGpx(text);

      const photos = journeyData?.photos ?? [];
      const enrichedPhotos = matchGpxToPhotos(trackPoints, photos);
      const matchCount = enrichedPhotos.filter(p => p._gpxMatched).length;

      const breadcrumbs = trackPoints.map(pt => ({ lat: pt.lat, lng: pt.lng, alt: pt.alt, timestamp: pt.timestamp }));

      dispatch({ type: 'SET_JOURNEY_DATA', payload: { breadcrumbs, gpxImported: true, photos: enrichedPhotos } });
      sentinelBus.emit(BREADCRUMB_UPDATED, { breadcrumbs });
      setMatchReport({ total: photos.length, matched: matchCount, trackPoints: trackPoints.length });
    } catch {
      setError('Could not parse GPX file. Make sure it is a valid .gpx track.');
    }
  };

  return (
    <div className="border border-white/10 rounded p-3 mb-4">
      <p className="font-mono text-[#E67E22] text-xs uppercase tracking-widest mb-2">Import GPX Track</p>
      <input type="file" accept=".gpx" onChange={handleFile} className="text-[#D9C5B2] text-sm font-mono" />
      {matchReport && (
        <p className="text-xs font-mono text-[#D9C5B2] mt-2">
          Matched {matchReport.matched} of {matchReport.total} photos to GPX track.
        </p>
      )}
      {journeyData?.gpxImported && !matchReport && (
        <p className="text-xs font-mono text-green-400 mt-2">✓ GPX imported</p>
      )}
      {error && <p className="text-xs font-mono text-red-400 mt-2">{error}</p>}
    </div>
  );
}
