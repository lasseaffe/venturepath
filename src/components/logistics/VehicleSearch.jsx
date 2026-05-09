import { useState, useEffect } from 'react';
import { calculateLegLogistics, formatExpeditionCost } from '../../utils/logisticsEngine';

const VEHICLE_DB = [
  { id: 1, name: 'Tesla Model 3',         type: 'EV',  efficiency: 25, range: 350 },
  { id: 2, name: 'Tesla Model Y',          type: 'EV',  efficiency: 28, range: 330 },
  { id: 3, name: 'Ford F-150 Lightning',   type: 'EV',  efficiency: 45, range: 320 },
  { id: 4, name: 'Ford F-150 (Gas)',        type: 'Gas', efficiency: 20, range: 500 },
  { id: 5, name: 'VW California (Van)',     type: 'Gas', efficiency: 28, range: 450 },
  { id: 6, name: 'Mercedes Sprinter',      type: 'Gas', efficiency: 18, range: 400 },
  { id: 7, name: 'Rivian R1T',             type: 'EV',  efficiency: 48, range: 314 },
];

export default function VehicleSearch({ onSelectVehicle, distanceKm = 320 }) {
  const [query,       setQuery]       = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [selected,    setSelected]    = useState(null);

  useEffect(() => {
    const t = setTimeout(() => {
      if (query.length < 2) { setSuggestions([]); return; }
      setSuggestions(
        VEHICLE_DB.filter(v => v.name.toLowerCase().includes(query.toLowerCase()))
      );
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  function pick(vehicle) {
    setSelected(vehicle);
    setQuery('');
    setSuggestions([]);
    onSelectVehicle?.(vehicle);
  }

  const logistics = selected
    ? calculateLegLogistics(distanceKm, selected, selected.type === 'EV' ? 0.14 : 3.80)
    : null;

  return (
    <div className="tactical-panel p-5 space-y-4">
      <h2 className="label-tag">Vehicle Scout</h2>

      {/* Search */}
      <div className="relative">
        <div className="flex items-center bg-[#0E1012] border border-[#2a2f36] rounded focus-within:border-[#E67E22]/60 transition-colors">
          <span className="pl-3 text-slate-600 text-sm">⌕</span>
          <input
            type="text"
            placeholder="Search vehicle model…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="flex-1 bg-transparent px-2 py-2 text-xs text-white font-mono placeholder-slate-700 focus:outline-none"
          />
        </div>

        {suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-[#111316] border border-[#2a2f36] rounded z-20 overflow-hidden shadow-xl">
            {suggestions.map(v => (
              <button
                key={v.id}
                onClick={() => pick(v)}
                className="w-full px-3 py-2.5 text-left flex justify-between items-center hover:bg-[#1a1e24] border-b border-[#1e2328] last:border-0 transition-colors"
              >
                <div>
                  <div className="text-xs text-white font-mono">{v.name}</div>
                  <div className="text-[9px] text-slate-600 font-mono tracking-widest mt-0.5">
                    {v.type} · {v.range}mi range
                  </div>
                </div>
                <span className="text-[#E67E22] text-[10px] font-mono">SELECT →</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selected vehicle logistics */}
      {selected && logistics && (
        <div className="bg-[#0E1012] rounded border border-[#1e2328] p-3 space-y-2">
          <div className="text-[10px] font-mono text-[#E67E22] tracking-widest">{selected.name}</div>
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div>
              <div className="text-slate-600 text-[9px] tracking-widest">FUEL COST</div>
              <div className="text-white mt-0.5">{formatExpeditionCost(logistics.cost)}</div>
            </div>
            <div>
              <div className="text-slate-600 text-[9px] tracking-widest">QUANTITY</div>
              <div className="text-white mt-0.5">{logistics.quantity} {logistics.units}</div>
            </div>
            <div>
              <div className="text-slate-600 text-[9px] tracking-widest">DISTANCE</div>
              <div className="text-white mt-0.5">{logistics.miles} mi</div>
            </div>
            <div>
              <div className="text-slate-600 text-[9px] tracking-widest">REFUEL</div>
              <div className={`mt-0.5 ${logistics.needsRefuel ? 'text-yellow-400' : 'text-green-400'}`}>
                {logistics.needsRefuel ? 'Required' : 'Not needed'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
