import { useState } from 'react';
import { useTripStore } from '../../../store/useTripStore';
import StopPhotoCard from './StopPhotoCard';
import PhotoUploader from './PhotoUploader';
import PhotoStrip from './PhotoStrip';
import PublishButton from './PublishButton';

export default function StudioView() {
  const { trip, legs, journey, setJourneyMeta } = useTripStore();
  const [selectedLegId, setSelectedLegId] = useState(legs[0]?.id ?? null);

  const selectedLeg = legs.find(l => l.id === selectedLegId);
  const sortedPhotos = [...(selectedLeg?.photos ?? [])].sort((a, b) => a.order - b.order);

  return (
    <div className="flex flex-col h-full">
      <div
        className="flex items-center gap-4 px-6 py-3 border-b shrink-0"
        style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
      >
        <input
          type="text"
          value={journey?.title ?? trip.name}
          onChange={e => setJourneyMeta({ title: e.target.value })}
          placeholder="Journey title…"
          className="flex-1 text-sm font-medium px-2 py-1 rounded border"
          style={{
            background: 'transparent',
            borderColor: 'var(--border)',
            color: 'var(--text-primary)',
          }}
        />
        <PublishButton />
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div
          className="w-72 shrink-0 overflow-y-auto border-r"
          style={{ borderColor: 'var(--border)' }}
        >
          {legs.length === 0 ? (
            <p className="p-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
              No stops yet — add stops in the Itinerary tab first.
            </p>
          ) : (
            legs.map(leg => (
              <StopPhotoCard
                key={leg.id}
                leg={leg}
                isSelected={leg.id === selectedLegId}
                onSelect={setSelectedLegId}
              />
            ))
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {!selectedLeg ? (
            <p style={{ color: 'var(--text-secondary)' }}>Select a stop on the left to add photos.</p>
          ) : (
            <>
              <h2 className="font-medium" style={{ color: 'var(--text-primary)' }}>
                {selectedLeg.from} → {selectedLeg.to}
              </h2>
              <PhotoUploader legId={selectedLeg.id} />
              <PhotoStrip legId={selectedLeg.id} photos={sortedPhotos} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
