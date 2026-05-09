// scripts/lib/queue.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const QUEUE_FILE   = path.join(__dirname, '..', '..', 'pipeline', 'issues', 'queue.json');
const ARCHIVE_FILE = path.join(__dirname, '..', '..', 'pipeline', 'issues', 'archive.json');

function readJSON(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { return []; }
}

function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

export function readQueue() { return readJSON(QUEUE_FILE); }
export function readArchive() { return readJSON(ARCHIVE_FILE); }

export function appendIssue(issue) {
  const queue = readQueue();
  const entry = {
    id:          randomUUID(),
    cityId:      issue.cityId,
    cityName:    issue.cityName,
    country:     issue.country ?? '',
    type:        issue.type,
    poiId:       issue.poiId ?? null,
    detail:      issue.detail ?? '',
    source:      issue.source ?? 'auto_detect',
    status:      'pending',
    reportedAt:  new Date().toISOString(),
    resolvedAt:  null,
    llmFix:      null,
  };
  queue.push(entry);
  writeJSON(QUEUE_FILE, queue);
  return entry;
}

export function updateIssue(id, patch) {
  const queue = readQueue();
  const idx = queue.findIndex(e => e.id === id);
  if (idx < 0) throw new Error(`Issue ${id} not found`);
  queue[idx] = { ...queue[idx], ...patch };
  writeJSON(QUEUE_FILE, queue);
  return queue[idx];
}

export function archiveResolved() {
  const queue = readQueue();
  const resolved = queue.filter(e => e.status === 'resolved' || e.status === 'skipped');
  const remaining = queue.filter(e => e.status !== 'resolved' && e.status !== 'skipped');
  const archive = readArchive();
  writeJSON(ARCHIVE_FILE, [...archive, ...resolved]);
  writeJSON(QUEUE_FILE, remaining);
  return resolved.length;
}
