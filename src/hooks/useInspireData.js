import { useState, useEffect } from 'react';

const DATA_URL = '/data/inspire_all.json';

export function useInspireData() {
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(DATA_URL)
      .then(r => {
        if (!r.ok) throw new Error(`Failed to load inspire data: ${r.status}`);
        return r.json();
      })
      .then(data => {
        setCities(data.cities ?? []);
        setLoading(false);
      })
      .catch(err => {
        console.error('[useInspireData] Failed to fetch inspire_all.json:', err);
        setError(err.message ?? 'Unknown error');
        setLoading(false);
      });
  }, []);

  return { cities, loading, error };
}

/**
 * Find the best matching city for a day label string.
 * Returns a matching city object or a random one as fallback.
 */
export function matchCity(cities, dayLabel) {
  if (!cities.length) return null;
  const needle = dayLabel.toLowerCase();
  const match = cities.find(c =>
    needle.includes(c.name.toLowerCase()) ||
    needle.includes(c.id.toLowerCase().replace(/-/g, ' '))
  );
  if (match) return match;
  return cities[Math.floor(Math.random() * cities.length)];
}
