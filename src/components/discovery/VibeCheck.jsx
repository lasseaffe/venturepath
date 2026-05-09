import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchVibes, vibesToActivities } from '../../utils/vibeCheckEngine';

const SOURCE_COLORS = {
  Instagram: 'text-pink-400',
  TikTok:    'text-cyan-400',
  Reddit:    'text-orange-400',
  Google:    'text-blue-400',
};

export default function VibeCheck({ destinationId = 'patagonia', tripName = 'your trip' }) {
  const [vibes, setVibes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generated, setGenerated] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [selectedTags, setSelectedTags] = useState(new Set());

  useEffect(() => {
    setLoading(true);
    fetchVibes(destinationId)
      .then(v => {
        setVibes(v);
        // Pre-select top 3
        setSelectedTags(new Set(v.slice(0, 3).map(vibe => vibe.tag)));
      })
      .finally(() => setLoading(false));
  }, [destinationId]);

  function toggleTag(tag) {
    setSelectedTags(prev => {
      const next = new Set(prev);
      next.has(tag) ? next.delete(tag) : next.add(tag);
      return next;
    });
  }

  async function generateItinerary() {
    setGenerating(true);
    await new Promise(r => setTimeout(r, 900));
    const selected = vibes.filter(v => selectedTags.has(v.tag));
    const activities = vibesToActivities(selected, selected.length);
    setGenerated(activities);
    setGenerating(false);
  }

  return (
    <div className="tactical-panel p-5 space-y-5 col-span-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="label-tag">Vibe-Check Itineraries</div>
          <div className="text-[10px] text-slate-500 font-mono mt-0.5">Trending activities scraped from social media</div>
        </div>
        <div className="text-[9px] font-mono text-slate-600 text-right">
          <div>Instagram · TikTok</div>
          <div>Reddit · Google</div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-slate-500 text-xs font-mono py-4">
          <span className="animate-pulse">●</span> Scraping social trends…
        </div>
      ) : (
        <>
          {/* Tag cloud */}
          <div className="space-y-2">
            <div className="text-[9px] font-mono text-slate-500 tracking-widest">
              TRENDING NOW — click to select for itinerary
            </div>
            <div className="flex flex-wrap gap-2">
              {vibes.map(vibe => {
                const isSelected = selectedTags.has(vibe.tag);
                const fontSize = vibe.score > 90 ? 'text-sm' : vibe.score > 75 ? 'text-xs' : 'text-[10px]';
                return (
                  <motion.button
                    key={vibe.tag}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => toggleTag(vibe.tag)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border font-mono transition-colors ${fontSize} ${
                      isSelected
                        ? 'bg-[#E2725B]/20 border-[#E2725B] text-white'
                        : 'bg-[#0E1012] border-[#2a2f36] text-slate-400 hover:border-[#E67E22]/50 hover:text-slate-200'
                    }`}
                  >
                    <span>{vibe.emoji}</span>
                    <span>{vibe.tag}</span>
                    <span className={`text-[9px] ${SOURCE_COLORS[vibe.source] ?? 'text-slate-600'}`}>
                      {vibe.score}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Generate button */}
          <div className="flex items-center gap-3">
            <button
              onClick={generateItinerary}
              disabled={selectedTags.size === 0 || generating}
              className="px-5 py-2.5 bg-[#E67E22] text-[#0E1012] font-mono font-bold text-xs rounded hover:bg-[#F2C94C] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {generating ? (
                <><span className="animate-spin">⟳</span> Generating…</>
              ) : (
                <>✦ Generate Itinerary from {selectedTags.size} Vibe{selectedTags.size !== 1 ? 's' : ''}</>
              )}
            </button>
            {selectedTags.size === 0 && (
              <span className="text-[10px] text-slate-600 font-mono">Select at least one vibe</span>
            )}
          </div>

          {/* Generated activities */}
          <AnimatePresence>
            {generated && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3"
              >
                <div className="text-[9px] font-mono text-[#E67E22] tracking-widest">
                  GENERATED ACTIVITIES — add to your itinerary in the ITINERARY tab
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                  {generated.map(act => (
                    <motion.div
                      key={act.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-[#0E1012] rounded-lg p-3 border border-[#E67E22]/20 flex gap-3 items-start"
                    >
                      <span className="text-xl shrink-0">{act.icon}</span>
                      <div className="min-w-0">
                        <div className="text-white text-xs font-mono font-semibold truncate">{act.title}</div>
                        <div className="text-[9px] font-mono text-slate-500 mt-0.5">
                          {act.time} · {act.duration} min · <span className="capitalize">{act.category}</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
                <div className="text-[10px] text-slate-600 font-mono">
                  ℹ Open the ITINERARY tab → Kanban Board to manually add these activities to your days
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}
