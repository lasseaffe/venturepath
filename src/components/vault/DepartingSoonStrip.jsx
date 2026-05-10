// src/components/vault/DepartingSoonStrip.jsx
import { useTripStore } from '../../store/useTripStore';

/**
 * Shows the next 1–2 upcoming tickets on the LaunchDashboard.
 * @param {{ onOpenVault: () => void }} props
 */
export default function DepartingSoonStrip({ onOpenVault }) {
  const { tickets } = useTripStore();
  const now = Date.now();

  const upcoming = tickets
    .filter(t => t.validFrom && new Date(t.validFrom).getTime() > now)
    .sort((a, b) => new Date(a.validFrom) - new Date(b.validFrom))
    .slice(0, 2);

  if (upcoming.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <p className="font-mono text-xs text-[#D9C5B2] uppercase tracking-wider">Departing Soon</p>
        <button onClick={onOpenVault} className="font-mono text-xs text-[#E67E22] hover:underline">
          View all →
        </button>
      </div>
      <div className="flex flex-col gap-2">
        {upcoming.map(t => {
          const ms    = new Date(t.validFrom).getTime() - now;
          const hours = Math.floor(ms / 3_600_000);
          const label = hours < 24 ? `in ${hours}h` : new Date(t.validFrom).toLocaleDateString();
          return (
            <button
              key={t.id}
              onClick={onOpenVault}
              className="flex items-center justify-between px-3 py-2 rounded-lg border border-white/10 hover:border-[#E67E22]/30 transition-colors text-left"
              style={{ background: '#0E1012' }}
            >
              <div>
                <p className="font-mono text-sm text-white">{t.title}</p>
                <p className="font-mono text-xs text-[#D9C5B2]">{t.provider}</p>
              </div>
              <p className="font-mono text-xs text-[#E67E22]">{label}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
