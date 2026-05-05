/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        /* Legacy brand tokens (kept for tactical-only hardcoded components) */
        brand: {
          bg: '#0E1012',
          accent: '#E67E22',
          surface: '#111316',
          raised: '#1a1f24',
          border: '#2a2f36',
          'midnight-silk': '#0F1115',
          'golden-hour': '#F2C94C',
          sandstone: '#D9C5B2',
        },
        /* Theme-aware aliases via CSS vars */
        theme: {
          bg:        'var(--bg)',
          surface:   'var(--surface)',
          raised:    'var(--surface-raised)',
          border:    'var(--border)',
          'nav-bg':  'var(--nav-bg)',
          accent:    'var(--accent)',
          cta:       'var(--cta)',
          primary:   'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted:     'var(--text-muted)',
          ok:        'var(--status-ok)',
          warn:      'var(--status-warn)',
          alert:     'var(--status-alert)',
        },
      },
      borderRadius: {
        card: 'var(--radius-card)',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
      },
      fontFamily: {
        editorial: ['"Playfair Display"', 'serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'ui-monospace', 'Consolas'],
      },
    },
  },
  plugins: [],
}
