// src/components/journey/JourneyMap3D.jsx
import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import sentinelBus from '../../utils/sentinelBus';
import { PHOTO_ACTIVE, BREADCRUMB_UPDATED } from '../../utils/sentinelBusEvents';

const TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

export default function JourneyMap3D({ breadcrumbs = [], photos = [] }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    if (!TOKEN || !containerRef.current) return;
    mapboxgl.accessToken = TOKEN;

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
      // 3D terrain
      map.addSource('mapbox-dem', {
        type: 'raster-dem',
        url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
        tileSize: 512,
      });
      map.setTerrain({ source: 'mapbox-dem', exaggeration: 1.5 });

      // Breadcrumb trail with altitude gradient
      if (breadcrumbs.length > 1) {
        const alts = breadcrumbs.map(b => b.alt ?? 0);
        const minAlt = Math.min(...alts);
        const maxAlt = Math.max(...alts) || minAlt + 1;

        map.addSource('trail', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: breadcrumbs.slice(0, -1).map((b, i) => ({
              type: 'Feature',
              properties: { alt: b.alt ?? 0, altNorm: ((b.alt ?? 0) - minAlt) / (maxAlt - minAlt) },
              geometry: {
                type: 'LineString',
                coordinates: [[b.lng, b.lat], [breadcrumbs[i + 1].lng, breadcrumbs[i + 1].lat]],
              },
            })),
          },
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
        el.style.cssText = 'width:12px;height:12px;border-radius:50%;border:2px solid #E67E22;background:#0E1012;cursor:pointer;';
        el.title = photo.timestamp ?? `Photo ${i + 1}`;
        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([photo.coords[1], photo.coords[0]])
          .addTo(map);
        el.addEventListener('click', () => sentinelBus.emit(PHOTO_ACTIVE, { photo }));
        markersRef.current.push(marker);
      });
    });

    // Sync map fly-to when slideshow changes photo
    const unsubPhoto = sentinelBus.on(PHOTO_ACTIVE, ({ photo }) => {
      if (photo.coords && mapRef.current) {
        mapRef.current.flyTo({
          center: [photo.coords[1], photo.coords[0]],
          zoom: 14,
          pitch: 45,
          duration: 1000,
        });
      }
    });

    // Redraw trail when GPX is imported
    const unsubBreadcrumb = sentinelBus.on(BREADCRUMB_UPDATED, ({ breadcrumbs: next }) => {
      const source = mapRef.current?.getSource('trail');
      if (!source) return;
      source.setData({
        type: 'FeatureCollection',
        features: next.slice(0, -1).map((b, i) => ({
          type: 'Feature',
          properties: { altNorm: 0 },
          geometry: {
            type: 'LineString',
            coordinates: [[b.lng, b.lat], [next[i + 1].lng, next[i + 1].lat]],
          },
        })),
      });
    });

    return () => {
      unsubPhoto();
      unsubBreadcrumb();
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];
      map.remove();
    };
  }, []);  // intentionally runs once; breadcrumbs/photos are loaded via sentinelBus events

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

  return <div ref={containerRef} className="w-full h-96 rounded overflow-hidden" />;
}
