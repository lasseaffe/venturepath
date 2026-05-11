// src/lib/images/scrapeImages.js
import { chromium }        from 'playwright-core';
import { scrapeFlickr }    from './flickrScraper.js';
import { scrapeWikimedia } from './wikimediaScraper.js';

/**
 * Scrape up to `count` CC-licensed images for `query`.
 * Flickr first; Wikimedia fills the gap if Flickr returns fewer than 2 results.
 *
 * @param {string} query   e.g. "Lille France" or "St. Nikolai Museum Hamburg"
 * @param {number} [count=5]
 * @returns {Promise<object[]>}  DestinationImage[]
 */
export async function scrapeImages(query, count = 5) {
  const browser = await chromium.launch({ headless: true });
  try {
    const flickr = await scrapeFlickr(browser, query, count);
    if (flickr.length >= 2) return flickr.slice(0, count);

    const wiki = await scrapeWikimedia(browser, query, count - flickr.length);
    return [...flickr, ...wiki].slice(0, count);
  } finally {
    await browser.close();
  }
}

/**
 * Normalize a destination string into a stable Supabase cache key.
 * "Lille, France" → "lille, france"
 *
 * @param {string} query
 * @returns {string}
 */
export function normalizeQueryKey(query) {
  return query.toLowerCase().trim().replace(/\s+/g, ' ');
}
