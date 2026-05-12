import { useState, useRef, useEffect, useCallback } from 'react';
import { fetchAlerts, checkCascade } from '../../utils/disruptionEngine';
import {
  searchAirports,
  searchStations,
  searchTransportHubs,
  searchBusStops,
  searchTramStops,
} from '../../utils/geocodeEngine';
import { useTripStore } from '../../store/useTripStore.jsx';
import { showToast } from '../ui/Toast.jsx';

// ─── UUID helper ────────────────────────────────────────────────────────────
let _planId = 0;
const uuid = () => `plan-${Date.now()}-${++_planId}`;

// ─── Mode config ─────────────────────────────────────────────────────────────
const MODE_CONFIG = {
  flight: { label: 'FLIGHT', icon: '✈',  accent: '#E67E22', placeholder: 'Airport or city…'  },
  train:  { label: 'TRAIN',  icon: '🚂', accent: '#4a9eff', placeholder: 'Station…'           },
  bus:    { label: 'BUS',    icon: '🚌', accent: '#22a060', placeholder: 'Bus stop or city…'  },
  ferry:  { label: 'FERRY',  icon: '⛴',  accent: '#0ea5e9', placeholder: 'Port or terminal…'  },
  drive:  { label: 'DRIVE',  icon: '🚗', accent: '#D9C5B2', placeholder: 'City or address…'   },
};

const TOGGLE_PILLS = {
  flight: ['Direct', 'Eco', 'Flexible', 'Cabin bag'],
  train:  ['Rail pass', '1st class', 'Bike space'],
  bus:    ['Express only', 'Eco coach'],
  ferry:  ['Cabin class', 'Vehicle', 'Pet friendly'],
  drive:  ['Toll-free', 'EV only', 'Scenic route'],
};

// ─── Leg ID counter ──────────────────────────────────────────────────────────
let _legId = 0;
function newLeg(mode = 'flight', from = '', to = '') {
  return { id: `leg-${++_legId}`, mode, from, to };
}

// ─── useInterval ─────────────────────────────────────────────────────────────
function useInterval(callback, delayMs) {
  const savedCallback = useRef(callback);
  useEffect(() => { savedCallback.current = callback; }, [callback]);
  useEffect(() => {
    if (delayMs === null) return;
    const id = setInterval(() => savedCallback.current(), delayMs);
    return () => clearInterval(id);
  }, [delayMs]);
}

// ─── useTransportAutocomplete ─────────────────────────────────────────────────
function useTransportAutocomplete(query, mode) {
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching]     = useState(false);
  const timer = useRef(null);

  useEffect(() => {
    if (!query || !query.trim()) { setSuggestions([]); return; }
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setSearching(true);
      try {
        let results;
        if      (mode === 'flight') results = await searchAirports(query, 5);
        else if (mode === 'train')  results = await searchStations(query, 5);
        else if (mode === 'bus')    results = await searchBusStops(query, 5);
        else                        results = await searchTransportHubs(query, 6);
        setSuggestions(results);
      } catch {
        setSuggestions([]);
      }
      setSearching(false);
    }, 350);
    return () => clearTimeout(timer.current);
  }, [query, mode]);

  return { suggestions, searching, clear: () => setSuggestions([]) };
}

// ─── buildMockResults ────────────────────────────────────────────────────────
function buildMockResults(from, to, mode) {
  const f = from || 'Origin';
  const t = to   || 'Destination';
  if (mode === 'flight') return [
    { id: 'r1', carrier: 'Lufthansa',  route: `${f} → ${t}`, price: 542, duration: '7h 45m', co2: 120, departs: '08:30', arrives: '16:15', baggage: '23kg incl.'  },
    { id: 'r2', carrier: 'DirectJet',  route: `${f} → ${t}`, price: 890, duration: '2h 15m', co2: 210, departs: '11:00', arrives: '13:15', baggage: 'Cabin only'  },
    { id: 'r3', carrier: 'GreenFly',   route: `${f} → ${t}`, price: 620, duration: '4h 45m', co2: 85,  departs: '14:30', arrives: '19:15', baggage: '23kg incl.'  },
  ];
  if (mode === 'train') return [
    { id: 'r1', carrier: 'Deutsche Bahn', route: `${f} → ${t}`, price: 89,  duration: '4h 02m', co2: 12, departs: '07:14', arrives: '11:16', baggage: 'Unlimited' },
    { id: 'r2', carrier: 'Eurostar',      route: `${f} → ${t}`, price: 55,  duration: '6h 30m', co2: 8,  departs: '09:30', arrives: '16:00', baggage: 'Unlimited' },
    { id: 'r3', carrier: 'Thalys',        route: `${f} → ${t}`, price: 120, duration: '3h 15m', co2: 10, departs: '13:45', arrives: '17:00', baggage: 'Unlimited' },
  ];
  return [
    { id: 'r1', carrier: 'Regional', route: `${f} → ${t}`, price: 32, duration: '1h 30m', co2: 4, departs: '09:00', arrives: '10:30', baggage: 'Hand luggage' },
    { id: 'r2', carrier: 'Express',  route: `${f} → ${t}`, price: 55, duration: '0h 45m', co2: 6, departs: '10:15', arrives: '11:00', baggage: 'Hand luggage' },
  ];
}

// ─── FilterRow ────────────────────────────────────────────────────────────────
function FilterRow({ mode, filters, onFilter }) {
  const togglePills = TOGGLE_PILLS[mode] ?? [];
  return (
    <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2, alignItems: 'center', flexWrap: 'nowrap' }}>
      {[
        { key: 'leaveBy',  label: 'Leave'                        },
        { key: 'arriveBy', label: 'Arrive'                       },
        { key: 'maxPrice', label: 'Price'                        },
        { key: 'sortBy',   label: filters.sortBy || 'Cheapest'   },
      ].map(p => (
        <button
          key={p.key}
          type="button"
          style={{ flexShrink: 0, padding: '4px 8px', borderRadius: 4, border: '1px solid #2a2f36', background: 'transparent', color: '#8A8680', fontSize: 9, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.06em', cursor: 'pointer', whiteSpace: 'nowrap' }}
        >
          {p.label} ▾
        </button>
      ))}

      <div style={{ width: 1, height: 20, background: '#2a2f36', flexShrink: 0 }} />

      {togglePills.map(pill => {
        const active = filters.toggles?.includes(pill);
        return (
          <button
            key={pill}
            type="button"
            onClick={() =>
              onFilter({
                ...filters,
                toggles: active
                  ? (filters.toggles || []).filter(t => t !== pill)
                  : [...(filters.toggles || []), pill],
              })
            }
            style={{
              flexShrink: 0, padding: '4px 8px', borderRadius: 4,
              border: `1px solid ${active ? '#E67E22' : '#2a2f36'}`,
              background: active ? '#E67E22' : 'transparent',
              color: active ? '#0E1012' : '#8A8680',
              fontSize: 9, fontFamily: "'JetBrains Mono', monospace",
              letterSpacing: '0.06em', cursor: 'pointer', whiteSpace: 'nowrap',
              fontWeight: active ? 'bold' : 'normal',
            }}
          >
            {pill}
          </button>
        );
      })}
    </div>
  );
}

// ─── ResultRow ────────────────────────────────────────────────────────────────
function ResultRow({ result, mode, selected, onSelect, onAddToPlan, accent }) {
  return (
    <div
      onClick={() => onSelect(result.id)}
      style={{
        background: selected ? '#E67E2214' : '#0E1012',
        border: `1px solid ${selected ? '#E67E2260' : '#1e2328'}`,
        borderRadius: 6, padding: '10px 12px',
        cursor: 'pointer', marginBottom: 6,
        transition: 'all 0.15s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 14, color: selected ? '#E67E22' : '#3a3a3a', flexShrink: 0 }}>
          {selected ? '◉' : '○'}
        </span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: '#8A8680', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.06em' }}>{result.carrier}</div>
          <div style={{ fontSize: 13, color: '#fff', fontFamily: "'JetBrains Mono', monospace", fontWeight: 'bold', marginTop: 2 }}>{result.route}</div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 16, color: accent, fontFamily: "'JetBrains Mono', monospace", fontWeight: 'bold' }}>${result.price}</div>
          <div style={{ fontSize: 9, color: '#8A8680', fontFamily: "'JetBrains Mono', monospace" }}>{result.duration}</div>
        </div>
      </div>

      {selected && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #2a2f36' }}>
          <div style={{ display: 'flex', gap: 16, marginBottom: 10, flexWrap: 'wrap' }}>
            {[
              ['DEPARTS', result.departs || '08:30'],
              ['ARRIVES', result.arrives || '16:15'],
              ['CO₂',     `${result.co2}kg`],
              ['BAGGAGE', result.baggage || '23kg incl.'],
            ].map(([k, v]) => (
              <div key={k}>
                <div style={{ fontSize: 8, color: '#555', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.1em' }}>{k}</div>
                <div style={{ fontSize: 11, color: '#ccc', fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={e => { e.stopPropagation(); onAddToPlan(result); }}
              style={{ padding: '8px 16px', background: '#E67E22', color: '#0E1012', border: 'none', borderRadius: 4, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 'bold', letterSpacing: '0.1em', cursor: 'pointer' }}
            >
              → ADD TO PLAN
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── AutocompleteField (keyboard-navigable, TO-style) ─────────────────────────
function AutocompleteField({ label, value, onChange, ac, mode }) {
  const [highlighted, setHighlighted] = useState(-1);
  const inputRef = useRef(null);

  function handleKeyDown(e) {
    if (!ac.suggestions.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlighted(h => Math.min(h + 1, ac.suggestions.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setHighlighted(h => Math.max(h - 1, 0)); }
    if (e.key === 'Enter' && highlighted >= 0) {
      e.preventDefault();
      onChange(ac.suggestions[highlighted].name);
      ac.clear();
      setHighlighted(-1);
    }
    if (e.key === 'Escape') { ac.clear(); setHighlighted(-1); }
  }

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ fontSize: 8, color: '#555', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.1em', marginBottom: 4 }}>{label}</div>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={e => { onChange(e.target.value); setHighlighted(-1); }}
        onBlur={() => { setTimeout(() => { ac.clear(); setHighlighted(-1); }, 150); }}
        onKeyDown={handleKeyDown}
        placeholder={MODE_CONFIG[mode]?.placeholder ?? 'Destination…'}
        style={{ width: '100%', background: '#0E1012', border: '1px solid #2a2f36', borderRadius: 4, padding: '8px 10px', color: '#fff', fontFamily: "'JetBrains Mono', monospace", fontSize: 12, outline: 'none', boxSizing: 'border-box' }}
      />
      {ac.searching && (
        <span style={{ position: 'absolute', right: 10, top: 30, fontSize: 9, color: '#555', fontFamily: "'JetBrains Mono', monospace" }}>…</span>
      )}
      {ac.suggestions.length > 0 && (
        <ul style={{ position: 'absolute', zIndex: 20, width: '100%', marginTop: 2, background: '#141820', border: '1px solid #2a2f36', borderRadius: 4, maxHeight: 160, overflowY: 'auto', padding: 0, listStyle: 'none' }}>
          {ac.suggestions.map((s, i) => (
            <li key={s.id}>
              <button
                type="button"
                onMouseDown={() => { onChange(s.name); ac.clear(); setHighlighted(-1); }}
                style={{
                  width: '100%', textAlign: 'left', padding: '8px 12px',
                  background: i === highlighted ? 'rgba(255,255,255,0.07)' : 'none',
                  border: 'none', borderBottom: '1px solid rgba(255,255,255,0.04)',
                  color: '#fff', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, cursor: 'pointer',
                }}
              >
                {s.name}
                {s.address !== s.name && (
                  <span style={{ display: 'block', fontSize: 9, color: '#555' }}>{s.address}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── LegSection ───────────────────────────────────────────────────────────────
function LegSection({ leg, index, mode, onAddToPlan, onRemove }) {
  const [to,            setTo]           = useState(leg.to   || '');
  const [from,          setFrom]         = useState(leg.from || '');
  const [usingLocation, setUsingLocation] = useState(!leg.from);
  const [filters,       setFilters]      = useState({ toggles: [] });
  const [selectedResult, setSelectedResult] = useState(null);
  const [searched,      setSearched]     = useState(false);
  const [fromHighlighted, setFromHighlighted] = useState(-1);

  const toAC   = useTransportAutocomplete(to,   mode);
  const fromAC = useTransportAutocomplete(usingLocation ? '' : from, mode);

  const accent  = MODE_CONFIG[mode]?.accent ?? '#E67E22';
  const results = searched ? buildMockResults(from, to, mode) : [];

  function handleSearch(e) {
    e.preventDefault();
    setSearched(true);
    setSelectedResult(null);
  }

  function handleAddToPlan(result) {
    onAddToPlan(result, { from, to, fromCoords: leg.fromCoords ?? null, toCoords: leg.toCoords ?? null });
  }

  return (
    <div style={{
      background: '#111318',
      border: '1px solid #2a2f36',
      borderLeft: `2px solid ${accent}`,
      borderRadius: 6,
      padding: 14,
      marginBottom: 10,
    }}>
      {/* Leg header */}
      <div style={{
        fontSize: 8, color: '#555', fontFamily: "'JetBrains Mono', monospace",
        letterSpacing: '0.1em', marginBottom: 10,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span>LEG {index + 1}</span>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 10 }}
          >
            ✕
          </button>
        )}
      </div>

      <form onSubmit={handleSearch} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

        {/* TO — destination first */}
        <AutocompleteField
          label="TO — DESTINATION"
          value={to}
          onChange={v => { setTo(v); setSearched(false); }}
          ac={toAC}
          mode={mode}
        />

        {/* FROM — origin, GPS-aware */}
        <div style={{ position: 'relative' }}>
          <div style={{
            fontSize: 8, color: '#555', fontFamily: "'JetBrains Mono', monospace",
            letterSpacing: '0.1em', marginBottom: 4,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            FROM — ORIGIN
            {usingLocation && (
              <span style={{
                fontSize: 7, color: '#4ade80', background: '#052e16',
                border: '1px solid #166534', borderRadius: 2, padding: '1px 4px',
              }}>
                ● USING YOUR LOCATION
              </span>
            )}
          </div>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input
              type="text"
              value={usingLocation ? '' : from}
              placeholder={usingLocation ? '↻ nearest hub' : 'Origin…'}
              onChange={e => {
                setFrom(e.target.value);
                setUsingLocation(false);
                setSearched(false);
                setFromHighlighted(-1);
              }}
              onFocus={() => { if (usingLocation) setUsingLocation(false); }}
              onBlur={() => { setTimeout(() => { fromAC.clear(); setFromHighlighted(-1); }, 150); }}
              onKeyDown={e => {
                if (!fromAC.suggestions.length) return;
                if (e.key === 'ArrowDown') { e.preventDefault(); setFromHighlighted(h => Math.min(h + 1, fromAC.suggestions.length - 1)); }
                if (e.key === 'ArrowUp')   { e.preventDefault(); setFromHighlighted(h => Math.max(h - 1, 0)); }
                if (e.key === 'Enter' && fromHighlighted >= 0) { e.preventDefault(); setFrom(fromAC.suggestions[fromHighlighted].name); fromAC.clear(); setFromHighlighted(-1); setUsingLocation(false); }
                if (e.key === 'Escape') { fromAC.clear(); setFromHighlighted(-1); }
              }}
              style={{
                width: '100%', background: '#0E1012', border: '1px solid #2a2f36',
                borderRadius: 4, padding: '8px 36px 8px 10px',
                color: '#fff', fontFamily: "'JetBrains Mono', monospace", fontSize: 12,
                outline: 'none', boxSizing: 'border-box',
              }}
            />
            <button
              type="button"
              onClick={() => { setFrom(''); setUsingLocation(true); }}
              title="Use my location"
              style={{
                position: 'absolute', right: 8,
                background: 'none', border: 'none', color: '#555',
                cursor: 'pointer', fontSize: 10, fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              ↻
            </button>
          </div>

          {/* FROM autocomplete dropdown */}
          {fromAC.suggestions.length > 0 && !usingLocation && (
            <ul style={{
              position: 'absolute', zIndex: 20, width: '100%', marginTop: 2,
              background: '#141820', border: '1px solid #2a2f36',
              borderRadius: 4, maxHeight: 160, overflowY: 'auto',
              padding: 0, listStyle: 'none',
            }}>
              {fromAC.suggestions.map((s, i) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onMouseDown={() => {
                      setFrom(s.name);
                      fromAC.clear();
                      setUsingLocation(false);
                      setFromHighlighted(-1);
                    }}
                    style={{
                      width: '100%', textAlign: 'left', padding: '8px 12px',
                      background: i === fromHighlighted ? 'rgba(255,255,255,0.07)' : 'none',
                      border: 'none',
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                      color: '#fff', fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 11, cursor: 'pointer',
                    }}
                  >
                    {s.name}
                    {s.address !== s.name && (
                      <span style={{ display: 'block', fontSize: 9, color: '#555' }}>{s.address}</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Filter row */}
        <FilterRow mode={mode} filters={filters} onFilter={setFilters} />

        <button
          type="submit"
          style={{
            width: '100%', padding: '8px',
            background: 'transparent',
            border: `1px solid ${accent}80`,
            color: accent,
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10, letterSpacing: '0.1em',
            borderRadius: 4, cursor: 'pointer',
          }}
        >
          SEARCH {MODE_CONFIG[mode]?.label ?? 'OPTIONS'}
        </button>
      </form>

      {/* Results */}
      {searched && results.length > 0 && (
        <div style={{ marginTop: 10 }}>
          {results.map(r => (
            <ResultRow
              key={r.id}
              result={r}
              mode={mode}
              accent={accent}
              selected={selectedResult === r.id}
              onSelect={id => setSelectedResult(prev => prev === id ? null : id)}
              onAddToPlan={handleAddToPlan}
            />
          ))}
        </div>
      )}

      {/* Empty search state */}
      {!searched && (
        <div style={{ paddingTop: 20, paddingBottom: 20, textAlign: 'center' }}>
          <div style={{ fontSize: 20, color: `${accent}66`, marginBottom: 6 }}>
            {MODE_CONFIG[mode]?.icon ?? '?'}
          </div>
          <div style={{ fontSize: 9, color: '#555', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.1em' }}>
            ENTER DESTINATION TO SEARCH
          </div>
        </div>
      )}
    </div>
  );
}

// ─── PublicTransport (top-level) ──────────────────────────────────────────────
export default function PublicTransport({ destination = '' }) {
  const [mode, setMode]   = useState('flight');
  const [legs, setLegs]   = useState([newLeg('flight', '', destination)]);
  const [checking, setChecking] = useState(false);

  const { addLeg: storeAddLeg } = useTripStore();

  function addLegRow() {
    const last = legs[legs.length - 1];
    setLegs(prev => [...prev, newLeg(mode, last?.to ?? '', '')]);
  }

  function removeLegRow(id) {
    setLegs(prev => prev.length > 1 ? prev.filter(l => l.id !== id) : prev);
  }

  const runDisruptionCheck = useCallback(async () => {
    const confirmed = legs.filter(l => l.selectedOption?.tripId);
    if (confirmed.length === 0) return;
    setChecking(true);
    const updates = await Promise.all(
      confirmed.map(async l => ({ id: l.id, disruption: await fetchAlerts(l) }))
    );
    setLegs(prev => {
      const withDisruption = prev.map(l => {
        const u = updates.find(x => x.id === l.id);
        return u ? { ...l, disruption: u.disruption } : l;
      });
      const cascadeResults = checkCascade(withDisruption);
      return withDisruption.map(l => ({
        ...l,
        cascadeRisk: cascadeResults.find(r => r.legId === l.id) ?? null,
      }));
    });
    setChecking(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useInterval(runDisruptionCheck, 90_000);

  function handleAddToPlan(result, legMeta) {
    storeAddLeg({
      id:       uuid(),
      from:     { label: legMeta.from || 'Origin',      coords: legMeta.fromCoords ?? null },
      to:       { label: legMeta.to   || 'Destination', coords: legMeta.toCoords   ?? null },
      mode,
      departs:  result.departs  ?? new Date().toISOString(),
      arrives:  result.arrives  ?? new Date().toISOString(),
      price:    result.price,
      currency: 'USD',
      co2kg:    result.co2,
      carrier:  result.carrier,
      status:   'pending',
    });
    showToast({
      message:  `✓ ${result.carrier} ${legMeta.from || 'Origin'}→${legMeta.to || 'Destination'} added to plan`,
      action:   'View on map →',
      onAction: () => {},
      duration: 3000,
    });
  }

  const accent = MODE_CONFIG[mode]?.accent ?? '#E67E22';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Section heading + check route */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 8, color: '#555', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.15em' }}>
          TRANSPORT PLANNER
        </span>
        <button
          type="button"
          onClick={runDisruptionCheck}
          disabled={checking}
          style={{
            padding: '4px 10px', borderRadius: 4,
            border: '1px solid #2a2f36',
            background: 'transparent',
            color: '#8A8680',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 8, letterSpacing: '0.1em',
            cursor: checking ? 'not-allowed' : 'pointer',
            opacity: checking ? 0.4 : 1,
          }}
        >
          {checking ? '⟳ CHECKING…' : '⚡ CHECK ROUTE'}
        </button>
      </div>

      {/* Mode selector */}
      <div style={{ display: 'flex', border: '1px solid #2a2f36', borderRadius: 6, overflow: 'hidden' }}>
        {Object.entries(MODE_CONFIG).map(([m, c]) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            style={{
              flex: 1, padding: '8px 4px',
              border: 'none',
              background: mode === m ? c.accent : 'transparent',
              color: mode === m ? '#0E1012' : '#8A8680',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 9, letterSpacing: '0.06em',
              fontWeight: mode === m ? 'bold' : 'normal',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {c.icon} {c.label}
          </button>
        ))}
      </div>

      {/* Leg sections */}
      {legs.map((leg, i) => (
        <LegSection
          key={leg.id}
          leg={leg}
          index={i}
          mode={mode}
          onRemove={legs.length > 1 ? () => removeLegRow(leg.id) : null}
          onAddToPlan={handleAddToPlan}
        />
      ))}

      {/* Footer buttons */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="button"
          onClick={addLegRow}
          style={{
            flex: 1, padding: '8px',
            background: 'transparent',
            border: '1px dashed #2a2f36',
            color: '#555',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 9, letterSpacing: '0.1em',
            borderRadius: 4, cursor: 'pointer',
            transition: 'border-color 0.15s, color 0.15s',
          }}
        >
          + ADD LEG
        </button>
      </div>

      {/* Route summary */}
      {legs.some(l => l.from || l.to) && (
        <div style={{ background: '#0d0f12', border: '1px solid #1a1f24', borderRadius: 8, padding: '12px 16px' }}>
          <div style={{ fontSize: 8, color: '#555', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.15em', marginBottom: 8 }}>
            ROUTE SUMMARY
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center', fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }}>
            {legs.map((leg, i) => {
              const mc = MODE_CONFIG[leg.mode]?.accent ?? '#2a2f36';
              const modeIcon = MODE_CONFIG[leg.mode]?.icon ?? '?';
              const nextLeg  = legs[i + 1];
              const buffer   = (leg.selectedOption?.arrival && nextLeg?.selectedOption?.departure)
                ? Math.round((new Date(nextLeg.selectedOption.departure) - new Date(leg.selectedOption.arrival)) / 60000)
                : null;
              const cr = nextLeg?.cascadeRisk;
              return (
                <span key={leg.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ color: '#ffffff' }}>{leg.from || '—'}</span>
                  <span style={{ color: `${mc}99` }}>──{modeIcon}──</span>
                  <span style={{ color: '#ffffff' }}>{leg.to || '—'}</span>
                  {buffer !== null && (
                    <span style={{
                      fontSize: 8, fontFamily: "'JetBrains Mono', monospace",
                      padding: '0 4px', borderRadius: 2,
                      color: cr?.severity === 'red' ? '#f87171' : cr?.severity === 'amber' ? '#fbbf24' : '#555',
                    }}>
                      {cr?.severity === 'red' ? 'MISSED ✕' : `+${buffer}m${cr ? ' ⚠' : ''}`}
                    </span>
                  )}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
