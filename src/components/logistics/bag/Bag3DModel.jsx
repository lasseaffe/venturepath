// APPLE-RISK: AR feature is a key differentiator — stub state will fail 4.2 minimum functionality review
// TODO (next sprint): replace with R3F + actual backpack GLTF model with drag-into-compartment UX
// src/components/logistics/bag/Bag3DModel.jsx

export default function Bag3DModel({ zoneMap, packed, zoneMode }) {
  const totalItems = Object.values(zoneMap).flat().length;
  const packedCount = Object.values(zoneMap).flat().filter(i => packed[i.id]).length;

  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
      <div
        className="w-32 h-40 border-2 border-[#E67E22]/50 rounded-xl relative overflow-hidden"
        style={{ animation: 'spin 8s linear infinite' }}
      >
        <div className="absolute inset-0 grid grid-cols-4 grid-rows-5 gap-px opacity-20">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="border border-[#E67E22]/30" />
          ))}
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[#E67E22] text-3xl">🎒</span>
        </div>
      </div>

      <div className="space-y-1">
        <p className="text-[10px] font-mono text-[#E67E22] tracking-widest">
          3D MODEL — NEXT SPRINT
        </p>
        <p className="text-[9px] font-mono text-slate-500">
          {packedCount}/{totalItems} items stowed
        </p>
        <p className="text-[8px] font-mono text-slate-600">
          Full 3D packing available in next build
        </p>
      </div>

      <style>{`@keyframes spin { from { transform: rotateY(0deg); } to { transform: rotateY(360deg); } }`}</style>
    </div>
  );
}
