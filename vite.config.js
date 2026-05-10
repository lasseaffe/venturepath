import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

function apiRoutes() {
  return {
    name: 'api-routes',
    configureServer(server) {
      server.middlewares.use('/api/tickets/parse-barcode', async (req, res, next) => {
        if (req.method !== 'POST') return next();
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
          try {
            const { barcodeData, barcodeType } = JSON.parse(body);
            const Anthropic = (await import('@anthropic-ai/sdk')).default;
            const client = new Anthropic();
            const message = await client.messages.create({
              model: 'claude-sonnet-4-6',
              max_tokens: 512,
              messages: [{
                role: 'user',
                content: `You are parsing a travel ticket barcode. The barcode type is "${barcodeType ?? 'unknown'}". The raw decoded string is:\n\n${barcodeData}\n\nExtract all structured fields you can identify. Return ONLY a JSON object with these fields (omit any you cannot determine):\n{\n  "type": "flight|transit|accommodation|access_pass|visa|document",\n  "title": "",\n  "provider": "",\n  "referenceCode": "",\n  "validFrom": "ISO string or null",\n  "validUntil": "ISO string or null",\n  "rawData": {}\n}\n\nFor flights, include in rawData: origin, destination, flightNumber, seat, gate.\nFor transit, include in rawData: route, zone.\nFor accommodation, include in rawData: checkIn, checkOut.\nFor access_pass, include in rawData: venue, tier.`,
              }],
            });
            const text = message.content[0].text.trim();
            let parsed;
            try {
              parsed = JSON.parse(text.replace(/^```json\n?/, '').replace(/\n?```$/, ''));
            } catch { parsed = null; }
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ parsed, raw: parsed ? undefined : text }));
          } catch (err) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: err.message }));
          }
        });
      });

      server.middlewares.use('/api/tickets/email-import', async (req, res, next) => {
        if (req.method !== 'POST') return next();
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
          try {
            const Anthropic = (await import('@anthropic-ai/sdk')).default;
            const client = new Anthropic();
            const MOCK_EMAILS = [
              {
                subject: 'Your booking confirmation – Hotel Marqués',
                body: 'Thank you for your booking. Confirmation number: HMR-88441. Check-in: 2026-11-10. Check-out: 2026-11-14. Total: €620.',
                from: 'no-reply@hoteles.com',
              },
              {
                subject: 'E-ticket: Santiago → Punta Arenas, LATAM LA-256',
                body: 'Flight LA-256. Departs SCL 07:40, arrives PUQ 10:55. Seat 12F. Booking ref: LATAM-99123.',
                from: 'etickets@latam.com',
              },
            ];
            const results = [];
            for (const [i, email] of MOCK_EMAILS.entries()) {
              const message = await client.messages.create({
                model: 'claude-sonnet-4-6',
                max_tokens: 512,
                messages: [{
                  role: 'user',
                  content: `Parse this booking confirmation email into a ticket. Return ONLY a JSON object:\n{\n  "type": "flight|transit|accommodation|access_pass|visa|document",\n  "title": "",\n  "provider": "",\n  "referenceCode": "",\n  "validFrom": "ISO or null",\n  "validUntil": "ISO or null",\n  "rawData": {}\n}\n\nSubject: ${email.subject}\nFrom: ${email.from}\nBody: ${email.body}`,
                }],
              });
              try {
                const text = message.content[0].text.trim();
                const parsed = JSON.parse(text.replace(/^```json\n?/, '').replace(/\n?```$/, ''));
                results.push({ ...parsed, source: 'email_import', _key: `email-${i}` });
              } catch { /* skip */ }
            }
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ tickets: results }));
          } catch (err) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: err.message }));
          }
        });
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), apiRoutes()],
  server: {
    proxy: {
      '/api/trends': {
        target: 'https://trends.google.com',
        changeOrigin: true,
        rewrite: () => '/trends/trendingSearches/daily/rss?geo=US&category=travel',
      },
    },
  },
})
