const NOMINATIM = 'https://nominatim.openstreetmap.org'
const OVERPASS  = 'https://overpass-api.de/api/interpreter'
const UA        = 'VenturePath/1.0 (contact@venturepath.app)'

const _cache = new Map()

export async function geocodeCity(city) {
  const url = `${NOMINATIM}/search?q=${encodeURIComponent(city)}&format=json&limit=1`
  const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'en' } })
  if (!res.ok) return null
  const data = await res.json()
  if (!data.length) return null
  const { lat, lon, boundingbox } = data[0]
  return { lat: parseFloat(lat), lon: parseFloat(lon), bbox: boundingbox.map(parseFloat) }
}

async function _overpass(bbox, tagFilter, limit = 30) {
  const [s, n, w, e] = [bbox[0], bbox[1], bbox[2], bbox[3]]
  const body = `[out:json][timeout:25];(node[${tagFilter}](${s},${w},${n},${e}););out body ${limit};`
  const res = await fetch(OVERPASS, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(body)}`
  })
  if (!res.ok) return []
  const data = await res.json()
  return (data.elements ?? [])
    .filter(el => el.lat && el.lon && (el.tags?.name || el.tags?.['name:en']))
    .map(el => ({
      id:   String(el.id),
      name: el.tags.name ?? el.tags['name:en'],
      lat:  el.lat,
      lon:  el.lon,
      tags: el.tags
    }))
}

const ACCOM_TAGS = {
  hotel:     'tourism=hotel',
  hostel:    'tourism=hostel',
  apartment: 'tourism=apartment',
  camp_site: 'tourism=camp_site',
  camping:   'tourism=camp_site',
  all:       'tourism~"hotel|hostel|apartment|camp_site"'
}

const ATTRACTION_TAGS = {
  historic:   'historic',
  cultural:   'tourism~"museum|artwork|gallery"',
  natural:    'natural~"peak|waterfall|cave_entrance"',
  religion:   'amenity=place_of_worship',
  viewpoints: 'tourism=viewpoint',
  all:        'tourism~"attraction|museum|viewpoint"'
}

const FOOD_TAGS = {
  restaurants: 'amenity=restaurant',
  cafes:       'amenity=cafe',
  bars:        'amenity=bar',
  markets:     'amenity=marketplace',
  street_food: 'amenity=fast_food',
  all:         'amenity~"restaurant|cafe|bar|marketplace|fast_food"'
}

async function _cached(key, fn) {
  if (_cache.has(key)) return _cache.get(key)
  const result = await fn()
  _cache.set(key, result)
  return result
}

export async function searchAccommodation(city, type = 'all') {
  return _cached(`a:${city}:${type}`, async () => {
    const geo = await geocodeCity(city)
    if (!geo) return []
    return _overpass(geo.bbox, ACCOM_TAGS[type] ?? ACCOM_TAGS.all, 40)
  })
}

export async function searchAttractions(city, category = 'all') {
  return _cached(`t:${city}:${category}`, async () => {
    const geo = await geocodeCity(city)
    if (!geo) return []
    return _overpass(geo.bbox, ATTRACTION_TAGS[category] ?? ATTRACTION_TAGS.all, 40)
  })
}

export async function searchFood(city, category = 'all') {
  return _cached(`f:${city}:${category}`, async () => {
    const geo = await geocodeCity(city)
    if (!geo) return []
    return _overpass(geo.bbox, FOOD_TAGS[category] ?? FOOD_TAGS.all, 40)
  })
}

export async function generateVibes(city) {
  const geo = await geocodeCity(city)
  if (!geo) return []

  const categories = [
    { tag: 'Hiking Trails',  emoji: '🥾', filter: 'route=hiking' },
    { tag: 'Street Food',    emoji: '🍜', filter: 'amenity=fast_food' },
    { tag: 'Historic Sites', emoji: '🏛️', filter: 'historic=yes' },
    { tag: 'Viewpoints',     emoji: '🔭', filter: 'tourism=viewpoint' },
    { tag: 'Cafes',          emoji: '☕', filter: 'amenity=cafe' },
    { tag: 'Night Markets',  emoji: '🌙', filter: 'amenity=marketplace' },
    { tag: 'Museums',        emoji: '🖼️', filter: 'tourism=museum' },
    { tag: 'Parks & Nature', emoji: '🌿', filter: 'leisure=park' },
    { tag: 'Local Bars',     emoji: '🍻', filter: 'amenity=bar' },
  ]

  const counts = await Promise.all(
    categories.map(async c => {
      const results = await _overpass(geo.bbox, c.filter, 50)
      return { ...c, score: results.length, results }
    })
  )

  return counts
    .filter(c => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 7)
    .map(c => ({ tag: c.tag, emoji: c.emoji, score: c.score, source: 'OpenStreetMap', results: c.results }))
}

export function clearCache() { _cache.clear() }
