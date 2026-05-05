import { useState } from 'react';
import { TripStoreProvider } from './store/useTripStore';
import { ExpeditionProvider } from './context/ExpeditionContext';
import { SquadGearProvider } from './context/SquadGearContext';
import LaunchDashboard from './components/dashboard/LaunchDashboard';
import TripPlanner from './pages/TripPlanner';
import ArchitectProfile from './components/social/ArchitectProfile';
import VentureVault from './components/discovery/VentureVault';

function AppRouter() {
  const [view, setView] = useState('dashboard');

  if (view === 'planner') {
    return (
      <TripPlanner
        onBackToDashboard={() => setView('dashboard')}
      />
    );
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
      onEnterTrip={() => setView('planner')}
      onOpenVault={() => setView('vault')}
      onOpenChat={() => setView('planner')}
      onOpenProfile={() => setView('profile')}
    />
  );
}

function App() {
  return (
    <TripStoreProvider>
      <SquadGearProvider>
        <ExpeditionProvider>
          <AppRouter />
        </ExpeditionProvider>
      </SquadGearProvider>
    </TripStoreProvider>
  );
}

export default App;
