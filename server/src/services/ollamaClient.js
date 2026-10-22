// Thin wrapper around the local Ollama REST API (https://github.com/ollama/ollama/blob/main/docs/api.md).
import env from '../config/env.js';

let healthCache = { at: 0, value: null };

/** Is Ollama reachable and is the configured model pulled? Cached for 15 seconds. */
export async function getHealth({ force = false } = {}) {
  if (!force && healthCache.value && Date.now() - healthCache.at < 15000) return healthCache.value;

  let value;
  try {
    const res = await fetch(`${env.ollamaUrl}/api/tags`, { signal: AbortSignal.timeout(2500) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const models = (data.models || []).map((m) => m.name);
    const wanted = env.ollamaModel.includes(':') ? env.ollamaModel : `${env.ollamaModel}:latest`;
    const modelAvailable = models.includes(wanted) || models.includes(env.ollamaModel);
    value = {
      online: true,
      model: env.ollamaModel,
      modelAvailable,
      models,
      message: modelAvailable
        ? `Ollama online - using ${env.ollamaModel}`
        : `Ollama is running but model "${env.ollamaModel}" is not pulled. Run: ollama pull ${env.ollamaModel}`,
    };
  } catch (err) {
    value = {
      online: false,
      model: env.ollamaModel,
      modelAvailable: false,
      models: [],
      message: `Ollama not reachable at ${env.ollamaUrl} (${err.name === 'TimeoutError' ? 'timeout' : err.message}). Using rule-based fallback.`,
    };
  }
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

/**
 * Send a chat request and parse the reply as JSON.
 * Throws on network errors, timeouts and unparseable output so callers can fall back.
 */
export async function chatJSON({ system, prompt, temperature = 0.2, maxTokens = 1024, timeoutMs = env.ollamaTimeoutMs }) {
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
  return parseJsonLoose(data?.message?.content);
}
