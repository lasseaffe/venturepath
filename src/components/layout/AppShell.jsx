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
  return (
    <div className="flex min-h-screen" style={{ background: 'var(--bg)' }}>
      <Sidebar
        activeTab={activeTab}
        onTabChange={onTabChange}
        onOpenProfile={onOpenProfile}
        onBackToDashboard={onBackToDashboard}
        onOpenChat={onOpenChat}
        onOpenInspire={onOpenInspire}
        onOpenTactical={onOpenTactical}
      />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
