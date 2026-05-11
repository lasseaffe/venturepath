// src/hooks/useDestinationImage.js
import { useState, useEffect } from 'react';

/**
 * Fetch a CC-licensed image for a destination or POI.
 *
 * @param {string|null} query  e.g. "Lille France". Pass null/empty to skip.
 * @param {'city'|'poi'}  type
 * @param {number}        index  Stable per-callsite integer (0–4).
 *                               Different values on different surfaces = variety without randomness.
 *                               ExpeditionSelectScreen=0, LedgerCard=1, KanbanDay=2, KanbanBlock=3
 * @returns {{ image: object|null, loading: boolean, error: boolean }}
 */
export function useDestinationImage(query, type = 'city', index = 0) {
  const [images,  setImages]  = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(false);

  useEffect(() => {
    const q = query?.trim();
    if (!q) return;

    let cancelled = false;
    setLoading(true);
    setError(false);

    fetch(`/api/destination-images?q=${encodeURIComponent(q)}&type=${type}&count=5`)
      .then(r => r.json())
      .then(data => {
        if (!cancelled) {
          setImages(data.images ?? []);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [query, type]);

  const image = images?.length > 0 ? images[index % images.length] : null;
  return { image, loading, error };
}
