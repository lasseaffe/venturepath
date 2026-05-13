import { useMemo, useState } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, useMapEvents } from 'react-leaflet';
import { useTracks } from '../../store/useTripStore.jsx';
import { SET_TRACK_PROFILE, UNDO, REDO } from '../../store/slices/tracks.js';
import { downloadTrackGpx } from '../../utils/gpxExporter.v2.js';
import ToolRail from './ToolRail.jsx';

export default function TrackStudio({ trackId }) {
  const { tracks, past, future, dispatch } = useTracks();
  const track = useMemo(() => tracks.find(t => t.id === trackId), [tracks, trackId]);
  const [tool, setTool] = useState('draw');

  if (!track) return null;

  const polyline = track.points.map(p => [p.lat, p.lng]);
  const center = polyline[0] ?? [46.5, 11.3]; // Dolomites — VP's expedition vibe

  return (
    <div className="relative h-full w-full">
      <ToolRail
        tool={tool}
        onTool={setTool}
        onUndo={() => dispatch({ type: UNDO })}
        onRedo={() => dispatch({ type: REDO })}
        canUndo={past.length > 0}
        canRedo={future.length > 0}
        onExport={() => downloadTrackGpx(track)}
        profile={track.profile}
        onProfile={(profile) => dispatch({ type: SET_TRACK_PROFILE, payload: { trackId: track.id, profile } })}
      />

      <MapContainer center={center} zoom={11} className="h-full w-full" attributionControl={false}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap'
        />
        {polyline.length >= 2 && (
          <Polyline positions={polyline} pathOptions={{ color: '#E67E22', weight: 4 }} />
        )}
        {track.points.map((p, i) => (
          <Marker
            key={i}
            position={[p.lat, p.lng]}
            draggable={tool === 'edit'}
            eventHandlers={{
              dragend: async (ev) => {
                if (tool !== 'edit') return;
                const { lat, lng } = ev.target.getLatLng();
                dispatch({ type: 'tracks/MOVE_POINT', payload: { trackId: track.id, idx: i, lat, lng } });

                // Reroute prev→this and this→next, if neighbors exist
                const { routeBetween } = await import('../../services/routingEngine.js');
                const prev = track.points[i - 1];
                const next = track.points[i + 1];
                // Note: this is a simplified reroute that warms the routing cache rather than splicing
                // segments in-range. A future task (Phase 4) will implement true segment splicing once
                // segment indexing is reworked.
                if (prev) {
                  await routeBetween({ from: { lat: prev.lat, lng: prev.lng }, to: { lat, lng }, profile: track.profile });
                }
                if (next) {
                  await routeBetween({ from: { lat, lng }, to: { lat: next.lat, lng: next.lng }, profile: track.profile });
                }
              },
            }}
          />
        ))}
        <ClickHandler tool={tool} track={track} dispatch={dispatch} />
      </MapContainer>

      <div className="absolute right-4 top-4 z-[1000] rounded-md border border-[#3a2f25] bg-[#0E1012]/95 p-3 font-[JetBrains_Mono] text-xs text-[#D9C5B2]">
        <div className="text-[10px] uppercase tracking-wider text-[#D9C5B2]/60">Composition</div>
        <div className="mt-1">{track.stats.distanceKm.toFixed(2)} km · {Math.round(track.stats.durationH * 60)} min</div>
        <div>↑ {track.stats.ascentM} m · ↓ {track.stats.descentM} m</div>
        <div className="text-[#E67E22]">{track.stats.difficulty.toUpperCase()}</div>
      </div>
    </div>
  );
}

function ClickHandler({ tool, track, dispatch }) {
  useMapEvents({
    async click(e) {
      if (tool !== 'draw') return;
      const { lat, lng } = e.latlng;
      const last = track.points[track.points.length - 1];

      // First click: drop a single starting point
      if (!last) {
        dispatch({
          type: 'tracks/APPEND_POINTS',
          payload: {
            trackId: track.id,
            points: [{ lat, lng, ele: null, time: null }],
            engine: 'manual',
            profile: track.profile,
          },
        });
        return;
      }

      // Subsequent clicks: ask routing engine for a path from `last` to clicked point
      const { routeBetween } = await import('../../services/routingEngine.js');
      const { hydrateElevations } = await import('../../services/elevationEngine.js');

      const res = await routeBetween({
        from: { lat: last.lat, lng: last.lng },
        to:   { lat, lng },
        profile: track.profile,
      });
      // Skip the first point of the segment (it's `last`, already in the track)
      const newPoints = res.points.slice(1);
      dispatch({
        type: 'tracks/APPEND_POINTS',
        payload: { trackId: track.id, points: newPoints, engine: res.engine, profile: track.profile },
      });

      // Fire-and-forget elevation hydration for the new points
      const eles = await hydrateElevations(newPoints);
      const startIdx = track.points.length;
      const fullEles = new Array(startIdx).fill(null).concat(eles);
      dispatch({
        type: 'tracks/HYDRATE_ELEVATION',
        payload: { trackId: track.id, elevations: fullEles },
      });
    },
  });
  return null;
}
