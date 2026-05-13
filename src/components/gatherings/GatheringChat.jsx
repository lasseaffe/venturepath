// VenturePath · Phase 3 · Realtime threaded chat for a Gathering
import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { listMessages, postMessage, deleteMessage, subscribeToMessages } from '../../lib/gatherings/api';

const S = {
  wrap: {
    display: 'flex', flexDirection: 'column',
    height: 360, background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.08)',
    fontFamily: "'JetBrains Mono', monospace",
  },
  feed: { flex: 1, overflowY: 'auto', padding: '10px 12px' },
  composer: {
    borderTop: '1px solid rgba(255,255,255,0.08)',
    padding: '8px 10px', display: 'flex', gap: 8,
    background: 'rgba(14,16,18,0.6)',
  },
  input: {
    flex: 1, background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.12)',
    color: '#fff', fontFamily: "'JetBrains Mono', monospace",
    fontSize: 12, padding: '8px 10px', outline: 'none',
    boxSizing: 'border-box', resize: 'none',
  },
  send: {
    background: '#E67E22', color: '#000', border: 'none',
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 10, letterSpacing: '0.12em', fontWeight: 700,
    padding: '8px 14px', cursor: 'pointer', textTransform: 'uppercase',
  },
  msg: { marginBottom: 10 },
  meta: { fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em', display: 'flex', gap: 8, alignItems: 'center' },
  body: { color: '#fff', fontSize: 12, lineHeight: 1.5, marginTop: 2, whiteSpace: 'pre-wrap', wordBreak: 'break-word' },
  reply: {
    background: 'rgba(230,126,34,0.08)',
    borderLeft: '2px solid #E67E22',
    padding: '4px 8px',
    fontSize: 10, color: 'rgba(255,255,255,0.5)',
    marginBottom: 4,
  },
  banner: {
    fontSize: 9, color: 'rgba(255,255,255,0.3)',
    letterSpacing: '0.12em', textAlign: 'center', padding: '6px 0',
  },
  mention: { color: '#F2C94C', fontWeight: 600 },
};

function formatTime(iso) {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  return sameDay
    ? d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// Render @mentions as highlighted spans
function renderBody(text) {
  const parts = text.split(/(@[a-z0-9_]+)/g);
  return parts.map((part, i) =>
    part.startsWith('@')
      ? <span key={i} style={S.mention}>{part}</span>
      : <span key={i}>{part}</span>
  );
}

export default function GatheringChat({ gatheringId }) {
  const { architect, profile } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [draft, setDraft]       = useState('');
  const [replyTo, setReplyTo]   = useState(null);
  const [sending, setSending]   = useState(false);
  const feedRef = useRef(null);

  const reload = useCallback(async () => {
    setLoading(true);
    const { data } = await listMessages(gatheringId);
    setMessages(data ?? []);
    setLoading(false);
  }, [gatheringId]);

  useEffect(() => { reload(); }, [reload]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [messages.length]);

  // Realtime subscription
  useEffect(() => {
    const channel = subscribeToMessages(gatheringId, {
      onInsert: (msg) => {
        // Optimistic insert protection: skip if we already have this id
        setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
      },
      onDelete: (msg) => {
        setMessages(prev => prev.filter(m => m.id !== msg.id));
      },
    });
    return () => { channel.unsubscribe(); };
  }, [gatheringId]);

  async function handleSend(e) {
    e?.preventDefault();
    if (!draft.trim() || !architect?.id) return;
    setSending(true);
    const body = draft.trim();
    setDraft('');
    setReplyTo(null);
    const { data } = await postMessage(gatheringId, architect.id, body, { replyTo: replyTo?.id ?? null });
    if (data) {
      setMessages(prev => prev.some(m => m.id === data.id) ? prev : [...prev, data]);
    }
    setSending(false);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { handleSend(e); }
  }

  async function handleDelete(msg) {
    if (msg.pioneer_id !== architect?.id) return;
    await deleteMessage(msg.id);
    setMessages(prev => prev.filter(m => m.id !== msg.id));
  }

  return (
    <div style={S.wrap}>
      <div ref={feedRef} style={S.feed}>
        {loading ? (
          <div style={S.banner}>▢▢▢ LOADING TRANSMISSIONS</div>
        ) : messages.length === 0 ? (
          <div style={S.banner}>NO TRANSMISSIONS YET — OPEN THE CHANNEL</div>
        ) : (
          messages.map(msg => {
            const parent = msg.reply_to ? messages.find(m => m.id === msg.reply_to) : null;
            const isMine = msg.pioneer_id === architect?.id;
            return (
              <div key={msg.id} style={S.msg}>
                {parent && (
                  <div style={S.reply}>
                    ↪ <span style={{ color: '#E67E22' }}>@{parent.profile?.handle ?? '…'}</span>: {parent.body.slice(0, 80)}{parent.body.length > 80 ? '…' : ''}
                  </div>
                )}
                <div style={S.meta}>
                  <span style={{ color: isMine ? '#E67E22' : '#F2C94C', fontWeight: 700 }}>
                    @{msg.profile?.handle ?? '…'}
                  </span>
                  <span>{formatTime(msg.created_at)}</span>
                  <button
                    onClick={() => setReplyTo(msg)}
                    style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', fontSize: 9, cursor: 'pointer', padding: 0, letterSpacing: '0.1em' }}
                  >
                    REPLY
                  </button>
                  {isMine && (
                    <button
                      onClick={() => handleDelete(msg)}
                      style={{ background: 'none', border: 'none', color: 'rgba(239,68,68,0.5)', fontSize: 9, cursor: 'pointer', padding: 0, letterSpacing: '0.1em' }}
                    >
                      DELETE
                    </button>
                  )}
                </div>
                <div style={S.body}>{renderBody(msg.body)}</div>
              </div>
            );
          })
        )}
      </div>

      {replyTo && (
        <div style={{ ...S.reply, margin: '0 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>↪ Replying to <strong style={{ color: '#E67E22' }}>@{replyTo.profile?.handle ?? '…'}</strong></span>
          <button onClick={() => setReplyTo(null)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 11 }}>✕</button>
        </div>
      )}

      <form style={S.composer} onSubmit={handleSend}>
        <textarea
          style={{ ...S.input, height: 36 }}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={profile ? `Transmit as @${profile.handle}…` : 'Sign in to transmit'}
          disabled={!architect}
          rows={1}
        />
        <button type="submit" style={S.send} disabled={sending || !draft.trim()}>
          {sending ? '…' : 'SEND'}
        </button>
      </form>
    </div>
  );
}
