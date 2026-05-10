import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { classifyPoi, categoryById } from '../../utils/poiCategories';

export default function MapLayerController({ pois = [], activeLayers }) {
  const map = useMap();
  const markersRef = useRef([]);

  useEffect(() => {
    // Remove previous markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    // Add markers for visible categories
    for (const poi of pois) {
      const categoryId = classifyPoi(poi);
      if (!categoryId || !activeLayers.has(categoryId)) continue;

      const cat = categoryById(categoryId);
      if (!cat || !poi.coords?.lat || !poi.coords?.lng) continue;

      const marker = L.circleMarker([poi.coords.lat, poi.coords.lng], {
        radius: 7,
        fillColor: cat.color,
        fillOpacity: 0.85,
        color: '#0E1012',
        weight: 1.5,
      }).addTo(map);

      marker.bindPopup(`
        <div style="font-family:'JetBrains Mono', monospace;font-size:12px;color:#0E1012">
          <strong>${poi.name ?? 'Unknown'}</strong><br/>
          <span style="color:${cat.color}">${cat.icon} ${cat.label}</span>
        </div>
      `);

      markersRef.current.push(marker);
    }

    return () => {
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];
    };
  }, [pois, activeLayers, map]);

  return null;
}
