import { openai, SYSTEM_PROMPT } from "@/lib/anthropic";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const { type, topic, scripture, audience, length } = await req.json();

  const lengthGuide: Record<string, string> = {
    short: "3–5 minutes (approximately 400–600 words)",
    medium: "7–10 minutes (approximately 900–1200 words)",
    long: "12–15 minutes (approximately 1500–2000 words)",
  };

  const audienceGuide: Record<string, string> = {
    general: "a general adult congregation",
    youth: "youth ages 12–18 (Young Men/Young Women)",
    children: "children ages 3–11 (Primary)",
    family: "a family with mixed ages including young children",
  };

  const typeGuide: Record<string, string> = {
    sacrament: "a Sacrament Meeting talk",
    fhe: "a Family Home Evening lesson",
    sunday_school: "a Sunday School lesson",
    youth: "a youth class lesson (Young Men/Young Women)",
  };

  const prompt = `Please write ${typeGuide[type] ?? "a gospel lesson"} for ${audienceGuide[audience] ?? "a general congregation"}.

Topic: ${topic}
${scripture ? `Featured Scripture: ${scripture}` : ""}
Length: ${lengthGuide[length] ?? "7–10 minutes"}

Structure the ${type === "sacrament" ? "talk" : "lesson"} with:
1. An engaging opening (scripture quote or thought-provoking question)
2. Introduction of the main principle
3. Two or three main teaching points with scriptural support
4. A personal story or relatable analogy
${type !== "sacrament" ? "5. Discussion questions for the class/family\n6. An activity suggestion (if appropriate for the audience)" : "5. A testimony-centered conclusion with invitation to act"}

End with a note reminding the speaker/teacher that this is a starting point — encourage them to study, pray, and let the Spirit guide their personal preparation.`;

  const stream = await openai.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 2048,
    stream: true,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt },
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
