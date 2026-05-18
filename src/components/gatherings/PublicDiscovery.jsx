// REQUIRES UGC POLICY LINK IN APP STORE METADATA
// REQUIRES LOCATION USAGE DESCRIPTION IN APP STORE CONNECT

import { useState, useCallback } from 'react';
import { discoverGatherings, setRsvp, cloneCharter, listCharters } from '../../lib/gatherings/api.js';
import { resolveAccent, getTemplate } from '../../lib/gatherings/templates.js';
import { useAuth } from '../../context/AuthContext.jsx';

const S = {
  root: { fontFamily: 'JetBrains Mono, monospace' },
  tabs: { display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' },
  tab: (active) => ({ padding: '0.45rem 0.9rem', background: active ? '#E67E2222' : 'transparent', border: `1px solid ${active ? '#E67E22' : '#333'}`, color: active ? '#E67E22' : '#888', fontSize: '0.65rem', letterSpacing: '0.1em', cursor: 'pointer', fontFamily: 'JetBrains Mono, monospace' }),
  controls: { display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' },
  label: { color: '#888', fontSize: '0.65rem', letterSpacing: '0.1em' },
  numInput: { width: 70, background: '#1a1a1a', border: '1px solid #333', color: '#fff', padding: '0.45rem', fontSize: '0.8rem', fontFamily: 'JetBrains Mono, monospace' },
  btn: (color = '#E67E22', sm = false) => ({ padding: sm ? '0.35rem 0.7rem' : '0.65rem 1.25rem', background: color, border: 'none', color: '#fff', fontSize: sm ? '0.6rem' : '0.7rem', letterSpacing: '0.08em', cursor: 'pointer', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }),
  ghost: (sm = false) => ({ padding: sm ? '0.35rem 0.7rem' : '0.65rem 1.25rem', background: 'transparent', border: '1px solid #444', color: '#D9C5B2', fontSize: sm ? '0.6rem' : '0.7rem', cursor: 'pointer', fontFamily: 'JetBrains Mono, monospace' }),
  card: (accent) => ({ background: '#111', border: `1px solid ${accent}33`, borderLeft: `3px solid ${accent}`, padding: '0.9rem', marginBottom: '0.5rem' }),
  cardTitle: { color: '#fff', fontFamily: 'Playfair Display, serif', fontWeight: 700, fontSize: '1rem', marginBottom: '0.3rem' },
  meta: { color: '#888', fontSize: '0.7rem', marginBottom: '0.4rem' },
  approxBlob: { background: '#1a1a00', border: '1px solid #E67E2233', color: '#E67E22', fontSize: '0.65rem', padding: '0.3rem 0.6rem', display: 'inline-block', marginBottom: '0.4rem' },
  badge: (color) => ({ display: 'inline-block', padding: '0.2rem 0.45rem', background: color + '22', color, fontSize: '0.6rem', letterSpacing: '0.08em', marginRight: '0.3rem' }),
  ok: { color: '#27AE60', fontSize: '0.7rem', marginTop: '0.3rem' },
  err: { color: '#e74c3c', fontSize: '0.7rem', marginTop: '0.3rem' },
  warn: { background: '#1a1200', border: '1px solid #E67E22', color: '#E67E22', padding: '0.75rem', fontSize: '0.75rem', marginBottom: '1rem' },
};

function GeoFeed({ sabbathFilter }) {
  const { profile } = useAuth();
  const [radius, setRadius]   = useState(50);
  const [results, setResults] = useState([]);
  const [cursor, setCursor]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [msgs, setMsgs]       = useState({});

  const locate = useCallback(() => new Promise((res, rej) => {
    // REQUIRES LOCATION USAGE DESCRIPTION IN APP STORE CONNECT
    navigator.geolocation.getCurrentPosition(
      p => res({ lat: p.coords.latitude, lng: p.coords.longitude }),
      rej,
      { timeout: 8000 }
    );
  }), []);

  async function search(append = false) {
    setLoading(true);
    try {
      const pos = await locate();
      const { data, error } = await discoverGatherings({
        lat: pos.lat, lng: pos.lng,
        radiusKm: radius,
        cursor: append ? cursor : null,
        sabbathFilter,
      });
      if (error) return;
      if (append) setResults(prev => [...prev, ...data]);
      else setResults(data);
      setHasMore(data.length === 20);
      if (data.length > 0) setCursor(data[data.length - 1].starts_at);
    } catch (_) {
      // Location denied — use profile region as fallback
      if (profile?.region) {
        // best-effort: we can't reverse-geocode region string without an API,
        // so just show a message
      }
    } finally {
      setLoading(false);
    }
  }

  async function doRsvp(id) {
    const { error } = await setRsvp(id, 'yes');
    setMsgs(m => ({ ...m, [id]: error ? { type: 'err', text: error.message } : { type: 'ok', text: 'RSVP confirmed — location revealed' } }));
    // Reload this card to show exact coords
    search();
  }

  return (
    <div>
      <div style={S.controls}>
        <span style={S.label}>RADIUS</span>
        <input style={S.numInput} type="number" value={radius} onChange={e => setRadius(Number(e.target.value))} min={5} max={500} />
        <span style={S.label}>km</span>
        <button style={S.btn()} onClick={() => search()} disabled={loading}>
          {loading ? '▢▢▢ SCANNING...' : 'SCAN AREA'}
        </button>
      </div>

      {results.length === 0 && !loading && (
        <div style={{ color: '#555', fontSize: '0.8rem', padding: '1.5rem 0', textAlign: 'center' }}>
          No public Gatherings in range — scan to see what's nearby
        </div>
      )}

      {results.map(g => {
        const accent = resolveAccent(g);
        const tpl    = getTemplate(g.template_id);
        const dist   = g.distance_m < 1000
          ? `${Math.round(g.distance_m)}m`
          : `${(g.distance_m / 1000).toFixed(1)}km`;
        const dateStr = g.starts_at ? new Date(g.starts_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

        return (
          <div key={g.id} style={S.card(accent)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={S.cardTitle}>{g.title}</div>
              <span style={S.badge('#888')}>{dist}</span>
            </div>
            <div style={S.meta}>{tpl.label} · {dateStr} · {g.attendee_count} Pioneers</div>
            <div style={S.meta}>Convened by @{g.convener_handle}</div>

            {g.vibe_tag && <div style={{ color: accent, fontSize: '0.7rem', marginBottom: '0.4rem' }}>{g.vibe_tag}</div>}

            {g.coords_radius_m > 0 && !g.is_attendee ? (
              <div style={S.approxBlob}>
                ◎ Approximate location (~{g.coords_radius_m}m radius) · RSVP to reveal exact
              </div>
            ) : g.location_label ? (
              <div style={{ color: '#D9C5B2', fontSize: '0.7rem' }}>◎ {g.location_label}</div>
            ) : null}

            {!g.is_attendee && (
              <button style={{ ...S.btn(accent, true), marginTop: '0.5rem' }} onClick={() => doRsvp(g.id)}>
                RSVP YES
              </button>
            )}
            {g.is_attendee && <span style={S.badge('#27AE60')}>✓ GOING</span>}

            {msgs[g.id] && <div style={msgs[g.id].type === 'ok' ? S.ok : S.err}>{msgs[g.id].text}</div>}
          </div>
        );
      })}

      {hasMore && (
        <button style={{ ...S.ghost(), width: '100%', textAlign: 'center', marginTop: '0.5rem' }} onClick={() => search(true)} disabled={loading}>
          LOAD MORE
        </button>
      )}
    </div>
  );
}

function CharterLibrary() {
  const [charters, setCharters] = useState([]);
  const [loading, setLoading]   = useState(false);
  const [msgs, setMsgs]         = useState({});

  async function load() {
    setLoading(true);
    const data = await listCharters();
    setCharters(data);
    setLoading(false);
  }

  async function doClone(id) {
    const { error } = await cloneCharter(id);
    setMsgs(m => ({ ...m, [id]: error ? { type: 'err', text: error.message } : { type: 'ok', text: 'Charter cloned into your Gatherings' } }));
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div style={{ color: '#888', fontSize: '0.65rem', letterSpacing: '0.1em' }}>CLONABLE GATHERING TEMPLATES</div>
        <button style={S.btn('#6C3483', true)} onClick={load} disabled={loading}>
          {loading ? 'LOADING...' : 'LOAD CHARTERS'}
        </button>
      </div>

      {charters.length === 0 && !loading && (
        <div style={{ color: '#555', fontSize: '0.75rem', padding: '1rem 0' }}>
          Charters are completed Gatherings published as reusable templates. Load to browse.
        </div>
      )}

      {charters.map(g => {
        const accent = resolveAccent(g);
        const tpl    = getTemplate(g.template_id);
        return (
          <div key={g.id} style={S.card(accent)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={S.cardTitle}>{g.title}</div>
              <span style={{ ...S.badge('#6C3483') }}>{g.charter_clones} clones</span>
            </div>
            <div style={S.meta}>{tpl.label} · by @{g.convener?.handle}</div>
            {g.charter_attribution?.original_title && (
              <div style={{ color: '#666', fontSize: '0.65rem', marginBottom: '0.4rem' }}>
                Based on: {g.charter_attribution.original_title}
              </div>
            )}
            {msgs[g.id] ? (
              <div style={msgs[g.id].type === 'ok' ? S.ok : S.err}>{msgs[g.id].text}</div>
            ) : (
              <button style={{ ...S.btn(accent, true), marginTop: '0.5rem' }} onClick={() => doClone(g.id)}>
                CLONE INTO MY GATHERINGS
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function PublicDiscovery() {
  const { profile } = useAuth();
  const [tab, setTab] = useState('feed');

  return (
    <div style={S.root}>
      {!profile?.verified && (
        <div style={S.warn}>
          PUBLIC GATHERINGS: Only verified Architects can publish public Gatherings. You can still browse and RSVP.
        </div>
      )}

      <div style={S.tabs}>
        <button style={S.tab(tab === 'feed')} onClick={() => setTab('feed')}>GEO-FEED</button>
        <button style={S.tab(tab === 'charters')} onClick={() => setTab('charters')}>CHARTERS</button>
      </div>

      {tab === 'feed' && <GeoFeed sabbathFilter={profile?.sabbath_aware ?? false} />}
      {tab === 'charters' && <CharterLibrary />}
    </div>
  );
}
