// APPLE-RISK: AR feature is a key differentiator — stub state will fail 4.2 minimum functionality review
// TourView is a placeholder; full implementation is Task 13.
export default function TourView({ onExit }) {
  return (
    <div
      className="flex flex-col items-center justify-center h-full gap-4"
      style={{ background: 'var(--bg)' }}
    >
      <p className="font-mono text-sm" style={{ color: 'var(--text-secondary)' }}>
        Tour playback — coming in Task 13
      </p>
      <button
        onClick={onExit}
        className="px-4 py-2 rounded text-xs font-mono uppercase tracking-wider"
        style={{ background: 'var(--ember)', color: '#fff' }}
      >
        Back to Studio
      </button>
    </div>
  );
}
