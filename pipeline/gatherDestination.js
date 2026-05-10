import fs from 'fs';
import path from 'path';

const WD_API = 'https://www.wikidata.org/w/api.php';
const COMMONS_THUMB = 'https://commons.wikimedia.org/wiki/Special:FilePath/';
const OTM_BASE = 'https://api.opentripmap.com/0.1/en';
const OTM_KEY = process.env.VITE_OTM_API_KEY ?? '';

function slug(city) {
  return city.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

async function wikidataSearch(name) {
  const url = new URL(WD_API);
  url.searchParams.set('action', 'wbsearchentities');
  url.searchParams.set('search', name);
  url.searchParams.set('language', 'en');
  url.searchParams.set('limit', '1');
  url.searchParams.set('format', 'json');
  url.searchParams.set('origin', '*');
  const res = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) });
  const text = await res.text();
  if (!text.trim().startsWith('{')) return null;
  const data = JSON.parse(text);
  return data.search?.[0]?.id ?? null;
}

async function wikidataProps(qid) {
  const url = new URL(WD_API);
  url.searchParams.set('action', 'wbgetentities');
  url.searchParams.set('ids', qid);
  url.searchParams.set('props', 'descriptions|claims|labels');
  url.searchParams.set('languages', 'en');
  url.searchParams.set('format', 'json');
  url.searchParams.set('origin', '*');
  const res = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) });
  const text = await res.text();
  if (!text.trim().startsWith('{')) return null;
  const data = JSON.parse(text);
  return data.entities?.[qid] ?? null;
}

function extractImageUrl(entity) {
  const p18 = entity?.claims?.['P18']?.[0]?.mainsnak?.datavalue?.value;
  if (!p18) return null;
  const encoded = encodeURIComponent(p18.replace(/ /g, '_'));
  return `${COMMONS_THUMB}${encoded}?width=800`;
}

function extractCoords(entity) {
  const p625 = entity?.claims?.['P625']?.[0]?.mainsnak?.datavalue?.value;
  if (!p625) return null;
  return { lat: p625.latitude, lng: p625.longitude };
}

async function otmPois(lat, lng) {
  if (!OTM_KEY) return [];
  try {
    const url = new URL(`${OTM_BASE}/places/radius`);
    url.searchParams.set('radius', '10000');
    url.searchParams.set('lat', lat);
    url.searchParams.set('lon', lng);
    url.searchParams.set('kinds', 'natural,cultural,historic');
    url.searchParams.set('limit', '10');
    url.searchParams.set('apikey', OTM_KEY);
    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(5000) });
    const data = await res.json();
    return (data.features ?? []).map(f => ({
      name: f.properties.name,
      kinds: f.properties.kinds,
      dist: f.properties.dist,
    }));
  } catch { return []; }
}

async function openMeteoClimate(lat, lng) {
  try {
    const url = `https://api.open-meteo.com/v1/climate?latitude=${lat}&longitude=${lng}&models=EC_Earth3P_HR&daily=temperature_2m_mean&start_date=2023-01-01&end_date=2023-12-31&timezone=auto`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return 'temperate';
    const data = await res.json();
    const temps = data.daily?.temperature_2m_mean ?? [];
    const avg = temps.reduce((s, t) => s + t, 0) / (temps.length || 1);
    if (avg < -5) return 'subarctic';
    if (avg < 5) return 'alpine';
    if (avg < 25) return 'temperate';
    return 'tropical';
  } catch { return 'temperate'; }
}

export async function gatherDestination(cityLine, cacheDir) {
  const city = cityLine.trim();
  const s = slug(city);
  const cachePath = path.join(cacheDir, `${s}.json`);

  if (fs.existsSync(cachePath)) {
    console.log(`  [cache hit] ${city}`);
    return JSON.parse(fs.readFileSync(cachePath, 'utf8'));
  }

  console.log(`  [gather] ${city}`);
  await new Promise(r => setTimeout(r, 800));

  const qid = await wikidataSearch(city);
  const entity = qid ? await wikidataProps(qid) : null;
  const description = entity?.descriptions?.en?.value ?? '';
  const imageUrl = entity ? extractImageUrl(entity) : null;
  const coords = entity ? extractCoords(entity) : null;
  const climate = coords ? await openMeteoClimate(coords.lat, coords.lng) : 'temperate';
  const pois = coords ? await otmPois(coords.lat, coords.lng) : [];

  const bundle = { city, slug: s, qid, description, imageUrl, coords, climate, pois };
  fs.mkdirSync(cacheDir, { recursive: true });
  fs.writeFileSync(cachePath, JSON.stringify(bundle, null, 2));
  return bundle;
}
