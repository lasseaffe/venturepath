// src/pages/ExpeditionDetail.jsx
// Spec 0 stub for /expedition/:slug — Spec 2 replaces with full detail page.
import { Link, useParams } from 'react-router-dom';

export default function ExpeditionDetail() {
  const { slug } = useParams();

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
        Expedition
      </h1>
      <p
        className="mt-4 text-xs uppercase tracking-widest"
        style={{ color: 'var(--accent)', fontFamily: 'JetBrains Mono, monospace' }}
      >
        EXPEDITION: {slug}
      </p>
      <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
        Hero, map, elevation, waypoints, and Clone CTA arrive in Spec 2.
      </p>
    </div>
  );
}
