import 'dotenv/config';

const groqApiKey = (process.env.GROQ_API_KEY || '').trim();
// Default to Groq when a key is present, otherwise the local Ollama server.
const llmProvider = (process.env.LLM_PROVIDER || (groqApiKey ? 'groq' : 'ollama')).toLowerCase();

const env = {
  port: Number(process.env.API_PORT) || 5000,
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/resume_portal',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  llmProvider: llmProvider === 'groq' ? 'groq' : 'ollama',
  groqApiKey,
  groqModel: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
  // low | medium | high - how long reasoning models think before answering.
  groqReasoningEffort: process.env.GROQ_REASONING_EFFORT || 'medium',
  ollamaUrl: (process.env.OLLAMA_URL || 'http://127.0.0.1:11434').replace(/\/$/, ''),
  ollamaModel: process.env.OLLAMA_MODEL || 'llama3.2:3b',
  // Hosted models answer in a few seconds; a laptop running Ollama can take a minute or more.
  llmTimeoutMs: Number(process.env.LLM_TIMEOUT_MS || process.env.OLLAMA_TIMEOUT_MS) || (llmProvider === 'groq' ? 30000 : 90000),
};

export default env;
