import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { listMessages, postMessage, deleteMessage, subscribeToMessages } from '../../lib/gatherings/api.js';

const S = {
  root: { display: 'flex', flexDirection: 'column', height: 400, fontFamily: 'JetBrains Mono, monospace' },
  feed: { flex: 1, overflowY: 'auto', paddingBottom: '0.5rem' },
  msg: (isMine) => ({ padding: '0.5rem 0', borderBottom: '1px solid #111', display: 'flex', flexDirection: 'column', alignItems: isMine ? 'flex-end' : 'flex-start' }),
  bubble: (isMine) => ({ background: isMine ? '#E67E2222' : '#1a1a1a', border: `1px solid ${isMine ? '#E67E2244' : '#222'}`, padding: '0.5rem 0.75rem', maxWidth: '80%', borderRadius: 2 }),
  handle: (isMine) => ({ color: isMine ? '#E67E22' : '#888', fontSize: '0.6rem', letterSpacing: '0.1em', marginBottom: '0.2rem' }),
  body: { color: '#D9C5B2', fontSize: '0.8rem', lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' },
  mention: { color: '#E67E22', fontWeight: 700 },
  time: { color: '#555', fontSize: '0.6rem', marginTop: '0.2rem' },
  replyCtx: { background: '#111', borderLeft: '2px solid #444', padding: '0.25rem 0.5rem', fontSize: '0.65rem', color: '#888', marginBottom: '0.25rem' },
  delBtn: { background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '0.65rem', padding: '0 0.3rem' },
  composer: { display: 'flex', gap: '0.5rem', borderTop: '1px solid #222', paddingTop: '0.75rem' },
  input: { flex: 1, background: '#1a1a1a', border: '1px solid #333', color: '#fff', padding: '0.6rem', fontSize: '0.8rem', fontFamily: 'JetBrains Mono, monospace', resize: 'none' },
  send: { padding: '0.6rem 1rem', background: '#E67E22', border: 'none', color: '#fff', fontSize: '0.65rem', letterSpacing: '0.1em', cursor: 'pointer', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, alignSelf: 'flex-end' },
  replyBar: { display: 'flex', justifyContent: 'space-between', background: '#111', borderLeft: '2px solid #E67E22', padding: '0.3rem 0.5rem', fontSize: '0.65rem', color: '#E67E22', marginBottom: '0.4rem' },
};

function renderBody(text) {
  // Highlight @mentions
  const parts = text.split(/(@\w+)/g);
  return parts.map((p, i) =>
    p.startsWith('@')
      ? <span key={i} style={S.mention}>{p}</span>
      : <span key={i}>{p}</span>
  );
}

export default function GatheringChat({ gatheringId }) {
  const { profile } = useAuth();
  const [messages, setMessages] = useState([]);
  const [text, setText]         = useState('');
  const [replyTo, setReplyTo]   = useState(null); // { id, body }
  const feedRef = useRef(null);

  const reload = useCallback(async () => {
    const data = await listMessages(gatheringId);
    setMessages(data);
  }, [gatheringId]);

  useEffect(() => { reload(); }, [reload]);

  // Auto-scroll
  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [messages.length]);

  // Realtime
  useEffect(() => {
    const channel = subscribeToMessages(
      gatheringId,
      (newMsg) => {
        setMessages(prev => {
          if (prev.find(m => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
      },
      (deletedId) => setMessages(prev => prev.filter(m => m.id !== deletedId))
    );
    return () => channel.unsubscribe();
  }, [gatheringId]);

  async function send() {
    const body = text.trim();
    if (!body) return;
    setText('');
    const prevReply = replyTo;
    setReplyTo(null);
    await postMessage(gatheringId, body, prevReply?.id ?? null);
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  }

  return (
    <div style={S.root}>
      <div style={S.feed} ref={feedRef}>
        {messages.length === 0 && (
          <div style={{ color: '#555', fontSize: '0.75rem', padding: '1rem 0', textAlign: 'center' }}>
            No transmissions yet — start the signal
          </div>
        )}
        {messages.map(m => {
          const isMine = m.pioneer_id === profile?.id;
          return (
            <div key={m.id} style={S.msg(isMine)}>
              <div style={S.handle(isMine)}>@{m.author?.handle ?? m.pioneer_id?.slice(0, 8)}</div>
              <div style={S.bubble(isMine)}>
                {m.reply_to && (
                  <div style={S.replyCtx}>
                    ↩ {messages.find(x => x.id === m.reply_to)?.body?.slice(0, 60) ?? 'previous message'}
                  </div>
                )}
                <div style={S.body}>{renderBody(m.body)}</div>
              </div>
              <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                <span style={S.time}>{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                <button style={S.delBtn} title="Reply" onClick={() => setReplyTo({ id: m.id, body: m.body })}>↩</button>
                {isMine && <button style={S.delBtn} title="Delete" onClick={() => deleteMessage(m.id)}>✕</button>}
              </div>
            </div>
          );
        })}
      </div>

      {replyTo && (
        <div style={S.replyBar}>
          <span>↩ Replying to: {replyTo.body.slice(0, 60)}</span>
          <button style={{ background: 'none', border: 'none', color: '#E67E22', cursor: 'pointer', fontSize: '0.7rem' }} onClick={() => setReplyTo(null)}>✕</button>
        </div>
      )}

      <div style={S.composer}>
        <textarea
          style={S.input}
          rows={2}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={`Transmit as @${profile?.handle ?? 'pioneer'}`}
        />
        <button style={S.send} onClick={send}>SEND</button>
      </div>
    </div>
  );
}
