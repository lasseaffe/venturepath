// src/LegacyApp.jsx
// Legacy state-view router. The new react-router-based AppRouter renders this
// under a catch-all "*" route — every legacy view (dashboard / planner / vault
// / profile / events / moodboard / auth / select) still works unchanged.
import { useState, useCallback } from 'react';
import { useTripStore } from './store/useTripStore';
import { useExpeditionList } from './hooks/useExpeditionList';
import LaunchDashboard from './components/dashboard/LaunchDashboard';
import TripPlanner from './pages/TripPlanner';
import VentureVault from './components/discovery/VentureVault';
import ExpeditionSelectScreen from './components/trip/ExpeditionSelectScreen';
import Moodboard from './pages/Moodboard';
import Events from './pages/Events';
import Auth from './pages/Auth';
import Profile from './pages/Profile';

export default function LegacyApp() {
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
