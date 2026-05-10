import { useState } from 'react';
import { POI_CATEGORIES } from '../../utils/poiCategories';
import { useCategoryLayers } from '../../utils/useCategoryLayers';

export default function CategoryLayerPanel() {
  const { presets, toggle, savePreset, loadPreset, deletePreset, isActive } = useCategoryLayers();
  const [presetInput, setPresetInput] = useState('');
  const [showInput, setShowInput]     = useState(false);

  function handleSave() {
    if (presetInput.trim()) {
      savePreset(presetInput.trim());
      setPresetInput('');
      setShowInput(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 p-4 font-mono" style={{ background: '#0E1012' }}>
      {/* Section header */}
      <div className="text-xs tracking-widest" style={{ color: '#E67E22' }}>
        ── CATEGORY LAYERS ─────────────────────────
      </div>

      {/* Category toggle chips */}
      <div className="flex flex-wrap gap-2">
        {POI_CATEGORIES.map(cat => {
          const active = isActive(cat.id);
          return (
            <button
              key={cat.id}
              onClick={() => toggle(cat.id)}
              className="flex items-center gap-1 px-3 py-1 rounded-full text-xs tracking-wide transition-all"
              style={{
                border: `1px solid ${active ? cat.color : '#2a2e35'}`,
                background: active ? `${cat.color}18` : 'transparent',
                color: active ? cat.color : '#64748b',
              }}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Presets section */}
      <div className="text-xs tracking-widest" style={{ color: '#E67E22' }}>
        ── PRESETS ──────────────────────────────────
      </div>

      {presets.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {presets.map(p => (
            <div
              key={p.id}
              className="flex items-center gap-2 px-3 py-1 rounded-full text-xs"
              style={{ background: '#1e2328', color: '#D9C5B2', border: '1px solid #2a2e35' }}
            >
              <button onClick={() => loadPreset(p.id)} className="hover:underline">
                {p.name}
              </button>
              <button
                onClick={() => deletePreset(p.id)}
                className="opacity-50 hover:opacity-100"
                aria-label={`Delete preset ${p.name}`}
              >×</button>
            </div>
          ))}
        </div>
      )}

      {/* Save preset */}
      {showInput ? (
        <div className="flex gap-2">
          <input
            autoFocus
            value={presetInput}
            onChange={e => setPresetInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setShowInput(false); }}
            placeholder="Preset name…"
            className="flex-1 px-3 py-1 rounded text-xs bg-transparent border outline-none"
            style={{ borderColor: '#2a2e35', color: '#D9C5B2' }}
          />
          <button
            onClick={handleSave}
            className="px-3 py-1 rounded text-xs"
            style={{ background: '#E67E22', color: '#0E1012' }}
          >Save</button>
        </div>
      ) : (
        <button
          onClick={() => setShowInput(true)}
          className="text-xs self-start hover:underline"
          style={{ color: '#64748b' }}
        >+ Save current as preset…</button>
      )}
    </div>
  );
}
