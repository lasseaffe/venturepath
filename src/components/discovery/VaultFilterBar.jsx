const DIFFICULTIES = ['Easy', 'Moderate', 'Hard', 'Expert'];
const CLIMATES = ['alpine', 'tropical', 'subarctic', 'desert', 'temperate', 'arid'];
const TABS = ['trending', 'curated', 'community'];

function Chip({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-[10px] font-mono border transition-colors ${
        active
          ? 'bg-[#E67E22] border-[#E67E22] text-white'
          : 'border-white/20 text-slate-400 hover:border-[#E67E22]/50'
      }`}
    >
      {label}
    </button>
  );
}

export default function VaultFilterBar({ filters, onChange }) {
  function toggle(key, value) {
    const current = filters[key];
    onChange({
      ...filters,
      [key]: current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value],
    });
  }

  return (
    <div className="space-y-3 mb-5">
      <div className="flex gap-2">
        {TABS.map(tab => (
          <Chip
            key={tab}
            label={tab.toUpperCase()}
            active={filters.tab === tab}
            onClick={() => onChange({ ...filters, tab })}
          />
        ))}
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-[10px] font-mono text-slate-500 w-16">DIFF</span>
        {DIFFICULTIES.map(d => (
          <Chip key={d} label={d} active={filters.difficulty.includes(d)} onClick={() => toggle('difficulty', d)} />
        ))}
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-[10px] font-mono text-slate-500 w-16">CLIMATE</span>
        {CLIMATES.map(c => (
          <Chip key={c} label={c} active={filters.climate.includes(c)} onClick={() => toggle('climate', c)} />
        ))}
      </div>

      <div className="flex gap-2 items-center">
        <span className="text-[10px] font-mono text-slate-500 w-16">PRICE</span>
        <Chip label="FREE" active={filters.freeOnly} onClick={() => onChange({ ...filters, freeOnly: !filters.freeOnly, paidOnly: false })} />
        <Chip label="PAID" active={filters.paidOnly} onClick={() => onChange({ ...filters, paidOnly: !filters.paidOnly, freeOnly: false })} />
      </div>
    </div>
  );
}
