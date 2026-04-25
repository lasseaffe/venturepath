import { openai, SYSTEM_PROMPT } from "@/lib/anthropic";

export const runtime = "nodejs";
export const maxDuration = 30;

const CHAT_SYSTEM = `${SYSTEM_PROMPT}

You are also a warm companion and friend. In addition to gospel topics, you can:
- Have friendly, uplifting conversations about everyday life
- Give practical advice grounded in gospel principles
- Help people feel less alone and encourage them to connect with their ward family
- Gently encourage reaching out to local leaders, friends, or the community when someone seems to need support

Always be warm, brief, and human. Keep responses concise — 2–4 short paragraphs at most. If someone seems to be struggling emotionally, show genuine care and gently encourage them to reach out to trusted people in their lives.`;

export async function POST(req: Request) {
  const { messages } = await req.json();

  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response("Bad request", { status: 400 });
  }

  const stream = await openai.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 512,
    stream: true,
    messages: [
      { role: "system", content: CHAT_SYSTEM },
      ...messages.slice(-10), // last 10 messages for context
    ],
  });

  const encoder = new TextEncoder();

  return new Response(
    new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content ?? "";
          if (text) controller.enqueue(encoder.encode(text));
        }
        controller.close();
      },
    }),
    {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
      },
    }
  );
}
