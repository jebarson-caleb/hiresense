// Provider-agnostic LLM client: Groq's hosted API (OpenAI-compatible) or a local Ollama server.
// Picked with LLM_PROVIDER; callers only see getHealth / isReady / chatJSON / activeModel.
import env from '../config/env.js';

const GROQ_URL = 'https://api.groq.com/openai/v1';

let healthCache = { at: 0, value: null };

export const provider = env.llmProvider;
export const activeModel = () => (provider === 'groq' ? env.groqModel : env.ollamaModel);

async function groqHealth() {
  if (!env.groqApiKey) {
    return { online: false, modelAvailable: false, models: [], message: 'GROQ_API_KEY is not set in server/.env. Using rule-based fallback.' };
  }
  const res = await fetch(`${GROQ_URL}/models`, {
    headers: { Authorization: `Bearer ${env.groqApiKey}` },
    signal: AbortSignal.timeout(5000),
  });
  if (res.status === 401) throw new Error('invalid GROQ_API_KEY');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const models = ((await res.json()).data || []).map((m) => m.id);
  const modelAvailable = models.includes(env.groqModel);
  return {
    online: true,
    modelAvailable,
    models,
    message: modelAvailable
      ? `Groq online - using ${env.groqModel}`
      : `Groq is reachable but model "${env.groqModel}" is not offered. Set GROQ_MODEL to one of: ${models.slice(0, 8).join(', ')}`,
  };
}

async function ollamaHealth() {
  const res = await fetch(`${env.ollamaUrl}/api/tags`, { signal: AbortSignal.timeout(2500) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const models = ((await res.json()).models || []).map((m) => m.name);
  const wanted = env.ollamaModel.includes(':') ? env.ollamaModel : `${env.ollamaModel}:latest`;
  const modelAvailable = models.includes(wanted) || models.includes(env.ollamaModel);
  return {
    online: true,
    modelAvailable,
    models,
    message: modelAvailable
      ? `Ollama online - using ${env.ollamaModel}`
      : `Ollama is running but model "${env.ollamaModel}" is not pulled. Run: ollama pull ${env.ollamaModel}`,
  };
}

/** Is the provider reachable and is the configured model available? Cached (15s local, 60s hosted). */
export async function getHealth({ force = false } = {}) {
  const ttl = provider === 'groq' ? 60000 : 15000;
  if (!force && healthCache.value && Date.now() - healthCache.at < ttl) return healthCache.value;

  let value;
  try {
    value = await (provider === 'groq' ? groqHealth() : ollamaHealth());
  } catch (err) {
    const where = provider === 'groq' ? 'Groq API' : `Ollama at ${env.ollamaUrl}`;
    value = {
      online: false,
      modelAvailable: false,
      models: [],
      message: `${where} not reachable (${err.name === 'TimeoutError' ? 'timeout' : err.message}). Using rule-based fallback.`,
    };
  }
  value = { provider, model: activeModel(), ...value };
  healthCache = { at: Date.now(), value };
  return value;
}

export async function isReady() {
  const h = await getHealth();
  return h.online && h.modelAvailable;
}

/** Pull the first {...} block out of a model reply, tolerating code fences and chatter. */
export function parseJsonLoose(text) {
  if (!text) throw new Error('Empty model response');
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start === -1 || end <= start) throw new Error('Model did not return JSON');
    const candidate = text
      .slice(start, end + 1)
      .replace(/,\s*([}\]])/g, '$1') // trailing commas
      .replace(/[“”]/g, '"');
    return JSON.parse(candidate);
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Reasoning models (gpt-oss, qwen3) think before answering; those tokens count against max_tokens.
const isReasoningModel = (m) => /gpt-oss|qwen3/i.test(m);

async function groqChat({ system, prompt, temperature, maxTokens, timeoutMs }) {
  const reasoning = isReasoningModel(env.groqModel);
  const body = JSON.stringify({
    model: env.groqModel,
    temperature,
    max_tokens: reasoning ? maxTokens + 6000 : maxTokens,
    ...(reasoning && { reasoning_effort: env.groqReasoningEffort, include_reasoning: false }),
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: prompt },
    ],
  });

  // One retry on rate limiting (free tier is ~30 requests/min), honouring Retry-After up to 15s.
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(`${GROQ_URL}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.groqApiKey}` },
      signal: AbortSignal.timeout(timeoutMs),
      body,
    });
    if (res.status === 429 && attempt === 1) {
      const wait = Math.min(15, Number(res.headers.get('retry-after')) || 5);
      await sleep(wait * 1000);
      continue;
    }
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      if (res.status === 401 || res.status === 404) healthCache.at = 0;
      throw new Error(`Groq HTTP ${res.status}: ${text.slice(0, 200)}`);
    }
    const data = await res.json();
    return data?.choices?.[0]?.message?.content;
  }
}

async function ollamaChat({ system, prompt, temperature, maxTokens, timeoutMs }) {
  const res = await fetch(`${env.ollamaUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(timeoutMs),
    body: JSON.stringify({
      model: env.ollamaModel,
      stream: false,
      format: 'json',
      keep_alive: '15m',
      options: { temperature, num_predict: maxTokens, num_ctx: 8192 },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    // A 404 usually means the model is not pulled; refresh health so the UI shows it.
    healthCache.at = 0;
    throw new Error(`Ollama HTTP ${res.status}: ${body.slice(0, 200)}`);
  }
  const data = await res.json();
  return data?.message?.content;
}

/**
 * Send a chat request and parse the reply as JSON.
 * Throws on network errors, timeouts and unparseable output so callers can fall back.
 */
export async function chatJSON({ system, prompt, temperature = 0.2, maxTokens = 1024, timeoutMs = env.llmTimeoutMs }) {
  const chat = provider === 'groq' ? groqChat : ollamaChat;
  return parseJsonLoose(await chat({ system, prompt, temperature, maxTokens, timeoutMs }));
}
