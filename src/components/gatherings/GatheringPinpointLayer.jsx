// VenturePath · Phase 2 · Gathering Pinpoint markers for RouteMap
// Rendered as a child of MapContainer (react-leaflet pattern).
import L from 'leaflet';
import { Marker, Popup } from 'react-leaflet';
import { resolveAccent, resolveIcon } from '../../lib/gatherings/templates';

function getPinColor(gathering) {
  const now = Date.now();
  const start = new Date(gathering.starts_at).getTime();
  const diff = start - now;
  if (diff < 0 || gathering.status === 'live') return '#F2C94C';   // Golden Hour — live
  if (diff < 3_600_000) return '#F2C94C';                          // Golden Hour — imminent
  return resolveAccent(gathering);                                   // template accent for upcoming
}

function makePinpointIcon(gathering) {
  const color = getPinColor(gathering);
  const icon  = resolveIcon(gathering);
  return L.divIcon({
    className: '',
    iconAnchor: [16, 16],
    popupAnchor: [0, -20],
    html: `
      <div style="
        width:32px;height:32px;border-radius:50%;
        background:${color}22;
        border:2px solid ${color};
        display:flex;align-items:center;justify-content:center;
        font-size:14px;
        box-shadow:0 0 0 3px ${color}33;
        transition:all 0.2s;
      ">
        ${icon}
      </div>
    `,
  });
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export default function GatheringPinpointLayer({ gatherings = [], onOpen }) {
  const visible = gatherings.filter(g =>
    g.coords &&
    Array.isArray(g.coords) &&
    g.coords.length === 2 &&
    g.status !== 'cancelled'
  );

  return visible.map(g => {
    // coords stored as [lng, lat] — Leaflet needs [lat, lng]
    const position = [g.coords[1], g.coords[0]];
    const accent = resolveAccent(g);

    return (
      <Marker
        key={g.id}
        position={position}
        icon={makePinpointIcon(g)}
      >
        <Popup>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, minWidth: 180, background: '#0E1012', color: '#fff', padding: '10px 12px', margin: -14 }}>
            <div style={{ fontWeight: 700, color: accent, marginBottom: 4, fontSize: 13 }}>
              {resolveIcon(g)} {g.title}
            </div>
            {g.vibe_tag && (
              <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10, fontStyle: 'italic', marginBottom: 6 }}>
                "{g.vibe_tag}"
              </div>
            )}
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, marginBottom: 8 }}>
              ◷ {formatDate(g.starts_at)}
            </div>
            {onOpen && (
              <button
                onClick={() => onOpen(g.id)}
                style={{
                  background: accent, color: '#000', border: 'none',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 9, letterSpacing: '0.12em', fontWeight: 700,
                  padding: '5px 10px', cursor: 'pointer', textTransform: 'uppercase', width: '100%',
                }}
              >
                OPEN GATHERING
              </button>
            )}
          </div>
        </Popup>
      </Marker>
    );
  });
}
