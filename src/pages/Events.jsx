import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useGatherings } from '../lib/gatherings/useGatherings.js';
import GatheringsHub from '../components/gatherings/GatheringsHub.jsx';
import PublicDiscovery from '../components/gatherings/PublicDiscovery.jsx';
import Auth from './Auth.jsx';

const S = {
  root: { minHeight: '100vh', background: '#0E1012', padding: '1.5rem', fontFamily: 'JetBrains Mono, monospace' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' },
  back: { background: 'none', border: 'none', color: '#888', fontSize: '0.7rem', letterSpacing: '0.1em', cursor: 'pointer', padding: 0 },
  pre: { color: '#E67E22', fontSize: '0.65rem', letterSpacing: '0.12em', marginBottom: '0.25rem' },
  title: { color: '#fff', fontFamily: 'Playfair Display, serif', fontSize: '1.6rem', fontWeight: 700 },
  tabs: { display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid #1a1a1a', paddingBottom: '0.75rem' },
  tab: (active) => ({ padding: '0.5rem 1rem', background: active ? '#E67E2222' : 'transparent', border: `1px solid ${active ? '#E67E22' : '#2a2a2a'}`, color: active ? '#E67E22' : '#666', fontSize: '0.65rem', letterSpacing: '0.1em', cursor: 'pointer', fontFamily: 'JetBrains Mono, monospace' }),
};

export default function Events({ onBack }) {
  const { status } = useAuth();
  const { items, loading, reload } = useGatherings();
  const [tab, setTab] = useState('mine');

  if (status === 'loading') {
    return (
      <div style={{ ...S.root, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#E67E22', fontSize: '0.8rem' }}>▢▢▢ INITIALISING GATHERINGS...</div>
      </div>
    );
  }

  if (status === 'anonymous') {
    return <Auth onSuccess={() => {}} />;
  }

  return (
    <div style={S.root}>
      <div style={S.header}>
        <div>
          <div style={S.pre}>// VENTUREPATH — GATHERINGS</div>
          <div style={S.title}>Your Gatherings</div>
        </div>
        {onBack && <button style={S.back} onClick={onBack}>← BACK TO BASECAMP</button>}
      </div>

      <div style={S.tabs}>
        <button style={S.tab(tab === 'mine')} onClick={() => setTab('mine')}>MY GATHERINGS</button>
        <button style={S.tab(tab === 'discover')} onClick={() => setTab('discover')}>DISCOVER</button>
      </div>

      {tab === 'mine' && (
        <GatheringsHub
          items={items}
          loading={loading}
          onReload={reload}
        />
      )}

      {tab === 'discover' && <PublicDiscovery />}
    </div>
  );
}
