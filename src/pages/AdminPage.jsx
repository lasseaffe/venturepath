import { useState } from 'react';
import AdminShell from '../components/admin/AdminShell';

const SECRET = import.meta.env.VITE_ADMIN_SECRET;

export default function AdminPage() {
  const [authed, setAuthed] = useState(
    () => sessionStorage.getItem('vp-admin-auth') === 'true'
  );
  const [input, setInput] = useState('');
  const [err, setErr] = useState(false);

  function attempt() {
    if (input === SECRET) {
      sessionStorage.setItem('vp-admin-auth', 'true');
      setAuthed(true);
    } else {
      setErr(true);
      setInput('');
    }
  }

  if (authed) return <AdminShell />;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', background: '#0E1012',
    }}>
      <div style={{
        width: 320, padding: 32,
        border: '1px solid #1C2025', borderRadius: 8,
      }}>
        <h1 style={{
          color: '#D9C5B2', fontFamily: '"JetBrains Mono", monospace',
          fontSize: 14, letterSpacing: 2, marginBottom: 24, marginTop: 0,
        }}>
          BASECAMP CONTROL
        </h1>
        <input
          type="password"
          value={input}
          onChange={e => { setInput(e.target.value); setErr(false); }}
          onKeyDown={e => e.key === 'Enter' && attempt()}
          placeholder="Admin secret"
          style={{
            width: '100%', boxSizing: 'border-box',
            background: '#1C2025',
            border: err ? '1px solid #E74C3C' : '1px solid #2A3035',
            borderRadius: 4, padding: '8px 12px',
            color: '#fff', fontFamily: '"JetBrains Mono", monospace',
            fontSize: 13, marginBottom: err ? 8 : 12, outline: 'none',
          }}
        />
        {err && (
          <p style={{ color: '#E74C3C', fontSize: 12, marginBottom: 12, marginTop: 0 }}>
            Incorrect secret.
          </p>
        )}
        <button
          onClick={attempt}
          style={{
            width: '100%', background: '#E67E22', border: 'none',
            borderRadius: 4, padding: '10px 0',
            color: '#fff', fontFamily: '"JetBrains Mono", monospace',
            fontSize: 13, cursor: 'pointer', letterSpacing: 1,
          }}
        >
          ENTER BASECAMP
        </button>
      </div>
    </div>
  );
}
