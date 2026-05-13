export default function StudioElevationStrip({ points }) {
  const eles = points.map(p => p.ele).filter(e => e != null);
  if (eles.length < 2) {
    return (
      <div className="absolute bottom-4 left-1/2 z-[1000] -translate-x-1/2 rounded-md border border-[#3a2f25] bg-[#0E1012]/95 px-4 py-3 font-[JetBrains_Mono] text-xs text-[#D9C5B2]/60">
        Compose at least two points to see elevation
      </div>
    );
  }
  const min = Math.min(...eles);
  const max = Math.max(...eles);
  const range = max - min || 1;
  const W = 480, H = 80;
  const path = points
    .filter(p => p.ele != null)
    .map((p, i, arr) => {
      const x = (i / (arr.length - 1)) * W;
      const y = H - ((p.ele - min) / range) * H;
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <div className="absolute bottom-4 left-1/2 z-[1000] -translate-x-1/2 rounded-md border border-[#3a2f25] bg-[#0E1012]/95 p-3 font-[JetBrains_Mono]">
      <div className="mb-1 flex justify-between text-[10px] uppercase tracking-wider text-[#D9C5B2]/60">
        <span>{Math.round(min)} m</span>
        <span>Elevation</span>
        <span>{Math.round(max)} m</span>
      </div>
      <svg width={W} height={H} className="block">
        <path d={path} fill="none" stroke="#E67E22" strokeWidth="2" />
      </svg>
    </div>
  );
}
