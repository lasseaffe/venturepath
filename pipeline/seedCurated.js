#!/usr/bin/env node
// pipeline/seedCurated.js
// VentureVault Curated Content Pipeline — Spec 3.
// Reads pipeline/routes/<theme>/*.json, parses paired GPX (or synthesizes from
// trace_coords), drafts prose with LLM, upserts to pro_paths + pro_path_waypoints.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { parseGpx } from './lib/parseGpx.js';
import { mapCategory } from './lib/mapCategory.js';
import { uploadGpx } from './lib/uploadGpx.js';
import { draftFromGpx } from './lib/draftFromGpx.js';
import { upsertRoute } from './lib/upsertRoute.js';
import { graphhopperSnap } from './lib/graphhopperSnap.js';
import { scoreQuality } from './scoreQuality.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load env from .env.local (existing pattern from run.js)
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const [k, ...rest] = line.split('=');
    if (k && rest.length) process.env[k.trim()] = rest.join('=').trim();
  }
}

const ROUTES_DIR = path.join(__dirname, 'routes');
const GPX_DIR = path.join(__dirname, 'gpx');
const THEMES = ['movie', 'historical', 'thematic', 'city', 'geographical'];

const args = process.argv.slice(2);
const routeArg = args.find((a) => a.startsWith('--route='))?.slice('--route='.length);
const approveOnly = args.includes('--approve');
const smoke = args.includes('--smoke');

function supa() {
  return createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
  });
}

function loadAllRoutes() {
  const out = [];
  for (const theme of THEMES) {
    const dir = path.join(ROUTES_DIR, theme);
    if (!fs.existsSync(dir)) continue;
    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.json'))) {
      const json = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
      out.push({ ...json, _theme: theme, _file: path.join(dir, file) });
    }
  }
  return out;
}

async function processRoute(supabase, route) {
  console.log(`\n► [${route._theme}] ${route.slug}`);

  // Resolve GPX file: either pre-existing or synthesized from trace_coords
  let gpxPath = path.join(GPX_DIR, route.gpx_file ?? `${route.slug}.gpx`);
  if (route.trace_coords && !fs.existsSync(gpxPath)) {
    console.log(`  synthesizing GPX via GraphHopper (${route.trace_coords.length} coords)`);
    const gpxXml = await graphhopperSnap({
      coords: route.trace_coords,
      slug: route.slug,
      profile: route.tags?.includes('foot') ? 'foot' : route.tags?.includes('bike') ? 'bike' : 'car',
    });
    fs.mkdirSync(GPX_DIR, { recursive: true });
    fs.writeFileSync(gpxPath, gpxXml);
    await new Promise((r) => setTimeout(r, 2000)); // rate limit
  }
  if (!fs.existsSync(gpxPath)) {
    throw new Error(`GPX file missing for ${route.slug}: ${gpxPath}`);
  }

  // Parse GPX deterministically (distance, elevation gain, named waypoints)
  const stats = parseGpx(gpxPath);
  console.log(`  parsed: ${stats.distanceKm}km, +${stats.elevationGain}m gain, ${stats.waypoints.length} wpts, ${stats.trackpointCount} trkpts`);

  // LLM draft — description + legs + days estimate from GPX-derived facts
  const draft = await draftFromGpx(route, stats);

  // Assemble pro_paths row
  const row = {
    slug:              route.slug,
    name:              route.name,
    destination:       route.destination,
    architect_name:    route.architect_name ?? 'VenturePath Curator',
    architect_id:      null,
    theme_category:    route.theme_category,
    tags:              route.tags ?? [],
    climate:           route.climate,
    difficulty:        route.difficulty,
    squad_min:         route.squad_min,
    squad_max:         route.squad_max,
    distance_km:       Math.round(stats.distanceKm),
    days:              draft.days,
    description:       draft.description,
    legs:              draft.legs,
    manifest_settings: { climate: route.climate, days: draft.days, hasChildren: false },
    objectives:        [],
    narrative_blocks: [],
    safety_meta:       {},
    provenance:        route.provenance ?? {},
    cover_image_url:   null,
    is_curated:        false,
    is_community:      false,
    source:            'pipeline',
    llm_quality_score: scoreQuality(draft),
  };

  // Assemble waypoint rows (without path_id — upsertRoute fills it)
  const waypointRows = stats.waypoints.map((wpt, i) => ({
    ord:              i,
    lat:              wpt.lat,
    lon:              wpt.lon,
    elevation_m:      wpt.ele,
    name:             wpt.name,
    category:         mapCategory(wpt.sym),
    trigger_radius_m: 20,
  }));

  // Upsert
  const upserted = await upsertRoute({ supabase, row, waypoints: waypointRows });
  console.log(`  upserted pro_paths.id=${upserted.id}`);

  // Upload GPX to Supabase Storage as <id>.gpx (Spec 0 RLS keys on this naming)
  const storagePath = await uploadGpx({ supabase, proPathId: upserted.id, localGpxPath: gpxPath });
  await supabase.from('pro_paths').update({ gpx_storage_path: storagePath }).eq('id', upserted.id);
  console.log(`  uploaded ${storagePath}`);

  return upserted;
}

async function approveAll(supabase) {
  const { count, error } = await supabase
    .from('pro_paths')
    .update({ is_curated: true }, { count: 'exact' })
    .eq('source', 'pipeline')
    .eq('is_curated', false)
    .select('*', { count: 'exact', head: true });
  if (error) throw error;
  console.log(`Approved ${count ?? 0} pipeline rows.`);
}

async function main() {
  const supabase = supa();

  if (approveOnly) {
    await approveAll(supabase);
    return;
  }

  let routes = loadAllRoutes();
  if (routeArg) routes = routes.filter((r) => r.slug === routeArg);
  if (smoke) routes = routes.slice(0, 1);
  if (routes.length === 0) {
    console.log('No routes matched filters.');
    return;
  }
  console.log(`\nVentureVault — ingesting ${routes.length} routes\n`);

  let ok = 0, fail = 0;
  for (const route of routes) {
    try {
      await processRoute(supabase, route);
      ok++;
    } catch (err) {
      console.error(`  ✗ ${route.slug}: ${err.message}`);
      fail++;
    }
  }
  console.log(`\nDone. ✓ ${ok}  ✗ ${fail}`);
}

main().catch((err) => {
  console.error('Pipeline failure:', err);
  process.exit(1);
});
