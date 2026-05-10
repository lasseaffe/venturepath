import { useTripStore } from '../../../store/useTripStore';

export default function StopPhotoCard({ leg, isSelected, onSelect }) {
  const { journey, setJourneyMeta } = useTripStore();
  const photos = leg.photos ?? [];
  const isCover = journey?.coverStopId === leg.id;
  const visible = photos.slice(0, 4);
  const overflow = photos.length - 4;

  function handleCoverStar(e) {
    e.stopPropagation();
    setJourneyMeta({ coverStopId: isCover ? null : leg.id });
  }

  return (
    <button
      onClick={() => onSelect(leg.id)}
      className="w-full text-left px-4 py-3 border-b transition-colors"
      style={{
        borderColor: 'var(--border)',
        background: isSelected ? 'rgba(230,126,34,0.1)' : 'transparent',
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
          {leg.from} → {leg.to}
        </span>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          {photos.length > 0 && (
            <span
              className="text-xs font-mono px-1.5 py-0.5 rounded"
              style={{ background: 'var(--ember)', color: '#fff' }}
            >
              {photos.length}
            </span>
          )}
          <button
            onClick={handleCoverStar}
            title={isCover ? 'Remove cover' : 'Set as tour cover'}
            style={{ color: isCover ? '#F2C94C' : 'var(--text-secondary)', fontSize: 16 }}
          >
            ★
          </button>
        </div>
      </div>

      {photos.length === 0 ? (
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          No photos yet — select this stop and add some
        </p>
      ) : (
        <div className="flex gap-1">
          {visible.map(p => (
            <div
              key={p.id}
              className="w-10 h-10 rounded overflow-hidden shrink-0"
              style={{ background: 'var(--border)' }}
            >
              <img
                src={p.url}
                alt={p.caption || ''}
                className="w-full h-full object-cover"
                onError={e => { e.target.style.display = 'none'; }}
              />
            </div>
          ))}
          {overflow > 0 && (
            <div
              className="w-10 h-10 rounded flex items-center justify-center text-xs font-mono shrink-0"
              style={{ background: 'var(--border)', color: 'var(--text-secondary)' }}
            >
              +{overflow}
            </div>
          )}
        </div>
      )}
    </button>
  );
}
