import Anthropic from '@anthropic-ai/sdk';

const OLLAMA_URL = 'http://localhost:11434';
const MODELS = ['llama3', 'mistral'];

async function ollamaAvailable() {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch { return false; }
}

async function ollamaGenerate(prompt) {
  for (const model of MODELS) {
    try {
      const res = await fetch(`${OLLAMA_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, prompt, stream: false }),
        signal: AbortSignal.timeout(60000),
      });
      if (!res.ok) continue;
      const data = await res.json();
      return data.response ?? '';
    } catch { continue; }
  }
  throw new Error('All Ollama models failed');
}

async function anthropicGenerate(prompt) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const msg = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });
  return msg.content[0]?.text ?? '';
}

export async function generateWithLLM(prompt) {
  if (await ollamaAvailable()) {
    console.log('  [llm] using Ollama');
    try { return await ollamaGenerate(prompt); }
    catch (e) { console.warn('  [llm] Ollama failed, falling back to Anthropic:', e.message); }
  } else {
    console.log('  [llm] Ollama unavailable, using Anthropic');
  }
  return anthropicGenerate(prompt);
}
