import { generateWithLLM } from './llmClient.js';
import { scoreQuality } from './scoreQuality.js';

const PROMPT_TEMPLATE = (bundle) => `
You are a VenturePath expedition architect. Given this destination data, generate a single curated Pro-Path expedition as valid JSON only (no markdown, no explanation).

Destination: ${bundle.city}
Description: ${bundle.description}
Climate: ${bundle.climate}
Top POIs: ${bundle.pois.slice(0, 5).map(p => p.name).join(', ')}
Cover image URL: ${bundle.imageUrl ?? 'null'}

Return ONLY this JSON shape:
{
  "name": "expedition name (evocative, not just the city name)",
  "destination": "${bundle.city}",
  "description": "2-3 sentence expedition brief in VenturePath voice. Mention squad, terrain, challenge.",
  "difficulty": "Easy|Moderate|Hard|Expert",
  "climate": "${bundle.climate}",
  "days": <number 2-14>,
  "distance_km": <number>,
  "squad_min": <number 1-4>,
  "squad_max": <number 2-12>,
  "legs": [
    { "from": "...", "to": "...", "mode": "foot|bus|flight|boat|train|bike", "durationH": <number>, "distanceKm": <number>, "status": "confirmed" }
  ],
  "cover_image_url": "${bundle.imageUrl ?? null}"
}

Rules: at least 2 legs, realistic distances, no lorem ipsum, expedition vocabulary only.
`;

function parseJson(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON found in LLM output');
  return JSON.parse(match[0]);
}

export async function generateExpedition(bundle) {
  const prompt = PROMPT_TEMPLATE(bundle);
  let raw = await generateWithLLM(prompt);
  let parsed;

  try {
    parsed = parseJson(raw);
  } catch {
    console.warn('  [generate] First parse failed, retrying with correction prompt');
    const correctionPrompt = `The following was not valid JSON. Extract and return ONLY the JSON object:\n\n${raw}`;
    raw = await generateWithLLM(correctionPrompt);
    parsed = parseJson(raw);
  }

  const expedition = {
    name: parsed.name ?? bundle.city,
    destination: parsed.destination ?? bundle.city,
    architect_name: 'VenturePath Curator',
    description: parsed.description ?? '',
    difficulty: parsed.difficulty ?? 'Moderate',
    climate: parsed.climate ?? bundle.climate,
    days: parsed.days ?? 3,
    distance_km: parsed.distance_km ?? 0,
    squad_min: parsed.squad_min ?? 1,
    squad_max: parsed.squad_max ?? 6,
    legs: parsed.legs ?? [],
    objectives: [],
    manifest_settings: { climate: parsed.climate ?? bundle.climate, days: parsed.days ?? 3, hasChildren: false },
    cover_image_url: parsed.cover_image_url ?? bundle.imageUrl ?? null,
    price_usd: 0,
    is_curated: true,
    is_community: false,
    source: 'pipeline',
  };

  expedition.llm_quality_score = scoreQuality(expedition);
  return expedition;
}
