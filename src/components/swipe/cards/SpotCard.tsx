// src/components/swipe/cards/SpotCard.tsx
import { useState } from 'react';
import type { SpotCardData } from './types';

const FALLBACK_GRADIENT = 'linear-gradient(160deg, #0E1012 0%, #E67E22 100%)';

interface Props { data: SpotCardData }

export function SpotCard({ data }: Props) {
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <div className="w-full h-full rounded-3xl overflow-hidden flex flex-col shadow-2xl relative">
      {/* Hero image */}
      <div className="flex-1 relative">
        {data.imageUrl && !imgFailed ? (
          <img
            src={data.imageUrl}
            alt={data.name}
            className="w-full h-full object-cover"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div className="absolute inset-0" style={{ background: FALLBACK_GRADIENT }} />
        )}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(14,16,18,0.92) 0%, transparent 50%)' }} />
      </div>

      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 px-6 pb-6 pt-4">
        <p className="text-xs uppercase tracking-widest mb-1" style={{ color: '#D9C5B2', fontFamily: 'JetBrains Mono, monospace' }}>
          {data.category}{data.distanceFromLegKm != null ? ` · ${data.distanceFromLegKm.toFixed(1)} km from leg` : ''}
        </p>
        <h2 className="text-2xl font-bold leading-tight mb-1" style={{ color: '#fff', fontFamily: 'Playfair Display, serif' }}>
          {data.name}
        </h2>
        {data.rating != null && (
          <p className="text-sm mb-3" style={{ color: '#D9C5B2', fontFamily: 'Inter, sans-serif' }}>★ {data.rating}</p>
        )}
        <div className="flex flex-wrap gap-2">
          {data.tags.map(tag => (
            <span key={tag} className="px-2 py-0.5 rounded-full text-xs" style={{ background: 'rgba(230,126,34,0.2)', color: '#E67E22', fontFamily: 'Inter, sans-serif' }}>
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
