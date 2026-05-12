import React, { useState } from 'react'

const CATEGORIES = ['ALL', 'RESTAURANTS', 'CAFES', 'BARS', 'MARKETS', 'STREET FOOD']
const CAT_MAP = {
  ALL: 'all', RESTAURANTS: 'restaurants', CAFES: 'cafes',
  BARS: 'bars', MARKETS: 'markets', 'STREET FOOD': 'street_food'
}
const EMOJI_MAP = {
  restaurant: '🍽️', cafe: '☕', bar: '🍻',
  marketplace: '🛒', fast_food: '🌮'
}

export default function LocalFlavor({ food = [], loading = false, onCategoryChange, selectedId, onSelect }) {
  const [activeTab, setActiveTab] = useState('ALL')

  function handleTab(tab) {
    setActiveTab(tab)
    onCategoryChange?.(CAT_MAP[tab])
  }

  return (
    <div className="bg-[#0E1012] border border-[#1a1d20] rounded p-4 font-mono">
      <div className="mb-3">
        <p className="text-xs text-[#D9C5B2] uppercase tracking-widest">Local Flavor</p>
      </div>

      <div className="flex gap-2 flex-wrap mb-3">
        {CATEGORIES.map(c => (
          <button
            key={c}
            onClick={() => handleTab(c)}
            className={`text-xs px-2 py-1 rounded border transition-colors ${
              activeTab === c
                ? 'bg-[#E67E22] border-[#E67E22] text-black'
                : 'border-[#333] text-[#D9C5B2] hover:border-[#E67E22]'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {loading && <p className="text-xs text-[#D9C5B2] animate-pulse">Scanning OpenStreetMap…</p>}
      {!loading && food.length === 0 && (
        <p className="text-xs text-[#555]">No dining spots found for this destination.</p>
      )}
      <ul className="space-y-2 max-h-64 overflow-y-auto">
        {food.map(place => {
          const amenity = place.tags?.amenity ?? 'restaurant'
          return (
            <li
              key={place.id}
              id={`discovery-card-${place.id}`}
              onClick={() => onSelect?.(place.id)}
              className={`flex items-center gap-3 p-2 rounded cursor-pointer transition-colors ${
                selectedId === place.id
                  ? 'border-l-2 border-[#E67E22] bg-[#111]'
                  : 'hover:bg-[#111] border-l-2 border-transparent'
              }`}
            >
              <div className="w-8 h-8 bg-[#1a1d20] rounded flex items-center justify-center text-sm">
                {EMOJI_MAP[amenity] ?? '🍽️'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{place.name}</p>
                <p className="text-xs text-[#E67E22] capitalize">{amenity.replace('_', ' ')}</p>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
