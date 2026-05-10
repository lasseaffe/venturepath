#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const [key, ...rest] = line.split('=');
    if (key && rest.length) process.env[key.trim()] = rest.join('=').trim();
  }
}

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { persistSession: false } }
);

const SEED_PATHS = [
  {
    name: 'Patagonia W-Trek',
    destination: 'Torres del Paine, Chile',
    architect_name: 'Ana M.',
    difficulty: 'Expert',
    distance_km: 72,
    days: 5,
    squad_min: 2,
    squad_max: 4,
    price_usd: 7,
    clones: 168,
    rating: 4.9,
    climate: 'temperate',
    cover_image_url: null,
    description: 'The iconic W circuit through Torres del Paine — granite towers, glaciers, and wild Patagonian weather. Expert-level terrain demands full squad commitment.',
    legs: [
      { from: 'Puerto Natales', to: 'Paine Grande', mode: 'boat', durationH: 3, distanceKm: 45, status: 'confirmed' },
      { from: 'Paine Grande', to: 'Grey Glacier', mode: 'foot', durationH: 7, distanceKm: 18, status: 'confirmed' },
      { from: 'Grey Glacier', to: 'Las Torres', mode: 'foot', durationH: 9, distanceKm: 20, status: 'pending' },
    ],
    objectives: [],
    manifest_settings: { climate: 'temperate', days: 5, hasChildren: false },
    is_curated: true,
    is_community: false,
    source: 'manual',
    llm_quality_score: 0.88,
  },
  {
    name: 'Icelandic Ring Road',
    destination: 'Iceland Ring Road',
    architect_name: 'Erik T.',
    difficulty: 'Moderate',
    distance_km: 1332,
    days: 10,
    squad_min: 2,
    squad_max: 6,
    price_usd: 8,
    clones: 214,
    rating: 4.8,
    climate: 'subarctic',
    cover_image_url: null,
    description: 'The full Ring Road circuit — waterfalls, lava fields, geysers, and the midnight sun. A moderate endurance test best tackled with a squad of 4.',
    legs: [
      { from: 'Reykjavik', to: 'Akureyri', mode: 'bus', durationH: 5, distanceKm: 390, status: 'confirmed' },
      { from: 'Akureyri', to: 'Egilsstaðir', mode: 'bus', durationH: 3, distanceKm: 270, status: 'confirmed' },
      { from: 'Egilsstaðir', to: 'Reykjavik', mode: 'bus', durationH: 6, distanceKm: 672, status: 'pending' },
    ],
    objectives: [],
    manifest_settings: { climate: 'subarctic', days: 10, hasChildren: false },
    is_curated: true,
    is_community: false,
    source: 'manual',
    llm_quality_score: 0.88,
  },
  {
    name: 'Swiss Alps Haute Route',
    destination: 'Swiss Alps, Switzerland',
    architect_name: 'Lena K.',
    difficulty: 'Hard',
    distance_km: 180,
    days: 7,
    squad_min: 1,
    squad_max: 3,
    price_usd: 6,
    clones: 87,
    rating: 4.7,
    climate: 'alpine',
    cover_image_url: null,
    description: 'Chamonix to Zermatt on foot. Seven days of alpine cols, high refuges, and the Matterhorn as your finish line.',
    legs: [
      { from: 'Chamonix', to: 'Verbier', mode: 'foot', durationH: 48, distanceKm: 90, status: 'confirmed' },
      { from: 'Verbier', to: 'Zermatt', mode: 'foot', durationH: 40, distanceKm: 90, status: 'pending' },
    ],
    objectives: [],
    manifest_settings: { climate: 'alpine', days: 7, hasChildren: false },
    is_curated: true,
    is_community: false,
    source: 'manual',
    llm_quality_score: 0.75,
  },
  {
    name: 'Mt. Fuji Sunrise',
    destination: 'Mt. Fuji, Japan',
    architect_name: 'Yuki S.',
    difficulty: 'Moderate',
    distance_km: 22,
    days: 2,
    squad_min: 1,
    squad_max: 8,
    price_usd: 4,
    clones: 453,
    rating: 4.9,
    climate: 'alpine',
    cover_image_url: null,
    description: 'The classic Fujinomiya ascent timed for the summit sunrise. Start at midnight, reach the crater at dawn. Japan\'s most-cloned expedition.',
    legs: [
      { from: 'Fujinomiya 5th Station', to: 'Summit', mode: 'foot', durationH: 6, distanceKm: 11, status: 'confirmed' },
      { from: 'Summit', to: 'Fujinomiya 5th Station', mode: 'foot', durationH: 3, distanceKm: 11, status: 'pending' },
    ],
    objectives: [],
    manifest_settings: { climate: 'alpine', days: 2, hasChildren: false },
    is_curated: true,
    is_community: false,
    source: 'manual',
    llm_quality_score: 0.88,
  },
];

async function seed() {
  // Check existing names to avoid duplicates
  const names = SEED_PATHS.map(p => p.name);
  const { data: existing } = await supabase.from('pro_paths').select('name').in('name', names);
  const existingNames = new Set((existing ?? []).map(r => r.name));
  const toInsert = SEED_PATHS.filter(p => !existingNames.has(p.name));

  if (toInsert.length === 0) {
    console.log('All curated paths already seeded — nothing to insert.');
    return;
  }

  const { error } = await supabase.from('pro_paths').insert(toInsert);
  if (error) { console.error('Seed failed:', error.message); process.exit(1); }
  console.log(`Seeded ${toInsert.length} curated paths.`);
}

seed();
