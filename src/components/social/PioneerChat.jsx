import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSquadGear } from '../../context/SquadGearContext';
import { useTripStore } from '../../store/useTripStore';
import sentinelBus from '../../utils/sentinelBus.js';
import { buildInsights } from '../../utils/architectEngine.js';
import { TypewriterText } from '../ui/TypewriterText';

const MEMBERS = {
  lead:  { name: 'Lead',  avatar: '🧗', color: 'text-[#E67E22]' },
  scout: { name: 'Scout', avatar: '🗺', color: 'text-blue-400'   },
  medic: { name: 'Medic', avatar: '🩺', color: 'text-green-400'  },
  ai:    { name: 'Scout AI', avatar: '⚡', color: 'text-[#F2C94C]' },
};

const SEED_MESSAGES = [
  { id: 'm0', type: 'log',  from: 'system', text: 'Squad session started. 3 members online.' },
  { id: 'm1', type: 'chat', from: 'scout',  text: 'Weather brief confirmed for Leg 2. Winds expected 80 km/h tomorrow morning.' },
  { id: 'm2', type: 'chat', from: 'medic',  text: 'First Aid Kit is in my pack. Who has the sat phone?' },
  { id: 'm3', type: 'log',  from: 'system', text: '[Scout] updated the Packing Manifest — Water Filter reassigned.' },
];

const STATUS_TEMPLATE = (trip, legs) => `
EXPEDITION BRIEF ──────────────
Objective: ${trip.name}
Destination: ${trip.destination}
Legs: ${legs.length} confirmed
Status: ${trip.status}
────────────────────────────────
`.trim();

export default function PioneerChat({ onClose }) {
  const [messages, setMessages] = useState(SEED_MESSAGES);
  const [input, setInput] = useState('');
  const [stream, setStream] = useState('SQUAD');
  const { trip, legs } = useTripStore();
  const { overEncumbered } = useSquadGear();
  const bottomRef = useRef(null);
  const idRef = useRef(10);

  const nextId = () => `m${++idRef.current}`;

  // Auto-alert for over-encumbered squad members
  useEffect(() => {
    if (overEncumbered.length === 0) return;
    const alert = {
      id: nextId(),
      type: 'fragment',
      from: 'ai',
      text: `Weight Alert: ${overEncumbered.map(m => m.name).join(', ')} over max capacity. Click to redistribute.`,
      action: 'REDISTRIBUTE',
    };
    setMessages(prev => [...prev, alert]);
  }, [overEncumbered.length]);

  useEffect(() => {
    const unsub = sentinelBus.on('HAZARD_UPDATED', ({ hazards }) => {
      const insights = buildInsights('HAZARD_UPDATED', { hazards }, {});
      insights.forEach(insight => {
        const newMsg = {
          id: `arch_${insight.id}_${Date.now()}`,
          type: 'architect',
          stream: 'LOGS',
          text: insight.message,
          timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages(prev => [...prev, newMsg]);
      });
    });
    return unsub;
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = () => {
    const text = input.trim();
    if (!text) return;
    setInput('');

    if (text === '/status') {
      const brief = {
        id: nextId(), type: 'status', from: 'ai',
        text: STATUS_TEMPLATE(trip, legs),
      };
      setMessages(prev => [...prev, brief]);
      return;
    }

    const msg = { id: nextId(), type: 'chat', from: 'lead', text };
    setMessages(prev => [...prev, msg]);

    // Simulate scout reply
    if (text.toLowerCase().includes('crossing')) {
      setTimeout(() => {
        setMessages(prev => [...prev, {
          id: nextId(), type: 'chat', from: 'scout',
          text: 'Confirmed knee-deep as of 08:00. Poles out, pack hipbelt unclipped.',
        }]);
      }, 1200);
    }
  };

  const filteredMessages = stream === 'LOGS'
    ? messages.filter(m => m.type === 'log' || m.type === 'fragment' || m.type === 'architect')
    : messages.filter(m => m.type !== 'log' && m.type !== 'architect');

  return (
    <div className="tactical-panel flex flex-col h-[520px]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-3">
          <span className="text-white font-mono font-bold text-sm">PioneerChat</span>
          <div className="flex gap-0">
            {['SQUAD', 'LOGS'].map(s => (
              <button
                key={s}
                onClick={() => setStream(s)}
                className={`px-3 py-1 text-[10px] font-mono tracking-widest border-b-2 transition-colors ${
                  stream === s ? 'border-[#E67E22] text-[#E67E22]' : 'border-transparent text-[var(--text-muted)]'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {Object.values(MEMBERS).slice(0, 3).map(m => (
            <span key={m.name} title={m.name} className="text-base">{m.avatar}</span>
          ))}
          {onClose && (
            <button onClick={onClose} className="ml-2 text-[var(--text-muted)] hover:text-white text-sm">✕</button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <AnimatePresence initial={false}>
          {filteredMessages.map(msg => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={msg.type === 'log' ? 'text-center' : ''}
            >
              {msg.type === 'log' && (
                <div className="text-[10px] font-mono text-[var(--text-muted)] italic">{msg.text}</div>
              )}
              {msg.type === 'chat' && (
                <div className={`flex gap-2 ${msg.from === 'lead' ? 'flex-row-reverse' : ''}`}>
                  <span className="text-xl shrink-0 mt-0.5">{MEMBERS[msg.from]?.avatar}</span>
                  <div className={`max-w-[70%] rounded-lg p-3 ${
                    msg.from === 'lead'
                      ? 'bg-[#E67E22]/20 border border-[#E67E22]/30'
                      : 'bg-white/5 border border-white/10'
                  }`}>
                    <div className={`text-[10px] font-mono mb-1 ${MEMBERS[msg.from]?.color}`}>
                      {MEMBERS[msg.from]?.name}
                    </div>
                    {msg.from === 'ai' ? (
                      <TypewriterText
                        text={msg.text}
                        speed={38}
                        cursorColor="#E67E22"
                        className="text-sm text-[var(--text-primary)]"
                      />
                    ) : (
                      <div className="text-sm text-[var(--text-primary)]">{msg.text}</div>
                    )}
                  </div>
                </div>
              )}
              {msg.type === 'status' && (
                <div className="glass-panel p-3 border border-[#F2C94C]/30">
                  <div className="label-tag text-[#F2C94C] mb-2">⚡ AI Scout Status Brief</div>
                  <pre className="text-xs font-mono text-[var(--text-secondary)] whitespace-pre-wrap">
                    <TypewriterText
                      text={msg.text}
                      speed={38}
                      cursorColor="#F2C94C"
                    />
                  </pre>
                </div>
              )}
              {msg.type === 'architect' && (
                <div key={msg.id} className="flex items-start gap-2 text-xs text-[#E67E22] [.tactical_&]:text-[#F2A900]">
                  <span className="mt-0.5 shrink-0">⬡</span>
                  <div>
                    <span className="font-bold mr-1">ARCHITECT</span>
                    <span className="opacity-70">{msg.timestamp}</span>
                    <p className="mt-0.5">{msg.text}</p>
                  </div>
                </div>
              )}
              {msg.type === 'fragment' && (
                <motion.div
                  className="glass-panel p-3 border border-[#F2C94C]/50 animate-pulse-gold"
                  animate={{ opacity: [0.8, 1, 0.8] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-xl">⚡</span>
                    <div className="flex-1">
                      <div className="text-[10px] font-mono text-[#F2C94C] mb-1">AI Scout Alert</div>
                      <TypewriterText
                        text={msg.text}
                        speed={38}
                        cursorColor="#F2C94C"
                        className="text-sm text-[var(--text-primary)]"
                      />
                    </div>
                    {msg.action && (
                      <button className="text-[10px] font-mono px-2 py-1 border border-[#F2C94C]/50 text-[#F2C94C] rounded hover:bg-[#F2C94C]/10 transition-colors shrink-0">
                        {msg.action}
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-white/10 p-3 flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Message squad… or type /status"
          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono placeholder-slate-600 focus:outline-none focus:border-[#E67E22]/50"
        />
        <button
          onClick={send}
          className="px-4 py-2 bg-[#E67E22] hover:bg-[#d4711e] text-white font-mono text-xs rounded-lg transition-colors"
        >
          SEND
        </button>
      </div>
    </div>
  );
}
