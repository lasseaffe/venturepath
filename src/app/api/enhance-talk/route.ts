import { openai, SYSTEM_PROMPT } from "@/lib/anthropic";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const { originalTopic, originalContent, enhancement, enhancementType } =
    await req.json();

  const enhancementGuide: Record<string, string> = {
    topic: `Add a new angle or related topic: "${enhancement}"`,
    scripture: `Incorporate this specific scripture deeply into the lesson: "${enhancement}"`,
    video: `Reference or build a teaching point around this resource/video: "${enhancement}"`,
    psalm: `Weave in the themes of this psalm/hymn passage: "${enhancement}"`,
    story: `Include a teaching story or analogy about: "${enhancement}"`,
  };

  const prompt = `You previously wrote a lesson on: "${originalTopic}"

Here is the existing content:
---
${originalContent.slice(0, 2000)}
---

Now enhance or extend this lesson by adding a new section. Focus on:
${enhancementGuide[enhancementType] ?? `Adding content about: "${enhancement}"`}

Write ONLY the new section to add — do not rewrite the original. Start with a markdown heading (##) and write 200–400 words.`;

  const stream = await openai.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 700,
    stream: true,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt },
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
