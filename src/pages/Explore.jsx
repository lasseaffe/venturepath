// src/pages/Explore.jsx
// Spec 0 stub for /explore — Spec 1 (Discovery) replaces with VentureVault browse.
import { Link } from 'react-router-dom';

export default function Explore() {
  return (
    <div
      className="min-h-screen p-6"
      style={{ background: 'var(--bg)', color: 'var(--text-primary)' }}
    >
      <Link
        to="/"
        className="text-xs hover:underline"
        style={{ color: 'var(--text-secondary)', fontFamily: 'JetBrains Mono, monospace' }}
      >
        ← BASECAMP
      </Link>
      <h1
        className="font-playfair text-3xl mt-6"
        style={{ color: 'var(--text-primary)' }}
      >
        VentureVault — Discovery
      </h1>
      <p
        className="mt-4 text-xs uppercase tracking-widest"
        style={{ color: 'var(--accent)', fontFamily: 'JetBrains Mono, monospace' }}
      >
        FETCHING CURATED EXPEDITIONS…
      </p>
      <p
        className="mt-2 text-sm"
        style={{ color: 'var(--text-secondary)' }}
      >
        Architects, Pro-Paths surface here once Spec 1 lands. The route is wired;
        the inventory is being seeded.
      </p>
    </div>
  );
}
