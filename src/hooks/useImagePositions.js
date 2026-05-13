// Per-expedition, per-image crop position store.
// localStorage is the optimistic cache; Supabase is the durable layer.
import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const STORAGE_KEY = 'vp-img-positions';

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function persist(map) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* storage full */
  }
}

function posKey(expeditionId, imageUrl) {
  return `${expeditionId}::${imageUrl}`;
}

// Module-level promise so hydration runs at most once per page load,
// even when multiple components mount useImagePositions().
let hydrationPromise = null;

async function hydrateFromSupabase(setPositions) {
  if (hydrationPromise) return hydrationPromise;
  hydrationPromise = (async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase
        .from('expedition_image_prefs')
        .select('expedition_id, image_url, x, y')
        .eq('user_id', user.id);
      if (error || !data) return;
      const next = { ...load() };
      for (const row of data) {
        next[posKey(row.expedition_id, row.image_url)] = { x: row.x, y: row.y };
      }
      persist(next);
      setPositions(next);
    } catch {
      /* offline / network — fall back to localStorage only */
    }
  })();
  return hydrationPromise;
}

export function useImagePositions() {
  const [positions, setPositions] = useState(load);

  useEffect(() => {
    hydrateFromSupabase(setPositions);
  }, []);

  const getPos = useCallback(
    (expeditionId, imageUrl) =>
      positions[posKey(expeditionId, imageUrl)] ?? { x: 50, y: 40 },
    [positions]
  );

  const setPos = useCallback(async (expeditionId, imageUrl, pos) => {
    setPositions((prev) => {
      const next = { ...prev, [posKey(expeditionId, imageUrl)]: pos };
      persist(next);
      return next;
    });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      supabase
        .from('expedition_image_prefs')
        .upsert(
          {
            user_id: user.id,
            expedition_id: expeditionId,
            image_url: imageUrl,
            x: pos.x,
            y: pos.y,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,expedition_id,image_url' }
        )
        .then(({ error }) => {
          if (error) console.warn('[useImagePositions] supabase upsert failed:', error.message);
        });
    } catch {
      /* network error — localStorage already updated */
    }
  }, []);

  return { getPos, setPos };
}
