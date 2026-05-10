#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { gatherDestination } from './gatherDestination.js';
import { generateExpedition } from './generateExpedition.js';
import { upsertPath } from './upsertPath.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DESTINATIONS_FILE = path.join(__dirname, 'destinations.txt');
const CACHE_DIR = path.join(__dirname, 'cache');
const FORCE = process.argv.includes('--force');

const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const [key, ...rest] = line.split('=');
    if (key && rest.length) process.env[key.trim()] = rest.join('=').trim();
  }
}

function readDestinations() {
  return fs.readFileSync(DESTINATIONS_FILE, 'utf8')
    .split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('#'));
}

async function run() {
  const cities = readDestinations();
  console.log(`\nVentureVault Pipeline — ${cities.length} destinations\n`);

  let ok = 0, fail = 0;
  for (const city of cities) {
    console.log(`\n► ${city}`);
    try {
      const bundle = await gatherDestination(city, CACHE_DIR);
      if (FORCE) {
        const slugPath = path.join(CACHE_DIR, `${bundle.slug}.json`);
        if (fs.existsSync(slugPath)) fs.unlinkSync(slugPath);
      }
      const expedition = await generateExpedition(bundle);
      const saved = await upsertPath(expedition);
      console.log(`  ✓ saved: ${saved.name} (quality: ${expedition.llm_quality_score})`);
      ok++;
    } catch (err) {
      console.error(`  ✗ failed: ${err.message}`);
      fail++;
    }
    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`\nDone — ${ok} succeeded, ${fail} failed`);
}

run().catch(err => { console.error(err); process.exit(1); });
