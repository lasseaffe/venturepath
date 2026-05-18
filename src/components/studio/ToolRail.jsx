import { Pencil, Move, MapPin, Undo2, Redo2, Download } from 'lucide-react';

const TOOLS = [
  { id: 'draw',     label: 'Compose',    Icon: Pencil  },
  { id: 'edit',     label: 'Re-route',   Icon: Move    },
  { id: 'waypoint', label: 'Anchor',     Icon: MapPin  },
];

export default function ToolRail({ tool, onTool, onUndo, onRedo, canUndo, canRedo, onExport, profile, onProfile }) {
  return (
    <aside className="absolute left-4 top-4 z-[1000] flex flex-col gap-2 rounded-md border border-[#3a2f25] bg-[#0E1012]/95 p-2 font-[JetBrains_Mono]">
      {TOOLS.map(({ id, label, Icon }) => (
        <button
          key={id}
          onClick={() => onTool(id)}
          aria-pressed={tool === id}
          className={`flex items-center gap-2 rounded px-3 py-2 text-xs uppercase tracking-wider ${
            tool === id ? 'bg-[#E67E22] text-[#0E1012]' : 'text-[#D9C5B2] hover:bg-[#1a1410]'
          }`}
          title={`${label} tool`}
        >
          <Icon size={14} />
          {label}
        </button>
      ))}

      <div className="my-1 h-px bg-[#3a2f25]" />

      <label className="text-[10px] uppercase tracking-wider text-[#D9C5B2]/60">Mode</label>
      <select
        value={profile}
        onChange={(e) => onProfile(e.target.value)}
        className="rounded bg-[#1a1410] px-2 py-1 text-xs text-[#D9C5B2]"
      >
        <option value="foot">Foot</option>
        <option value="cycling">Cycling</option>
        <option value="mtb">MTB</option>
        <option value="car">Car</option>
      </select>

      <div className="my-1 h-px bg-[#3a2f25]" />

      <button onClick={onUndo} disabled={!canUndo} className="flex items-center gap-2 rounded px-3 py-2 text-xs text-[#D9C5B2] hover:bg-[#1a1410] disabled:opacity-40" title="Undo">
        <Undo2 size={14} /> Undo
      </button>
      <button onClick={onRedo} disabled={!canRedo} className="flex items-center gap-2 rounded px-3 py-2 text-xs text-[#D9C5B2] hover:bg-[#1a1410] disabled:opacity-40" title="Redo">
        <Redo2 size={14} /> Redo
      </button>

      <div className="my-1 h-px bg-[#3a2f25]" />

      <button onClick={onExport} className="flex items-center gap-2 rounded bg-[#E67E22]/20 px-3 py-2 text-xs uppercase tracking-wider text-[#E67E22] hover:bg-[#E67E22]/30" title="Export GPX">
        <Download size={14} /> Export
      </button>
    </aside>
  );
}
