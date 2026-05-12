#!/usr/bin/env node
// Moodboard drift check — warns when CSS tokens and moodboard.config.js diverge.
// Warning-only: exits 0 always. Run on demand: `npm run moodboard:check`.

import fs from "node:fs";
import path from "node:path";
import url from "node:url";

const root = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), "..");
const CSS_FILE = path.join(root, "src/index.css");
const CONFIG_FILE = path.join(root, "src/pages/moodboard/moodboard.config.js");

function read(file) {
  if (!fs.existsSync(file)) {
    console.error(`✗ Missing: ${path.relative(root, file)}`);
    return null;
  }
  return fs.readFileSync(file, "utf-8");
}

const css = read(CSS_FILE);
const config = read(CONFIG_FILE);
if (!css || !config) process.exit(0);

const cssVars = new Set();
for (const match of css.matchAll(/(?<![\w-])(--[a-zA-Z0-9-]+)\s*:/g)) {
  cssVars.add(match[1]);
}

const configVars = new Set();
for (const match of config.matchAll(/cssVar:\s*["'](--[a-zA-Z0-9-]+)["']/g)) {
  configVars.add(match[1]);
}

const inCssOnly = [...cssVars].filter((v) => !configVars.has(v)).sort();
const inConfigOnly = [...configVars].filter((v) => !cssVars.has(v)).sort();

// VP's index.css declares a few mechanical helpers — don't flag them.
const ignored = new Set([
  "--accent-dim", "--accent-rule", "--border-strong",
  "--trail", "--radius-card", "--shadow-card",
]);
const drifted = inCssOnly.filter((v) => !ignored.has(v));

if (drifted.length === 0 && inConfigOnly.length === 0) {
  console.log("✓ No moodboard drift — every CSS token is documented in moodboard.config.js and vice versa.");
  process.exit(0);
}

console.log("⚠ Moodboard drift detected:\n");
if (drifted.length) {
  console.log(`  ${drifted.length} CSS token(s) not yet in moodboard.config.js:`);
  drifted.forEach((v) => console.log(`    · ${v}`));
}
if (inConfigOnly.length) {
  console.log(`\n  ${inConfigOnly.length} config token(s) not found in CSS (may be stale):`);
  inConfigOnly.forEach((v) => console.log(`    · ${v}`));
}
console.log("\n  Update moodboard.config.js and log the change in docs/moodboard.log.md.");
process.exit(0);
