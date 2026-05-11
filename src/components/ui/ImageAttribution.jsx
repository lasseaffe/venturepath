// src/components/ui/ImageAttribution.jsx
import { useState, useEffect, useRef } from 'react';

/**
 * CC attribution display: persistent micro-bar + click-to-expand popover.
 * The micro-bar must always be visible to satisfy CC license requirements.
 *
 * @param {{ author, authorUrl, photoPageUrl, license, licenseUrl }} attribution
 * @param {string} [className]
 */
export default function ImageAttribution({ attribution, className = '' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  if (!attribution?.author) return null;

  return (
    <div ref={ref} className={`absolute bottom-0 left-0 right-0 ${className}`} style={{ zIndex: 10 }}>

      {/* Persistent micro-bar — always rendered, satisfies CC attribution requirement */}
      <button
        onClick={e => { e.stopPropagation(); setOpen(v => !v); }}
        style={{
          width: '100%', padding: '2px 6px',
          background: 'rgba(0,0,0,0.52)', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4,
        }}
      >
        <span style={{
          fontSize: 8, color: 'rgba(255,255,255,0.38)',
          fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.03em',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%',
        }}>
          © {attribution.author} · {attribution.license}
        </span>
      </button>

      {/* Click-to-expand popover with author link, license link, original URL */}
      {open && (
        <div
          onClick={e => e.stopPropagation()}
          style={{
            position: 'absolute', bottom: '100%', right: 0, marginBottom: 4,
            background: 'rgba(14,16,18,0.94)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 6, padding: '8px 10px', backdropFilter: 'blur(8px)',
            minWidth: 200, maxWidth: 280, zIndex: 20,
          }}
        >
          <p style={{
            fontSize: 9, color: 'rgba(255,255,255,0.4)',
            fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.08em',
            marginBottom: 6, textTransform: 'uppercase',
          }}>
            Photo credit
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <a href={attribution.authorUrl} target="_blank" rel="noopener noreferrer"
               style={{ fontSize: 10, color: '#E67E22', fontFamily: 'monospace', textDecoration: 'none' }}>
              {attribution.author} ↗
            </a>
            <a href={attribution.licenseUrl} target="_blank" rel="noopener noreferrer"
               style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace', textDecoration: 'none' }}>
              {attribution.license} ↗
            </a>
            <a href={attribution.photoPageUrl} target="_blank" rel="noopener noreferrer"
               style={{ fontSize: 10, color: '#E67E22', fontFamily: 'monospace', textDecoration: 'none' }}>
              View original ↗
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
