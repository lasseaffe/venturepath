import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';

export const DEFAULT_FILTERS = {
  difficulty: [],
  climate: [],
  daysMax: 30,
  squadMin: 1,
  paidOnly: false,
  freeOnly: false,
  tab: 'trending',
};

export function useProPaths(filters = DEFAULT_FILTERS) {
  const [paths, setPaths] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    supabase
      .from('pro_paths')
      .select('*')
      .order('clones', { ascending: false })
      .then(({ data, error: err }) => {
        if (cancelled) return;
        if (err) { setError(err.message); setLoading(false); return; }
        setPaths(data ?? []);
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    let result = [...paths];

    if (filters.tab === 'curated') result = result.filter(p => p.is_curated);
    if (filters.tab === 'community') result = result.filter(p => p.is_community);

    if (filters.difficulty.length > 0)
      result = result.filter(p => filters.difficulty.includes(p.difficulty));
    if (filters.climate.length > 0)
      result = result.filter(p => filters.climate.includes(p.climate));
    if (filters.daysMax < 30)
      result = result.filter(p => p.days <= filters.daysMax);
    if (filters.squadMin > 1)
      result = result.filter(p => p.squad_max >= filters.squadMin);
    if (filters.freeOnly)
      result = result.filter(p => p.price_usd === 0);
    if (filters.paidOnly)
      result = result.filter(p => p.price_usd > 0);

    if (filters.tab === 'trending') {
      result = result.slice().sort((a, b) => b.clones - a.clones);
    }

    return result;
  }, [paths, filters]);

  return { paths: filtered, loading, error, refetch: () => {} };
}
