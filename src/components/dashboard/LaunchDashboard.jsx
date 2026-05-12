// src/components/dashboard/LaunchDashboard.jsx
import { useTheme } from '../../context/ThemeContext';
import CommandRail from './CommandRail';
import ExpeditionPanel from './ExpeditionPanel';
import ActionList from './ActionList';

export default function LaunchDashboard({ onEnterTrip, onOpenVault, onNavigate }) {
  const { theme } = useTheme();

  return (
    <div style={{
      minHeight: '100vh',
      background: theme === 'tactical' ? '#0A0A0A' : '#0E1012',
      color: '#fff',
      display: 'flex',
    }}>
      <CommandRail currentView="dashboard" onNavigate={onNavigate} />

      {/* Content area — offset by CommandRail (64px collapsed) */}
      <div style={{ marginLeft: 64, flex: 1, display: 'flex', minHeight: '100vh' }}>
        <ExpeditionPanel />
        <ActionList
          onNavigate={onNavigate}
          onEnterTrip={onEnterTrip}
          onOpenVault={onOpenVault}
        />
      </div>
    </div>
  );
}
