import { useState } from 'react';
import Sidebar from './Sidebar';

export default function AppShell({
  activeTab,
  onTabChange,
  onOpenProfile,
  onBackToDashboard,
  onOpenChat,
  onOpenInspire,
  onOpenTactical,
  children,
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  function closeDrawer() { setDrawerOpen(false); }

  return (
    <div className="flex h-dvh" style={{ background: 'var(--bg)' }}>

      {/* Mobile backdrop */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={closeDrawer}
        />
      )}

      {/* Sidebar — always in DOM; transformed off-screen on mobile when closed */}
      <div
        className={[
          'fixed inset-y-0 left-0 z-50 md:static md:z-auto md:translate-x-0',
          'transition-transform duration-200 ease-in-out shrink-0',
          drawerOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        <Sidebar
          activeTab={activeTab}
          onTabChange={(tab) => { onTabChange(tab); closeDrawer(); }}
          onOpenProfile={() => { onOpenProfile?.(); closeDrawer(); }}
          onBackToDashboard={() => { onBackToDashboard?.(); closeDrawer(); }}
          onOpenChat={() => { onOpenChat?.(); closeDrawer(); }}
          onOpenInspire={onOpenInspire}
          onOpenTactical={() => { onOpenTactical?.(); closeDrawer(); }}
        />
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-auto flex flex-col min-w-0">
        {/* Mobile top bar */}
        <div
          className="md:hidden flex items-center gap-3 px-4 py-3 border-b shrink-0"
          style={{ background: 'var(--nav-bg)', borderColor: 'rgba(255,255,255,0.15)' }}
        >
          <button
            onClick={() => setDrawerOpen(true)}
            className="w-10 h-10 flex items-center justify-center rounded-lg"
            style={{ color: 'var(--nav-text)' }}
            aria-label="Open navigation"
          >
            <svg width="20" height="20" fill="none" viewBox="0 0 20 20">
              <rect x="2" y="5" width="16" height="1.8" rx="0.9" fill="currentColor" />
              <rect x="2" y="9.1" width="16" height="1.8" rx="0.9" fill="currentColor" />
              <rect x="2" y="13.2" width="16" height="1.8" rx="0.9" fill="currentColor" />
            </svg>
          </button>
          <span
            className="font-semibold text-sm tracking-wide"
            style={{ color: 'var(--nav-text)' }}
          >
            VenturePath
          </span>
        </div>

        {children}
      </main>
    </div>
  );
}
