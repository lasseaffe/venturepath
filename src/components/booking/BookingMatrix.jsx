// src/components/booking/BookingMatrix.jsx
import { useState } from 'react';
import { searchMission } from '../../utils/bookingEngine';

export default function BookingMatrix() {
  const [goal, setGoal] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSearch = async () => {
    if (!goal.trim()) return;
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const pkg = await searchMission(goal);
      setResult(pkg);
    } catch {
      setError('Mission search failed. Check your connection and try again.');
    }
    setLoading(false);
  };

  return (
    <div className="p-4 text-white">
      <h2 className="font-playfair text-2xl mb-2">Booking Matrix</h2>
      <p className="text-[#D9C5B2] font-mono text-xs mb-4">Describe your mission goal to get a complete booking package.</p>

      <div className="flex gap-2 mb-6">
        <input
          className="flex-1 bg-black/40 border border-white/10 rounded px-3 py-2 text-sm font-mono text-white placeholder-white/30"
          placeholder="e.g. 3 days in Lisbon, budget €800"
          value={goal}
          onChange={e => setGoal(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
        />
        <button
          onClick={handleSearch}
          disabled={loading}
          className="px-4 py-2 bg-[#E67E22] text-black font-mono text-sm rounded disabled:opacity-50"
        >
          {loading ? 'Searching...' : 'Search →'}
        </button>
      </div>

      {error && <p className="text-red-400 font-mono text-xs mb-4">{error}</p>}

      {result && (
        <div className="border border-[#E67E22]/30 rounded-lg p-4 space-y-3 font-mono text-sm">
          <div className="flex justify-between">
            <span className="text-[#E67E22]">Destination</span>
            <span className="text-white">{result.destination}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#E67E22]">Duration</span>
            <span className="text-white">{result.days ? `${result.days} days` : '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#E67E22]">Budget</span>
            <span className="text-white">{result.budget ? `€${result.budget}` : '—'}</span>
          </div>
          <div className="border-t border-white/10 pt-3">
            <p className="text-[#E67E22] mb-1">✈ Flight</p>
            <p className="text-[#D9C5B2]">{result.flight?.carrier ?? '—'}</p>
          </div>
          <div>
            <p className="text-[#E67E22] mb-1">🏨 Stay</p>
            <p className="text-[#D9C5B2]">{result.stay?.name ?? '—'}</p>
          </div>
          <div>
            <p className="text-[#E67E22] mb-1">🚌 Transit</p>
            <p className="text-[#D9C5B2]">{result.transit}</p>
          </div>
          {result.permits.length > 0 && (
            <div>
              <p className="text-[#E67E22] mb-1">📋 Permits Required</p>
              <ul className="text-amber-400 space-y-1">
                {result.permits.map(p => <li key={p}>• {p}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
