import { useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';

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
  car:    '#E67E22',
  train:  '#f87171',
};

function makeTourPin(num, color, isActive) {
  const pulse = isActive
    ? `<div style="position:absolute;inset:-6px;border-radius:50%;border:2px solid ${color};opacity:0.6;animation:tourPulse 1.4s ease-out infinite;"></div>`
    : '';
  return L.divIcon({
    className: '',
    iconAnchor: [18, 36],
    popupAnchor: [0, -40],
    html: `
      <style>@keyframes tourPulse{0%{transform:scale(1);opacity:0.6;}100%{transform:scale(2.2);opacity:0;}}</style>
      <div style="position:relative;width:36px;height:36px;">
        ${pulse}
        <div style="position:absolute;inset:0;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${isActive ? color : '#555'};display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,${isActive ? 0.9 : 0.4});opacity:${isActive ? 1 : 0.5};">
          <span style="transform:rotate(45deg);font-size:12px;font-weight:700;color:#0d1b2a;">${num}</span>
        </div>
      </div>`,
  });
}

function FlyToStop({ coords }) {
  const map = useMap();
  useEffect(() => {
    if (coords) map.flyTo(coords, 10, { animate: true, duration: 1.2 });
  }, [coords, map]);
  return null;
}

export default function TourMap({ stops, activeStopIndex }) {
  const activeStop = stops[activeStopIndex];
  const center = stops.find(s => s.coords)?.coords ?? [20, 0];

  return (
    <MapContainer
      center={center}
      zoom={4}
      style={{ width: '100%', height: '100%' }}
      zoomControl={false}
    >
      <TileLayer
        url="https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png"
        attribution='&copy; Stadia Maps'
      />

      {activeStop?.coords && <FlyToStop coords={activeStop.coords} />}

      {stops.slice(0, -1).map((stop, i) => {
        const next = stops[i + 1];
        if (!stop.coords || !next?.coords) return null;
        const color = MODE_COLOR[stop.leg.mode] ?? '#E67E22';
        return (
          <Polyline
            key={i}
            positions={[stop.coords, next.coords]}
            pathOptions={{ color, weight: 2, opacity: 0.5, dashArray: '6 4' }}
          />
        );
      })}

      {stops.map((stop, i) => {
        if (!stop.coords) return null;
        const isActive = i === activeStopIndex;
        const color = MODE_COLOR[stop.leg.mode] ?? '#E67E22';
        return (
          <Marker
            key={stop.leg.id}
            position={stop.coords}
            icon={makeTourPin(i + 1, color, isActive)}
          />
        );
      })}
    </MapContainer>
  );
}
