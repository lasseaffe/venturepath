// src/utils/what3words.js

const W3W_BASE = 'https://api.what3words.com/v3';

/**
 * Converts GPS coordinates to a what3words address.
 * @param {number} lat
 * @param {number} lng
 * @param {string} apiKey — VITE_W3W_API_KEY
 * @returns {Promise<{ words: string, country: string, nearestPlace: string, mapUrl: string }>}
 */
export async function convertToW3W(lat, lng, apiKey) {
  const url = `${W3W_BASE}/convert-to-3wa?coordinates=${lat},${lng}&key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`what3words API error: ${res.status}`);
  const data = await res.json();
  return {
    words: data.words,
    country: data.country,
    nearestPlace: data.nearestPlace,
    mapUrl: data.map,
  };
}
