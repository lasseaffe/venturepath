// Parse moodboard.log.md markdown → up to `limit` newest entries.
// VP is Vite + client-side, so the .md is imported as a raw string at build time
// via Vite's `?raw` import suffix.

export function parseMoodboardLog(md, limit = 5) {
  if (!md) return [];
  const lines = md.split(/\r?\n/);
  const entries = [];
  let current = null;
  let bucket = null;

  for (const line of lines) {
    const h2 = line.match(/^##\s+(\S+)\s*(?:—|-)\s*(.+)$/);
    if (h2) {
      if (current) entries.push(current);
      if (entries.length >= limit) break;
      current = { title: h2[2].trim(), date: h2[1].trim(), changed: [], ideas: [] };
      bucket = null;
      continue;
    }
    if (!current) continue;
    if (/^###\s+Changed/i.test(line)) { bucket = 'changed'; continue; }
    if (/^###\s+Ideas/i.test(line))   { bucket = 'ideas';   continue; }
    const bullet = line.match(/^\s*[-*]\s+(.+)$/);
    if (bullet && bucket) current[bucket].push(bullet[1].trim());
  }
  if (current && entries.length < limit) entries.push(current);
  return entries;
}
