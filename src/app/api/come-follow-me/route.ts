import { openai, getNextModel, SYSTEM_PROMPT } from "@/lib/anthropic";
import { getCurrentCfmWeek } from "@/lib/come-follow-me";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const { question, weekOverride } = await req.json();

  const week = weekOverride
    ? { title: weekOverride.title, scriptures: weekOverride.scriptures, theme: weekOverride.theme, dateRange: weekOverride.dateRange }
    : getCurrentCfmWeek();

  const contextPrompt = `The current Come Follow Me lesson is:
- Week: ${week.title}
- Date Range: ${week.dateRange}
- Scriptures: ${week.scriptures}
- Theme: ${week.theme}

The member's question or request: ${question}

Please respond in a helpful, faith-affirming way that draws on this week's Come Follow Me lesson. Connect your answer to the featured scriptures where relevant. Keep your response focused and practical for personal or family study.`;

  const stream = await openai.chat.completions.create({
    model: getNextModel(),
    max_tokens: 1024,
    stream: true,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: contextPrompt },
    ],
  });

  const encoder = new TextEncoder();

  const readableStream = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content ?? "";
        if (text) {
          controller.enqueue(encoder.encode(text));
        }
      }
      controller.close();
    },
  });

  return new Response(readableStream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
    },
  });
}
