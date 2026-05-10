import { useTripStore } from '../../store/useTripStore.jsx';

export default function InsightCard({ insight }) {
  const { dismissInsight } = useTripStore();

  return (
    <div className="
      flex items-start gap-3 p-3 rounded-lg border
      bg-[#FDF6EC] border-[#E67E22]/40
      [.tactical_&]:bg-[#0E1012] [.tactical_&]:border-[#F2A900]/40
      text-sm mb-2
    ">
      <span className="text-[#E67E22] [.tactical_&]:text-[#F2A900] mt-0.5 shrink-0" aria-hidden>⬡</span>
      <div className="flex-1 min-w-0">
        <p className="text-[#3D2B1F] [.tactical_&]:text-[#F2A900] font-medium leading-snug">
          {insight.message}
        </p>
        {insight.cta && (
          <button
            onClick={insight.cta.onClick}
            className="mt-1 text-xs text-[#E67E22] [.tactical_&]:text-[#F2A900] underline underline-offset-2 hover:opacity-80"
          >
            {insight.cta.label}
          </button>
        )}
      </div>
      <button
        onClick={() => dismissInsight(insight.id)}
        aria-label="Dismiss insight"
        className="text-[#9E8A78] hover:text-[#3D2B1F] [.tactical_&]:text-[#F2A900]/50 [.tactical_&]:hover:text-[#F2A900] shrink-0 text-base leading-none"
      >
        ×
      </button>
    </div>
  );
}
