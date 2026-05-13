// src/components/layout/AppShell.jsx
import { useState } from 'react';
import { Map, Layers, Scale, BookOpen, Camera, Zap, Crosshair, Settings } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useTripStore } from '../../store/useTripStore';
import { useSquadGear } from '../../context/SquadGearContext';
import BottomNav from './BottomNav';
import TopBar from './TopBar';

const NAV_GROUPS = [
  {
    group: 'Plan',
    items: [
      { key: 'dashboard', label: 'Dashboard',      icon: Map       },
      { key: 'select',    label: 'Trip Planner',   icon: Layers    },
      { key: 'ledger',    label: 'Ledger',          icon: Scale     },
    ],
  },
  {
    group: 'Explore',
    items: [
      { key: 'vault',     label: 'VentureVault',   icon: BookOpen  },
      { key: 'ar',        label: 'AR Ghost Tours', icon: Camera    },
      { key: 'inspire',   label: 'Inspire',        icon: Zap       },
    ],
  },
  {
    group: 'Tools',
    items: [
      { key: 'tactical',  label: 'Tactical Mode',  icon: Crosshair },
      { key: 'settings',  label: 'Settings',       icon: Settings  },
    ],
  },
];

const THEME_LABELS = { default: 'NOMAD', day: 'DAY', tactical: 'TACTICAL' };

export default function AppShell({
  activeView,
  onNavigate,
  // legacy callback props — kept for backward compat with existing TripPlanner usage
  onBackToDashboard,
  onOpenVault,
  onOpenProfile,
  onOpenInspire,
  onOpenTactical,
  onOpenSettings,
  // mobile bottom nav
  activeBottomTab = 'PLAN',
  onSelectBottomTab,
  children,
}) {
  const [expanded, setExpanded] = useState(false);
  const { theme, cycleTheme } = useTheme();
  const { trip } = useTripStore();
  const { members, weights } = useSquadGear();

  const isTactical = theme === 'tactical';
  // Tactical Mode always collapses the rail — the amber colour signals emergency context
  const railExpanded = expanded && !isTactical;

  function navigate(key) {
    if (onNavigate) {
      onNavigate(key);
      return;
    }
    // Legacy fallback for components not yet migrated to onNavigate
    if (key === 'dashboard' || key === 'select') onBackToDashboard?.();
    if (key === 'vault')    onOpenVault?.();
    if (key === 'profile')  onOpenProfile?.();
    if (key === 'inspire')  onOpenInspire?.();
    if (key === 'tactical') onOpenTactical?.();
    if (key === 'settings') onOpenSettings?.();
  }

  return (
    <>
      <style>{`
        .vp-rail {
          position: fixed; top: 0; left: 0; bottom: 0; z-index: 40;
          width: 64px; display: flex; flex-direction: column;
          background: rgba(0,0,0,0.25); backdrop-filter: blur(14px);
          border-right: 1px solid rgba(255,255,255,0.08);
          transition: width 0.35s cubic-bezier(0.4,0,0.2,1); overflow: hidden;
        }
        @media (max-width: 768px) { .vp-rail { display: none; } }
        .vp-rail.vp-expanded { width: 280px; }
        .vp-label {
          opacity: 0; white-space: nowrap;
          transition: opacity 0.15s ease 0.08s; overflow: hidden;
        }
        .vp-rail.vp-expanded .vp-label { opacity: 1; }
        .vp-group-hd {
          opacity: 0; height: 0; overflow: hidden;
          transition: opacity 0.15s ease 0.08s, height 0.2s ease;
          font-family: 'JetBrains Mono', monospace; font-size: 10px;
          letter-spacing: 0.12em; color: rgba(255,255,255,0.35);
          padding: 0 16px; text-transform: uppercase;
        }
        .vp-rail.vp-expanded .vp-group-hd { opacity: 1; height: 28px; }
        .vp-nav-btn {
          display: flex; align-items: center; gap: 12px;
          padding: 10px 20px; cursor: pointer;
          border-left: 3px solid transparent;
          transition: background 0.15s, border-color 0.15s;
          color: rgba(255,255,255,0.6);
          background: none; border-top: none; border-right: none; border-bottom: none;
          width: 100%; text-align: left;
        }
        .vp-nav-btn:hover { background: rgba(255,255,255,0.06); color: #fff; }
        .vp-nav-btn.vp-active {
          border-left-color: #E67E22; color: #E67E22;
          background: rgba(230,126,34,0.08);
        }
        .vp-nav-btn.vp-tactical-active {
          border-left-color: #F2A900; color: #F2A900;
          background: rgba(242,169,0,0.08);
        }
        .vp-divider { height: 1px; background: rgba(255,255,255,0.08); margin: 8px 0; }
        .vp-shell-body {
          margin-left: 64px; height: 100dvh;
          display: flex; flex-direction: column; overflow: hidden;
          background: var(--bg);
        }
        @media (max-width: 768px) { .vp-shell-body { margin-left: 0; } }
        .vp-topbar-mobile { display: none; }
        @media (max-width: 768px) { .vp-topbar-mobile { display: block; } }
        .vp-bottomnav-mobile { display: none; }
        @media (max-width: 768px) { .vp-bottomnav-mobile { display: block; } }
      `}</style>

      {/* ── Fixed left rail (desktop only) ── */}
      <nav
        className={`vp-rail${railExpanded ? ' vp-expanded' : ''}`}
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
      >
        {/* Brand */}
        <div style={{ padding: '20px 20px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 24, height: 24, border: '2px solid #E67E22',
            transform: 'rotate(45deg)', flexShrink: 0,
          }} />
          <span className="vp-label" style={{
            fontFamily: 'Playfair Display, serif', fontSize: 16, fontWeight: 700, color: '#fff',
          }}>
            VenturePath
          </span>
          <button
            onClick={cycleTheme}
            className="vp-label"
            style={{
              marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4,
              fontSize: 10, fontFamily: 'JetBrains Mono, monospace',
              color: 'rgba(255,255,255,0.5)', background: 'none', border: 'none',
              cursor: 'pointer', letterSpacing: '0.08em',
            }}
          >
            {THEME_LABELS[theme] ?? 'NOMAD'}
          </button>
        </div>

        {/* Nav groups */}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
          {NAV_GROUPS.map(group => (
            <div key={group.group}>
              <div className="vp-group-hd">{group.group}</div>
              {group.items.map(item => {
                const Icon = item.icon;
                const isActive = activeView === item.key;
                const isTacticalKey = item.key === 'tactical';
                return (
                  <button
                    key={item.key}
                    className={`vp-nav-btn${isActive ? (isTacticalKey ? ' vp-tactical-active' : ' vp-active') : ''}`}
                    onClick={() => navigate(item.key)}
                    title={item.label}
                  >
                    <Icon size={20} style={{ flexShrink: 0 }} />
                    <span className="vp-label" style={{ fontSize: 14, fontWeight: isActive ? 600 : 400 }}>
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div className="vp-divider" />

        {/* Active expedition */}
        <div style={{ padding: '12px 20px' }}>
          <div style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: 9,
            letterSpacing: '0.12em', color: 'rgba(255,255,255,0.35)',
            textTransform: 'uppercase', marginBottom: 6,
          }}>Active</div>
          <div className="vp-label" style={{
            fontFamily: 'Playfair Display, serif', fontSize: 13,
            color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden',
            textOverflow: 'ellipsis', maxWidth: 220,
          }}>
            {trip.name}
          </div>
          <div className="vp-label" style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
            color: 'rgba(255,255,255,0.45)', marginTop: 2,
          }}>
            {trip.destination} · {trip.days}d
          </div>
        </div>

        <div className="vp-divider" />

        {/* Squad gear weights */}
        <div style={{ padding: '12px 20px' }}>
          {members.map(m => {
            const w = weights[m.id] ?? 0;
            const pct = Math.min((w / m.maxKg) * 100, 100);
            const over = w > m.maxKg;
            return (
              <div key={m.id} style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>
                    {m.avatar}{' '}
                    <span className="vp-label" style={{ fontSize: 11 }}>{m.name}</span>
                  </span>
                  <span className="vp-label" style={{
                    fontSize: 10, fontFamily: 'JetBrains Mono, monospace',
                    color: over ? 'var(--status-alert, #ef4444)' : 'rgba(255,255,255,0.4)',
                  }}>
                    {w.toFixed(1)}/{m.maxKg}kg
                  </span>
                </div>
                <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.12)' }}>
                  <div style={{
                    height: '100%', borderRadius: 2, width: `${pct}%`,
                    background: over ? 'var(--status-alert, #ef4444)' : '#E67E22',
                    transition: 'width 0.3s',
                  }} />
                </div>
              </div>
            );
          })}
        </div>

        <div className="vp-divider" />

        {/* Architect footer */}
        <button
          onClick={() => navigate('profile')}
          style={{
            padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 10,
            background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left',
          }}
        >
          <div style={{
            width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
            background: '#E67E22', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700, color: '#fff',
          }}>
            L7
          </div>
          <div className="vp-label">
            <div style={{ fontSize: 12, color: '#fff', fontWeight: 600 }}>Level 7 Pioneer</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', fontFamily: 'JetBrains Mono, monospace' }}>
              $142 earnings · View →
            </div>
          </div>
        </button>
      </nav>

      {/* ── Content area ── */}
      <div className="vp-shell-body">
        <div className="vp-topbar-mobile">
          <TopBar
            onBackToDashboard={() => navigate('dashboard')}
            onOpenProfile={() => navigate('profile')}
            onOpenSettings={() => navigate('settings')}
          />
        </div>

        <main style={{ flex: 1, overflowY: 'auto' }}>
          {children}
        </main>

        <div className="vp-bottomnav-mobile">
          <BottomNav
            activeBottomTab={activeBottomTab}
            onTabSelect={onSelectBottomTab ?? (() => {})}
          />
        </div>
      </div>
    </>
  );
}
