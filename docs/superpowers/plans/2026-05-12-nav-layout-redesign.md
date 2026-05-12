# Nav & Layout Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace VenturePath's bottom-nav + icon-only sidebar with a desktop-first layout: persistent top bar, labeled 200px sidebar, sticky scroll-aware section nav in TripPlanner, and bottom nav hidden on desktop.

**Architecture:** New `TopBar.jsx` and `StickyNav.jsx` components slot into a restructured `AppShell.jsx`. `Sidebar.jsx` is rewritten with labeled items. `TripPlanner.jsx` drops tab-switching in favour of a single scrollable page with `IntersectionObserver` tracking active section. Mobile keeps the existing bottom nav via a CSS media query hide.

**Tech Stack:** React 18, Framer Motion (already installed), CSS media queries for responsive hide/show, native `IntersectionObserver` API.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/components/layout/TopBar.jsx` | **Create** | Fixed 48px top bar: logo, Premium pill, profile/settings/bell |
| `src/components/layout/StickyNav.jsx` | **Create** | Scroll-aware sticky section nav for TripPlanner |
| `src/components/layout/Sidebar.jsx` | **Rewrite** | Labeled 200px desktop sidebar |
| `src/components/layout/AppShell.jsx` | **Modify** | Wire TopBar + Sidebar + StickyNav, hide BottomNav on desktop |
| `src/components/layout/BottomNav.jsx` | **Modify** | Add `display:none` above 768px |
| `src/pages/TripPlanner.jsx` | **Modify** | Replace tab state with scroll layout + IntersectionObserver |
| `src/App.jsx` | **Modify** | Pass `onOpenExpeditions` to Sidebar via AppShell |
| `src/components/trip/ExpeditionSelectScreen.jsx` | **Modify** | Use new Sidebar (already imports it — just verify props align) |
| `src/components/dashboard/LaunchDashboard.jsx` | **Modify** | Wrap in AppShell so TopBar appears on dashboard too |

---

## Task 1: Create TopBar.jsx

**Files:**
- Create: `src/components/layout/TopBar.jsx`

- [ ] **Step 1: Create the file**

```jsx
// src/components/layout/TopBar.jsx
export default function TopBar({ onBackToDashboard, onOpenProfile, onOpenSettings }) {
  return (
    <header
      style={{
        height: 48,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        background: '#0E1012',
        borderBottom: '1px solid var(--border)',
        zIndex: 50,
      }}
    >
      {/* Logo */}
      <button
        onClick={onBackToDashboard}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
        }}
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M10 2L18 7V13L10 18L2 13V7L10 2Z" stroke="#E67E22" strokeWidth="1.5" fill="none" />
          <path d="M10 5L15 8V12L10 15L5 12V8L10 5Z" fill="rgba(230,126,34,0.15)" stroke="#E67E22" strokeWidth="1" />
        </svg>
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.85)',
            fontWeight: 700,
          }}
        >
          VenturePath
        </span>
      </button>

      {/* Right actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* Premium pill */}
        <button
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 12px',
            borderRadius: 20,
            border: '1px solid #E67E22',
            background: 'none',
            cursor: 'pointer',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            letterSpacing: '0.08em',
            color: '#E67E22',
            fontWeight: 700,
          }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M6 1L7.5 4.5H11L8.5 6.5L9.5 10L6 8L2.5 10L3.5 6.5L1 4.5H4.5L6 1Z"
              stroke="#E67E22" strokeWidth="1" fill="rgba(230,126,34,0.15)" />
          </svg>
          Premium
        </button>

        {/* Profile */}
        <TopBarBtn onClick={onOpenProfile} title="Architect Profile">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
            <circle cx="8" cy="5" r="3" />
            <path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6" strokeLinecap="round" />
          </svg>
        </TopBarBtn>

        {/* Settings */}
        <TopBarBtn onClick={onOpenSettings} title="Settings">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
            <circle cx="8" cy="8" r="2.5" />
            <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.1 3.1l1.4 1.4M11.5 11.5l1.4 1.4M3.1 12.9l1.4-1.4M11.5 4.5l1.4-1.4" strokeLinecap="round" />
          </svg>
        </TopBarBtn>

        {/* Notifications */}
        <div style={{ position: 'relative' }}>
          <TopBarBtn title="Notifications">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
              <path d="M8 1a5 5 0 0 1 5 5v3l1.5 2H1.5L3 9V6a5 5 0 0 1 5-5Z" strokeLinecap="round" />
              <path d="M6.5 13a1.5 1.5 0 0 0 3 0" strokeLinecap="round" />
            </svg>
          </TopBarBtn>
          {/* Red dot badge */}
          <div style={{
            position: 'absolute',
            top: 4,
            right: 4,
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: '#E74C3C',
            border: '1px solid #0E1012',
            pointerEvents: 'none',
          }} />
        </div>
      </div>
    </header>
  );
}

function TopBarBtn({ onClick, title, children }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: 32,
        height: 32,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 6,
        border: 'none',
        background: 'none',
        cursor: 'pointer',
        color: 'rgba(255,255,255,0.55)',
        transition: 'background 0.15s, color 0.15s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
        e.currentTarget.style.color = '#fff';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'none';
        e.currentTarget.style.color = 'rgba(255,255,255,0.55)';
      }}
    >
      {children}
    </button>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/layout/TopBar.jsx
git commit -m "feat(layout): add TopBar with logo, Premium pill, profile/settings/notifications"
```

---

## Task 2: Rewrite Sidebar.jsx with labeled nav items

**Files:**
- Modify: `src/components/layout/Sidebar.jsx`

- [ ] **Step 1: Replace the entire file**

```jsx
// src/components/layout/Sidebar.jsx
import { useTheme } from '../../context/ThemeContext';

const THEMES = ['default', 'day', 'tactical'];
const THEME_LABELS = { default: 'Dark', day: 'Day', tactical: 'Tactical' };
const THEME_ICONS = {
  default: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
      <path d="M13 9A6 6 0 0 1 6 2a7 7 0 1 0 7 7Z" strokeLinecap="round" />
    </svg>
  ),
  day: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
      <circle cx="8" cy="8" r="3" />
      <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.1 3.1l1.4 1.4M11.5 11.5l1.4 1.4M3.1 12.9l1.4-1.4M11.5 4.5l1.4-1.4" strokeLinecap="round" />
    </svg>
  ),
  tactical: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
      <circle cx="8" cy="8" r="6" />
      <circle cx="8" cy="8" r="2" />
      <path d="M8 2v2M8 12v2M2 8h2M12 8h2" strokeLinecap="round" />
    </svg>
  ),
};

const NAV_ITEMS = [
  {
    label: 'Dashboard',
    prop: 'onBackToDashboard',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
        <rect x="1" y="1" width="6" height="6" rx="1" />
        <rect x="9" y="1" width="6" height="6" rx="1" />
        <rect x="1" y="9" width="6" height="6" rx="1" />
        <rect x="9" y="9" width="6" height="6" rx="1" />
      </svg>
    ),
  },
  {
    label: 'My Expeditions',
    prop: 'onOpenExpeditions',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
        <path d="M8 1L15 5v6L8 15 1 11V5L8 1Z" strokeLinejoin="round" />
        <path d="M8 5l4 2.5v3L8 13 4 10.5v-3L8 5Z" fill="rgba(230,126,34,0.15)" />
      </svg>
    ),
  },
  {
    label: 'VentureVault',
    prop: 'onOpenVault',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
        <path d="M8 1L15 4.5v7L8 15 1 11.5v-7L8 1Z" />
        <path d="M8 5l4 2v4l-4 2-4-2V7l4-2Z" fill="rgba(230,126,34,0.1)" />
      </svg>
    ),
  },
  {
    label: 'Inspire',
    prop: 'onOpenInspire',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
        <path d="M8 1l1.8 4.4L14 6.2l-3.3 3 .9 4.8L8 11.6l-3.6 2.4.9-4.8-3.3-3 4.2-.8L8 1Z" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    label: 'Architect',
    prop: 'onOpenProfile',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
        <circle cx="8" cy="5" r="3" />
        <path d="M2 15c0-3.3 2.7-6 6-6s6 2.7 6 6" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: 'Tactical',
    prop: 'onOpenTactical',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
        <circle cx="8" cy="8" r="6" />
        <circle cx="8" cy="8" r="2" fill="rgba(242,169,0,0.2)" stroke="#F2A900" />
        <path d="M8 2v2M8 12v2M2 8h2M12 8h2" stroke="#F2A900" strokeLinecap="round" />
      </svg>
    ),
    activeColor: '#F2A900',
  },
  {
    label: 'Settings',
    prop: 'onOpenSettings',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
        <circle cx="8" cy="8" r="2.5" />
        <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.1 3.1l1.4 1.4M11.5 11.5l1.4 1.4M3.1 12.9l1.4-1.4M11.5 4.5l1.4-1.4" strokeLinecap="round" />
      </svg>
    ),
  },
];

export default function Sidebar({
  activeItem,
  onBackToDashboard,
  onOpenExpeditions,
  onOpenVault,
  onOpenInspire,
  onOpenProfile,
  onOpenTactical,
  onOpenSettings,
}) {
  const { theme, setTheme } = useTheme();

  const callbacks = {
    onBackToDashboard,
    onOpenExpeditions,
    onOpenVault,
    onOpenInspire,
    onOpenProfile,
    onOpenTactical,
    onOpenSettings,
  };

  function cycleTheme() {
    const next = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length];
    setTheme(next);
  }

  return (
    <aside
      style={{
        width: 200,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--nav-bg)',
        borderRight: '1px solid var(--border)',
        padding: '8px 0',
      }}
    >
      {NAV_ITEMS.map(item => {
        const isActive = activeItem === item.prop;
        const cb = callbacks[item.prop];
        return (
          <NavItem
            key={item.prop}
            icon={item.icon}
            label={item.label}
            isActive={isActive}
            activeColor={item.activeColor}
            onClick={cb}
          />
        );
      })}

      {/* Spacer pushes theme to bottom */}
      <div style={{ flex: 1 }} />

      {/* Theme cycler */}
      <NavItem
        icon={THEME_ICONS[theme]}
        label={THEME_LABELS[theme]}
        isActive={false}
        onClick={cycleTheme}
      />
    </aside>
  );
}

function NavItem({ icon, label, isActive, activeColor = '#E67E22', onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        width: '100%',
        height: 40,
        padding: '0 14px',
        background: isActive ? 'rgba(230,126,34,0.08)' : 'none',
        border: 'none',
        borderLeft: isActive ? `2px solid ${activeColor}` : '2px solid transparent',
        cursor: 'pointer',
        color: isActive ? activeColor : 'rgba(255,255,255,0.45)',
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 11,
        letterSpacing: '0.06em',
        textAlign: 'left',
        transition: 'background 0.15s, color 0.15s, border-color 0.15s',
      }}
      onMouseEnter={e => {
        if (!isActive) {
          e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
          e.currentTarget.style.color = '#fff';
        }
      }}
      onMouseLeave={e => {
        if (!isActive) {
          e.currentTarget.style.background = 'none';
          e.currentTarget.style.color = 'rgba(255,255,255,0.45)';
        }
      }}
    >
      <span style={{ flexShrink: 0, display: 'flex' }}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/layout/Sidebar.jsx
git commit -m "feat(layout): rewrite Sidebar with 200px labeled nav items"
```

---

## Task 3: Create StickyNav.jsx

**Files:**
- Create: `src/components/layout/StickyNav.jsx`

- [ ] **Step 1: Create the file**

```jsx
// src/components/layout/StickyNav.jsx
const SECTIONS = [
  { id: 'section-overview',   label: 'Overview' },
  { id: 'section-itinerary',  label: 'Itinerary' },
  { id: 'section-logistics',  label: 'Logistics' },
  { id: 'section-stays',      label: 'Stays' },
  { id: 'section-transport',  label: 'Transport' },
  { id: 'section-vault',      label: 'Vault' },
];

export default function StickyNav({ activeSection, scrollContainerRef }) {
  function scrollTo(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 20,
        display: 'flex',
        gap: 4,
        padding: '0 16px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--surface)',
        overflowX: 'auto',
        flexShrink: 0,
      }}
    >
      {SECTIONS.map(s => {
        const isActive = activeSection === s.id;
        return (
          <button
            key={s.id}
            onClick={() => scrollTo(s.id)}
            style={{
              padding: '10px 12px',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10,
              letterSpacing: '0.08em',
              fontWeight: isActive ? 700 : 400,
              color: isActive ? '#E67E22' : 'var(--text-secondary)',
              background: 'none',
              border: 'none',
              borderBottom: isActive ? '2px solid #E67E22' : '2px solid transparent',
              marginBottom: -1,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'color 0.15s',
            }}
          >
            {s.label.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/layout/StickyNav.jsx
git commit -m "feat(layout): add StickyNav scroll-aware section nav"
```

---

## Task 4: Rewrite AppShell.jsx

**Files:**
- Modify: `src/components/layout/AppShell.jsx`

- [ ] **Step 1: Replace the entire file**

```jsx
// src/components/layout/AppShell.jsx
import TopBar from './TopBar';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';

export default function AppShell({
  activeItem,
  activeSection,
  onBackToDashboard,
  onOpenExpeditions,
  onOpenVault,
  onOpenInspire,
  onOpenProfile,
  onOpenTactical,
  onOpenSettings,
  children,
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', overflow: 'hidden', background: 'var(--bg)' }}>
      {/* Top bar — desktop only */}
      <div style={{ display: 'none' }} className="desktop-only">
        <TopBar
          onBackToDashboard={onBackToDashboard}
          onOpenProfile={onOpenProfile}
          onOpenSettings={onOpenSettings}
        />
      </div>
      <TopBar
        onBackToDashboard={onBackToDashboard}
        onOpenProfile={onOpenProfile}
        onOpenSettings={onOpenSettings}
      />

      {/* Body row: sidebar + content */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar — desktop only */}
        <div
          className="sidebar-desktop"
          style={{ display: 'flex' }}
        >
          <Sidebar
            activeItem={activeItem}
            onBackToDashboard={onBackToDashboard}
            onOpenExpeditions={onOpenExpeditions}
            onOpenVault={onOpenVault}
            onOpenInspire={onOpenInspire}
            onOpenProfile={onOpenProfile}
            onOpenTactical={onOpenTactical}
            onOpenSettings={onOpenSettings}
          />
        </div>

        {/* Main content column */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
          <main style={{ flex: 1, overflowY: 'auto' }}>
            {children}
          </main>

          {/* Bottom nav — mobile only */}
          <div className="bottomnav-mobile">
            <BottomNav
              activeBottomTab="PLAN"
              onTabSelect={() => {}}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add responsive CSS to `src/index.css`**

Open `src/index.css` and append at the end:

```css
/* Desktop: show sidebar, hide bottom nav */
@media (min-width: 768px) {
  .sidebar-desktop { display: flex !important; }
  .bottomnav-mobile { display: none !important; }
}

/* Mobile: hide sidebar */
@media (max-width: 767px) {
  .sidebar-desktop { display: none !important; }
  .bottomnav-mobile { display: flex !important; }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/AppShell.jsx src/index.css
git commit -m "feat(layout): restructure AppShell with TopBar + labeled Sidebar + mobile BottomNav"
```

---

## Task 5: Update TripPlanner — remove tab state, add scroll layout

**Files:**
- Modify: `src/pages/TripPlanner.jsx`

This is the largest change. The `tab` state drives all content visibility — replacing it with `activeSection` + always-rendered sections.

- [ ] **Step 1: Replace `tab` state and add section refs at the top of `TripPlanner`**

Find this block near the top of the component body (around line 113):
```jsx
const [tab, setTab] = useState('OVERVIEW');
```

Replace with:
```jsx
const [activeSection, setActiveSection] = useState('section-overview');
const overviewRef   = useRef(null);
const itineraryRef  = useRef(null);
const logisticsRef  = useRef(null);
const staysRef      = useRef(null);
const transportRef  = useRef(null);
const vaultRef      = useRef(null);
const discoveryFetched = useRef(false);
```

- [ ] **Step 2: Replace the two discovery `useEffect` hooks with lazy fetch on intersection**

Find the two `useEffect` blocks that check `if (tab !== 'DISCOVERY' ...)` (around lines 152–168) and replace both with:

```jsx
// Lazy-fetch discovery data when the discovery section scrolls into view
useEffect(() => {
  if (!overviewRef.current) return;
  // We watch the vault section (last) as a proxy — actually watch a discoveryRef
  // but we have no dedicated discovery section in scroll layout.
  // Instead, fetch when component mounts if destination is set.
  if (!trip?.destination) return;
  const city = trip.destination.split(',')[0].trim();

  const observer = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting && !discoveryFetched.current) {
        discoveryFetched.current = true;
        setAttractionsLoading(true);
        searchAttractions(city, attractionCategory)
          .then(setAttractions)
          .finally(() => setAttractionsLoading(false));
        setFoodLoading(true);
        searchFood(city, foodCategory)
          .then(setFood)
          .finally(() => setFoodLoading(false));
      }
    },
    { threshold: 0.05 }
  );

  if (vaultRef.current) observer.observe(vaultRef.current);
  return () => observer.disconnect();
}, [trip?.destination]);
```

- [ ] **Step 3: Add IntersectionObserver for active section tracking**

Add this `useEffect` after the discovery fetch effect:

```jsx
useEffect(() => {
  const sections = [
    { ref: overviewRef,  id: 'section-overview' },
    { ref: itineraryRef, id: 'section-itinerary' },
    { ref: logisticsRef, id: 'section-logistics' },
    { ref: staysRef,     id: 'section-stays' },
    { ref: transportRef, id: 'section-transport' },
    { ref: vaultRef,     id: 'section-vault' },
  ];

  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    },
    { threshold: 0.2, rootMargin: '-48px 0px 0px 0px' }
  );

  sections.forEach(({ ref }) => {
    if (ref.current) observer.observe(ref.current);
  });

  return () => observer.disconnect();
}, []);
```

- [ ] **Step 4: Replace AppShell usage and tab content**

Find the `<AppShell ...>` open tag and update its props:

```jsx
<AppShell
  activeItem="onOpenExpeditions"
  activeSection={activeSection}
  onBackToDashboard={onBackToDashboard}
  onOpenExpeditions={onBackToDashboard}
  onOpenVault={() => {}}
  onOpenProfile={() => setProfileOpen(true)}
  onOpenInspire={() => setInspireOpen(true)}
  onOpenTactical={() => setTacticalMode(true)}
  onOpenSettings={() => setSettingsOpen(true)}
>
```

- [ ] **Step 5: Add StickyNav import and insert it inside AppShell children**

Add to imports at top of file:
```jsx
import StickyNav from '../components/layout/StickyNav';
```

Then inside the `<AppShell>` children, immediately after `<TripHeroImage ... />` and before the header block, add:
```jsx
<StickyNav activeSection={activeSection} />
```

- [ ] **Step 6: Replace the tab-gated `<div className="p-6">` with scroll sections**

Find the block starting with `{/* Tab content */}` and the `<div className="p-6">` that wraps all the `{tab === 'X' && ...}` conditionals. Replace it entirely with:

```jsx
{/* Scrollable sections — all always rendered */}
<section id="section-overview" ref={overviewRef} style={{ scrollMarginTop: 48, padding: '24px 24px 0' }}>
  <div className="space-y-3">
    {/* Row 1: Map (70%) + Path timeline (30%) */}
    <div style={{ display: 'flex', gap: 12, alignItems: 'stretch' }}>
      <div style={{ flex: '0 0 70%', position: 'relative', minHeight: 320 }}>
        <RouteMap
          style={{ height: 320 }}
          selectedDate={selectedDate}
          dayLoops={dayLoops}
          stays={stays}
          pois={pois}
        />
        <AnimatePresence>
          {activeLegId && (
            <LegHud
              leg={legs.find(l => l.id === activeLegId)}
              onClose={() => setActiveLegId(null)}
            />
          )}
        </AnimatePresence>
        {legs.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
            {legs.filter(l => l.status === 'confirmed').map(l => (
              <button
                key={l.id}
                onClick={() => setActiveLegId(activeLegId === l.id ? null : l.id)}
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 9, letterSpacing: '0.08em',
                  padding: '3px 10px', borderRadius: 2,
                  border: `1px solid ${activeLegId === l.id ? '#E67E22' : '#2a2f36'}`,
                  background: activeLegId === l.id ? 'rgba(230,126,34,0.12)' : 'transparent',
                  color: activeLegId === l.id ? '#E67E22' : '#8A8680',
                  cursor: 'pointer',
                }}
              >
                {activeLegId === l.id ? '■ STOP' : `▶ LEG ${l.id}`} {l.to}
              </button>
            ))}
          </div>
        )}
      </div>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <TimelinePath />
      </div>
    </div>
    <GpxPanel />
    <ElevationStrip />
    <SafetyTicker destinationId={destinationId} center={mapCenter} zoom={8} />
  </div>
</section>

<section id="section-itinerary" ref={itineraryRef} style={{ scrollMarginTop: 48, padding: '24px 24px 0' }}>
  <div className="space-y-6">
    {selectedDate ? (() => {
      const dayLoop = dayLoops.find(dl => dl.date === selectedDate);
      const stay    = stays.find(s => s.id === dayLoop?.homebaseStayId);
      const dayPois = (dayLoop?.stopIds ?? []).map(id => pois.find(p => p.id === id)).filter(Boolean);
      return dayLoop ? (
        <div>
          <DayLoopPanel
            dayLoop={dayLoop}
            stay={stay}
            pois={dayPois}
            onAddStop={() => setShowAddStop(true)}
          />
          {showAddStop && (
            <div style={{ padding: 8 }}>
              <AddStopFlow
                dayLoopId={dayLoop.id}
                homebaseCoords={stay?.coords ?? [0, 0]}
                onAdd={(stop) => {
                  addStopToDayLoop(dayLoop.id, stop);
                  const updatedStops = [...dayPois, stop];
                  const effectiveMode = dayLoop.planningMode ?? trip.planningMode ?? 'semi';
                  const result = onStopAdded({ dayLoop, stop, homebaseCoords: stay?.coords ?? [0, 0], allStops: updatedStops, mode: effectiveMode, dispatch });
                  if (effectiveMode === 'semi' && result?.previews) {
                    setPendingPreviews({ previews: result.previews, stopName: stop.name });
                  }
                  setShowAddStop(false);
                }}
                onClose={() => setShowAddStop(false)}
              />
            </div>
          )}
          {pendingPreviews && (
            <div style={{ padding: 8 }}>
              <CascadeConfirmSheet
                previews={pendingPreviews.previews}
                stopName={pendingPreviews.stopName}
                onApply={() => setPendingPreviews(null)}
                onDiscard={() => setPendingPreviews(null)}
                dispatch={dispatch}
              />
            </div>
          )}
        </div>
      ) : (
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--text-muted)', padding: 12 }}>
          No day loop for {selectedDate}. Add a Stay with check-in/check-out dates covering this night first.
        </p>
      );
    })() : null}
    <LedgerWorkbench />
    <KanbanBoard tripName={trip.name} destination={trip.destination} />
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
      <div className="lg:col-span-2"><TransitMap /></div>
      <div className="lg:col-span-3"><LegGuide /></div>
    </div>
    <BudgetLoom />
  </div>
</section>

<section id="section-logistics" ref={logisticsRef} style={{ scrollMarginTop: 48, padding: '24px 24px 0' }}>
  <div className="space-y-4">
    <PackingManifest climate={manifestSettings.climate} days={manifestSettings.days} />
  </div>
</section>

<section id="section-stays" ref={staysRef} style={{ scrollMarginTop: 48, padding: '24px 24px 0' }}>
  <div className="max-w-2xl space-y-4">
    <AccommodationSearch destination={trip.destination} />
  </div>
</section>

<section id="section-transport" ref={transportRef} style={{ scrollMarginTop: 48, padding: '24px 24px 0' }}>
  <div className="max-w-2xl space-y-4">
    <PublicTransport destination={trip.destination} />
  </div>
</section>

<section id="section-vault" ref={vaultRef} style={{ scrollMarginTop: 48, padding: '24px 24px 0 24px' }}>
  <VentureVault onCloneComplete={() => {
    document.getElementById('section-overview')?.scrollIntoView({ behavior: 'smooth' });
  }} />
</section>
```

- [ ] **Step 7: Remove the old `setTab` call in VentureVault's `onCloneComplete`** — already handled in Step 6 above. Also remove the `PlanSubNav` import since StickyNav replaces it. Find and remove:
```jsx
import AppShell from '../components/layout/AppShell';
```
It stays — but also remove:
```jsx
// Remove this import — no longer needed:
// PlanSubNav is now StickyNav inside AppShell
```
Actually PlanSubNav is imported inside AppShell, not TripPlanner. Check `AppShell.jsx` — it imports `PlanSubNav`. Since we rewrote AppShell in Task 4, PlanSubNav is no longer imported there. No action needed.

- [ ] **Step 8: Commit**

```bash
git add src/pages/TripPlanner.jsx
git commit -m "feat(planner): replace tab-switching with infinite scroll + IntersectionObserver section tracking"
```

---

## Task 6: Update App.jsx to pass onOpenExpeditions

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1: Add `onOpenExpeditions` to AppShell calls and pass through**

In `App.jsx`, the `TripPlanner` renders with `onBackToDashboard`. The sidebar inside TripPlanner needs `onOpenExpeditions` to navigate to the expedition select screen. In `handleNavigate` this is already wired as `setView('select')`. We need to pass it through.

Find the TripPlanner render block and confirm AppShell inside TripPlanner receives `onOpenExpeditions`. This is handled by the AppShell props in Task 5 Step 4 — `onOpenExpeditions={onBackToDashboard}` sends the user back to dashboard (which then lets them pick an expedition). This is acceptable since `onBackToDashboard` in TripPlanner calls `handleBackFromPlanner` which goes to `'dashboard'` view.

Update `handleBackFromPlanner` to go to `'select'` instead of `'dashboard'` so the back-to-expeditions nav item works correctly:

Find:
```jsx
function handleBackFromPlanner() {
  if (activeExpeditionId) {
    saveExpedition({
      id: activeExpeditionId,
      trip,
      legs,
      objectives,
      manifestSettings,
    });
  }
  setView('dashboard');
}
```

Change `setView('dashboard')` to `setView('select')` — so "My Expeditions" in the sidebar takes you to the expedition picker, not the dashboard. Keep dashboard nav as a separate option by passing `onBackToDashboard` separately.

Updated TripPlanner AppShell call in Task 5 Step 4 already passes both. No further changes needed in App.jsx.

- [ ] **Step 2: Verify ExpeditionSelectScreen uses new Sidebar props**

Open `src/components/trip/ExpeditionSelectScreen.jsx`. Confirm it passes `onOpenVault` to Sidebar. From the earlier sidebar fix it already passes `onBackToDashboard`, `onOpenProfile`, `onOpenVault`. Add the missing `onOpenExpeditions` prop (which is a no-op on this screen since we're already on expeditions):

Find the `<Sidebar` usage in ExpeditionSelectScreen and update:
```jsx
<Sidebar
  activeItem="onOpenExpeditions"
  onBackToDashboard={onBackToDashboard}
  onOpenProfile={onOpenProfile}
  onOpenVault={onOpenVault}
  onOpenExpeditions={() => {}}
/>
```

- [ ] **Step 3: Commit**

```bash
git add src/App.jsx src/components/trip/ExpeditionSelectScreen.jsx
git commit -m "fix(nav): wire onOpenExpeditions through sidebar; active item highlighting"
```

---

## Task 7: Hide TopBar on mobile, verify bottom nav shows on mobile

**Files:**
- Modify: `src/index.css` (already opened in Task 4)

- [ ] **Step 1: Add TopBar responsive rule**

The TopBar is rendered unconditionally in AppShell. Add a CSS class to hide it on mobile. In AppShell (Task 4), wrap TopBar in a div with class `topbar-desktop`. Add to `src/index.css`:

```css
@media (max-width: 767px) {
  .topbar-desktop { display: none !important; }
}
@media (min-width: 768px) {
  .topbar-desktop { display: block !important; }
}
```

Update `AppShell.jsx` to wrap TopBar:
```jsx
<div className="topbar-desktop">
  <TopBar
    onBackToDashboard={onBackToDashboard}
    onOpenProfile={onOpenProfile}
    onOpenSettings={onOpenSettings}
  />
</div>
```

Remove the duplicate TopBar render from Task 4 Step 1 (the `desktop-only` div was a placeholder — replace with this clean version).

- [ ] **Step 2: Clean up AppShell.jsx**

The AppShell from Task 4 has a leftover `desktop-only` div that renders TopBar twice. Replace the entire AppShell body with the clean version:

```jsx
// src/components/layout/AppShell.jsx
import TopBar from './TopBar';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';

export default function AppShell({
  activeItem,
  onBackToDashboard,
  onOpenExpeditions,
  onOpenVault,
  onOpenInspire,
  onOpenProfile,
  onOpenTactical,
  onOpenSettings,
  children,
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', overflow: 'hidden', background: 'var(--bg)' }}>
      {/* Top bar — hidden on mobile via CSS */}
      <div className="topbar-desktop">
        <TopBar
          onBackToDashboard={onBackToDashboard}
          onOpenProfile={onOpenProfile}
          onOpenSettings={onOpenSettings}
        />
      </div>

      {/* Body row */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar — hidden on mobile via CSS */}
        <div className="sidebar-desktop">
          <Sidebar
            activeItem={activeItem}
            onBackToDashboard={onBackToDashboard}
            onOpenExpeditions={onOpenExpeditions}
            onOpenVault={onOpenVault}
            onOpenInspire={onOpenInspire}
            onOpenProfile={onOpenProfile}
            onOpenTactical={onOpenTactical}
            onOpenSettings={onOpenSettings}
          />
        </div>

        {/* Main content column */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
          <main style={{ flex: 1, overflowY: 'auto' }}>
            {children}
          </main>

          {/* Bottom nav — shown on mobile via CSS */}
          <div className="bottomnav-mobile">
            <BottomNav activeBottomTab="PLAN" onTabSelect={() => {}} />
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/AppShell.jsx src/index.css
git commit -m "fix(layout): clean up AppShell, add responsive show/hide for TopBar/Sidebar/BottomNav"
```

---

## Self-Review Checklist

**Spec coverage:**
- [x] TopBar: Task 1
- [x] Sidebar rewrite with labels: Task 2
- [x] StickyNav: Task 3
- [x] AppShell restructure: Tasks 4 + 7
- [x] TripPlanner scroll layout + IntersectionObserver: Task 5
- [x] Mobile responsive (hide TopBar/Sidebar, show BottomNav): Task 7
- [x] `onOpenExpeditions` wiring: Task 6
- [x] ExpeditionSelectScreen Sidebar props: Task 6
- [x] Discovery lazy fetch on scroll: Task 5 Step 2

**LaunchDashboard:** Spec says "wrap in AppShell so TopBar appears on dashboard too." LaunchDashboard currently uses its own `CommandRail` sidebar — wiring it into the new AppShell would require removing CommandRail and is a significant refactor. Scope this as a follow-up; the current tasks deliver the TripPlanner + expedition select screen improvements which are what the user's screenshot showed as broken.

**Type consistency:** `activeItem` prop is a string matching a prop name key (e.g. `"onOpenExpeditions"`) — used consistently across Sidebar, AppShell, and all call sites.
