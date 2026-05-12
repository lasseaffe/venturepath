// src/components/dashboard/ExpeditionPanel.jsx
import { useDestinationImage } from '../../hooks/useDestinationImage';
import { useTripStore } from '../../store/useTripStore';
import { useSquadGear } from '../../context/SquadGearContext';

export default function ExpeditionPanel() {
  const { trip, legs, budget } = useTripStore();
  const { members, weights } = useSquadGear();

  const activeLeg = legs.find(l => l.status !== 'complete') ?? legs[0] ?? null;
  const legCity = activeLeg?.from ?? trip.destination;
  const { image } = useDestinationImage(legCity, 'city', 0);
  const photoUrl = image?.url ?? null;

  const spent = (budget?.items ?? []).reduce((s, i) => s + (i.amount ?? 0), 0);
  const total = budget?.total ?? 0;
  const left = total - spent;
  const spentPct = total > 0 ? Math.min((spent / total) * 100, 100) : 0;

  return (
    <div style={{ width: 260, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8, padding: '20px 0 20px 20px', overflowY: 'auto' }}>
      <ActiveLegCard leg={activeLeg} trip={trip} photoUrl={photoUrl} />
      <ExpeditionCard trip={trip} legs={legs} />
      <SquadLoadCard members={members} weights={weights} />
      <BudgetCard spent={spent} left={left} total={total} spentPct={spentPct} />
    </div>
  );
}

function ActiveLegCard({ leg, trip, photoUrl }) {
  const isEnRoute = leg?.status === 'confirmed';
  return (
    <div style={{ borderRadius: 6, overflow: 'hidden', position: 'relative', minHeight: 120, flexShrink: 0 }}>
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: photoUrl ? `url(${photoUrl})` : undefined,
        backgroundSize: 'cover', backgroundPosition: 'center',
        backgroundColor: '#1a2010',
      }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.78) 100%)' }} />
      <div style={{ position: 'relative', zIndex: 1, padding: 14 }}>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 6, fontFamily: 'JetBrains Mono, monospace' }}>
          ACTIVE LEG
        </div>
        <div style={{ color: '#fff', fontSize: 18, fontWeight: 700, fontFamily: 'Playfair Display, serif', lineHeight: 1.1, marginBottom: 4 }}>
          {leg ? leg.from : trip.destination}
        </div>
        {leg && (
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>
            → {leg.to} · {leg.mode} · {leg.durationH}h
          </div>
        )}
        <div style={{ marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(230,126,34,0.15)', border: '1px solid rgba(230,126,34,0.3)', borderRadius: 2, padding: '4px 10px' }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#E67E22' }} />
          <span style={{ color: '#E67E22', fontSize: 10, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.08em' }}>
            {isEnRoute ? 'EN ROUTE' : 'NEXT UP'}
          </span>
        </div>
      </div>
    </div>
  );
}

function ExpeditionCard({ trip, legs }) {
  const totalKm = legs.reduce((s, l) => s + (l.distanceKm ?? 0), 0);
  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 4, padding: '12px 14px' }}>
      <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 5, fontFamily: 'JetBrains Mono, monospace' }}>EXPEDITION</div>
      <div style={{ color: '#fff', fontSize: 13, fontWeight: 600, fontFamily: 'Playfair Display, serif' }}>{trip.name}</div>
      <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, fontFamily: 'JetBrains Mono, monospace', marginTop: 2 }}>
        {trip.destination} · {trip.days}d{totalKm > 0 ? ` · ${totalKm.toLocaleString()}km` : ''}
      </div>
    </div>
  );
}

function SquadLoadCard({ members, weights }) {
  if (!members?.length) return null;
  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 4, padding: '12px 14px' }}>
      <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8, fontFamily: 'JetBrains Mono, monospace' }}>SQUAD LOAD</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {members.map(m => {
          const w = weights[m.id] ?? 0;
          const over = w > m.maxKg;
          const pct = Math.min((w / m.maxKg) * 100, 100);
          return (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 22, height: 22, borderRadius: '50%', background: over ? 'rgba(239,68,68,0.7)' : '#E67E22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0, color: '#000' }}>
                {m.avatar ?? m.name?.[0] ?? '?'}
              </div>
              <div style={{ flex: 1, height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 2 }}>
                <div style={{ width: `${pct}%`, height: '100%', background: over ? '#ef4444' : '#E67E22', borderRadius: 2, transition: 'width 0.3s' }} />
              </div>
              <span style={{ fontSize: 10, color: over ? '#ef4444' : 'rgba(255,255,255,0.4)', fontFamily: 'JetBrains Mono, monospace', minWidth: 52, textAlign: 'right' }}>
                {w.toFixed(1)}/{m.maxKg}kg{over ? ' ⚠' : ''}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BudgetCard({ spent, left, total, spentPct }) {
  if (total === 0) return null;
  const fmt = n => `€${Math.round(n).toLocaleString()}`;
  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 4, padding: '12px 14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace' }}>BUDGET</div>
        <div style={{ color: '#E67E22', fontSize: 13, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>{fmt(left)} left</div>
      </div>
      <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2 }}>
        <div style={{ width: `${spentPct}%`, height: '100%', background: '#E67E22', borderRadius: 2 }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', fontFamily: 'JetBrains Mono, monospace' }}>{fmt(spent)} spent</span>
        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', fontFamily: 'JetBrains Mono, monospace' }}>{fmt(total)} total</span>
      </div>
    </div>
  );
}
