// src/components/dashboard/LaunchDashboard.jsx
import AppShell from '../layout/AppShell';
import ExpeditionPanel from './ExpeditionPanel';
import ActionList from './ActionList';

export default function LaunchDashboard({ onEnterTrip, onOpenVault, onNavigate }) {
  return (
    <AppShell activeView="dashboard" onNavigate={onNavigate}>
      <div style={{ display: 'flex', minHeight: '100%', color: '#fff' }}>
        <ExpeditionPanel />
        <ActionList
          onNavigate={onNavigate}
          onEnterTrip={onEnterTrip}
          onOpenVault={onOpenVault}
        />
      </div>
    </AppShell>
  );
}
