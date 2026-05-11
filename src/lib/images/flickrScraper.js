// src/lib/images/flickrScraper.js

// Flickr CC license IDs accepted: BY, BY-SA, BY-ND, BY-NC, BY-NC-SA, BY-NC-ND, CC0, PDM
const FLICKR_LICENSE_PARAMS = '2%2C3%2C4%2C5%2C6%2C9%2C10';

// Parse "https://live.staticflickr.com/65535/53045678412_a8a6c74b80_m.jpg"
// into { server, id, secret } for URL construction.
function parseFlickrCdnUrl(src) {
  const m = src.match(/staticflickr\.com\/(\d+)\/(\d+)_([a-f0-9]+)_\w+\.jpg/);
  return m ? { server: m[1], id: m[2], secret: m[3] } : null;
}

function buildFlickrUrls({ server, id, secret }) {
  const base = `https://live.staticflickr.com/${server}/${id}_${secret}`;
  return { url: `${base}_b.jpg`, thumb: `${base}_m.jpg` };
}

function normalizeLicense(raw) {
  if (!raw) return null;
  const s = raw.toLowerCase();
  if (s.includes('public domain'))                             return 'CC0 / Public Domain';
  if (s.includes('noncommercial') && s.includes('sharealike')) return 'CC BY-NC-SA 2.0';
  if (s.includes('noncommercial') && s.includes('noderivs'))   return 'CC BY-NC-ND 2.0';
  if (s.includes('noncommercial'))                             return 'CC BY-NC 2.0';
  if (s.includes('noderivs'))                                  return 'CC BY-ND 2.0';
  if (s.includes('sharealike'))                                return 'CC BY-SA 2.0';
  if (s.includes('attribution') || s.includes('cc by'))       return 'CC BY 2.0';
  return raw.slice(0, 50);
}

async function scrapePhotoAttribution(page, photoPageUrl) {
  try {
    await page.goto(photoPageUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });

    // Author name — try several selectors in order of reliability
    const authorLocator = page
      .locator('a.owner-name, a[data-track="attributionUsername"], .photo-owner a')
      .first();
    const author    = await authorLocator.textContent({ timeout: 5000 }).then(t => t?.trim()).catch(() => null);
    const authorUrl = await authorLocator.getAttribute('href').catch(() => null);

    // License link
    const licenseLocator = page
      .locator('a[rel="license"], .attribution-license a, a[href*="creativecommons"]')
      .first();
    const licenseRaw = await licenseLocator.textContent({ timeout: 5000 }).then(t => t?.trim()).catch(() => null);
    const licenseUrl = await licenseLocator.getAttribute('href').catch(() => null);
    const license    = normalizeLicense(licenseRaw);

    if (!author || !license) return null;

    return {
      author,
      authorUrl:   authorUrl ?? 'https://www.flickr.com',
      photoPageUrl,
      license,
      licenseUrl:  licenseUrl ?? 'https://creativecommons.org/licenses/',
    };
  } catch {
    return null;
  }
}

/**
 * Scrape up to `count` CC-licensed photos from Flickr for `query`.
 * Uses Playwright locator API throughout — no legacy page.evaluate usage.
 *
 * @param {import('@playwright/browser-chromium').Browser} browser
 * @param {string} query
 * @param {number} count
 * @returns {Promise<object[]>}  DestinationImage[]
 */
export async function scrapeFlickr(browser, query, count = 5) {
  const page = await browser.newPage();
  const results = [];

  try {
    const searchUrl =
      `https://www.flickr.com/search/?text=${encodeURIComponent(query)}` +
      `&license=${FLICKR_LICENSE_PARAMS}&media=photos&sort=relevance`;

    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page
      .locator('.photo-list-photo-view, img[src*="staticflickr"]')
      .first()
      .waitFor({ timeout: 10000 })
      .catch(() => {});

    // Collect photo anchors from search results
    const anchors = await page
      .locator('.photo-list-photo-view a[href*="/photos/"], .search-photos-view a[href*="/photos/"]')
      .all()
      .catch(() => []);

    // Fallback: any anchor wrapping a staticflickr image
    const fallbackAnchors = anchors.length === 0
      ? await page.locator('a:has(img[src*="staticflickr"])').all().catch(() => [])
      : [];

    const all = [...anchors, ...fallbackAnchors].slice(0, 12);

    for (const anchor of all) {
      if (results.length >= count) break;

      const href   = await anchor.getAttribute('href').catch(() => null);
      const imgSrc = await anchor.locator('img').first().getAttribute('src').catch(() => null);

      if (!imgSrc?.includes('staticflickr')) continue;

      const parsed = parseFlickrCdnUrl(imgSrc);
      if (!parsed) continue;

      const { url, thumb } = buildFlickrUrls(parsed);

      const rawHref      = href ?? '';
      const photoPageUrl = rawHref.startsWith('http')
        ? rawHref.split('?')[0]
        : `https://www.flickr.com${rawHref.split('?')[0]}`;

      if (!photoPageUrl.match(/flickr\.com\/photos\/[^/]+\/\d+/)) continue;

      const attribution = await scrapePhotoAttribution(page, photoPageUrl);
      if (!attribution) continue;

      results.push({ url, thumb, title: '', source: 'flickr', ...attribution });
    }
  } finally {
    await page.close();
  }

  return results;
}
