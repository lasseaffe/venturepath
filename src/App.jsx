import { useState } from 'react';
import { TripStoreProvider } from './store/useTripStore';
import { ExpeditionProvider } from './context/ExpeditionContext';
import { SquadGearProvider } from './context/SquadGearContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { OnboardingEngine } from './components/onboarding/OnboardingEngine';
import vpConfig from './config/venturepath.onboarding.config';
import AppRouter from './router/AppRouter';

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
