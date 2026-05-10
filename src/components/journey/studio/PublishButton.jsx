import { useTripStore } from '../../../store/useTripStore';

function generateSlug(tripName) {
  return tripName
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 40) + '-' + Date.now().toString(36);
}

export default function PublishButton() {
  const { trip, journey, legs, setJourneyMeta } = useTripStore();
  const hasPhotos = legs.some(l => (l.photos ?? []).length > 0);

  function handlePublish() {
    const slug = journey?.shareSlug || generateSlug(trip.name);
    const meta = {
      published: true,
      shareSlug: slug,
      title: journey?.title || trip.name,
      createdAt: journey?.createdAt || new Date().toISOString(),
    };
    setJourneyMeta(meta);
    const link = `${window.location.origin}${window.location.pathname}#tour/${slug}`;
    navigator.clipboard.writeText(link).catch(() => {});
  }

  function handleUnpublish() {
    setJourneyMeta({ published: false });
  }

  function handleCopyLink() {
    const link = `${window.location.origin}${window.location.pathname}#tour/${journey.shareSlug}`;
    navigator.clipboard.writeText(link).catch(() => {});
  }

  if (!hasPhotos) return null;

  return (
    <div className="flex items-center gap-2">
      {journey?.published ? (
        <>
          <button
            onClick={handleCopyLink}
            className="px-3 py-1.5 rounded text-xs font-mono uppercase tracking-wider"
            style={{ background: 'var(--ember)', color: '#fff' }}
          >
            Published ✓ — Copy Link
          </button>
          <button
            onClick={handleUnpublish}
            className="px-3 py-1.5 rounded text-xs font-mono uppercase tracking-wider"
            style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
          >
            Unpublish
          </button>
        </>
      ) : (
        <button
          onClick={handlePublish}
          className="px-3 py-1.5 rounded text-xs font-mono uppercase tracking-wider"
          style={{ background: 'var(--ember)', color: '#fff' }}
        >
          Publish Journey
        </button>
      )}
    </div>
  );
}
