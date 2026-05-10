// src/components/swipe/cards/FilteredResultCard.tsx
import { SpotCard } from './SpotCard';
import type { FilteredCardData } from './types';

interface Props { data: FilteredCardData }

export function FilteredResultCard({ data }: Props) {
  return (
    <div className="w-full h-full relative">
      <SpotCard data={data} />
      {/* Match reasons chip row pinned above bottom content */}
      <div className="absolute bottom-0 left-0 right-0 px-6 pb-2 flex flex-wrap gap-1" style={{ paddingBottom: '9rem' }}>
        {data.matchReasons.map(reason => (
          <span key={reason} className="px-2 py-0.5 rounded text-xs font-semibold" style={{ background: '#E67E22', color: '#0E1012', fontFamily: 'JetBrains Mono, monospace' }}>
            ✓ {reason}
          </span>
        ))}
      </div>
    </div>
  );
}
