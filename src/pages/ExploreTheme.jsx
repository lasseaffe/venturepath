// src/pages/ExploreTheme.jsx
// Spec 0 stub for /explore/:theme — Spec 1 fills with themed Pro-Path grid.
import { Link, useParams } from 'react-router-dom';

const THEMES = new Set(['movie', 'historical', 'thematic', 'city', 'geographical']);

export default function ExploreTheme() {
  const { theme } = useParams();
  const known = THEMES.has(theme);

  return (
    <div
      className="min-h-screen p-6"
      style={{ background: 'var(--bg)', color: 'var(--text-primary)' }}
    >
      <Link
        to="/explore"
        className="text-xs hover:underline"
        style={{ color: 'var(--text-secondary)', fontFamily: 'JetBrains Mono, monospace' }}
      >
        ← VENTUREVAULT
      </Link>
      <h1
        className="font-playfair text-3xl mt-6"
        style={{ color: 'var(--text-primary)' }}
      >
        Theme — {theme}
      </h1>
      <p
        className="mt-4 text-xs uppercase tracking-widest"
        style={{
          color: known ? 'var(--accent)' : 'var(--status-warn)',
          fontFamily: 'JetBrains Mono, monospace',
        }}
      >
        {known ? `THEME: ${theme}` : `UNKNOWN THEME: ${theme}`}
      </p>
      <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
        Known registers: movie · historical · thematic · city · geographical.
      </p>
    </div>
  );
}
