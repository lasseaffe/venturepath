import { useState, useRef } from 'react';

const FSQ_KEY = import.meta.env.VITE_FSQ_API_KEY;

async function searchFoursquare(query, homebaseCoords) {
  const [lat, lng] = homebaseCoords;
  const url = `https://api.foursquare.com/v3/places/search?query=${encodeURIComponent(query)}&ll=${lat},${lng}&radius=10000&limit=8&fields=fsq_id,name,categories,geocodes,distance`;
  const res = await fetch(url, { headers: { Authorization: FSQ_KEY } });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.results ?? []).map(r => ({
    id: r.fsq_id,
    name: r.name,
    coords: [r.geocodes.main.latitude, r.geocodes.main.longitude],
    category: r.categories?.[0]?.name?.toLowerCase().split(' ')[0] ?? 'place',
    distanceM: r.distance,
  }));
}

export function AddStopFlow({ dayLoopId, homebaseCoords, onAdd, onClose, anchorCoords = null }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);

  function handleInput(e) {
    const val = e.target.value;
    setQuery(val);
    setSelected(null);
    clearTimeout(debounceRef.current);
    if (!val.trim()) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      const coords = anchorCoords ?? homebaseCoords;
      const res = await searchFoursquare(val, coords);
      setResults(res);
      setLoading(false);
    }, 350);
  }

  function confirm() {
    if (!selected) return;
    onAdd(selected);
  }

  return (
    <div style={{ background: 'var(--surface-raised)', border: '1px solid rgba(230,126,34,0.3)', borderRadius: 2, padding: 12 }}>
      <input
        placeholder="Search places..."
        value={query}
        onChange={handleInput}
        autoFocus
        style={{
          width: '100%', background: 'var(--surface)', border: '1px solid rgba(230,126,34,0.3)',
          borderRadius: 2, padding: '6px 10px', fontFamily: 'var(--font-mono)', fontSize: '0.65rem',
          color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box',
        }}
      />

      {loading && (
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: 'var(--text-muted)', marginTop: 6 }}>Searching...</p>
      )}

      {results.length > 0 && (
        <ul style={{ margin: '6px 0 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 3 }}>
          {results.map(r => (
            <li key={r.id}>
              <button
                onClick={() => setSelected(r)}
                style={{
                  width: '100%', textAlign: 'left', background: selected?.id === r.id ? 'rgba(230,126,34,0.08)' : 'var(--surface)',
                  border: selected?.id === r.id ? '1px solid rgba(230,126,34,0.4)' : '1px solid rgba(242,237,232,0.07)',
                  borderRadius: 2, padding: '5px 9px', cursor: 'pointer',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}
              >
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--text-primary)' }}>{r.name}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.52rem', color: 'var(--text-muted)' }}>
                  {r.distanceM ? `${(r.distanceM / 1000).toFixed(1)} km` : ''}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {selected && (
        <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
          <button
            onClick={confirm}
            style={{ background: 'var(--accent)', color: '#0A0B0C', fontFamily: 'var(--font-mono)', fontSize: '0.6rem', fontWeight: 700, padding: '5px 12px', borderRadius: 2, border: 'none', cursor: 'pointer' }}
          >
            + Add to Day
          </button>
          <button
            onClick={onClose}
            style={{ background: 'transparent', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '0.6rem', padding: '5px 10px', border: '1px solid rgba(242,237,232,0.12)', borderRadius: 2, cursor: 'pointer' }}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
