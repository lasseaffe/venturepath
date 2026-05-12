// src/components/dashboard/ActionList.jsx
import { useSquadGear } from '../../context/SquadGearContext';
import { useTripStore } from '../../store/useTripStore';

const ROW_BASE = {
  background: 'rgba(255,255,255,0.03)',
  borderLeft: '2px solid rgba(255,255,255,0.1)',
  borderRadius: 2,
  padding: '12px 14px',
  cursor: 'pointer',
  display: 'block',
  width: '100%',
  textAlign: 'left',
  border: 'none',
  marginBottom: 6,
  transition: 'background 0.15s',
};

function ActionRow({ label, sub, subColor, accentColor, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{ ...ROW_BASE, borderLeft: `2px solid ${accentColor ?? 'rgba(255,255,255,0.1)'}` }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
    >
      <div style={{ color: '#fff', fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{label}</div>
      <div style={{ color: subColor ?? 'rgba(255,255,255,0.4)', fontSize: 11 }}>{sub}</div>
    </button>
  );
}

export default function ActionList({ onNavigate, onEnterTrip, onOpenVault }) {
  const { members, weights } = useSquadGear();
  const { legs } = useTripStore();

  // Squad overload check
  const overloadedMember = members.find(m => (weights[m.id] ?? 0) > m.maxKg);
  const overloadDelta = overloadedMember
    ? ((weights[overloadedMember.id] ?? 0) - overloadedMember.maxKg).toFixed(1)
    : null;

  // TODO: wire to ledger store when available
  const pendingVotes = 0;

  const plannedLegs = legs.filter(l => l.status !== 'complete').length;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '20px 20px 20px 12px' }}>
      <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8, fontFamily: 'JetBrains Mono, monospace' }}>
        QUICK ACTIONS
      </div>

      <ActionRow
        label="Open Itinerary"
        sub={`${plannedLegs} leg${plannedLegs !== 1 ? 's' : ''} planned`}
        accentColor="#E67E22"
        onClick={onEnterTrip}
      />

      <ActionRow
        label="Ledger Workbench"
        sub={pendingVotes > 0 ? `${pendingVotes} decisions pending squad vote` : 'No open decisions'}
        subColor={pendingVotes > 0 ? '#4ade80' : 'rgba(255,255,255,0.4)'}
        accentColor={pendingVotes > 0 ? 'rgba(74,222,128,0.5)' : 'rgba(255,255,255,0.1)'}
        onClick={() => onNavigate('ledger')}
      />

      <ActionRow
        label="Squad Gear"
        sub={overloadedMember ? `⚠ ${overloadedMember.name} overloaded by ${overloadDelta} kg` : 'All Pioneers within limit'}
        subColor={overloadedMember ? '#ef4444' : 'rgba(255,255,255,0.4)'}
        accentColor={overloadedMember ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.1)'}
        onClick={onEnterTrip}
      />

      <ActionRow
        label="VentureVault"
        sub="Browse & clone proven Pro-Paths"
        accentColor="rgba(255,255,255,0.1)"
        onClick={onOpenVault}
      />

      <ActionRow
        label="AR Ghost Tours"
        sub="Walk through location-anchored history"
        accentColor="rgba(255,255,255,0.1)"
        onClick={() => onNavigate('ar')}
      />

      <ActionRow
        label="Tactical Mode"
        sub="Offline cache ready"
        accentColor="rgba(255,255,255,0.1)"
        onClick={() => onNavigate('tactical')}
      />
    </div>
  );
}
