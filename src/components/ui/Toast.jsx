// src/components/ui/Toast.jsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Module-level toast store — no context needed
let _listeners = new Set();
let _toasts = [];
let _nextId = 0;

export function showToast({ message, action, onAction, duration = 3000 }) {
  const id = ++_nextId;
  const toast = { id, message, action, onAction };
  _toasts = [..._toasts, toast];
  _listeners.forEach(fn => fn([..._toasts]));
  setTimeout(() => {
    _toasts = _toasts.filter(t => t.id !== id);
    _listeners.forEach(fn => fn([..._toasts]));
  }, duration);
}

function useToasts() {
  const [toasts, setToasts] = useState([..._toasts]);
  useEffect(() => {
    _listeners.add(setToasts);
    return () => _listeners.delete(setToasts);
  }, []);
  return toasts;
}

export default function ToastContainer() {
  const toasts = useToasts();

  return (
    <div style={{
      position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
      zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center',
      pointerEvents: 'none',
    }}>
      <AnimatePresence>
        {toasts.map(t => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2 }}
            style={{
              background: '#1a1f26',
              border: '1px solid #2a2f36',
              borderRadius: 4,
              padding: '8px 14px',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              pointerEvents: 'auto',
              minWidth: 260,
            }}
          >
            <span style={{ color: '#E67E22' }}>✓</span>
            <span style={{ flex: 1 }}>{t.message}</span>
            {t.action && (
              <button
                onClick={t.onAction}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#E67E22', fontFamily: 'inherit', fontSize: 11,
                  padding: 0, textDecoration: 'underline',
                }}
              >
                {t.action}
              </button>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
