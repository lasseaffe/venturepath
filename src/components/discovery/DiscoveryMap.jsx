import React, { useEffect } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

const TILES = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
const ATTR  = '© <a href="https://openstreetmap.org">OpenStreetMap</a> © <a href="https://carto.com">CARTO</a>'

function FitBounds({ pins }) {
  const map = useMap()
  useEffect(() => {
    const all = pins.filter(p => p.lat && p.lon)
    if (all.length === 0) return
    const lats = all.map(p => p.lat)
    const lons = all.map(p => p.lon)
    map.fitBounds(
      [[Math.min(...lats), Math.min(...lons)], [Math.max(...lats), Math.max(...lons)]],
      { padding: [32, 32], maxZoom: 15 }
    )
  }, [pins, map])
  return null
}

function PanTo({ selectedId, pins }) {
  const map = useMap()
  useEffect(() => {
    if (!selectedId) return
    const pin = pins.find(p => p.id === selectedId)
    if (pin) map.panTo([pin.lat, pin.lon], { animate: true })
  }, [selectedId, pins, map])
  return null
}

export default function DiscoveryMap({ attractionPins = [], foodPins = [], selectedId, onPinClick }) {
  const allPins = [...attractionPins, ...foodPins]
  const defaultCenter = [48.8566, 2.3522]

  return (
    <div className="w-full rounded overflow-hidden border border-[#1a1d20]" style={{ height: 280 }}>
      <MapContainer
        center={defaultCenter}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <TileLayer url={TILES} attribution={ATTR} />
        <FitBounds pins={allPins} />
        <PanTo selectedId={selectedId} pins={allPins} />

        {attractionPins.map(pin => (
          <CircleMarker
            key={`attr-${pin.id}`}
            center={[pin.lat, pin.lon]}
            radius={selectedId === pin.id ? 9 : 6}
            pathOptions={{
              color: selectedId === pin.id ? '#fff' : '#E67E22',
              fillColor: '#E67E22',
              fillOpacity: 0.9,
              weight: selectedId === pin.id ? 2 : 1
            }}
            eventHandlers={{ click: () => onPinClick?.(pin.id, 'attraction') }}
          >
            <Popup className="font-mono text-xs">
              <strong>{pin.name}</strong><br />
              {pin.tags?.historic ?? pin.tags?.tourism ?? 'Attraction'}
            </Popup>
          </CircleMarker>
        ))}

        {foodPins.map(pin => (
          <CircleMarker
            key={`food-${pin.id}`}
            center={[pin.lat, pin.lon]}
            radius={selectedId === pin.id ? 9 : 6}
            pathOptions={{
              color: selectedId === pin.id ? '#fff' : '#D9C5B2',
              fillColor: '#D9C5B2',
              fillOpacity: 0.9,
              weight: selectedId === pin.id ? 2 : 1
            }}
            eventHandlers={{ click: () => onPinClick?.(pin.id, 'food') }}
          >
            <Popup className="font-mono text-xs">
              <strong>{pin.name}</strong><br />
              {pin.tags?.amenity ?? 'Food & Drink'}
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  )
}
