// src/utils/bookingEngine.js
import permitRegistry from '../data/permitRegistry.json';

const DURATION_RE = /(\d+)\s*days?/i;
const BUDGET_RE = /[€$£]?([\d,]+)/;

export function parseGoal(goalText) {
  const durationMatch = goalText.match(DURATION_RE);
  const budgetMatch = goalText.match(BUDGET_RE);

  const withoutNumbers = goalText.replace(DURATION_RE, '').replace(BUDGET_RE, '');
  const destination = withoutNumbers
    .replace(/\b(in|to|for|at|budget|days?|euros?|dollars?)\b/gi, '')
    .replace(/[€$£,]/g, '')
    .trim()
    .replace(/\s+/g, ' ');

  return {
    destination: destination || null,
    days: durationMatch ? parseInt(durationMatch[1], 10) : null,
    budgetEur: budgetMatch ? parseFloat(budgetMatch[1].replace(',', '')) : null,
  };
}

export function getPermits(destination) {
  if (!destination) return [];
  const key = Object.keys(permitRegistry).find(k =>
    destination.toLowerCase().includes(k.toLowerCase())
  );
  return key ? permitRegistry[key] : [];
}

export async function searchMission(goalText) {
  const { destination, days, budgetEur } = parseGoal(goalText);
  const permits = getPermits(destination);

  let coords = null;
  try {
    const geoRes = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(destination)}&format=json&limit=1`,
      { headers: { 'User-Agent': 'VenturePath/1.0' } }
    );
    const geoData = await geoRes.json();
    if (geoData[0]) coords = { lat: parseFloat(geoData[0].lat), lng: parseFloat(geoData[0].lon) };
  } catch (_) { /* network unavailable */ }

  const amadeusKey = import.meta.env?.VITE_AMADEUS_KEY;
  const flight = amadeusKey
    ? await fetchAmadeusFlight(destination, amadeusKey)
    : { carrier: 'Search on Skyscanner', price: null, durationH: null };

  return {
    destination,
    coords,
    days,
    budgetEur,
    flight,
    stay: { name: `Search hotels in ${destination}`, pricePerNight: null },
    transit: 'Check local transit at Rome2Rio',
    permits,
    totalCost: null,
  };
}

async function fetchAmadeusFlight(destination, apiKey) {
  return { carrier: 'Amadeus search pending', price: null, durationH: null };
}
