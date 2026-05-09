#!/usr/bin/env node
/**
 * fetch-cities.mjs
 * Reads pipeline/destinations.txt, fetches each city via OTM + Wikipedia,
 * runs auto-detect, appends issues to pipeline/issues/queue.json.
 *
 * Usage:
 *   node scripts/fetch-cities.mjs
 *   node scripts/fetch-cities.mjs --force      # re-fetch existing cities
 *   node scripts/fetch-cities.mjs --limit 5    # only process first 5
 *   node scripts/fetch-cities.mjs --dry-run    # print plan, don't write
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { fetchCity, slugify, OTM_KEY } from './lib/city-fetcher.js';
import { detectIssues } from './lib/auto-detect.js';
import { appendIssue } from './lib/queue.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE  = path.join(__dirname, '..', 'public', 'data', 'inspire_all.json');
const DEST_FILE  = path.join(__dirname, '..', 'pipeline', 'destinations.txt');

const FORCE   = process.argv.includes('--force');
const DRY_RUN = process.argv.includes('--dry-run');
const limitArg = process.argv.indexOf('--limit');
const LIMIT   = limitArg >= 0 ? parseInt(process.argv[limitArg + 1], 10) : Infinity;

if (!OTM_KEY) {
  console.error('Set VITE_OTM_API_KEY in .env');
  process.exit(1);
}

// Parse destinations.txt
const lines = fs.readFileSync(DEST_FILE, 'utf8').split('\n');
const destinations = lines
  .map(l => l.trim())
  .filter(l => l && !l.startsWith('#'));

// Load existing DB
const db = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
const existingIds = new Set(db.cities.map(c => c.id));

const toFetch = destinations
  .filter(d => FORCE || !existingIds.has(slugify(d.split(',')[0].trim())))
  .slice(0, LIMIT);

console.log(`\n🗺   VenturePath City Fetcher`);
console.log(`    ${destinations.length} destinations in file`);
console.log(`    ${toFetch.length} to fetch${FORCE ? ' (--force)' : ''}`);
if (DRY_RUN) console.log('    DRY RUN — no writes\n');
console.log('──────────────────────────────────────────────');

let added = 0, skipped = 0, issuesFound = 0;

for (const dest of toFetch) {
  const [cityName, countryRaw] = dest.split(',').map(s => s.trim());
  const country = countryRaw ?? '';
  console.log(`\n🌍  ${cityName}, ${country}`);

  try {
    const cityObj = await fetchCity(cityName, country, { verbose: false });
    console.log(`    ✅ ${cityObj.pois.length} POIs`);

    // Auto-detect quality issues
    const issues = detectIssues(cityObj);
    if (issues.length) {
      console.log(`    ⚠️  ${issues.length} issue(s) detected`);
      issuesFound += issues.length;
    }

    if (!DRY_RUN) {
      if (issues.length) issues.forEach(appendIssue);
      const idx = db.cities.findIndex(c => c.id === cityObj.id);
      if (idx >= 0) db.cities[idx] = cityObj;
      else db.cities.push(cityObj);
      added++;
    }
  } catch (e) {
    console.log(`    ✖  Failed: ${e.message}`);
    skipped++;
  }

  // Polite delay between cities
  await new Promise(r => setTimeout(r, 500));
}

if (!DRY_RUN) {
  db.generated = new Date().toISOString().slice(0, 10);
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), 'utf8');
}

console.log('\n──────────────────────────────────────────────');
console.log(`✅  Done: ${added} added, ${skipped} failed, ${issuesFound} issues queued`);
console.log(`    Total cities in DB: ${db.cities.length}\n`);
