#!/usr/bin/env node
/**
 * fix-issues.mjs
 * Reads pending issues from pipeline/issues/queue.json.
 * Fixes them using Ollama (llama3.1:8b) or llama.cpp fallback.
 * Patches public/data/inspire_all.json in place.
 * Archives resolved issues to pipeline/issues/archive.json.
 *
 * Requires Ollama running: ollama serve (then: ollama pull llama3.1:8b)
 * Or llama.cpp server on port 8080.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { readQueue, updateIssue, archiveResolved } from './lib/queue.js';
import { fetchCity, otmGeocode, otmPois, otmDetail, poiFromOtm, slugify, OTM_KEY } from './lib/city-fetcher.js';
import { wikiSummary } from './lib/city-fetcher.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, '..', 'public', 'data', 'inspire_all.json');

// LLM endpoints — try Ollama first, fall back to llama.cpp
const LLM_ENDPOINTS = [
  { url: 'http://localhost:11434/api/chat', type: 'ollama' },
  { url: 'http://localhost:8080/v1/chat/completions', type: 'openai' },
];
const MODEL = 'llama3.1:8b';

async function llmChat(prompt) {
  for (const endpoint of LLM_ENDPOINTS) {
    try {
      const body = endpoint.type === 'ollama'
        ? { model: MODEL, messages: [{ role: 'user', content: prompt }], stream: false, options: { temperature: 0.3, num_predict: 300 } }
        : { model: MODEL, messages: [{ role: 'user', content: prompt }], max_tokens: 300, temperature: 0.3 };

      const res = await fetch(endpoint.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(30000),
      });
      if (!res.ok) continue;
      const data = await res.json();
      const text = endpoint.type === 'ollama'
        ? data.message?.content
        : data.choices?.[0]?.message?.content;
      if (text?.trim()) return text.trim();
    } catch { continue; }
  }
  throw new Error('No LLM endpoint available. Start Ollama with: ollama serve');
}

function loadDB() { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
function saveDB(db) {
  db.generated = new Date().toISOString().slice(0, 10);
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), 'utf8');
}

async function fixWrongLanguage(issue, db) {
  const city = db.cities.find(c => c.id === issue.cityId);
  if (!city) throw new Error(`City ${issue.cityId} not in DB`);
  const poi = city.pois.find(p => p.id === issue.poiId);
  if (!poi) throw new Error(`POI ${issue.poiId} not found`);

  const wiki = await wikiSummary(poi.name);
  const context = wiki?.extract?.slice(0, 300) ?? '';

  const prompt = `You are a travel guide editor. Rewrite this POI description in clear, engaging English.
Requirements: English only, 1-2 sentences, factual, no generic phrases like "a notable landmark".
City: ${city.name}, ${city.country}
POI name: ${poi.name}
Current description: ${poi.description}
${context ? `Wikipedia context: ${context}` : ''}
Return ONLY the rewritten description, nothing else.`;

  const fixed = await llmChat(prompt);
  poi.description = fixed.slice(0, 200);
  return `Fixed description: "${fixed.slice(0, 80)}…"`;
}

async function fixBadPoi(issue, db) {
  const city = db.cities.find(c => c.id === issue.cityId);
  if (!city) throw new Error(`City ${issue.cityId} not in DB`);
  const poi = city.pois.find(p => p.id === issue.poiId);
  if (!poi) throw new Error(`POI ${issue.poiId} not found`);

  const wiki = await wikiSummary(poi.name);
  const context = wiki?.extract?.slice(0, 400) ?? '';

  if (!context) {
    // Remove the POI if we can't find any info about it
    city.pois = city.pois.filter(p => p.id !== issue.poiId);
    return `Removed unfixable POI "${poi.name}" (no Wikipedia data found)`;
  }

  const prompt = `You are a travel guide editor. Write a short description for this place.
Requirements: English only, 1-2 sentences, factual, engaging, specific to this place.
City: ${city.name}, ${city.country}
Place name: ${poi.name}
Wikipedia: ${context}
Return ONLY the description, nothing else.`;

  const fixed = await llmChat(prompt);
  poi.description = fixed.slice(0, 200);
  return `Fixed description for "${poi.name}"`;
}

async function fixMissingImage(issue, db) {
  const city = db.cities.find(c => c.id === issue.cityId);
  if (!city) throw new Error(`City ${issue.cityId} not in DB`);

  const wiki = await wikiSummary(city.name);
  const img = wiki?.originalimage?.source ?? wiki?.thumbnail?.source ?? '';
  if (img) {
    city.image_url = img;
    return `Set image from Wikipedia: ${img.slice(0, 60)}…`;
  }

  // Try Wikimedia Commons search
  const res = await fetch(
    `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(city.name + ' city')}&srnamespace=6&srlimit=3&format=json`
  );
  const data = await res.json();
  const title = data?.query?.search?.[0]?.title;
  if (title) {
    const infoRes = await fetch(
      `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=imageinfo&iiprop=url&format=json`
    );
    const infoData = await infoRes.json();
    const pages = Object.values(infoData?.query?.pages ?? {});
    const url = pages[0]?.imageinfo?.[0]?.url;
    if (url) { city.image_url = url; return `Set image from Wikimedia Commons`; }
  }
  throw new Error('No image found from Wikipedia or Wikimedia Commons');
}

async function fixMissingPois(issue, db) {
  const city = db.cities.find(c => c.id === issue.cityId);
  if (!city) throw new Error(`City ${issue.cityId} not in DB`);

  // Re-geocode and fetch with wider radius + lower rate filter
  const geo = await otmGeocode(city.name, city.country);
  const seen = new Set(city.pois.map(p => p.id));
  const newPois = [];

  for (const kinds of ['cultural', 'historic', 'museums', 'restaurants']) {
    try {
      const url = `https://api.opentripmap.com/0.1/en/places/radius?radius=12000&lon=${geo.lon}&lat=${geo.lat}&kinds=${kinds}&limit=8&rate=2&format=json&apikey=${OTM_KEY}`;
      const res = await fetch(url);
      const places = await res.json();
      for (const place of places) {
        if (!place.name?.trim() || seen.has(place.xid)) continue;
        if (/^stolperstein|^gedenktafel|^mahnmal/i.test(place.name)) continue;
        seen.add(place.xid);
        await new Promise(r => setTimeout(r, 200));
        const detail = await otmDetail(place.xid);
        const poi = poiFromOtm(place, detail, city.name);
        if (poi && !city.pois.find(p => p.id === poi.id)) {
          city.pois.push(poi);
          newPois.push(poi.name);
        }
        if (city.pois.length >= 12) break;
      }
    } catch { continue; }
    await new Promise(r => setTimeout(r, 300));
    if (city.pois.length >= 12) break;
  }
  return `Added ${newPois.length} POIs: ${newPois.join(', ')}`;
}

async function fixWrongLocation(issue, db) {
  const city = db.cities.find(c => c.id === issue.cityId);
  if (!city) throw new Error(`City ${issue.cityId} not in DB`);
  // Re-fetch entire city with strict country enforcement
  const fresh = await fetchCity(city.name, city.country, { verbose: false });
  const idx = db.cities.findIndex(c => c.id === issue.cityId);
  db.cities[idx] = fresh;
  return `Re-fetched entire city entry with corrected location`;
}

// ── Main ─────────────────────────────────────────────────────────────────────

const queue = readQueue().filter(e => e.status === 'pending');
console.log(`\n🔧  VenturePath Issue Fixer`);
console.log(`    ${queue.length} pending issues\n`);

if (queue.length === 0) {
  console.log('    Nothing to fix. Queue is empty.\n');
  process.exit(0);
}

const db = loadDB();
let fixed = 0, failed = 0;

for (const issue of queue) {
  console.log(`\n▶  [${issue.type}] ${issue.cityName} — ${issue.poiId ?? 'city-level'}`);
  console.log(`   ${issue.detail}`);

  updateIssue(issue.id, { status: 'in_progress' });

  try {
    let result;
    switch (issue.type) {
      case 'wrong_language': result = await fixWrongLanguage(issue, db); break;
      case 'bad_poi':        result = await fixBadPoi(issue, db);        break;
      case 'missing_image':  result = await fixMissingImage(issue, db);  break;
      case 'missing_pois':   result = await fixMissingPois(issue, db);   break;
      case 'wrong_location':
      case 'wrong_city':     result = await fixWrongLocation(issue, db); break;
      default:
        updateIssue(issue.id, { status: 'skipped' });
        console.log(`   ⏭  Skipped (type "${issue.type}" requires manual fix)`);
        continue;
    }

    updateIssue(issue.id, {
      status:    'resolved',
      resolvedAt: new Date().toISOString(),
      llmFix:    { result, appliedAt: new Date().toISOString() },
    });
    console.log(`   ✅  ${result}`);
    fixed++;
  } catch (e) {
    updateIssue(issue.id, {
      status: 'pending', // reset so it can be retried
      llmFix: { error: e.message, attemptedAt: new Date().toISOString() },
    });
    console.log(`   ✖  ${e.message}`);
    failed++;
  }
}

saveDB(db);
const archived = archiveResolved();
console.log(`\n──────────────────────────────────────────────`);
console.log(`✅  Fixed: ${fixed}, Failed: ${failed}, Archived: ${archived}\n`);
