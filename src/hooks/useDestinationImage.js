// src/hooks/useDestinationImage.js
import { useState, useEffect } from 'react';

function sessionKey(type, query) {
  return `destimg:${type}:${query.trim().toLowerCase()}`;
}

export function useDestinationImage(query, type = 'city', index = 0) {
  const [images,  setImages]  = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(false);

  useEffect(() => {
    const q = query?.trim();
    if (!q) return;

    // Check sessionStorage cache first
    try {
      const cached = sessionStorage.getItem(sessionKey(type, q));
      if (cached) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setImages(JSON.parse(cached));
        return;
      }
    } catch {
      // sessionStorage unavailable — fall through to fetch
    }

    // No cache — fetch
    let cancelled = false;
    setLoading(true);
    setError(false);

    fetch(`/api/destination-images?q=${encodeURIComponent(q)}&type=${type}&count=5`)
      .then(r => r.json())
      .then(data => {
        if (cancelled) return;
        const imgs = data.images ?? [];
        setImages(imgs);
        setLoading(false);
        if (imgs.length > 0) {
          try {
            sessionStorage.setItem(sessionKey(type, q), JSON.stringify(imgs));
          } catch {
            // sessionStorage full — not critical
          }
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

  // Guard on query so stale images don't show when query clears
  const image = (query?.trim() && images?.length > 0) ? images[index % images.length] : null;
  return { image, images, loading, error };
}
