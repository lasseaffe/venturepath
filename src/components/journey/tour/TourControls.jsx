export default function TourControls({
  stops,
  activeStopIndex,
  playing,
  onPlay,
  onPause,
  onPrevStop,
  onNextStop,
  onJumpTo,
}) {
  const activeStop = stops[activeStopIndex];

  return (
    <div
      className="shrink-0 px-6 py-4 border-t"
      style={{ background: '#0E1012', borderColor: 'rgba(255,255,255,0.1)' }}
    >
      <p
        className="text-center font-mono text-xs tracking-widest uppercase mb-3"
        style={{ color: 'rgba(255,255,255,0.5)' }}
      >
        {activeStop ? `${activeStop.leg.from} → ${activeStop.leg.to}` : ''}
      </p>

      <div className="flex gap-1 mb-4">
        {stops.map((stop, i) => (
          <button
            key={stop.leg.id}
            onClick={() => onJumpTo(i)}
            className="flex-1 h-1 rounded-full transition-colors"
            style={{
              background: i <= activeStopIndex ? 'var(--ember)' : 'rgba(255,255,255,0.15)',
            }}
            title={`${stop.leg.from} → ${stop.leg.to}`}
          />
        ))}
      </div>

      <div className="flex items-center justify-center gap-6">
        <button
          onClick={onPrevStop}
          disabled={activeStopIndex === 0}
          className="text-xl disabled:opacity-30"
          style={{ color: '#fff' }}
          title="Previous stop"
        >
          ⏮
        </button>

        <button
          onClick={playing ? onPause : onPlay}
          className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
          style={{ background: 'var(--ember)', color: '#fff' }}
          title={playing ? 'Pause' : 'Play'}
        >
          {playing ? '⏸' : '▶'}
        </button>

        <button
          onClick={onNextStop}
          disabled={activeStopIndex >= stops.length - 1}
          className="text-xl disabled:opacity-30"
          style={{ color: '#fff' }}
          title="Next stop"
        >
          ⏭
        </button>
      </div>
    </div>
  );
}
