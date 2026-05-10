// src/app/api/wizard-optimize/route.js
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export async function POST(request) {
  const { stops, days, startDate, squadSize, climate } = await request.json()

  if (!stops || stops.length === 0) {
    return new Response(JSON.stringify({ error: 'No stops provided' }), { status: 400 })
  }

  const stopList = stops.map((s, i) =>
    `${i + 1}. [ID:${s.id}] ${s.name} — intensity: ${s.intensity}, duration: ${s.duration}, type: ${s.type}`
  ).join('\n')

  const systemPrompt = `You are an expedition pacing expert for VenturePath, a tactical travel planning platform. You help Architects distribute their planned stops across expedition days to avoid fatigue, travel conflicts, and wasted time.

When given a list of stops, you:
1. Analyse intensity distribution and identify problematic days
2. Suggest a specific reordering that spreads high-intensity stops across different days
3. Flag geographic conflicts (stops that are too far apart to do in one day)
4. Recommend rest days where appropriate (every 3-4 days of heavy activity)
5. Return a proposedGrid as JSON after your narrative explanation

ALWAYS end your response with a JSON block in this exact format:
\`\`\`json
{
  "proposedGrid": {
    "0": {"morning": "stop-name-or-null", "afternoon": "stop-name-or-null", "evening": "stop-name-or-null"}
  },
  "conflicts": ["description of any conflicts found"]
}
\`\`\`

Use the stop ID (the value in [ID:...] brackets) as the key in proposedGrid values. Day indices are 0-based. Use null for empty slots.`

  const userMessage = `Expedition details:
- Duration: ${days} days starting ${startDate}
- Squad size: ${squadSize}
- Climate: ${climate}

Planned stops:
${stopList}

Please analyse the pacing and suggest an optimal day-by-day layout.`

  const stream = await client.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  })

  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
          controller.enqueue(encoder.encode(chunk.delta.text))
        }
      }
      controller.close()
    },
  })

  return new Response(readable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Transfer-Encoding': 'chunked' },
  })
}
