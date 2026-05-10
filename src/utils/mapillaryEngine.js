const MAPILLARY_BASE = 'https://graph.mapillary.com/images';

export async function fetchStreetImage(lat, lng) {
  const token = import.meta.env.VITE_MAPILLARY_TOKEN;
  if (!token) return null;

  try {
    const params = new URLSearchParams({
      fields: 'id,thumb_256_url',
      closeto: `${lng},${lat}`,
      radius: '100',
      limit: '1',
      access_token: token,
    });
    const res = await fetch(`${MAPILLARY_BASE}?${params}`, {
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.data?.[0]?.thumb_256_url ?? null;
  } catch {
    return null;
  }
}
