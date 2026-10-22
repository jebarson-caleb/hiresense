// Resume analysis: local LLM (Ollama) first, rule-based fallback if it is unavailable or misbehaves.
import env from '../config/env.js';
import { chatJSON, isReady } from './ollamaClient.js';
import { analyzeWithRules } from './fallback.js';
import { normalizeSkillList } from './skills.js';

const MAX_CHARS = 6000;

const SYSTEM_PROMPT = `You are an expert technical recruiter and ATS (applicant tracking system) reviewer.
You analyse resumes and reply with ONLY a JSON object, no markdown, using exactly this shape:
{
  "summary": "2-3 sentence professional summary of the candidate",
  "skills": ["concrete skills, tools, languages and frameworks found in the resume"],
  "experienceYears": number (total professional experience incl. internships, 0 for students),
  "education": ["degree, institution, year"],
  "strengths": ["3-5 specific strengths of this resume"],
  "weaknesses": ["2-4 specific gaps or problems"],
  "suggestions": ["3-6 actionable improvements to the resume"],
  "suggestedRoles": ["2-3 job titles this candidate fits"],
  "atsScore": number from 0 to 100 (how well the resume is written and structured for ATS)
}
Only use facts present in the resume. Be specific and concise.`;

const str = (v, max = 400) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const strList = (v, limit = 8, max = 220) =>
  (Array.isArray(v) ? v : typeof v === 'string' ? v.split(/\n|;/) : [])
    .map((x) => (typeof x === 'string' ? x : x && typeof x === 'object' ? Object.values(x).join(', ') : String(x ?? '')))
    .map((x) => x.trim().slice(0, max))
    .filter(Boolean)
    .slice(0, limit);
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

/** Validate the model output and blend it with the deterministic rule-based signals. */
function normalize(llm, rules) {
  const llmSkills = normalizeSkillList(llm.skills, 40);
  // Union with dictionary hits so obvious keywords the small model skipped are not lost.
  const skills = normalizeSkillList([...llmSkills, ...rules.skills], 45);

  const llmYears = Number(llm.experienceYears);
  const experienceYears = Number.isFinite(llmYears) && llmYears >= 0 ? clamp(Math.round(llmYears * 10) / 10, 0, 40) : rules.experienceYears;

  const llmAts = Number(llm.atsScore);
  // Blend so the score is stable between runs but still reflects the model's judgement.
  const atsScore = Number.isFinite(llmAts) ? Math.round(0.5 * clamp(llmAts, 0, 100) + 0.5 * rules.atsScore) : rules.atsScore;

  const pick = (key, limit) => {
    const list = strList(llm[key], limit);
    return list.length ? list : rules[key];
  };

  return {
    summary: str(llm.summary, 800) || rules.summary,
    skills,
    experienceYears,
    education: pick('education', 4),
    strengths: pick('strengths', 6),
    weaknesses: pick('weaknesses', 5),
    suggestions: pick('suggestions', 7),
    suggestedRoles: pick('suggestedRoles', 4),
    atsScore,
  };
}

/**
 * @returns {Promise<{analysis: object, analyzedBy: 'ollama'|'fallback', model: string, error?: string}>}
 */
export async function analyzeResume(text) {
  const rules = analyzeWithRules(text);
  if (!text || text.trim().length < 50) {
    return { analysis: rules, analyzedBy: 'fallback', model: '', error: 'Resume text too short to analyse' };
  }
  if (!(await isReady())) return { analysis: rules, analyzedBy: 'fallback', model: '' };

  const prompt = `Analyse this resume:\n"""\n${text.slice(0, MAX_CHARS)}\n"""`;
  let lastError;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const llm = await chatJSON({ system: SYSTEM_PROMPT, prompt, temperature: attempt === 1 ? 0.2 : 0 });
      if (!llm || typeof llm !== 'object' || (!llm.summary && !llm.skills)) throw new Error('JSON missing expected fields');
      return { analysis: normalize(llm, rules), analyzedBy: 'ollama', model: env.ollamaModel };
    } catch (err) {
      lastError = err;
      console.warn(`[ai] resume analysis attempt ${attempt} failed: ${err.message}`);
      if (err.name === 'TimeoutError' || err.name === 'AbortError') break; // retrying a timeout just doubles the wait
    }
  }
  return { analysis: rules, analyzedBy: 'fallback', model: '', error: lastError?.message };
}
