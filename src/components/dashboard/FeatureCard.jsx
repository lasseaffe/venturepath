// src/components/dashboard/FeatureCard.jsx
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function FeatureCard({ icon: Icon, name, tagline, teaserLines, badge, onClick, cardHeight }) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.button
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      animate={{ scale: hovered ? 1.03 : 1 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      style={{
        flexShrink: 0,
        width: 240,
        height: cardHeight ?? 320,
        background: hovered ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.07)',
        backdropFilter: 'blur(10px)',
        border: hovered ? '1px solid rgba(230,126,34,0.4)' : '1px solid rgba(255,255,255,0.1)',
        borderRadius: 12,
        padding: 24,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        cursor: 'pointer',
        textAlign: 'left',
        boxShadow: hovered ? '0 20px 60px rgba(0,0,0,0.4)' : '0 4px 20px rgba(0,0,0,0.2)',
        transition: 'background 0.2s, border-color 0.2s, box-shadow 0.2s',
      }}
    >
      {/* Icon */}
      <Icon size={32} style={{ color: '#E67E22', marginBottom: 12, flexShrink: 0 }} />

      {/* Name */}
      <div style={{
        fontFamily: 'Playfair Display, serif', fontSize: 18,
        fontWeight: 700, color: '#fff', marginBottom: 6, lineHeight: 1.2,
      }}>
        {name}
      </div>

      {/* Tagline */}
      <div style={{
        fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
        color: 'rgba(255,255,255,0.55)', marginBottom: badge ? 8 : 0,
        lineHeight: 1.5,
      }}>
        {tagline}
      </div>

      {/* Squad badge */}
      {badge && (
        <div style={{
          padding: '2px 8px', borderRadius: 4,
          background: 'rgba(230,126,34,0.15)',
          border: '1px solid rgba(230,126,34,0.3)',
          fontFamily: 'JetBrains Mono, monospace', fontSize: 9,
          color: '#E67E22', letterSpacing: '0.08em',
        }}>
          {badge}
        </div>
      )}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Hover teaser */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.18 }}
            style={{ width: '100%' }}
          >
            <div style={{
              height: 1, background: 'rgba(255,255,255,0.1)', marginBottom: 12,
            }} />
            <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
              {teaserLines.map((line, i) => (
                <li key={i} style={{
                  fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
                  color: 'rgba(255,255,255,0.65)', marginBottom: 6,
                  display: 'flex', alignItems: 'flex-start', gap: 6,
                }}>
                  <span style={{ color: '#E67E22', flexShrink: 0 }}>·</span>
                  {line}
                </li>
              ))}
            </ul>
            <div style={{
              marginTop: 12, padding: '7px 16px',
              background: '#E67E22', borderRadius: 9999,
              fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
              fontWeight: 700, color: '#fff', letterSpacing: '0.06em',
              display: 'inline-block',
            }}>
              Enter →
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
