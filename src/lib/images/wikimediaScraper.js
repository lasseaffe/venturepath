// src/lib/images/wikimediaScraper.js

/**
 * Scrape up to `count` CC-licensed images from Wikimedia Commons.
 * Uses Playwright locator API — no legacy page.evaluate usage.
 *
 * @param {import('@playwright/browser-chromium').Browser} browser
 * @param {string} query
 * @param {number} count
 * @returns {Promise<object[]>}  DestinationImage[]
 */
export async function scrapeWikimedia(browser, query, count = 5) {
  const page = await browser.newPage();
  const results = [];

  try {
    const searchUrl =
      `https://commons.wikimedia.org/w/index.php` +
      `?search=${encodeURIComponent(query)}&title=Special:MediaSearch&type=image`;

    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page
      .locator('.sdms-image-result, a[href*="/wiki/File:"]')
      .first()
      .waitFor({ timeout: 10000 })
      .catch(() => {});

    // Collect File: page links
    const linkLocators = await page
      .locator('.sdms-image-result a, .searchResultImage a, a[href*="/wiki/File:"]')
      .all()
      .catch(() => []);

    const filePageUrls = [];
    for (const loc of linkLocators.slice(0, 10)) {
      const href = await loc.getAttribute('href').catch(() => null);
      if (href?.includes('/wiki/File:') && !filePageUrls.includes(href)) {
        filePageUrls.push(href.startsWith('http') ? href : `https://commons.wikimedia.org${href}`);
      }
    }

    for (const filePageUrl of filePageUrls) {
      if (results.length >= count) break;

      try {
        await page.goto(filePageUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });

        const imageUrl = await page
          .locator('#file a, .fullMedia a, a[href*="upload.wikimedia.org"]')
          .first()
          .getAttribute('href')
          .catch(() => null);

        if (!imageUrl || !imageUrl.match(/\.(jpg|jpeg|png|webp)/i)) continue;

        const author = await page
          .locator('.licensetpl_short, .author, [id*="fileinfotpl_aut"] + td, td.licensetpl_via')
          .first()
          .textContent({ timeout: 4000 })
          .then(t => t?.trim())
          .catch(() => null);

        const licenseLocator = page.locator('a[href*="creativecommons"], .licensetpl_short').first();
        const license    = await licenseLocator.textContent({ timeout: 4000 }).then(t => t?.trim()).catch(() => null);
        const licenseUrl = await licenseLocator.getAttribute('href').catch(() => null);

        if (!author || !license) continue;

        const filename = decodeURIComponent(filePageUrl.split('/wiki/File:')[1] ?? '');
        // Construct a 320px Wikimedia thumb URL from the full image URL
        const thumbUrl = imageUrl
          .replace(/\/commons\/([a-f0-9])\/([a-f0-9]{2})\//, '/commons/thumb/$1/$2/')
          + `/320px-${filename}`;

        results.push({
          url:          imageUrl,
          thumb:        thumbUrl || imageUrl,
          title:        filename.replace(/_/g, ' '),
          author:       author.replace(/\s+/g, ' ').slice(0, 100),
          authorUrl:    filePageUrl,
          photoPageUrl: filePageUrl,
          license:      license.slice(0, 50),
          licenseUrl:   licenseUrl?.startsWith('http') ? licenseUrl : `https:${licenseUrl ?? '//creativecommons.org/licenses/'}`,
          source:       'wikimedia',
        });
      } catch {
        // skip this file
      }
    }
  } finally {
    await page.close();
  }

  return results;
}
