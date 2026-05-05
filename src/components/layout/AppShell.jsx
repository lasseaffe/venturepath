import Sidebar from './Sidebar';

export default function AppShell({ activeTab, onTabChange, onOpenProfile, onBackToDashboard, children }) {
  return (
    <div className="flex min-h-screen" style={{ background: 'var(--bg)' }}>
      <Sidebar
        activeTab={activeTab}
        onTabChange={onTabChange}
        onOpenProfile={onOpenProfile}
        onBackToDashboard={onBackToDashboard}
      />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
