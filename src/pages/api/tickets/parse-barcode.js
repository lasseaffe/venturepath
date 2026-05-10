// parse-barcode handler
// NOTE: VenturePath uses Vite+React with no server runtime yet.
// This handler exports parseBarcodeHandler for use when an Express/Node server is added.
// Wire it up in a server.js at the project root: app.post('/api/tickets/parse-barcode', parseBarcodeHandler)

import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

// Handler: POST /api/tickets/parse-barcode
// Body: { barcodeData: string, barcodeType?: string }
// Returns: { parsed: object|null, raw?: string }
export async function parseBarcodeHandler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { barcodeData, barcodeType } = req.body;
  if (!barcodeData) return res.status(400).json({ error: 'barcodeData required' });

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 512,
    messages: [
      {
        role: 'user',
        content: `You are parsing a travel ticket barcode. The barcode type is "${barcodeType ?? 'unknown'}". The raw decoded string is:\n\n${barcodeData}\n\nExtract all structured fields you can identify. Return ONLY a JSON object with these fields (omit any you cannot determine):\n{\n  "type": "flight|transit|accommodation|access_pass|visa|document",\n  "title": "",\n  "provider": "",\n  "referenceCode": "",\n  "validFrom": "ISO string or null",\n  "validUntil": "ISO string or null",\n  "rawData": {}\n}\n\nFor flights, include in rawData: origin, destination, flightNumber, seat, gate.\nFor transit, include in rawData: route, zone.\nFor accommodation, include in rawData: checkIn, checkOut.\nFor access_pass, include in rawData: venue, tier.`,
      },
    ],
  });

  try {
    const text = message.content[0].text.trim();
    const json = JSON.parse(text.replace(/^```json\n?/, '').replace(/\n?```$/, ''));
    res.json({ parsed: json });
  } catch {
    res.json({ parsed: null, raw: message.content[0].text });
  }
}
