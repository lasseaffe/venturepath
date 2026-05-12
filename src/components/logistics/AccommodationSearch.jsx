import React, { useState, useEffect } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet'
import { searchAccommodation } from '../../utils/osmEngine.js'
import 'leaflet/dist/leaflet.css'

const TILES = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
const ATTR  = '© <a href="https://openstreetmap.org">OpenStreetMap</a> © <a href="https://carto.com">CARTO</a>'

function FitBounds({ pins }) {
  const map = useMap()
  useEffect(() => {
    const valid = pins.filter(p => p.lat && p.lon)
    if (!valid.length) return
    const lats = valid.map(p => p.lat)
    const lons = valid.map(p => p.lon)
    map.fitBounds(
      [[Math.min(...lats), Math.min(...lons)], [Math.max(...lats), Math.max(...lons)]],
      { padding: [32, 32], maxZoom: 16 }
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

export default function AccommodationSearch({ destination }) {
  const [results, setResults]       = useState([])
  const [loading, setLoading]       = useState(false)
  const [activeType, setActiveType] = useState('all')
  const [selectedId, setSelectedId] = useState(null)

  async function runSearch() {
    if (!destination) return
    setLoading(true)
    const city = destination.split(',')[0].trim()
    const data = await searchAccommodation(city, activeType)
    setResults(data)
    setSelectedId(null)
    setLoading(false)
  }

  useEffect(() => {
    if (results.length > 0) runSearch()
  }, [activeType])

  return (
    <div className="bg-[#0E1012] border border-[#1a1d20] rounded p-4 font-mono">
      <p className="text-xs text-[#D9C5B2] uppercase tracking-widest mb-3">
        Stays — {destination ?? '—'}
      </p>

      <div className="flex gap-2 mb-3 flex-wrap">
        {['all', 'hotel', 'hostel', 'apartment', 'camp_site'].map(t => (
          <button
            key={t}
            onClick={() => setActiveType(t)}
            className={`text-xs px-3 py-1 rounded border transition-colors ${
              activeType === t
                ? 'bg-[#E67E22] border-[#E67E22] text-black'
                : 'border-[#333] text-[#D9C5B2] hover:border-[#E67E22]'
            }`}
          >
            {t === 'camp_site' ? 'CAMPING' : t.toUpperCase()}
          </button>
        ))}
      </div>

      <button
        onClick={runSearch}
        disabled={loading}
        className="w-full mb-4 py-2 text-xs font-bold tracking-widest bg-[#E67E22] text-black rounded hover:bg-[#cf6d17] disabled:opacity-50 transition-colors"
      >
        {loading ? 'SEARCHING…' : 'SEARCH STAYS'}
      </button>

      {results.length > 0 && (
        <div className="flex gap-3" style={{ minHeight: 320 }}>
          <ul className="flex-1 space-y-2 overflow-y-auto pr-1" style={{ maxHeight: 400 }}>
            {results.map(place => (
              <li
                key={place.id}
                id={`stay-card-${place.id}`}
                onClick={() => setSelectedId(place.id)}
                className={`p-2 rounded cursor-pointer transition-colors ${
                  selectedId === place.id
                    ? 'border-l-2 border-[#E67E22] bg-[#111]'
                    : 'hover:bg-[#111] border-l-2 border-transparent'
                }`}
              >
                <p className="text-sm text-white truncate">{place.name}</p>
                <p className="text-xs text-[#D9C5B2] capitalize">
                  {place.tags?.tourism ?? 'Accommodation'}
                  {place.tags?.stars ? ` · ${'★'.repeat(parseInt(place.tags.stars))}` : ''}
                </p>
              </li>
            ))}
          </ul>

          <div className="rounded overflow-hidden border border-[#1a1d20]" style={{ width: '55%', minHeight: 320 }}>
            <MapContainer
              center={[results[0].lat, results[0].lon]}
              zoom={14}
              style={{ height: '100%', width: '100%', minHeight: 320 }}
              zoomControl={false}
            >
              <TileLayer url={TILES} attribution={ATTR} />
              <FitBounds pins={results} />
              <PanTo selectedId={selectedId} pins={results} />
              {results.map(place => (
                <CircleMarker
                  key={place.id}
                  center={[place.lat, place.lon]}
                  radius={selectedId === place.id ? 10 : 7}
                  pathOptions={{
                    color: selectedId === place.id ? '#fff' : '#E67E22',
                    fillColor: '#E67E22',
                    fillOpacity: 0.9,
                    weight: selectedId === place.id ? 2 : 1
                  }}
                  eventHandlers={{
                    click: () => {
                      setSelectedId(place.id)
                      document.getElementById(`stay-card-${place.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
                    }
                  }}
                >
                  <Popup className="font-mono text-xs">
                    <strong>{place.name}</strong><br />
                    {place.tags?.tourism ?? 'Accommodation'}
                  </Popup>
                </CircleMarker>
              ))}
            </MapContainer>
          </div>
        </div>
      )}

      {!loading && results.length === 0 && (
        <p className="text-xs text-[#555] text-center py-4">
          Search for stays above to see results on map.
        </p>
      )}
    </div>
  )
}
