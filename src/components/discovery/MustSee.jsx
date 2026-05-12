import React, { useState } from 'react'

const CATEGORIES = ['ALL', 'HISTORIC', 'CULTURAL', 'NATURAL', 'RELIGION', 'VIEWPOINTS']
const CAT_MAP = {
  ALL: 'all', HISTORIC: 'historic', CULTURAL: 'cultural',
  NATURAL: 'natural', RELIGION: 'religion', VIEWPOINTS: 'viewpoints'
}

export default function MustSee({ attractions = [], loading = false, onCategoryChange, selectedId, onSelect }) {
  const [activeTab, setActiveTab] = useState('ALL')

  function handleTab(tab) {
    setActiveTab(tab)
    onCategoryChange?.(CAT_MAP[tab])
  }

  return (
    <div className="bg-[#0E1012] border border-[#1a1d20] rounded p-4 font-mono">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-[#D9C5B2] uppercase tracking-widest">Must-See</p>
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
      {!loading && attractions.length === 0 && (
        <p className="text-xs text-[#555]">No attractions found for this destination.</p>
      )}
      <ul className="space-y-2 max-h-64 overflow-y-auto">
        {attractions.map(place => (
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
            <div className="w-8 h-8 bg-[#1a1d20] rounded flex items-center justify-center text-sm">🏛️</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white truncate">{place.name}</p>
              <p className="text-xs text-[#D9C5B2]">
                {place.tags?.historic ?? place.tags?.tourism ?? place.tags?.natural ?? 'Attraction'}
                {place.tags?.stars ? ` · ${'★'.repeat(parseInt(place.tags.stars))}` : ''}
              </p>
            </div>
            <button
              onClick={e => e.stopPropagation()}
              className="text-xs text-[#E67E22] border border-[#E67E22] px-2 py-0.5 rounded hover:bg-[#E67E22] hover:text-black transition-colors shrink-0"
            >
              + ADD
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
