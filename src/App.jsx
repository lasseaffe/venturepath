import { useState, useCallback } from 'react';
import { TripStoreProvider, useTripStore } from './store/useTripStore';
import { ExpeditionProvider } from './context/ExpeditionContext';
import { SquadGearProvider } from './context/SquadGearContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useExpeditionList } from './hooks/useExpeditionList';
import { OnboardingEngine } from './components/onboarding/OnboardingEngine';
import vpConfig from './config/venturepath.onboarding.config';
import LaunchDashboard from './components/dashboard/LaunchDashboard';
import TripPlanner from './pages/TripPlanner';
import ArchitectProfile from './components/social/ArchitectProfile';
import VentureVault from './components/discovery/VentureVault';
import ExpeditionSelectScreen from './components/trip/ExpeditionSelectScreen';
import Moodboard from './pages/Moodboard';
import Events from './pages/Events';
import Auth from './pages/Auth';
import Profile from './pages/Profile';

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
    if (key === 'dashboard') setView('dashboard');
    else if (key === 'select') setView('select');
    else if (key === 'vault') setView('vault');
    else if (key === 'profile') setView('profile');
    else if (key === 'events') setView('events');
    else if (key === 'tactical' || key === 'ar' || key === 'ledger' || key === 'inspire' || key === 'settings') {
      setView('select');
    }
  }, []);

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
    setView('select');
  }

  if (view === 'select') {
    return (
      <ExpeditionSelectScreen
        onEnter={handleEnterExpedition}
        onNavigate={handleNavigate}
        onBackToDashboard={() => setView('dashboard')}
        onOpenVault={() => setView('vault')}
        onOpenProfile={() => setView('profile')}
        onOpenExpeditions={() => {}}
      />
    );
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

  if (view === 'events') {
    return <Events onClose={() => setView('dashboard')} />;
  }

  if (view === 'auth') {
    return <Auth onAuthenticated={() => setView('dashboard')} onCancel={() => setView('dashboard')} />;
  }

  if (view === 'profile') {
    return <Profile onClose={() => setView('dashboard')} onSignedOut={() => setView('dashboard')} />;
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

function HandleSetupNudge() {
  const { needsHandleSetup, status } = useAuth();
  const [hidden, setHidden] = useState(false);
  if (status !== 'authenticated' || !needsHandleSetup || hidden) return null;
  return (
    <div
      style={{
        position: 'fixed', bottom: 20, right: 20, zIndex: 9999,
        background: 'rgba(230,126,34,0.15)', border: '1px solid rgba(230,126,34,0.5)',
        padding: '10px 14px', display: 'flex', gap: 10, alignItems: 'center',
        fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#E67E22',
        maxWidth: 300,
      }}
    >
      <span>⚠ Draft handle active. Set a permanent handle in your Dossier.</span>
      <button
        onClick={() => setHidden(true)}
        style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 12 }}
      >
        ✕
      </button>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <TripStoreProvider>
        <SquadGearProvider>
          <ExpeditionProvider>
            <OnboardingEngine config={vpConfig} />
            <AppRouter />
            <HandleSetupNudge />
          </ExpeditionProvider>
        </SquadGearProvider>
      </TripStoreProvider>
    </AuthProvider>
  );
}

export default App;
