import { motion, AnimatePresence } from 'framer-motion';

const PROFILE_LABELS = {
  foot: 'FOOT',
  cycling: 'CYCLING',
  mtb: 'MTB',
  car: 'CAR',
  boat: 'BOAT',
  flight: 'FLIGHT',
};

const DIFFICULTY_COLORS = {
  easy: '#4CAF50',
  moderate: '#F2C94C',
  hard: '#E67E22',
  expert: '#C03030',
};

function StatsRow({ stats }) {
  const diffColor = DIFFICULTY_COLORS[stats.difficulty] ?? '#8A8680';
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)',
      gap: 8, marginBottom: 16,
    }}>
      {[
        { label: 'DIST', value: `${stats.distanceKm} km` },
        { label: 'DURATION', value: `${stats.durationH} h` },
        { label: 'ASCENT', value: `↑ ${stats.ascentM} m` },
        { label: 'DESCENT', value: `↓ ${stats.descentM} m` },
      ].map(({ label, value }) => (
        <div key={label} style={{
          background: '#0A0C0E', border: '1px solid #1a1f24',
          borderRadius: 2, padding: '8px 10px',
        }}>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 8, letterSpacing: '0.1em', textTransform: 'uppercase',
            color: '#484440', marginBottom: 4,
          }}>{label}</div>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11, color: '#F2EDE8',
          }}>{value}</div>
        </div>
      ))}
      {/* Difficulty pill */}
      <div style={{
        background: '#0A0C0E', border: `1px solid ${diffColor}`,
        borderRadius: 2, padding: '8px 10px',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      }}>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 8, letterSpacing: '0.1em', textTransform: 'uppercase',
          color: '#484440', marginBottom: 4,
        }}>GRADE</div>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
          color: diffColor,
        }}>{stats.difficulty}</div>
      </div>
    </div>
  );
}

function WaypointList({ waypoints }) {
  if (!waypoints || waypoints.length === 0) {
    return (
      <div style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 9, color: '#D9C5B2', letterSpacing: '0.04em',
        padding: '8px 0', marginBottom: 12,
      }}>
        No waypoints in this track
      </div>
    );
  }

  const shown = waypoints.slice(0, 5);
  const overflow = waypoints.length - shown.length;

  return (
    <div style={{
      border: '1px solid #1a1f24', borderRadius: 2, marginBottom: 12,
    }}>
      {shown.map((w, i) => (
        <div key={w.id ?? i} style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '7px 12px',
          borderBottom: i < shown.length - 1 ? '1px solid #1a1f24' : 'none',
        }}>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 8, letterSpacing: '0.08em',
            color: '#E67E22', minWidth: 18, textAlign: 'right',
          }}>
            {i + 1}
          </div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#F2EDE8', flex: 1 }}>
            {w.name}
          </div>
          {w.category && (
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 8, letterSpacing: '0.08em', textTransform: 'uppercase',
              color: '#484440',
            }}>{w.category}</div>
          )}
        </div>
      ))}
      {overflow > 0 && (
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 9, color: '#D9C5B2', letterSpacing: '0.04em',
          padding: '6px 12px', textAlign: 'center',
          borderTop: '1px solid #1a1f24',
        }}>
          and {overflow} more
        </div>
      )}
    </div>
  );
}

export default function GpxImportDialogV2({ track, multiTrackWarning, onConfirm, onCancel }) {
  if (!track) return null;

  const { name, profile, points, waypoints, stats } = track;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(10,11,12,0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 24,
        }}
        onClick={onCancel}
      >
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          onClick={e => e.stopPropagation()}
          style={{
            background: '#101214',
            border: '1px solid #2a2f36',
            borderRadius: 4,
            padding: 24,
            width: '100%',
            maxWidth: 500,
          }}
        >
          {/* Header */}
          <div style={{ marginBottom: 16, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase',
                color: '#E67E22', marginBottom: 4,
              }}>
                GPX TRACK IMPORT
              </div>
              <div style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 18, color: '#F2EDE8', lineHeight: 1.3,
              }}>
                {name || 'Unnamed Track'}
              </div>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 9, color: '#D9C5B2', marginTop: 4,
              }}>
                {(points ?? []).length} points recorded
              </div>
            </div>
            {/* Profile badge */}
            <div style={{
              background: '#E67E22', borderRadius: 2,
              padding: '4px 8px', flexShrink: 0,
            }}>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 9, fontWeight: 700, letterSpacing: '0.1em',
                color: '#0E1012',
              }}>
                {PROFILE_LABELS[profile] ?? (profile ?? 'FOOT').toUpperCase()}
              </div>
            </div>
          </div>

          {/* Stats row */}
          {stats && <StatsRow stats={stats} />}

          {/* Elevation band */}
          {stats && (
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10, color: '#D9C5B2', letterSpacing: '0.06em',
              marginBottom: 12,
            }}>
              Min {stats.minEleM ?? 0} m — Max {stats.maxEleM ?? 0} m
            </div>
          )}

          {/* Waypoints */}
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase',
            color: '#484440', marginBottom: 6,
          }}>
            Waypoints
          </div>
          <WaypointList waypoints={waypoints} />

          {/* Multi-track warning */}
          {multiTrackWarning && (
            <div style={{
              border: '1px solid #E67E22', borderRadius: 2,
              padding: '8px 12px', marginBottom: 16,
            }}>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 9, color: '#E67E22', letterSpacing: '0.04em',
              }}>
                Only the first track was loaded — Phase 4 adds multi-track support.
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <button
              onClick={() => onConfirm('append-as-leg')}
              style={{
                flex: 1, padding: '10px 0',
                background: '#E67E22', border: 'none', borderRadius: 2,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
                color: '#0E1012', cursor: 'pointer',
              }}
            >
              APPEND AS LEG
            </button>
            <button
              onClick={() => onConfirm('replace-with-leg')}
              style={{
                flex: 1, padding: '10px 0',
                background: 'transparent',
                border: '1px solid #E67E22', borderRadius: 2,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
                color: '#E67E22', cursor: 'pointer',
              }}
            >
              REPLACE ITINERARY
            </button>
          </div>

          {/* Cancel link */}
          <div style={{ textAlign: 'center' }}>
            <button
              onClick={onCancel}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase',
                color: '#484440',
                textDecoration: 'underline',
              }}
            >
              Cancel
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
