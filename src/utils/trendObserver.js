/**
 * scoreCities — pure function, no side effects.
 *
 * @param {Array<{ id: string, name: string, tags: string[] }>} cities
 * @param {string[]} trendTerms — trending search strings in rank order (index 0 = most trending)
 * @returns {Map<string, { score: number, label: string }>} cityId → { score, label }
 *
 * Scoring:
 *   For each (termIndex, term) pair, a city matches when:
 *     city.name.toLowerCase() is a substring of term.toLowerCase(), OR
 *     term.toLowerCase() is a substring of city.name.toLowerCase(), OR
 *     (only if no name match) any city.tags entry satisfies either substring direction with term.
 *   On match: weight = Math.max(1, 20 - termIndex) is added to the city's accumulated score.
 *   label = the term text from the match that produced the highest single weight (ties: first wins).
 */
export function scoreCities(cities, trendTerms) {
  /** @type {Map<string, { score: number, label: string, bestWeight: number }>} */
  const result = new Map();

  for (let termIndex = 0; termIndex < trendTerms.length; termIndex++) {
    const term = trendTerms[termIndex];
    const termLower = term.toLowerCase();
    const weight = Math.max(1, 20 - termIndex);

    for (const city of cities) {
      const nameLower = city.name.toLowerCase();
      const nameMatches =
        nameLower.includes(termLower) || termLower.includes(nameLower);

      const tagMatches = !nameMatches && city.tags.some(tag => {
        const tagLower = tag.toLowerCase();
        return tagLower.includes(termLower) || termLower.includes(tagLower);
      });

      if (!nameMatches && !tagMatches) continue;

      const existing = result.get(city.id);
      if (!existing) {
        result.set(city.id, { score: weight, label: term, bestWeight: weight });
      } else {
        existing.score += weight;
        if (weight > existing.bestWeight) {
          existing.bestWeight = weight;
          existing.label = term;
        }
      }
    }
  }

  // Strip internal bestWeight before returning
  const clean = new Map();
  for (const [id, { score, label }] of result) {
    clean.set(id, { score, label });
  }
  return clean;
}
