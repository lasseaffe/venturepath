#!/usr/bin/env node
/**
 * issue-receiver.mjs
 * Minimal Express server on port 3099.
 * Receives user-submitted issue reports from the in-app report button
 * and appends them to pipeline/issues/queue.json.
 *
 * Started automatically by START - VenturePath (3001).bat
 */
import express from 'express';
import { appendIssue } from './lib/queue.js';

const PORT = 3099;
const app = express();
app.use(express.json());

// Allow requests from the Vite dev server (localhost:3001)
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.post('/report', (req, res) => {
  const { cityId, cityName, country, type, poiId, detail } = req.body;

  if (!cityId || !type) {
    return res.status(400).json({ ok: false, error: 'cityId and type are required' });
  }

  const VALID_TYPES = ['wrong_location', 'bad_poi', 'wrong_language', 'missing_image', 'missing_pois', 'other'];
  if (!VALID_TYPES.includes(type)) {
    return res.status(400).json({ ok: false, error: `Invalid type. Must be one of: ${VALID_TYPES.join(', ')}` });
  }

  try {
    const entry = appendIssue({ cityId, cityName, country, type, poiId, detail, source: 'user_report' });
    console.log(`[${new Date().toISOString()}] Report received: ${type} for ${cityName} (${cityId})`);
    res.json({ ok: true, id: entry.id });
  } catch (e) {
    console.error('Failed to append issue:', e.message);
    res.status(500).json({ ok: false, error: 'Failed to save report' });
  }
});

app.get('/health', (_, res) => res.json({ ok: true, port: PORT }));

app.listen(PORT, () => {
  console.log(`[issue-receiver] Listening on http://localhost:${PORT}`);
});
