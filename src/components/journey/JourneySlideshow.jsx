// src/components/journey/JourneySlideshow.jsx
import { useState } from 'react';
import sentinelBus from '../../utils/sentinelBus';
import { PHOTO_ACTIVE } from '../../utils/sentinelBusEvents';
import StatOverlay from './StatOverlay';

export default function JourneySlideshow({ photos }) {
  const [index, setIndex] = useState(0);

  if (!photos || photos.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 border border-white/10 rounded text-[#D9C5B2] font-mono text-sm">
        No photos in this expedition yet.
      </div>
    );
  }

  const photo = photos[index];

  const go = (dir) => {
    const next = (index + dir + photos.length) % photos.length;
    setIndex(next);
    sentinelBus.emit(PHOTO_ACTIVE, { photo: photos[next] });
  };

  return (
    <div className="relative w-full aspect-video bg-black rounded overflow-hidden">
      <img src={photo.url} alt="" className="w-full h-full object-cover" />
      <StatOverlay photo={photo} />

      <button
        onClick={() => go(-1)}
        aria-label="Previous photo"
        className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/60 text-white rounded-full w-8 h-8 flex items-center justify-center font-mono"
      >‹</button>
      <button
        onClick={() => go(1)}
        aria-label="Next photo"
        className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/60 text-white rounded-full w-8 h-8 flex items-center justify-center font-mono"
      >›</button>

      <div className="absolute top-3 right-3 bg-black/60 rounded px-2 py-1 font-mono text-xs text-white">
        {index + 1} / {photos.length}
      </div>
    </div>
  );
}
