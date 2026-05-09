// scripts/lib/city-fetcher.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Auto-load .env two levels up (project root)
const envPath = path.join(__dirname, '..', '..', '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const [k, ...v] = line.trim().split('=');
    if (k && v.length && !process.env[k]) process.env[k] = v.join('=');
  });
}

export const OTM_KEY = process.env.VITE_OTM_API_KEY ?? '';
const OTM_BASE = 'https://api.opentripmap.com/0.1/en';

export function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

const OTM_KIND_MAP = [
  { otmKinds: ['foods', 'restaurants', 'cafe', 'bar'],               cat: 'food',       icon: '🍽',  duration: 75  },
  { otmKinds: ['cultural', 'museums', 'theatres_and_entertainments'], cat: 'activity',   icon: '🎭',  duration: 120 },
  { otmKinds: ['historic', 'architecture', 'religion'],               cat: 'landmark',   icon: '🏛',  duration: 90  },
  { otmKinds: ['natural', 'parks', 'sport'],                          cat: 'hidden_gem', icon: '💎',  duration: 60  },
];

export const OTM_FETCH_KINDS = [
  { kinds: 'cultural',                    label: 'cultural' },
  { kinds: 'historic',                    label: 'historic' },
  { kinds: 'museums',                     label: 'museums'  },
  { kinds: 'restaurants',                 label: 'food'     },
  { kinds: 'theatres_and_entertainments', label: 'activity' },
  { kinds: 'natural',                     label: 'nature'   },
];

export const COUNTRY_CONTINENT = {
  germany: 'Europe', france: 'Europe', spain: 'Europe', italy: 'Europe',
  portugal: 'Europe', netherlands: 'Europe', belgium: 'Europe', switzerland: 'Europe',
  austria: 'Europe', denmark: 'Europe', sweden: 'Europe', norway: 'Europe',
  finland: 'Europe', poland: 'Europe', czechia: 'Europe', 'czech republic': 'Europe',
  hungary: 'Europe', romania: 'Europe', greece: 'Europe', turkey: 'Europe',
  croatia: 'Europe', serbia: 'Europe', slovenia: 'Europe', slovakia: 'Europe',
  'united kingdom': 'Europe', uk: 'Europe', ireland: 'Europe', iceland: 'Europe',
  ukraine: 'Europe', 'bosnia and herzegovina': 'Europe', montenegro: 'Europe',
  japan: 'Asia', china: 'Asia', 'south korea': 'Asia', korea: 'Asia',
  thailand: 'Asia', vietnam: 'Asia', indonesia: 'Asia', malaysia: 'Asia',
  india: 'Asia', nepal: 'Asia', cambodia: 'Asia', laos: 'Asia',
  myanmar: 'Asia', singapore: 'Asia', philippines: 'Asia', taiwan: 'Asia',
  'hong kong': 'Asia', mongolia: 'Asia', 'sri lanka': 'Asia',
  'saudi arabia': 'Asia', 'united arab emirates': 'Asia', uae: 'Asia',
  jordan: 'Asia', israel: 'Asia', lebanon: 'Asia', iraq: 'Asia', iran: 'Asia',
  'united states': 'North America', usa: 'North America', canada: 'North America',
  mexico: 'North America', cuba: 'North America', 'costa rica': 'North America',
  guatemala: 'North America', panama: 'North America',
  brazil: 'South America', argentina: 'South America', colombia: 'South America',
  peru: 'South America', chile: 'South America', ecuador: 'South America',
  venezuela: 'South America', bolivia: 'South America', uruguay: 'South America',
  nigeria: 'Africa', kenya: 'Africa', ethiopia: 'Africa', ghana: 'Africa',
  tanzania: 'Africa', 'south africa': 'Africa', egypt: 'Africa',
  morocco: 'Africa', senegal: 'Africa', rwanda: 'Africa',
  australia: 'Oceania', 'new zealand': 'Oceania', fiji: 'Oceania',
};

export function inferContinent(country) {
  const cl = country.toLowerCase();
  return COUNTRY_CONTINENT[cl]
    ?? Object.entries(COUNTRY_CONTINENT).find(([k]) => cl.includes(k))?.[1]
    ?? 'Europe';
}

export function inferTags(wikiDesc = '', wikiExtract = '') {
  const text = (wikiDesc + ' ' + wikiExtract).toLowerCase();
  const checks = [
    ['port city',    ['port', 'harbour', 'harbor']],
    ['museums',      ['museum']],
    ['historic',     ['historic', 'medieval', 'ancient', 'old town']],
    ['beaches',      ['beach', 'coast', 'seaside']],
    ['mountains',    ['mountain', 'alpine', 'volcano']],
    ['food scene',   ['cuisine', 'gastronomy', 'food']],
    ['music',        ['music', 'festival', 'jazz', 'opera']],
    ['arts',         ['art', 'gallery', 'theatre']],
    ['nightlife',    ['nightlife', 'club', 'bar scene']],
    ['architecture', ['architecture', 'cathedral', 'baroque', 'gothic']],
    ['culture',      ['culture', 'cultural']],
  ];
  const tags = checks.filter(([, kws]) => kws.some(kw => text.includes(kw))).map(([tag]) => tag);
  if (tags.length < 3) tags.push('travel');
  return [...new Set(tags)].slice(0, 6);
}

export function mapOtmKinds(kindsStr) {
  const parts = (kindsStr ?? '').toLowerCase().split(',');
  for (const { otmKinds, cat, icon, duration } of OTM_KIND_MAP) {
    if (otmKinds.some(k => parts.some(p => p.includes(k)))) return { cat, icon, duration };
  }
  return { cat: 'hidden_gem', icon: '💎', duration: 60 };
}

export function poiFromOtm(place, detail, cityName) {
  const { cat, icon, duration } = mapOtmKinds(place.kinds);
  const name = detail?.name || place.name;
  if (!name || name.trim() === '') return null;
  const description = detail?.wikipedia_extracts?.text
    ?? detail?.info?.descr
    ?? `A notable ${cat} in ${cityName}.`;
  return {
    id:              `${cat}-${slugify(name)}`,
    name,
    category:        cat,
    icon,
    description:     description.slice(0, 200),
    duration_min:    duration,
    time_suggestion: null,
    notes:           detail?.url ?? null,
  };
}

export async function countryNameToCode(countryName) {
  if (!countryName) return null;
  try {
    const res = await fetch(
      `https://restcountries.com/v3.1/name/${encodeURIComponent(countryName)}?fields=cca2,name`,
    );
    if (!res.ok) return null;
    const data = await res.json();
    // Prefer exact common-name match to avoid e.g. "Caribbean Netherlands" before "Netherlands"
    const needle = countryName.toLowerCase();
    const match = data.find(c => c.name?.common?.toLowerCase() === needle) ?? data[0];
    return match?.cca2?.toLowerCase() ?? null;
  } catch { return null; }
}

export async function otmGeocode(cityName, country) {
  const cc = await countryNameToCode(country);
  const ccParam = cc ? `&country=${cc}` : '';
  const url = `${OTM_BASE}/places/geoname?name=${encodeURIComponent(cityName)}${ccParam}&apikey=${OTM_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`OTM geocode ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function otmPois(lat, lon, kinds, limit = 8) {
  const url = `${OTM_BASE}/places/radius?radius=8000&lon=${lon}&lat=${lat}&kinds=${kinds}&limit=${limit}&rate=3&format=json&apikey=${OTM_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`OTM POI ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function otmDetail(xid) {
  const res = await fetch(`${OTM_BASE}/places/xid/${xid}?apikey=${OTM_KEY}`);
  if (!res.ok) return null;
  return res.json();
}

export async function wikiSummary(cityName) {
  try {
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(cityName.replace(/ /g, '_'))}`,
      { headers: { Accept: 'application/json' } }
    );
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}

export async function fetchCity(cityName, country, { verbose = true } = {}) {
  const log = verbose ? console.log : () => {};

  log('📖  Fetching Wikipedia summary…');
  const wiki = await wikiSummary(cityName);
  const description = (wiki?.extract ?? `${cityName} is a fascinating destination.`).slice(0, 600);
  const imageUrl    = wiki?.originalimage?.source ?? wiki?.thumbnail?.source ?? '';
  const tags        = inferTags(wiki?.description ?? '', wiki?.extract ?? '');
  const continent   = inferContinent(country);

  log('📍  Geocoding…');
  const geo = await otmGeocode(cityName, country);
  if (!geo?.lat || !geo?.lon) throw new Error(`OTM geocode returned no coordinates for "${cityName}, ${country}" — city may be ambiguous or unknown`);
  log(`    → ${geo.lat.toFixed(4)}, ${geo.lon.toFixed(4)}`);

  const pois = [];
  const seen = new Set();

  for (const group of OTM_FETCH_KINDS) {
    log(`🗺   Fetching ${group.label} POIs…`);
    try {
      const places = await otmPois(geo.lat, geo.lon, group.kinds, 8);
      for (const place of places) {
        if (!place.name?.trim() || seen.has(place.xid)) continue;
        if (/^stolperstein|^gedenktafel|^mahnmal/i.test(place.name)) continue;
        seen.add(place.xid);
        await new Promise(r => setTimeout(r, 200));
        const detail = await otmDetail(place.xid);
        const poi = poiFromOtm(place, detail, cityName);
        if (poi && !pois.find(p => p.id === poi.id)) pois.push(poi);
        if (pois.length >= 18) break;
      }
    } catch (e) {
      log(`  ⚠️  ${group.label}: ${e.message}`);
    }
    await new Promise(r => setTimeout(r, 300));
    if (pois.length >= 18) break;
  }

  return {
    id:        slugify(cityName),
    name:      cityName,
    country:   country || geo.country || 'Unknown',
    continent,
    tags,
    description,
    image_url: imageUrl,
    pois,
  };
}
