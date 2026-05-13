#!/usr/bin/env node
/**
 * fetch-destination-photos.js
 *
 * Dev utility to pull candidate hero image URLs from Pexels and Unsplash.
 * Run once per destination to generate candidates for manual verification.
 *
 * USAGE:
 *   node scripts/fetch-destination-photos.js --destination "hamburg" --count 10
 *
 * ENVIRONMENT:
 *   PEXELS_API_KEY        (required for Pexels; skip with warning if missing)
 *   UNSPLASH_ACCESS_KEY   (required for Unsplash; skip with warning if missing)
 *
 * OUTPUT:
 *   Prints candidate URLs + metadata to stdout.
 *   Copy verified entries into DESTINATION_HEROES["destination"] in src/utils/destinationEngine.js.
 *   Open each preview URL in a browser to verify it shows the correct destination before committing.
 *
 * EXAMPLE OUTPUT:
 *   // Paste verified entries into DESTINATION_HEROES["hamburg"]:
 *   // Open each preview URL to verify it shows hamburg before committing.
 *
 *   // preview: https://images.unsplash.com/...?w=400
 *   { url: '...', source: 'unsplash', credit: 'John Photographer', tags: ['hamburg', 'waterfront'] },
 */

const args = process.argv.slice(2);
const dest = args[args.indexOf('--destination') + 1] ?? 'hamburg';
const count = parseInt(args[args.indexOf('--count') + 1] ?? '10', 10);

const PEXELS_KEY = process.env.PEXELS_API_KEY;
const UNSPLASH_KEY = process.env.UNSPLASH_ACCESS_KEY;

if (!PEXELS_KEY && !UNSPLASH_KEY) {
  console.error('ERROR: Set PEXELS_API_KEY or UNSPLASH_ACCESS_KEY before running.');
  process.exit(1);
}

/**
 * Fetch landscape-oriented photos from Pexels API.
 * Returns array of { url, source, credit, tags, preview }.
 */
async function fetchPexels(query, perPage) {
  if (!PEXELS_KEY) {
    console.warn('⚠️  PEXELS_API_KEY not set — skipping Pexels');
    return [];
  }

  try {
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=landscape`,
      { headers: { Authorization: PEXELS_KEY } }
    );

    if (!res.ok) {
      console.warn(`⚠️  Pexels API returned ${res.status} for query "${query}"`);
      return [];
    }

    const json = await res.json();
    return (json.photos ?? []).map(p => ({
      url: p.src.original + '?auto=compress&cs=tinysrgb&w=2560',
      source: 'pexels',
      credit: p.photographer,
      tags: query.toLowerCase().split(' '),
      preview: p.src.medium,
    }));
  } catch (err) {
    console.warn(`⚠️  Pexels fetch failed for "${query}":`, err.message);
    return [];
  }
}

/**
 * Fetch landscape-oriented photos from Unsplash API.
 * Returns array of { url, source, credit, tags, preview }.
 */
async function fetchUnsplash(query, perPage) {
  if (!UNSPLASH_KEY) {
    console.warn('⚠️  UNSPLASH_ACCESS_KEY not set — skipping Unsplash');
    return [];
  }

  try {
    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=landscape`,
      { headers: { Authorization: `Client-ID ${UNSPLASH_KEY}` } }
    );

    if (!res.ok) {
      console.warn(`⚠️  Unsplash API returned ${res.status} for query "${query}"`);
      return [];
    }

    const json = await res.json();
    return (json.results ?? []).map(p => ({
      url: p.urls.raw + '&w=2560&q=80&fm=jpg',
      source: 'unsplash',
      credit: p.user.name,
      tags: (p.tags ?? [])
        .map(t => t.title?.toLowerCase?.())
        .filter(Boolean),
      preview: p.urls.small,
    }));
  } catch (err) {
    console.warn(`⚠️  Unsplash fetch failed for "${query}":`, err.message);
    return [];
  }
}

/**
 * Main fetch routine.
 */
(async () => {
  console.log(`\n📷 Fetching candidate photos for: "${dest}"\n`);

  // Query variants to improve coverage
  const queries = [
    dest,
    `${dest} waterfront`,
    `${dest} landmark`,
    `${dest} architecture`,
    `${dest} skyline`,
  ];

  const half = Math.ceil(count / 2);
  const resultsPerQuery = Math.ceil(half / 3);

  const results = [];

  // Fetch from top 3 query variants (original + waterfront + landmark)
  for (const q of queries.slice(0, 3)) {
    console.log(`Searching: "${q}"...`);
    results.push(...(await fetchPexels(q, resultsPerQuery)));
    results.push(...(await fetchUnsplash(q, resultsPerQuery)));
  }

  // Deduplicate by URL and slice to count
  const unique = results
    .filter((r, i, a) => a.findIndex(x => x.url === r.url) === i)
    .slice(0, count);

  if (unique.length === 0) {
    console.error(
      '\n❌ No results found. Check API keys and destination name.\n'
    );
    process.exit(1);
  }

  console.log(
    `\n✅ Found ${unique.length} unique results.\n` +
    `================================================================================\n` +
    `// Paste verified entries into DESTINATION_HEROES["${dest}"]:\n` +
    `// Open each preview URL in a browser to verify it shows "${dest}" before committing.\n`
  );

  unique.forEach(r => {
    console.log(`// preview: ${r.preview}`);
    console.log(
      `{ url: '${r.url}', source: '${r.source}', credit: '${r.credit}', tags: ${JSON.stringify(r.tags)} },`
    );
  });

  console.log(
    `\n================================================================================\n`
  );
})();
