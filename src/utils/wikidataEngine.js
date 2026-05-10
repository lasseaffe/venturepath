const WD_API = 'https://www.wikidata.org/w/api.php';
const COMMONS_THUMB = 'https://commons.wikimedia.org/wiki/Special:FilePath/';
const DEBOUNCE_MS = 200;

let _lastCall = 0;

async function debounce() {
  const now = Date.now();
  const wait = DEBOUNCE_MS - (now - _lastCall);
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  _lastCall = Date.now();
}

async function searchEntity(name) {
  const url = new URL(WD_API);
  url.searchParams.set('action', 'wbsearchentities');
  url.searchParams.set('search', name);
  url.searchParams.set('language', 'en');
  url.searchParams.set('limit', '1');
  url.searchParams.set('format', 'json');
  url.searchParams.set('origin', '*');

  const res = await fetch(url.toString(), { signal: AbortSignal.timeout(3000) });
  if (!res.ok) return null;
  const data = await res.json();
  return data.search?.[0]?.id ?? null;
}

async function fetchEntityProps(qid) {
  const url = new URL(WD_API);
  url.searchParams.set('action', 'wbgetentities');
  url.searchParams.set('ids', qid);
  url.searchParams.set('props', 'descriptions|claims|labels');
  url.searchParams.set('languages', 'en');
  url.searchParams.set('format', 'json');
  url.searchParams.set('origin', '*');

  const res = await fetch(url.toString(), { signal: AbortSignal.timeout(3000) });
  if (!res.ok) return null;
  const data = await res.json();
  return data.entities?.[qid] ?? null;
}

async function resolveLabel(qid) {
  const url = new URL(WD_API);
  url.searchParams.set('action', 'wbgetentities');
  url.searchParams.set('ids', qid);
  url.searchParams.set('props', 'labels');
  url.searchParams.set('languages', 'en');
  url.searchParams.set('format', 'json');
  url.searchParams.set('origin', '*');

  try {
    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return qid;
    const data = await res.json();
    return data.entities?.[qid]?.labels?.en?.value ?? qid;
  } catch {
    return qid;
  }
}

function buildImageUrl(filename) {
  if (!filename) return null;
  const encoded = encodeURIComponent(filename.replace(/ /g, '_'));
  return `${COMMONS_THUMB}${encoded}?width=400`;
}

export async function wikidataFetch(name, _coords) {
  try {
    await debounce();
    const qid = await searchEntity(name);
    if (!qid) return null;

    const entity = await fetchEntityProps(qid);
    if (!entity) return null;

    const description = entity.descriptions?.en?.value ?? '';

    const p31Claim = entity.claims?.P31?.[0]?.mainsnak?.datavalue?.value?.id;
    const instance_of = p31Claim ? await resolveLabel(p31Claim) : '';

    const p18Filename = entity.claims?.P18?.[0]?.mainsnak?.datavalue?.value;
    const image_url = buildImageUrl(p18Filename);

    return { qid, description, instance_of, image_url };
  } catch {
    return null;
  }
}
