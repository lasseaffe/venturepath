// src/components/layout/AppShell.jsx
import TopBar from './TopBar';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';

export default function AppShell({
  activeItem,
  activeBottomTab = 'PLAN',
  onBackToDashboard,
  onOpenExpeditions,
  onOpenVault,
  onOpenInspire,
  onOpenProfile,
  onOpenTactical,
  onOpenSettings,
  onSelectBottomTab,
  children,
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', overflow: 'hidden', background: 'var(--bg)' }}>
      {/* Top bar — hidden on mobile via CSS class */}
      <div className="topbar-desktop">
        <TopBar
          onBackToDashboard={onBackToDashboard}
          onOpenProfile={onOpenProfile}
          onOpenSettings={onOpenSettings}
        />
      </div>

      {/* Body row: sidebar + content */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar — hidden on mobile via CSS class */}
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

          {/* Bottom nav — shown on mobile via CSS class */}
          <div className="bottomnav-mobile">
            <BottomNav activeBottomTab={activeBottomTab} onTabSelect={onSelectBottomTab ?? (() => {})} />
          </div>
        </div>
      </div>
    </div>
  );
}
