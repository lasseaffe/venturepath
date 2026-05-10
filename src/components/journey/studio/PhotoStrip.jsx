import { useSortable, SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useTripStore } from '../../../store/useTripStore';

function SortablePhoto({ photo, legId }) {
  const { updatePhoto, removePhoto } = useTripStore();
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: photo.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="shrink-0 w-32">
      <div
        {...attributes}
        {...listeners}
        className="w-32 h-24 rounded overflow-hidden mb-1 cursor-grab active:cursor-grabbing"
        style={{ background: 'var(--border)' }}
      >
        <img
          src={photo.url}
          alt={photo.caption || ''}
          className="w-full h-full object-cover"
          onError={e => { e.target.style.opacity = '0.3'; }}
          draggable={false}
        />
      </div>
      <input
        type="text"
        value={photo.caption}
        onChange={e => updatePhoto(legId, photo.id, { caption: e.target.value })}
        placeholder="Caption…"
        maxLength={140}
        className="w-full text-xs px-1.5 py-1 rounded border"
        style={{
          background: 'var(--surface)',
          borderColor: 'var(--border)',
          color: 'var(--text-primary)',
        }}
      />
      <button
        onClick={() => removePhoto(legId, photo.id)}
        className="text-xs mt-1 w-full text-center transition-colors"
        style={{ color: 'var(--text-secondary)' }}
      >
        Remove
      </button>
    </div>
  );
}

export default function PhotoStrip({ legId, photos }) {
  const { reorderPhotos } = useTripStore();

  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = photos.map(p => p.id);
    const oldIndex = ids.indexOf(active.id);
    const newIndex = ids.indexOf(over.id);
    const reordered = [...ids];
    reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, active.id);
    reorderPhotos(legId, reordered);
  }

  if (photos.length === 0) return null;

  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={photos.map(p => p.id)} strategy={horizontalListSortingStrategy}>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {photos.map(p => (
            <SortablePhoto key={p.id} photo={p} legId={legId} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
