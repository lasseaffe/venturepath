// src/components/booking/SimulatorNarrative.jsx
import { useState } from 'react';

export default function SimulatorNarrative({ impacts, triggerLeg }) {
  const [advice, setAdvice] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchAdvice = async () => {
    setLoading(true);
    setAdvice('');
    const prompt = `You are a travel recovery advisor for VenturePath. An Architect's expedition has a delay.
Trigger: Leg "${triggerLeg?.from} → ${triggerLeg?.to}" is delayed.
Downstream impact:
${impacts.map(i => `- Leg ${i.leg_id}: ${i.status} (buffer: ${i.buffer_hours}h)`).join('\n')}
Give 3 concrete, actionable recovery options. Be direct. Use expedition vocabulary.`;

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: prompt }),
      });
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        setAdvice(prev => prev + decoder.decode(value));
      }
    } catch {
      setAdvice('Recovery advisor unavailable. Check your network connection.');
    }
    setLoading(false);
  };

  return (
    <div className="mt-4">
      {!advice && !loading && (
        <button
          onClick={fetchAdvice}
          className="w-full py-2 border border-[#E67E22]/50 text-[#E67E22] font-mono text-sm rounded hover:bg-[#E67E22]/10"
        >
          What should I do? →
        </button>
      )}
      {loading && <p className="text-[#E67E22] font-mono text-sm animate-pulse">Consulting recovery advisor...</p>}
      {advice && (
        <div className="bg-black/30 border border-[#E67E22]/20 rounded p-3 text-sm text-[#D9C5B2] font-mono whitespace-pre-wrap">
          {advice}
        </div>
      )}
    </div>
  );
}
