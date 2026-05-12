// src/components/dashboard/FeatureCardRow.jsx
import { useRef } from 'react';
import { Map, Users, BookOpen, Crosshair, Camera, Scale } from 'lucide-react';
import { useSquadSync } from '../../hooks/useSquadSync';
import { useTheme } from '../../context/ThemeContext';
import FeatureCard from './FeatureCard';

export default function FeatureCardRow({ onEnterTrip, onOpenVault, onNavigate, cardHeight }) {
  const { syncReady } = useSquadSync();
  const { setTheme } = useTheme();
  const rowRef = useRef(null);

  const CARDS = [
    {
      icon: Map,
      name: 'Trip Planner',
      tagline: 'Architect your expedition leg by leg',
      teaserLines: [
        'Plan legs & itinerary in detail',
        'Set transport mode per leg',
        'Built-in budget tracker',
      ],
      badge: null,
      onClick: onEnterTrip,
    },
    {
      icon: Users,
      name: 'Squad Sync',
      tagline: 'Command your team in real time',
      teaserLines: [
        'Live gear weight balance',
        'Real-time manifest sync',
        'Per-member status badges',
      ],
      badge: syncReady ? '3 members synced' : 'Syncing…',
      onClick: onEnterTrip,
    },
    {
      icon: BookOpen,
      name: 'VentureVault',
      tagline: 'Browse & clone proven Pro-Paths',
      teaserLines: [
        'Browse 200+ curated Pro-Paths',
        'Clone any expedition in 3 taps',
        'Earn as an Architect creator',
      ],
      badge: null,
      onClick: onOpenVault,
    },
    {
      icon: Crosshair,
      name: 'Tactical Mode',
      tagline: 'Offline-ready emergency command',
      teaserLines: [
        'Full offline itinerary access',
        'SOS beacon with GPS text',
        'Emergency contact display',
      ],
      badge: null,
      onClick: () => {
        setTheme('tactical');
        onEnterTrip();
      },
    },
    {
      icon: Camera,
      name: 'AR Ghost Tours',
      tagline: 'Walk through location-anchored history',
      teaserLines: [
        'GPS-anchored historical content',
        'Narrative overlays at each site',
        'Walk the past, anywhere',
      ],
      badge: null,
      onClick: () => onNavigate('ar'),
    },
    {
      icon: Scale,
      name: 'Ledger Workbench',
      tagline: 'Squad decisions, nominations & votes',
      teaserLines: [
        'Nominate expedition options',
        'Squad vote + veto flow',
        'Full decision history log',
      ],
      badge: null,
      onClick: onEnterTrip,
    },
  ];

  return (
    <div style={{ position: 'relative', flex: 1 }}>
      {/* Scroll row */}
      <div
        ref={rowRef}
        style={{
          display: 'flex',
          gap: 16,
          padding: '24px 32px',
          overflowX: 'auto',
          overflowY: 'hidden',
          scrollbarWidth: 'none',
          height: '100%',
          boxSizing: 'border-box',
        }}
      >
        <style>{`.vp-card-row::-webkit-scrollbar { display: none; }`}</style>
        {CARDS.map(card => (
          <FeatureCard
            key={card.name}
            icon={card.icon}
            name={card.name}
            tagline={card.tagline}
            teaserLines={card.teaserLines}
            badge={card.badge}
            onClick={card.onClick}
            cardHeight={cardHeight}
          />
        ))}
      </div>

      {/* Right fade scroll hint */}
      <div style={{
        position: 'absolute', top: 0, right: 0, bottom: 0, width: 80,
        background: 'linear-gradient(to left, rgba(0,0,0,0.5), transparent)',
        pointerEvents: 'none',
      }} />
    </div>
  );
}
