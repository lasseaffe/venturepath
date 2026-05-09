#!/usr/bin/env node
/**
 * generate-city.mjs
 * Usage: node scripts/generate-city.mjs "Hamburg, Germany"
 *        node scripts/generate-city.mjs "Tokyo, Japan" --dry-run
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { fetchCity, slugify, OTM_KEY } from './lib/city-fetcher.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, '..', 'public', 'data', 'inspire_all.json');

const DRY_RUN = process.argv.includes('--dry-run');
const cityArg = process.argv.slice(2).filter(a => !a.startsWith('--'))[0];

if (!cityArg) { console.error('Usage: node scripts/generate-city.mjs "City, Country"'); process.exit(1); }
if (!OTM_KEY) { console.error('Set VITE_OTM_API_KEY in .env'); process.exit(1); }

const [cityName, countryRaw] = cityArg.split(',').map(s => s.trim());
const country = countryRaw ?? '';

console.log(`\n🌍  Generating: ${cityName}${country ? `, ${country}` : ''}`);
console.log('──────────────────────────────────────────────');

const cityObj = await fetchCity(cityName, country);
console.log(`✅  Collected ${cityObj.pois.length} POIs`);

if (DRY_RUN) { console.log('\n── DRY RUN ──\n', JSON.stringify(cityObj, null, 2)); process.exit(0); }

const db = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
const idx = db.cities.findIndex(c => c.id === cityObj.id);
if (idx >= 0) { db.cities[idx] = cityObj; console.log(`\n♻️   Replaced "${cityName}"`); }
else { db.cities.push(cityObj); console.log(`\n➕  Added "${cityName}" (total: ${db.cities.length})`); }
db.generated = new Date().toISOString().slice(0, 10);
fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), 'utf8');
console.log(`💾  Saved.\n`);

// =============================================================================
// FOURSQUARE INTEGRATION (disabled — project in sandbox mode, no billing)
// Re-enable: 1) add billing at foursquare.com/developers
//            2) set VITE_FSQ_API_KEY in .env
//            3) swap OTM_FETCH_KINDS loop for FSQ block below
// =============================================================================
// const FSQ_KEY = process.env.VITE_FSQ_API_KEY ?? '';
// const FSQ_BASE = 'https://api.foursquare.com/v3';
// const FSQ_CATEGORY_GROUPS = [
//   { label: 'landmark',   fsqCategory: '16000', icon: '🏛',  duration: 90  },
//   { label: 'food',       fsqCategory: '13065', icon: '🍽',  duration: 75  },
//   { label: 'activity',   fsqCategory: '10000', icon: '🎭',  duration: 120 },
//   { label: 'hidden_gem', fsqCategory: '16020', icon: '💎',  duration: 60  },
// ];
// async function fsqSearch(near, categoryId, limit = 6) {
//   const url = `${FSQ_BASE}/places/search?near=${encodeURIComponent(near)}&categories=${categoryId}&limit=${limit}&sort=RATING`;
//   const res = await fetch(url, { headers: { Accept: 'application/json', Authorization: FSQ_KEY } });
//   if (!res.ok) throw new Error(`Foursquare ${res.status}: ${await res.text()}`);
//   return (await res.json()).results ?? [];
// }
// function poiFromFsq(place, group, city) {
//   return {
//     id: `${group.label}-${slugify(place.name)}`, name: place.name, category: group.label,
//     icon: group.icon, description: place.categories?.[0]?.name
//       ? `${place.categories[0].name} in ${city}.` : `A notable ${group.label} in ${city}.`,
//     duration_min: group.duration, time_suggestion: null, notes: null,
//   };
// }
