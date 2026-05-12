import { useState, useEffect } from 'react';
import { CircleMarker, Popup } from 'react-leaflet';
import { searchByCategory, FSQ_CATEGORIES } from '../../utils/foursquareEngine';

const PIN_CATEGORIES = [
  { key: 'attractions', kinds: FSQ_CATEGORIES.attractions, color: '#E67E22', label: 'VIEWPOINT' },
  { key: 'food',        kinds: FSQ_CATEGORIES.restaurants,  color: '#5C9A6A', label: 'FOOD' },
];

const POPUP_STYLE = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 11,
  minWidth: 160,
};

export default function ScoutPinsLayer({ destination, visible = true }) {
  const [pins, setPins] = useState([]);

  useEffect(() => {
    if (!destination || !visible) return;
    let cancelled = false;

    async function load() {
      const results = await Promise.all(
        PIN_CATEGORIES.map(cat =>
          searchByCategory(cat.kinds, destination, 8).then(places =>
            places
              .filter(p => p.coords?.lat && p.coords?.lng)
              .map(p => ({ ...p, pinColor: cat.color, pinLabel: cat.label }))
          )
        )
      );
      if (!cancelled) setPins(results.flat());
    }

    load();
    return () => { cancelled = true; };
  }, [destination, visible]);

  if (!visible) return null;

  return (
    <>
      {pins.map(pin => (
        <CircleMarker
          key={pin.id}
          center={[pin.coords.lat, pin.coords.lng]}
          radius={6}
          pathOptions={{
            color: pin.pinColor,
            fillColor: pin.pinColor,
            fillOpacity: 0.85,
            weight: 1.5,
            opacity: 0.9,
          }}
        >
          <Popup>
            <div style={POPUP_STYLE}>
              <div style={{ fontWeight: 700, color: pin.pinColor, marginBottom: 4 }}>
                {pin.name}
              </div>
              <div style={{ color: '#888', fontSize: 9, letterSpacing: '0.08em', marginBottom: 4 }}>
                {pin.pinLabel}
                {pin.type && pin.type !== pin.pinLabel ? ` · ${pin.type}` : ''}
              </div>
              {pin.rating && (
                <div style={{ color: '#E67E22', fontSize: 10 }}>★ {pin.rating}</div>
              )}
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </>
  );
}
