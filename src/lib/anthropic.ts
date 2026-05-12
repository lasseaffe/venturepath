import OpenAI from "openai";

// AI_PROVIDER options:
//   openrouter  (default) — cycles free OpenRouter models
//   anthropic   — Anthropic API directly
//   ollama      — local Ollama instance
//   llama-local — local llama.cpp server (models downloaded to ~/.cache/huggingface/hub)
//                 Start with: llama-server --hf-repo meta-llama/Llama-3.1-8B --port 8080
const PROVIDER = process.env.AI_PROVIDER ?? "openrouter";

const FREE_MODELS = [
  "google/gemma-4-31b-it:free",
  "google/gemma-4-26b-a4b-it:free",
  "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
];

// llama-local model sizes in order of preference (largest first for quality)
// Set LLAMA_MODEL env var to override, e.g. "Llama-3.2-1B" for low-memory machines
const LLAMA_MODELS = ["Llama-3.1-8B", "Llama-3.2-3B", "Llama-3.2-1B"];

let modelIndex = 0;

export function getNextModel(): string {
  if (PROVIDER === "anthropic") return process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";
  if (PROVIDER === "ollama") return process.env.OLLAMA_MODEL ?? "llama3.2";
  if (PROVIDER === "llama-local") return process.env.LLAMA_MODEL ?? LLAMA_MODELS[0];
  const model = FREE_MODELS[modelIndex % FREE_MODELS.length];
  modelIndex++;
  return model;
}

function buildClientConfig() {
  if (PROVIDER === "anthropic") {
    return {
      apiKey: process.env.ANTHROPIC_API_KEY,
      baseURL: "https://api.anthropic.com/v1",
      defaultHeaders: { "anthropic-version": "2023-06-01" },
    };
  }
  if (PROVIDER === "ollama") {
    return {
      apiKey: "ollama",
      baseURL: process.env.OLLAMA_BASE_URL ?? "http://localhost:11434/v1",
    };
  }
  if (PROVIDER === "llama-local") {
    // llama.cpp server exposes an OpenAI-compatible API — no key required
    return {
      apiKey: "llama-local",
      baseURL: process.env.LLAMA_BASE_URL ?? "http://localhost:8080/v1",
    };
  }
  return {
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: "https://openrouter.ai/api/v1",
    defaultHeaders: {
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
      "X-Title": "HolyFlex",
    },
  };
}

export const openai = new OpenAI(buildClientConfig());

export const SYSTEM_PROMPT = `You are HolyFlex, a faith-positive AI assistant for members of The Church of Jesus Christ of Latter-day Saints.

You are knowledgeable about:
- All four standard works: The Holy Bible (KJV), The Book of Mormon, The Doctrine and Covenants, and The Pearl of Great Price
- General Conference talks and teachings from modern prophets and apostles
- Come Follow Me curriculum and LDS gospel principles
- LDS culture, ordinances, covenants, and practices
- Family Home Evening, Sacrament Meeting, Sunday School, and other Church meetings

Your role is to assist members in:
- Preparing sacrament meeting talks and FHE lessons
- Deepening their understanding of gospel principles
- Studying the scriptures with context and insight
- Supporting their faith journey

Important guidelines:
- Always frame your assistance as a starting point; encourage personal revelation and the guidance of the Holy Ghost
- Never claim to replace scripture study, prayer, or the counsel of local leaders
- Do not generate content that impersonates Church leaders or General Authorities
- Be doctrinally accurate and faith-affirming in all responses
- Use a warm, humble, and spiritually uplifting tone
- When appropriate, reference specific scriptures with book, chapter, and verse`;
