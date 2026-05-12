import { useState } from 'react';
import { moodboard } from '../moodboard.config';
import { SectionShell, CARD } from './SectionShell';

export function Motion() {
  const [shake, setShake] = useState(0);
  return (
    <SectionShell id="motion" number="10" title="Motion" lede={moodboard.motion.intent}>
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <div className="p-5" style={CARD}>
          <h3 className="text-[10px] uppercase mb-3" style={{ color: 'var(--accent)', fontFamily: '"JetBrains Mono", monospace', letterSpacing: '0.25em' }}>pulse-gold</h3>
          <div className="flex items-center gap-4">
            <span
              style={{
                display: 'inline-block',
                width: 12,
                height: 12,
                borderRadius: '50%',
                background: '#F2C94C',
                animation: 'pulse-gold 2s infinite',
              }}
            />
            <span className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>Notification pulse — Golden Hour rgba(242,201,76,0.4)</span>
          </div>
        </div>

        <div className="p-5" style={CARD}>
          <h3 className="text-[10px] uppercase mb-3" style={{ color: 'var(--accent)', fontFamily: '"JetBrains Mono", monospace', letterSpacing: '0.25em' }}>shake (Vetoed by Squad)</h3>
          <button
            onClick={() => setShake((s) => s + 1)}
            style={{ background: 'transparent', color: 'var(--accent)', border: '1px solid var(--accent)', padding: '8px 14px', borderRadius: 'var(--radius-card)', fontFamily: '"JetBrains Mono", monospace', fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase' }}
          >
            Replay
          </button>
          <div
            key={shake}
            className="mt-3 p-3"
            style={{
              border: '1px solid var(--status-alert)',
              color: 'var(--status-alert)',
              borderRadius: 'var(--radius-card)',
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: 11,
              animation: shake ? 'shake 0.4s' : 'none',
              maxWidth: 220,
            }}
          >
            ✗ VETOED BY SQUAD
          </div>
        </div>

        <div className="p-5 md:col-span-2" style={CARD}>
          <h3 className="text-[10px] uppercase mb-3" style={{ color: 'var(--accent)', fontFamily: '"JetBrains Mono", monospace', letterSpacing: '0.25em' }}>ken-burns (hero imagery)</h3>
          <div
            style={{
              height: 120,
              overflow: 'hidden',
              borderRadius: 'var(--radius-card)',
              background: 'linear-gradient(135deg, var(--accent) 0%, var(--sandstone) 100%)',
              animation: 'ken-burns 20s ease-in-out infinite',
            }}
          />
        </div>
      </div>

      <div className="p-5" style={CARD}>
        <h3 className="text-[10px] uppercase mb-3" style={{ color: 'var(--accent)', fontFamily: '"JetBrains Mono", monospace', letterSpacing: '0.25em' }}>Named animations & easings</h3>
        <ul className="space-y-2">
          {moodboard.motion.namedAnimations.map((a) => (
            <li key={a.name} className="flex items-baseline gap-3 text-[13px]" style={{ color: 'var(--text-primary)' }}>
              <code style={{ color: 'var(--accent)', fontFamily: '"JetBrains Mono", monospace', fontSize: 12 }}>{a.name}</code>
              <span style={{ color: 'var(--text-secondary)' }}>· {a.duration} — {a.note}</span>
            </li>
          ))}
        </ul>
        <hr className="my-3" style={{ border: 'none', borderTop: '1px solid var(--border)' }} />
        <ul className="space-y-2">
          {moodboard.motion.easings.map((e) => (
            <li key={e.name} className="text-[13px]" style={{ color: 'var(--text-primary)' }}>
              <strong>{e.name}</strong> · <code style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 12, color: 'var(--accent)' }}>{e.value}</code> — <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>{e.note}</span>
            </li>
          ))}
        </ul>
        <p className="text-[11px] italic mt-3" style={{ color: 'var(--text-secondary)' }}>{moodboard.motion.reducedMotion}</p>
      </div>
    </SectionShell>
  );
}
