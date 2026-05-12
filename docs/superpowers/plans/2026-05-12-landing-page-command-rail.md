# Landing Page — Expedition Command Rail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the VenturePath landing page with a hover-expand Command Rail sidebar, an active-trip Hero Strip, and a horizontal scroll row of 6 interactive feature showcase cards.

**Architecture:** Four new focused components replace the current `LaunchDashboard.jsx` left panel and `Sidebar.jsx` icon bar. `App.jsx` gets a new `onNavigate` handler threaded into `LaunchDashboard`, which passes it to `CommandRail`. Navigation is purely callback-based (no router library) to match the existing state-based routing pattern in `App.jsx`.

**Tech Stack:** React 18, Framer Motion, Lucide React, Zustand (`useTripStore`), `SquadGearContext`, `ThemeContext`, CSS custom properties (`var(--bg)`, `var(--accent)`, `var(--cta)`, etc.)

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `src/components/dashboard/CommandRail.jsx` | Hover-expand left rail — brand, nav groups, active trip, squad weights, profile |
| Create | `src/components/dashboard/HeroStrip.jsx` | Active trip banner pinned at top of right content area |
| Create | `src/components/dashboard/FeatureCard.jsx` | Single feature card with hover-expand teaser + click navigation |
| Create | `src/components/dashboard/FeatureCardRow.jsx` | Horizontal scroll container for the 6 `FeatureCard` instances |
| Modify | `src/components/dashboard/LaunchDashboard.jsx` | Remove old left panel + ticker; compose the 4 new components |
| Modify | `src/App.jsx` | Add `onNavigate` handler, pass to `LaunchDashboard`, wire tactical mode |
| Retire | `src/components/layout/Sidebar.jsx` | No longer rendered anywhere — leave file, remove import from any consumer |

---

## Task 1: CommandRail — collapsed icon rail

**Files:**
- Create: `src/components/dashboard/CommandRail.jsx`

- [ ] **Step 1: Create the file with collapsed-only structure**

```jsx
// src/components/dashboard/CommandRail.jsx
import { useRef, useState } from 'react';
import { Map, Users, BookOpen, Crosshair, Camera, Scale, User, Moon, Sun } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useTripStore } from '../../store/useTripStore';
import { useSquadGear } from '../../context/SquadGearContext';

const NAV_GROUPS = [
  {
    group: 'Expedition',
    items: [
      { key: 'dashboard',  label: 'Dashboard',         icon: Map      },
      { key: 'select',     label: 'Trip Planner',      icon: Map      },
    ],
  },
  {
    group: 'Discover',
    items: [
      { key: 'vault',      label: 'VentureVault',      icon: BookOpen },
      { key: 'ar',         label: 'AR Ghost Tours',    icon: Camera   },
    ],
  },
  {
    group: 'Command',
    items: [
      { key: 'tactical',   label: 'Tactical Mode',     icon: Crosshair },
      { key: 'ledger',     label: 'Ledger Workbench',  icon: Scale    },
      { key: 'profile',    label: 'Profile',           icon: User     },
    ],
  },
];

const THEME_ICONS = { default: Moon, day: Sun, tactical: Crosshair };
const THEME_LABELS = { default: 'NOMAD', day: 'DAY', tactical: 'TACTICAL' };

export default function CommandRail({ currentView, onNavigate }) {
  const [expanded, setExpanded] = useState(false);
  const { theme, cycleTheme } = useTheme();
  const { trip } = useTripStore();
  const { members, weights } = useSquadGear();
  const ThemeIcon = THEME_ICONS[theme] ?? Moon;

  const activeItems = NAV_GROUPS.flatMap(g => g.items).map(i => i.key);

  return (
    <>
      <style>{`
        .vp-rail {
          position: fixed;
          top: 0; left: 0; bottom: 0;
          z-index: 40;
          width: 64px;
          display: flex;
          flex-direction: column;
          background: rgba(0,0,0,0.25);
          backdrop-filter: blur(14px);
          border-right: 1px solid rgba(255,255,255,0.08);
          transition: width 0.35s cubic-bezier(0.4,0,0.2,1);
          overflow: hidden;
        }
        .vp-rail.expanded { width: 280px; }
        .vp-rail-label {
          opacity: 0;
          white-space: nowrap;
          transition: opacity 0.15s ease 0.08s;
          overflow: hidden;
        }
        .vp-rail.expanded .vp-rail-label { opacity: 1; }
        .vp-rail-group-header {
          opacity: 0;
          height: 0;
          overflow: hidden;
          transition: opacity 0.15s ease 0.08s, height 0.2s ease;
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.12em;
          color: rgba(255,255,255,0.35);
          padding: 0 16px;
          text-transform: uppercase;
        }
        .vp-rail.expanded .vp-rail-group-header {
          opacity: 1;
          height: 28px;
        }
        .vp-rail-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 20px;
          cursor: pointer;
          border-left: 3px solid transparent;
          transition: background 0.15s, border-color 0.15s;
          color: rgba(255,255,255,0.6);
          background: none;
          border-top: none;
          border-right: none;
          border-bottom: none;
          width: 100%;
          text-align: left;
        }
        .vp-rail-item:hover { background: rgba(255,255,255,0.06); color: #fff; }
        .vp-rail-item.active {
          border-left-color: #E67E22;
          color: #E67E22;
          background: rgba(230,126,34,0.08);
        }
        .vp-rail-divider {
          height: 1px;
          background: rgba(255,255,255,0.08);
          margin: 8px 0;
        }
      `}</style>

      <nav
        className={`vp-rail${expanded ? ' expanded' : ''}`}
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
      >
        {/* Brand */}
        <div style={{ padding: '20px 20px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 24, height: 24, border: '2px solid #E67E22',
            transform: 'rotate(45deg)', flexShrink: 0,
          }} />
          <span className="vp-rail-label" style={{
            fontFamily: 'Playfair Display, serif', fontSize: 16, fontWeight: 700, color: '#fff',
          }}>
            VenturePath
          </span>
          <button
            onClick={cycleTheme}
            className="vp-rail-label"
            style={{
              marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4,
              fontSize: 10, fontFamily: 'JetBrains Mono, monospace',
              color: 'rgba(255,255,255,0.5)', background: 'none', border: 'none',
              cursor: 'pointer', letterSpacing: '0.08em',
            }}
          >
            <ThemeIcon size={12} />
            {THEME_LABELS[theme]}
          </button>
        </div>

        {/* Nav groups */}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
          {NAV_GROUPS.map(group => (
            <div key={group.group}>
              <div className="vp-rail-group-header">{group.group}</div>
              {group.items.map(item => {
                const Icon = item.icon;
                const isActive = currentView === item.key;
                return (
                  <button
                    key={item.key}
                    className={`vp-rail-item${isActive ? ' active' : ''}`}
                    onClick={() => onNavigate(item.key)}
                    title={item.label}
                  >
                    <Icon size={20} style={{ flexShrink: 0 }} />
                    <span className="vp-rail-label" style={{
                      fontSize: 14, fontWeight: isActive ? 600 : 400,
                    }}>
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div className="vp-rail-divider" />

        {/* Active trip */}
        <div style={{ padding: '12px 20px' }}>
          <div style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: 9,
            letterSpacing: '0.12em', color: 'rgba(255,255,255,0.35)',
            textTransform: 'uppercase', marginBottom: 6,
          }}>
            Active
          </div>
          <div className="vp-rail-label" style={{
            fontFamily: 'Playfair Display, serif', fontSize: 13,
            color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden',
            textOverflow: 'ellipsis', maxWidth: 220,
          }}>
            {trip.name}
          </div>
          <div className="vp-rail-label" style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
            color: 'rgba(255,255,255,0.45)', marginTop: 2,
          }}>
            {trip.destination} · {trip.days}d
          </div>
        </div>

        <div className="vp-rail-divider" />

        {/* Squad weights */}
        <div style={{ padding: '12px 20px' }}>
          {members.map(m => {
            const w = weights[m.id] ?? 0;
            const pct = Math.min((w / m.maxKg) * 100, 100);
            const over = w > m.maxKg;
            return (
              <div key={m.id} style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>
                    {m.avatar} <span className="vp-rail-label" style={{ fontSize: 11 }}>{m.name}</span>
                  </span>
                  <span className="vp-rail-label" style={{
                    fontSize: 10, fontFamily: 'JetBrains Mono, monospace',
                    color: over ? 'var(--status-alert, #ef4444)' : 'rgba(255,255,255,0.4)',
                  }}>
                    {w.toFixed(1)}/{m.maxKg}kg
                  </span>
                </div>
                <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.12)' }}>
                  <div style={{
                    height: '100%', borderRadius: 2,
                    width: `${pct}%`,
                    background: over ? 'var(--status-alert, #ef4444)' : '#E67E22',
                    transition: 'width 0.3s',
                  }} />
                </div>
              </div>
            );
          })}
        </div>

        <div className="vp-rail-divider" />

        {/* Profile footer */}
        <button
          onClick={() => onNavigate('profile')}
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
          <div className="vp-rail-label">
            <div style={{ fontSize: 12, color: '#fff', fontWeight: 600 }}>Level 7 Pioneer</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', fontFamily: 'JetBrains Mono, monospace' }}>
              $142 earnings · View →
            </div>
          </div>
        </button>
      </nav>
    </>
  );
}
```

- [ ] **Step 2: Verify the file saved correctly**

```bash
# Check file exists and has content
wc -l src/components/dashboard/CommandRail.jsx
# Expected: ~180 lines
```

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/CommandRail.jsx
git commit -m "feat: add CommandRail collapsed/expanded sidebar component"
```

---

## Task 2: HeroStrip — active trip banner

**Files:**
- Create: `src/components/dashboard/HeroStrip.jsx`

- [ ] **Step 1: Create HeroStrip**

```jsx
// src/components/dashboard/HeroStrip.jsx
import { useTripStore } from '../../store/useTripStore';

export default function HeroStrip({ onEnterTrip }) {
  const { trip, legs } = useTripStore();
  const totalKm = legs.reduce((s, l) => s + (l.distanceKm ?? 0), 0);

  const STATUS_COLORS = {
    PLANNING: 'rgba(230,126,34,0.9)',
    ACTIVE:   'rgba(34,197,94,0.9)',
    COMPLETE: 'rgba(148,163,184,0.7)',
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 24,
      padding: '20px 32px',
      background: 'rgba(0,0,0,0.35)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid rgba(255,255,255,0.08)',
      minHeight: 100,
    }}>
      {/* Left: trip identity */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: 'JetBrains Mono, monospace', fontSize: 9,
          letterSpacing: '0.15em', color: 'rgba(255,255,255,0.4)',
          textTransform: 'uppercase', marginBottom: 4,
        }}>
          Your Expedition
        </div>
        <h1 style={{
          fontFamily: 'Playfair Display, serif',
          fontSize: 'clamp(1.25rem, 3vw, 2rem)',
          color: '#fff', margin: 0, lineHeight: 1.1,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {trip.name}
        </h1>
        <p style={{
          fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
          color: 'rgba(255,255,255,0.5)', margin: '4px 0 0',
        }}>
          {trip.destination} · {trip.days} days · {totalKm > 0 ? `${totalKm.toLocaleString()} km` : '0 km'}
        </p>
      </div>

      {/* Centre: dates */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 9, fontFamily: 'JetBrains Mono, monospace', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Departure</div>
          <div style={{ fontSize: 13, color: '#fff', fontFamily: 'JetBrains Mono, monospace', marginTop: 2 }}>{trip.startDate}</div>
        </div>
        <span style={{ color: '#E67E22', fontSize: 16 }}>→</span>
        <div>
          <div style={{ fontSize: 9, fontFamily: 'JetBrains Mono, monospace', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Return</div>
          <div style={{ fontSize: 13, color: '#fff', fontFamily: 'JetBrains Mono, monospace', marginTop: 2 }}>{trip.endDate}</div>
        </div>
      </div>

      {/* Status pill */}
      <div style={{
        padding: '4px 12px', borderRadius: 4, flexShrink: 0,
        background: STATUS_COLORS[trip.status] ?? STATUS_COLORS.PLANNING,
        fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
        letterSpacing: '0.12em', color: '#fff', fontWeight: 700,
        textTransform: 'uppercase',
      }}>
        {trip.status ?? 'PLANNING'}
      </div>

      {/* CTA */}
      <button
        onClick={onEnterTrip}
        style={{
          flexShrink: 0,
          padding: '10px 24px',
          background: '#E67E22',
          border: 'none', borderRadius: 9999,
          color: '#fff', fontWeight: 600, fontSize: 14,
          cursor: 'pointer',
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.background = '#d4711e'}
        onMouseLeave={e => e.currentTarget.style.background = '#E67E22'}
      >
        Start Planning →
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/dashboard/HeroStrip.jsx
git commit -m "feat: add HeroStrip active-trip banner component"
```

---

## Task 3: FeatureCard — single showcase card

**Files:**
- Create: `src/components/dashboard/FeatureCard.jsx`

- [ ] **Step 1: Create FeatureCard**

```jsx
// src/components/dashboard/FeatureCard.jsx
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function FeatureCard({ icon: Icon, name, tagline, teaserLines, badge, onClick, cardHeight }) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.button
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      animate={{ scale: hovered ? 1.03 : 1 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      style={{
        flexShrink: 0,
        width: 240,
        height: cardHeight ?? 320,
        background: hovered ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.07)',
        backdropFilter: 'blur(10px)',
        border: hovered ? '1px solid rgba(230,126,34,0.4)' : '1px solid rgba(255,255,255,0.1)',
        borderRadius: 12,
        padding: 24,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        cursor: 'pointer',
        textAlign: 'left',
        boxShadow: hovered ? '0 20px 60px rgba(0,0,0,0.4)' : '0 4px 20px rgba(0,0,0,0.2)',
        transition: 'background 0.2s, border-color 0.2s, box-shadow 0.2s',
      }}
    >
      {/* Icon */}
      <Icon size={32} style={{ color: '#E67E22', marginBottom: 12, flexShrink: 0 }} />

      {/* Name */}
      <div style={{
        fontFamily: 'Playfair Display, serif', fontSize: 18,
        fontWeight: 700, color: '#fff', marginBottom: 6, lineHeight: 1.2,
      }}>
        {name}
      </div>

      {/* Tagline */}
      <div style={{
        fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
        color: 'rgba(255,255,255,0.55)', marginBottom: badge ? 8 : 0,
        lineHeight: 1.5,
      }}>
        {tagline}
      </div>

      {/* Squad badge */}
      {badge && (
        <div style={{
          padding: '2px 8px', borderRadius: 4,
          background: 'rgba(230,126,34,0.15)',
          border: '1px solid rgba(230,126,34,0.3)',
          fontFamily: 'JetBrains Mono, monospace', fontSize: 9,
          color: '#E67E22', letterSpacing: '0.08em',
        }}>
          {badge}
        </div>
      )}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Hover teaser */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.18 }}
            style={{ width: '100%' }}
          >
            <div style={{
              height: 1, background: 'rgba(255,255,255,0.1)', marginBottom: 12,
            }} />
            <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
              {teaserLines.map((line, i) => (
                <li key={i} style={{
                  fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
                  color: 'rgba(255,255,255,0.65)', marginBottom: 6,
                  display: 'flex', alignItems: 'flex-start', gap: 6,
                }}>
                  <span style={{ color: '#E67E22', flexShrink: 0 }}>·</span>
                  {line}
                </li>
              ))}
            </ul>
            <div style={{
              marginTop: 12, padding: '7px 16px',
              background: '#E67E22', borderRadius: 9999,
              fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
              fontWeight: 700, color: '#fff', letterSpacing: '0.06em',
              display: 'inline-block',
            }}>
              Enter →
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/dashboard/FeatureCard.jsx
git commit -m "feat: add FeatureCard hover-expand showcase card component"
```

---

## Task 4: FeatureCardRow — horizontal scroll row

**Files:**
- Create: `src/components/dashboard/FeatureCardRow.jsx`

- [ ] **Step 1: Create FeatureCardRow**

```jsx
// src/components/dashboard/FeatureCardRow.jsx
import { useRef } from 'react';
import { Map, Users, BookOpen, Crosshair, Camera, Scale } from 'lucide-react';
import { useSquadSync } from '../../hooks/useSquadSync';
import { useTheme } from '../../context/ThemeContext';
import FeatureCard from './FeatureCard';

export default function FeatureCardRow({ onEnterTrip, onOpenVault, onNavigate, cardHeight }) {
  const { syncReady } = useSquadSync();
  const { setTheme } = useTheme();
  const rowRef = useRef(null);

  const CARDS = [
    {
      icon: Map,
      name: 'Trip Planner',
      tagline: 'Architect your expedition leg by leg',
      teaserLines: [
        'Plan legs & itinerary in detail',
        'Set transport mode per leg',
        'Built-in budget tracker',
      ],
      badge: null,
      onClick: onEnterTrip,
    },
    {
      icon: Users,
      name: 'Squad Sync',
      tagline: 'Command your team in real time',
      teaserLines: [
        'Live gear weight balance',
        'Real-time manifest sync',
        'Per-member status badges',
      ],
      badge: syncReady ? '3 members synced' : 'Syncing…',
      onClick: onEnterTrip,
    },
    {
      icon: BookOpen,
      name: 'VentureVault',
      tagline: 'Browse & clone proven Pro-Paths',
      teaserLines: [
        'Browse 200+ curated Pro-Paths',
        'Clone any expedition in 3 taps',
        'Earn as an Architect creator',
      ],
      badge: null,
      onClick: onOpenVault,
    },
    {
      icon: Crosshair,
      name: 'Tactical Mode',
      tagline: 'Offline-ready emergency command',
      teaserLines: [
        'Full offline itinerary access',
        'SOS beacon with GPS text',
        'Emergency contact display',
      ],
      badge: null,
      onClick: () => {
        setTheme('tactical');
        onEnterTrip();
      },
    },
    {
      icon: Camera,
      name: 'AR Ghost Tours',
      tagline: 'Walk through location-anchored history',
      teaserLines: [
        'GPS-anchored historical content',
        'Narrative overlays at each site',
        'Walk the past, anywhere',
      ],
      badge: null,
      onClick: () => onNavigate('ar'),
    },
    {
      icon: Scale,
      name: 'Ledger Workbench',
      tagline: 'Squad decisions, nominations & votes',
      teaserLines: [
        'Nominate expedition options',
        'Squad vote + veto flow',
        'Full decision history log',
      ],
      badge: null,
      onClick: onEnterTrip,
    },
  ];

  return (
    <div style={{ position: 'relative', flex: 1 }}>
      {/* Scroll row */}
      <div
        ref={rowRef}
        style={{
          display: 'flex',
          gap: 16,
          padding: '24px 32px',
          overflowX: 'auto',
          overflowY: 'hidden',
          scrollbarWidth: 'none',
          height: '100%',
          boxSizing: 'border-box',
        }}
      >
        <style>{`.vp-card-row::-webkit-scrollbar { display: none; }`}</style>
        {CARDS.map(card => (
          <FeatureCard
            key={card.name}
            icon={card.icon}
            name={card.name}
            tagline={card.tagline}
            teaserLines={card.teaserLines}
            badge={card.badge}
            onClick={card.onClick}
            cardHeight={cardHeight}
          />
        ))}
      </div>

      {/* Right fade scroll hint */}
      <div style={{
        position: 'absolute', top: 0, right: 0, bottom: 0, width: 80,
        background: 'linear-gradient(to left, rgba(0,0,0,0.5), transparent)',
        pointerEvents: 'none',
      }} />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/dashboard/FeatureCardRow.jsx
git commit -m "feat: add FeatureCardRow horizontal scroll showcase row"
```

---

## Task 5: Refactor LaunchDashboard

Remove the old left panel, ticker, and right panel. Compose the 4 new components.

**Files:**
- Modify: `src/components/dashboard/LaunchDashboard.jsx`

- [ ] **Step 1: Replace LaunchDashboard.jsx entirely**

```jsx
// src/components/dashboard/LaunchDashboard.jsx
import { useRef, useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useDestinationImage } from '../../hooks/useDestinationImage';
import { useTripStore } from '../../store/useTripStore';
import CommandRail from './CommandRail';
import HeroStrip from './HeroStrip';
import FeatureCardRow from './FeatureCardRow';

function useHighResUrl(url) {
  const [resolved, setResolved] = useState(url);
  const probeRef = useRef(null);
  useEffect(() => {
    if (!url) { setResolved(null); return; }
    const kUrl = url.replace(/_b\.jpg$/, '_k.jpg');
    if (kUrl === url) { setResolved(url); return; }
    const img = new Image();
    probeRef.current = img;
    img.onload  = () => setResolved(kUrl);
    img.onerror = () => setResolved(url);
    img.src = kUrl;
    return () => {
      if (probeRef.current) {
        probeRef.current.onload = null;
        probeRef.current.onerror = null;
      }
    };
  }, [url]);
  return resolved;
}

export default function LaunchDashboard({ onEnterTrip, onOpenVault, onOpenProfile, onNavigate }) {
  const { theme } = useTheme();
  const { trip } = useTripStore();
  const { image: heroImage } = useDestinationImage(trip.destination, 'city', 0);
  const heroUrl = useHighResUrl(heroImage?.url ?? null);

  const heroGradient = theme === 'tactical'
    ? 'linear-gradient(to right, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.55) 50%, rgba(0,0,0,0.25) 100%)'
    : 'linear-gradient(to right, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.45) 50%, rgba(0,0,0,0.15) 100%)';

  // Estimate card height: viewport height minus hero strip (~120px) minus padding (~48px)
  const cardHeight = Math.max(240, (typeof window !== 'undefined' ? window.innerHeight : 700) - 120 - 48 - 48);

  return (
    <div style={{
      minHeight: '100vh', position: 'relative', overflow: 'hidden',
      background: 'var(--bg, #0E1012)', color: 'var(--text-primary, #fff)',
    }}>
      {/* Full-bleed hero background */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        <div
          className="animate-ken-burns"
          style={{
            position: 'absolute', inset: 0,
            backgroundSize: 'cover', backgroundPosition: 'center',
            ...(heroUrl ? { backgroundImage: `url(${heroUrl})` } : {}),
          }}
        />
        <div style={{ position: 'absolute', inset: 0, background: heroGradient }} />
      </div>

      {/* Command Rail (fixed, left) */}
      <CommandRail
        currentView="dashboard"
        onNavigate={onNavigate}
      />

      {/* Right content area — offset by collapsed rail width (64px) */}
      <div style={{
        position: 'relative', zIndex: 10,
        marginLeft: 64,
        display: 'flex', flexDirection: 'column',
        minHeight: '100vh',
      }}>
        {/* Hero Strip */}
        <HeroStrip onEnterTrip={onEnterTrip} />

        {/* Feature Card Row */}
        <FeatureCardRow
          onEnterTrip={onEnterTrip}
          onOpenVault={onOpenVault}
          onNavigate={onNavigate}
          cardHeight={cardHeight}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/dashboard/LaunchDashboard.jsx
git commit -m "refactor: replace LaunchDashboard with Command Rail layout"
```

---

## Task 6: Wire App.jsx — add onNavigate handler

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1: Add `onNavigate` handler and pass to LaunchDashboard**

In `src/App.jsx`, replace the `LaunchDashboard` render call (lines 80–87) with:

```jsx
// Add this handler inside AppRouter(), alongside handleEnterExpedition:
const handleNavigate = useCallback((key) => {
  if (key === 'select' || key === 'dashboard') {
    setView(key);
  } else if (key === 'vault') {
    setView('vault');
  } else if (key === 'profile') {
    setView('profile');
  } else if (key === 'tactical') {
    setView('select'); // enter expedition in tactical mode (theme already set by card)
  } else if (key === 'ar' || key === 'ledger') {
    setView('select'); // placeholder: enter expedition for now
  }
}, []);

// Replace the LaunchDashboard return block:
return (
  <LaunchDashboard
    onEnterTrip={() => setView('select')}
    onOpenVault={() => setView('vault')}
    onOpenChat={() => setView('planner')}
    onOpenProfile={() => setView('profile')}
    onNavigate={handleNavigate}
  />
);
```

Full updated `AppRouter` function for clarity:

```jsx
function AppRouter() {
  const [view, setView] = useState('dashboard');
  const [activeExpeditionId, setActiveExpeditionId] = useState(null);
  const { trip, legs, objectives, manifestSettings } = useTripStore();
  const { saveExpedition } = useExpeditionList();

  const handleEnterExpedition = useCallback((expeditionId) => {
    setActiveExpeditionId(expeditionId);
    setView('planner');
  }, []);

  const handleNavigate = useCallback((key) => {
    if (key === 'select' || key === 'dashboard') {
      setView(key);
    } else if (key === 'vault') {
      setView('vault');
    } else if (key === 'profile') {
      setView('profile');
    } else if (key === 'tactical' || key === 'ar' || key === 'ledger') {
      setView('select');
    }
  }, []);

  function handleBackFromPlanner() {
    if (activeExpeditionId) {
      saveExpedition({ id: activeExpeditionId, trip, legs, objectives, manifestSettings });
    }
    setView('dashboard');
  }

  if (view === 'select') {
    return <ExpeditionSelectScreen onEnter={handleEnterExpedition} />;
  }

  if (view === 'planner') {
    return (
      <TripPlanner
        onBackToDashboard={handleBackFromPlanner}
        onOpenMoodboard={() => setView('moodboard')}
      />
    );
  }

  if (view === 'moodboard') {
    return <Moodboard onBackToDashboard={() => setView('dashboard')} />;
  }

  if (view === 'profile') {
    return <ArchitectProfile onClose={() => setView('dashboard')} />;
  }

  if (view === 'vault') {
    return (
      <div className="min-h-screen p-6" style={{ background: 'var(--bg)' }}>
        <button
          onClick={() => setView('dashboard')}
          className="text-xs mb-4 block hover:underline"
          style={{ color: 'var(--text-secondary)' }}
        >
          ← Back
        </button>
        <VentureVault onCloneComplete={() => setView('planner')} />
      </div>
    );
  }

  return (
    <LaunchDashboard
      onEnterTrip={() => setView('select')}
      onOpenVault={() => setView('vault')}
      onOpenChat={() => setView('planner')}
      onOpenProfile={() => setView('profile')}
      onNavigate={handleNavigate}
    />
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/App.jsx
git commit -m "feat: wire onNavigate handler from App.jsx to LaunchDashboard"
```

---

## Task 7: Remove Sidebar.jsx from consumers and verify

**Files:**
- Modify: `src/pages/TripPlanner.jsx` (remove Sidebar import if present)

- [ ] **Step 1: Check if Sidebar.jsx is imported anywhere**

```bash
grep -r "Sidebar" src/ --include="*.jsx" --include="*.tsx" -l
```

- [ ] **Step 2: Remove any Sidebar import/usage found**

For each file returned by grep, remove the import line:
```jsx
// Remove this line wherever it appears:
import Sidebar from '../layout/Sidebar';
// or
import { Sidebar } from '../layout/Sidebar';
```

And remove any `<Sidebar ... />` JSX usage.

- [ ] **Step 3: Start dev server and visually verify**

```bash
npm run dev
# Open http://localhost:3001
# Verify:
# 1. Landing page shows 64px icon rail on left
# 2. Hovering rail expands to 280px with labels + squad weights
# 3. Hero strip shows trip name, dates, CTA at top right
# 4. 6 feature cards scroll horizontally below the hero strip
# 5. Hovering a card reveals teaser bullets + "Enter →"
# 6. Clicking a card navigates correctly (Vault → vault view, Profile → profile, etc.)
# 7. No console errors
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove Sidebar.jsx consumer imports; verify landing page layout"
```

---

## Task 8: Log the completed work

**Files:**
- Modify: `C:\Users\lasse\Desktop\venturepath\logs\2026-05-12.md` (create if needed)
- Modify: `C:\Users\lasse\Desktop\holyflex\logs\2026-05-12.md` (session log — append)

- [ ] **Step 1: Append to VenturePath session log**

Create or append to `C:\Users\lasse\Desktop\venturepath\logs\2026-05-12.md`:

```markdown
## [HH:MM] Landing page — Expedition Command Rail

- Replaced LaunchDashboard left glass panel + Sidebar.jsx with hover-expand CommandRail (64px → 280px)
- Added HeroStrip: active trip banner with name, dates, status, Start Planning CTA
- Added FeatureCard + FeatureCardRow: horizontal scroll of 6 showcase cards (hover teaser, click navigate)
- Wired onNavigate handler in App.jsx; Tactical Mode card sets theme before entering expedition
- Removed activity ticker bar; squad sync status now lives on Squad Sync feature card badge

Files changed:
- src/components/dashboard/CommandRail.jsx (new)
- src/components/dashboard/HeroStrip.jsx (new)
- src/components/dashboard/FeatureCard.jsx (new)
- src/components/dashboard/FeatureCardRow.jsx (new)
- src/components/dashboard/LaunchDashboard.jsx (refactored)
- src/App.jsx (added handleNavigate)
```

- [ ] **Step 2: Append to HolyFlex session log (project-level log rule)**

Append to `C:\Users\lasse\Desktop\holyflex\logs\2026-05-12.md`:

```markdown
## [HH:MM] VenturePath — Landing Page Command Rail

- Redesigned VP landing page dashboard with hover-expand sidebar + feature showcase cards
- Files changed in C:\Users\lasse\Desktop\venturepath\src\components\dashboard\
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task |
|-----------------|------|
| 64px collapsed rail, icon-only | Task 1 |
| 280px expanded on hover, 0.35s cubic-bezier | Task 1 |
| Nav groups: Expedition, Discover, Command | Task 1 |
| Active trip in expanded rail | Task 1 |
| Squad weights in expanded rail | Task 1 |
| Profile footer in rail | Task 1 |
| Hero strip: trip name, dates, status, CTA | Task 2 |
| FeatureCard hover teaser + click navigate | Task 3 |
| 6 cards in horizontal scroll row | Task 4 |
| Right-edge fade scroll hint | Task 4 |
| Tactical Mode card sets theme | Task 4 |
| Squad Sync badge uses `syncReady` | Task 4 |
| LaunchDashboard composed from new components | Task 5 |
| Hero background + Ken Burns stays | Task 5 |
| 64px left margin on content area | Task 5 |
| App.jsx `onNavigate` handler | Task 6 |
| Sidebar.jsx consumers cleaned up | Task 7 |
| Task log written | Task 8 |

No gaps found. All spec sections covered.
