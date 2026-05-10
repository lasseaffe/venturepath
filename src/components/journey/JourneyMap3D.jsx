// src/components/journey/JourneyMap3D.jsx
import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import sentinelBus from '../../utils/sentinelBus';
import { PHOTO_ACTIVE, BREADCRUMB_UPDATED } from '../../utils/sentinelBusEvents';

const TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

function buildTrailFeatures(breadcrumbs) {
  const alts = breadcrumbs.map(b => b.alt ?? 0);
  const minAlt = Math.min(...alts);
  const maxAlt = Math.max(...alts) || minAlt + 1;
  return breadcrumbs.slice(0, -1).map((b, i) => ({
    type: 'Feature',
    properties: { altNorm: ((b.alt ?? 0) - minAlt) / (maxAlt - minAlt) },
    geometry: {
      type: 'LineString',
      coordinates: [[b.lng, b.lat], [breadcrumbs[i + 1].lng, breadcrumbs[i + 1].lat]],
    },
  }));
}

export default function JourneyMap3D({ breadcrumbs = [], photos = [] }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const activeMarkerRef = useRef(null);

  useEffect(() => {
    if (!TOKEN || !containerRef.current) return;
    mapboxgl.accessToken = TOKEN;

    let destroyed = false;

    const center = breadcrumbs[0]
      ? [breadcrumbs[0].lng, breadcrumbs[0].lat]
      : [0, 0];

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center,
      zoom: 10,
      pitch: 45,
    });
    mapRef.current = map;

    map.on('load', () => {
      if (destroyed) return;

      // 3D terrain
      map.addSource('mapbox-dem', {
        type: 'raster-dem',
        url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
        tileSize: 512,
      });
      map.setTerrain({ source: 'mapbox-dem', exaggeration: 1.5 });

      // Breadcrumb trail with altitude gradient
      if (breadcrumbs.length > 1) {
        map.addSource('trail', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: buildTrailFeatures(breadcrumbs) },
        });

        map.addLayer({
          id: 'trail-line',
          type: 'line',
          source: 'trail',
          paint: {
            'line-width': 3,
            'line-color': [
              'interpolate', ['linear'],
              ['get', 'altNorm'],
              0, '#D9C5B2',
              1, '#E67E22',
            ],
          },
        });
      }

      // Photo pin markers
      photos.forEach((photo, i) => {
        if (!photo.coords) return;
        const el = document.createElement('div');
        el.style.cssText = 'width:12px;height:12px;border-radius:50%;border:2px solid #E67E22;background:#0E1012;cursor:pointer;transition:transform 0.2s;';
        el.title = photo.timestamp ?? `Photo ${i + 1}`;
        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([photo.coords[1], photo.coords[0]])
          .addTo(map);
        el.addEventListener('click', () => sentinelBus.emit(PHOTO_ACTIVE, { photo }));
        markersRef.current.push({ marker, el, photo });
      });
    });

    // Sync map fly-to + active pin pulse when slideshow changes photo
    const unsubPhoto = sentinelBus.on(PHOTO_ACTIVE, ({ photo }) => {
      if (photo.coords && mapRef.current) {
        mapRef.current.flyTo({
          center: [photo.coords[1], photo.coords[0]],
          zoom: 14,
          pitch: 45,
          duration: 1000,
        });
      }
      // Clear previous active pin pulse
      if (activeMarkerRef.current) {
        activeMarkerRef.current.style.animation = '';
        activeMarkerRef.current.style.boxShadow = '';
      }
      // Find and pulse the active pin
      const entry = markersRef.current.find(
        m => m.photo.url === photo.url || m.photo.timestamp === photo.timestamp
      );
      if (entry) {
        entry.el.style.animation = 'pin-pulse 1s ease-in-out infinite';
        entry.el.style.boxShadow = '0 0 0 0 rgba(230,126,34,0.7)';
        activeMarkerRef.current = entry.el;
      }
    });

    // Redraw trail with correct altitude gradient when GPX is imported
    const unsubBreadcrumb = sentinelBus.on(BREADCRUMB_UPDATED, ({ breadcrumbs: next }) => {
      const source = mapRef.current?.getSource('trail');
      if (!source || next.length < 2) return;
      source.setData({
        type: 'FeatureCollection',
        features: buildTrailFeatures(next),
      });
    });

    return () => {
      destroyed = true;
      unsubPhoto();
      unsubBreadcrumb();
      markersRef.current.forEach(({ marker }) => marker.remove());
      markersRef.current = [];
      map.remove();
    };
  }, []); // runs once; live updates come via sentinelBus

  if (!TOKEN) {
    return (
      <div className="flex items-center justify-center h-64 border border-white/10 rounded text-[#D9C5B2] font-mono text-sm text-center p-4">
        <div>
          <p className="text-[#E67E22] mb-2">3D Map unavailable</p>
          <p className="text-xs">Set VITE_MAPBOX_TOKEN in your .env file to enable the 3D Journey Map.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`@keyframes pin-pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.6)} }`}</style>
      <div ref={containerRef} className="w-full h-96 rounded overflow-hidden" />
    </>
  );
}
