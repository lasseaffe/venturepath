// src/components/journey/legacy/SlideshowMiniMap.jsx
import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';

// Leaflet CSS is imported globally in main.jsx — do not re-import here.

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function makeEmberMarker() {
  return L.divIcon({
    className: '',
    iconAnchor: [10, 10],
    html: `<div style="
      width:20px;height:20px;border-radius:50%;
      background:#E67E22;border:2px solid #fff;
      box-shadow:0 0 0 4px rgba(230,126,34,0.3);
    "></div>`,
  });
}

function MapController({ coords }) {
  const map = useMap();
  const markerRef = useRef(null);

  useEffect(() => {
    if (!coords) return;
    map.flyTo([coords.lat, coords.lng], map.getZoom(), { duration: 0.5 });

    if (markerRef.current) {
      markerRef.current.setLatLng([coords.lat, coords.lng]);
    } else {
      markerRef.current = L.marker([coords.lat, coords.lng], {
        icon: makeEmberMarker(),
        zIndexOffset: 1000,
      }).addTo(map);
    }
  }, [coords, map]);

  return null;
}

export default function SlideshowMiniMap({ coords, bearing }) {
  const defaultCenter = coords ? [coords.lat, coords.lng] : [48.86, 2.35];

  return (
    <div
      className="relative w-full h-full overflow-hidden rounded-r"
      style={{
        transition: 'transform 0.5s ease',
        transform: `rotate(${bearing ?? 0}deg)`,
      }}
    >
      <MapContainer
        center={defaultCenter}
        zoom={13}
        style={{ width: '100%', height: '100%' }}
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution=""
        />
        <MapController coords={coords} bearing={bearing} />
      </MapContainer>

      {/* North indicator — counter-rotates to stay upright */}
      <div
        className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full font-mono text-xs font-bold z-[1000]"
        style={{
          background: '#0E1012',
          color: '#E67E22',
          border: '1px solid #E67E22',
          transform: `rotate(${-(bearing ?? 0)}deg)`,
          transition: 'transform 0.5s ease',
        }}
      >N</div>
    </div>
  );
}
