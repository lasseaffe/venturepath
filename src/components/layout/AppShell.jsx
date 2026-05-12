import BottomNav from './BottomNav';
import PlanSubNav from './PlanSubNav';

const PLAN_TABS = new Set(['OVERVIEW', 'ITINERARY', 'PUBLIC TRANSPORT', 'STAYS', 'LOGISTICS', 'VAULT']);

function getBottomTab(activeTab) {
  if (activeTab === 'DISCOVERY') return 'DISCOVER';
  return 'PLAN';
}

export default function AppShell({
  activeTab,
  onTabChange,
  onOpenProfile,
  onBackToDashboard,
  onOpenChat,
  onOpenInspire,
  onOpenTactical,
  onOpenSettings,
  children,
}) {
  const activeBottomTab = getBottomTab(activeTab);

  function handleBottomTab(id) {
    if (id === 'RECORD') {
      onOpenTactical?.();
      return;
    }
    if (id === 'DISCOVER') {
      onTabChange('DISCOVERY');
      return;
    }
    // PLAN — restore Overview if currently showing Discovery
    if (activeTab === 'DISCOVERY') {
      onTabChange('OVERVIEW');
    }
  }

  const showPlanSubNav = PLAN_TABS.has(activeTab);

  return (
    <div style={{ display: 'flex', height: '100dvh', overflow: 'hidden', background: 'var(--bg)' }}>
      {/* Main column */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

        {/* Horizontal sub-tabs when in PLAN mode */}
        {showPlanSubNav && (
          <PlanSubNav activeTab={activeTab} onTabChange={onTabChange} />
        )}

        {/* Scrollable content area */}
        <main style={{ flex: 1, overflowY: 'auto' }}>
          {children}
        </main>

        {/* Persistent bottom nav */}
        <BottomNav activeBottomTab={activeBottomTab} onTabSelect={handleBottomTab} />
      </div>
    </div>
  );
}
