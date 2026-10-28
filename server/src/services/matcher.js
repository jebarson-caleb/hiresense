// Resume <-> job matching. Fast score = skill overlap + TF-IDF text similarity;
// AI score = LLM judgement (Groq or Ollama), blended in when the provider is available.
import { chatJSON, isReady, provider } from './llmClient.js';
import { buildIdf, tokenize, cosine } from './fallback.js';
import { extractSkills, normalizeSkillList, skillKey } from './skills.js';

const jobText = (job) => `${job.title} ${job.title} ${(job.requiredSkills || []).join(' ')} ${job.description}`;

function resumeSkillSet(resume) {
  const fromText = resume.rawText ? extractSkills(resume.rawText) : [];
  return new Set([...(resume.analysis?.skills || []), ...fromText].map(skillKey));
}

/** Pre-compute what is shared across many job comparisons for one resume. */
export function prepareCorpus(resume, jobs) {
  const resumeTokens = tokenize(`${resume.analysis?.summary || ''} ${(resume.analysis?.skills || []).join(' ')} ${resume.rawText || ''}`);
  const jobTokens = jobs.map((j) => tokenize(jobText(j)));
  return { resumeTokens, jobTokens, idf: buildIdf([resumeTokens, ...jobTokens]), skillSet: resumeSkillSet(resume) };
}

/** Deterministic score, cheap enough to run against every open job on each request. */
export function fastMatch(resume, job, corpus, jobIndex) {
  const ctx = corpus || prepareCorpus(resume, [job]);
  const tokens = ctx.jobTokens[jobIndex ?? 0];

  const textScore = Math.round(Math.min(1, cosine(ctx.resumeTokens, tokens, ctx.idf) / 0.4) * 100);

  const required = normalizeSkillList(job.requiredSkills || []);
  const matchedSkills = required.filter((s) => ctx.skillSet.has(s.toLowerCase()));
  const missingSkills = required.filter((s) => !ctx.skillSet.has(s.toLowerCase()));

  let skillScore = required.length ? (matchedSkills.length / required.length) * 100 : textScore;
  const years = resume.analysis?.experienceYears || 0;
  if (job.minExperience > 0 && years < job.minExperience) {
    skillScore *= 0.75 + 0.25 * (years / job.minExperience);
  }
  skillScore = Math.round(skillScore);

  return {
    score: Math.round(0.75 * skillScore + 0.25 * textScore),
    skillScore,
    textScore,
    aiScore: null,
    matchedSkills,
    missingSkills,
    aiReasoning: '',
    scoredBy: 'fallback',
  };
}

const FIT_SYSTEM = `You are a strict, fair technical recruiter screening a candidate for a specific job.
Reply with ONLY a JSON object:
{"score": number 0-100, "reasoning": "2-3 sentences naming the decisive matches and gaps", "missingSkills": ["required skills or qualifications the candidate clearly lacks"]}
How to score:
- Weigh required skills most (about 50%), then relevant experience depth and seniority vs the minimum (about 30%), then domain/role alignment and education (about 20%).
- Count a skill as present if the candidate shows it or a close equivalent (e.g. PostgreSQL for "SQL", Next.js for "React").
- Being under the minimum experience should lower the score noticeably; far exceeding it should not raise it much.
- Bands: 85+ excellent, 65-84 good, 40-64 partial, below 40 poor.
- Judge only on the information given; never assume unstated skills. missingSkills must not list anything the candidate has.`;

/** Ask the LLM how well the resume fits the job. Throws if unavailable. */
export async function aiFit(resume, job) {
  const a = resume.analysis || {};
  const prompt = `JOB
Title: ${job.title} at ${job.company}
Required skills: ${(job.requiredSkills || []).join(', ') || 'not specified'}
Minimum experience: ${job.minExperience || 0} years
Description: ${String(job.description).slice(0, provider === 'groq' ? 4000 : 1500)}

CANDIDATE
Summary: ${a.summary || 'n/a'}
Skills: ${(a.skills || []).join(', ') || 'n/a'}
Experience: ${a.experienceYears ?? 0} years
Education: ${(a.education || []).join('; ') || 'n/a'}
Resume excerpt: ${String(resume.rawText || '').slice(0, provider === 'groq' ? 8000 : 2500)}`;

  const out = await chatJSON({ system: FIT_SYSTEM, prompt, temperature: 0.1, maxTokens: 400, timeoutMs: provider === 'groq' ? 20000 : 60000 });
  const score = Number(out.score);
  if (!Number.isFinite(score)) throw new Error('AI fit response missing score');
  return {
    score: Math.max(0, Math.min(100, Math.round(score))),
    reasoning: typeof out.reasoning === 'string' ? out.reasoning.trim().slice(0, 600) : '',
    missingSkills: normalizeSkillList(out.missingSkills, 8),
  };
}

// In-memory cache so repeated "AI fit" checks for the same resume/job version are instant.
const fitCache = new Map();

/** Full match: fast score, upgraded with the LLM's opinion when the provider is ready. */
export async function fullMatch(resume, job, { useAI = true } = {}) {
  const base = fastMatch(resume, job);
  if (!useAI || !(await isReady())) return base;

  const key = `${resume._id}:${new Date(resume.updatedAt).getTime()}:${job._id}:${new Date(job.updatedAt).getTime()}`;
  try {
    let fit = fitCache.get(key);
    if (!fit) {
      fit = await aiFit(resume, job);
      fitCache.set(key, fit);
      if (fitCache.size > 500) fitCache.delete(fitCache.keys().next().value);
    }
    const missing = normalizeSkillList([...base.missingSkills, ...fit.missingSkills], 10);
    return {
      ...base,
      // A large hosted model's holistic judgement is reliable enough to weigh equally with skill overlap.
      score: Math.round(provider === 'groq' ? 0.5 * base.skillScore + 0.5 * fit.score : 0.6 * base.skillScore + 0.4 * fit.score),
      aiScore: fit.score,
      aiReasoning: fit.reasoning,
      missingSkills: missing,
      scoredBy: provider,
    };
  } catch (err) {
    console.warn(`[ai] fit scoring failed, using fast score: ${err.message}`);
    return base;
  }
}

/** Rank many jobs for one resume using the fast score. */
export function rankJobs(resume, jobs) {
  const corpus = prepareCorpus(resume, jobs);
  return jobs
    .map((job, i) => ({ job, match: fastMatch(resume, job, corpus, i) }))
    .sort((a, b) => b.match.score - a.match.score);
}
