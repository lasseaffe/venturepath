// src/components/dashboard/LaunchDashboard.jsx
import { useRef, useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useDestinationImage } from '../../hooks/useDestinationImage';
import { useTripStore } from '../../store/useTripStore';
import CommandRail from './CommandRail';
import HeroStrip from './HeroStrip';
import FeatureCardRow from './FeatureCardRow';

function useHighResUrl(url) {
  const [resolved, setResolved] = useState(url);
  const probeRef = useRef(null);
  useEffect(() => {
    if (!url) { setResolved(null); return; }
    const kUrl = url.replace(/_b\.jpg$/, '_k.jpg');
    if (kUrl === url) { setResolved(url); return; }
    const img = new Image();
    probeRef.current = img;
    img.onload  = () => setResolved(kUrl);
    img.onerror = () => setResolved(url);
    img.src = kUrl;
    return () => {
      if (probeRef.current) {
        probeRef.current.onload = null;
        probeRef.current.onerror = null;
      }
    };
  }, [url]);
  return resolved;
}

export default function LaunchDashboard({ onEnterTrip, onOpenVault, onNavigate }) {
  const { theme } = useTheme();
  const { trip } = useTripStore();
  const { image: heroImage } = useDestinationImage(trip.destination, 'city', 0);
  const heroUrl = useHighResUrl(heroImage?.url ?? null);

  const heroGradient = theme === 'tactical'
    ? 'linear-gradient(to right, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.55) 50%, rgba(0,0,0,0.25) 100%)'
    : 'linear-gradient(to right, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.45) 50%, rgba(0,0,0,0.15) 100%)';

  const cardHeight = Math.max(240, (typeof window !== 'undefined' ? window.innerHeight : 700) - 120 - 48 - 48);

  return (
    <div style={{
      minHeight: '100vh', position: 'relative', overflow: 'hidden',
      background: 'var(--bg, #0E1012)', color: 'var(--text-primary, #fff)',
    }}>
      {/* Full-bleed hero background */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        <div
          className="animate-ken-burns"
          style={{
            position: 'absolute', inset: 0,
            backgroundSize: 'cover', backgroundPosition: 'center',
            ...(heroUrl ? { backgroundImage: `url(${heroUrl})` } : {}),
          }}
        />
        <div style={{ position: 'absolute', inset: 0, background: heroGradient }} />
      </div>

      {/* Command Rail (fixed, left) */}
      <CommandRail
        currentView="dashboard"
        onNavigate={onNavigate}
      />

      {/* Right content area — offset by collapsed rail width (64px) */}
      <div style={{
        position: 'relative', zIndex: 10,
        marginLeft: 64,
        display: 'flex', flexDirection: 'column',
        minHeight: '100vh',
      }}>
        {/* Hero Strip */}
        <HeroStrip onEnterTrip={onEnterTrip} />

        {/* Feature Card Row */}
        <FeatureCardRow
          onEnterTrip={onEnterTrip}
          onOpenVault={onOpenVault}
          onNavigate={onNavigate}
          cardHeight={cardHeight}
        />
      </div>
    </div>
  );
}
