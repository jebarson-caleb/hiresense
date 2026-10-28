// Resume analysis: LLM (Groq or local Ollama) first, rule-based fallback if it is unavailable or misbehaves.
import { chatJSON, isReady, provider, activeModel } from './llmClient.js';
import { analyzeWithRules } from './fallback.js';
import { normalizeSkillList } from './skills.js';

// Hosted models have a 128k context, so they get the whole resume; small local models get a trimmed copy.
const MAX_CHARS = provider === 'groq' ? 20000 : 6000;
// How much the model's ATS score counts against the rule-based one. A large hosted model is trusted more.
const LLM_ATS_WEIGHT = provider === 'groq' ? 0.7 : 0.5;

const SYSTEM_PROMPT = `You are a senior technical recruiter and ATS (applicant tracking system) reviewer with 15 years of hiring experience.
Read the resume carefully and reply with ONLY a JSON object (no markdown, no commentary) in exactly this shape:
{
  "summary": "2-3 sentence third-person professional summary: current level, core stack, standout achievement",
  "skills": ["every concrete skill, language, framework, tool, platform and methodology in the resume, canonical names e.g. JavaScript, React, PostgreSQL, AWS"],
  "experienceYears": number,
  "education": ["Degree, Institution, Year"],
  "strengths": ["3-5 strengths, each citing specific evidence from the resume"],
  "weaknesses": ["2-4 concrete gaps or problems in the resume as written"],
  "suggestions": ["3-6 actionable, specific rewrites or additions, e.g. 'Quantify the API migration bullet with latency or cost numbers'"],
  "suggestedRoles": ["2-3 realistic job titles at the right seniority"],
  "atsScore": number
}
Rules:
- Use only facts present in the resume. Never invent employers, dates, degrees or skills.
- experienceYears: total professional experience including internships, computed from the date ranges (overlapping roles counted once, "Present" = today). Round to one decimal. 0 for students with no work history.
- skills: deduplicate, no soft skills like "teamwork", no sentence fragments.
- strengths/weaknesses/suggestions must be specific to THIS resume, never generic advice like "add more detail".
- atsScore (0-100) rubric: clear standard section headings (15), contact info present (10), skills section with relevant keywords (20), quantified achievements with numbers (20), consistent dates and reverse-chronological order (10), strong action verbs and concise bullets (15), education present (10).`;

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
  const atsScore = Number.isFinite(llmAts) ? Math.round(LLM_ATS_WEIGHT * clamp(llmAts, 0, 100) + (1 - LLM_ATS_WEIGHT) * rules.atsScore) : rules.atsScore;

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
 * @returns {Promise<{analysis: object, analyzedBy: 'groq'|'ollama'|'fallback', model: string, error?: string}>}
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
      const llm = await chatJSON({ system: SYSTEM_PROMPT, prompt, temperature: attempt === 1 ? 0.2 : 0, maxTokens: 1800 });
      if (!llm || typeof llm !== 'object' || (!llm.summary && !llm.skills)) throw new Error('JSON missing expected fields');
      return { analysis: normalize(llm, rules), analyzedBy: provider, model: activeModel() };
    } catch (err) {
      lastError = err;
      console.warn(`[ai] resume analysis attempt ${attempt} failed: ${err.message}`);
      if (err.name === 'TimeoutError' || err.name === 'AbortError') break; // retrying a timeout just doubles the wait
    }
  }
  return { analysis: rules, analyzedBy: 'fallback', model: '', error: lastError?.message };
}
