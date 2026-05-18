import { useState, useCallback } from 'react';
import ErrorBoundary from './ErrorBoundary.jsx';
import { TripStoreProvider, useTripStore } from './store/useTripStore';
import { ExpeditionProvider } from './context/ExpeditionContext';
import { SquadGearProvider } from './context/SquadGearContext';
import { AuthProvider } from './context/AuthContext.jsx';
import { useExpeditionList } from './hooks/useExpeditionList';
import { OnboardingEngine } from './components/onboarding/OnboardingEngine';
import vpConfig from './config/venturepath.onboarding.config';
import LaunchDashboard from './components/dashboard/LaunchDashboard';
import TripPlanner from './pages/TripPlanner';
import VentureVault from './components/discovery/VentureVault';
import ExpeditionSelectScreen from './components/trip/ExpeditionSelectScreen';
import Moodboard from './pages/Moodboard';
import Studio from './pages/Studio.jsx';
import Events from './pages/Events.jsx';
import Auth from './pages/Auth.jsx';
import Profile from './pages/Profile.jsx';

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
    if (key === 'select' || key === 'dashboard') {
      setView(key);
    } else if (key === 'vault') {
      setView('vault');
    } else if (key === 'profile') {
      setView('profile');
    } else if (key === 'studio') {
      setView('studio');
    } else if (key === 'events') {
      setView('events');
    } else if (key === 'auth') {
      setView('auth');
    } else if (key === 'tactical' || key === 'ar' || key === 'ledger') {
      setView('select');
    }
  }, []);

  function handleBackFromPlanner() {
    if (activeExpeditionId) {
      saveExpedition({ id: activeExpeditionId, trip, legs, objectives, manifestSettings });
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

  if (view === 'moodboard') return <Moodboard onBackToDashboard={() => setView('dashboard')} />;
  if (view === 'studio')    return <Studio onBack={() => setView('dashboard')} />;
  if (view === 'auth')      return <Auth onSuccess={() => setView('dashboard')} />;
  if (view === 'profile')   return <Profile onClose={() => setView('dashboard')} onSignedOut={() => setView('dashboard')} />;
  if (view === 'events')    return <Events onBack={() => setView('dashboard')} />;

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

function App() {
  return (
    <ErrorBoundary>
      <TripStoreProvider>
        <SquadGearProvider>
          <ExpeditionProvider>
            <AuthProvider>
              <OnboardingEngine config={vpConfig} />
              <AppRouter />
            </AuthProvider>
          </ExpeditionProvider>
        </SquadGearProvider>
      </TripStoreProvider>
    </ErrorBoundary>
  );
}

export default App;
