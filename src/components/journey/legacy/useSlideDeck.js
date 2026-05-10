import { useState, useEffect, useCallback } from 'react';
import { useTripStore } from '../../../store/useTripStore';
import { buildSlideDeck } from '../../../utils/slideDeck';
import sentinelBus from '../../../utils/sentinelBus';
import { PHOTO_ACTIVE } from '../../../utils/sentinelBusEvents';

const AUTOPLAY_MS = 4000;

export function useSlideDeck() {
  const { journeyData, legs } = useTripStore();
  const photos      = journeyData?.photos      ?? [];
  const breadcrumbs = journeyData?.breadcrumbs ?? [];

  const slides = buildSlideDeck(photos, breadcrumbs, legs);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [playing, setPlaying] = useState(false);

  const clamp = (i) => Math.max(0, Math.min(i, slides.length - 1));

  const goTo = useCallback((i) => {
    const idx = clamp(i);
    setCurrentIndex(idx);
    const slide = slides[idx];
    if (slide?.type === 'photo') {
      sentinelBus.emit(PHOTO_ACTIVE, { photo: slide.photo });
    }
  }, [slides]);

  const goNext = useCallback(() => goTo(currentIndex + 1), [currentIndex, goTo]);
  const goPrev = useCallback(() => goTo(currentIndex - 1), [currentIndex, goTo]);

  // Auto-advance
  useEffect(() => {
    if (!playing || slides.length === 0) return;
    const id = setInterval(() => {
      setCurrentIndex(i => {
        const next = i + 1 >= slides.length ? 0 : i + 1;
        const slide = slides[next];
        if (slide?.type === 'photo') sentinelBus.emit(PHOTO_ACTIVE, { photo: slide.photo });
        return next;
      });
    }, AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [playing, slides]);

  // Reset index when slide deck changes (new photos added)
  useEffect(() => {
    setCurrentIndex(0);
  }, [slides.length]);

  const currentSlide = slides[currentIndex] ?? null;

  return { slides, currentIndex, currentSlide, goNext, goPrev, goTo, playing, setPlaying };
}
