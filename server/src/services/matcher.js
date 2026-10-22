// Resume <-> job matching. Fast score = skill overlap + TF-IDF text similarity;
// AI score = local LLM judgement, blended in when Ollama is available.
import { chatJSON, isReady } from './ollamaClient.js';
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

const FIT_SYSTEM = `You are a strict technical recruiter. Compare a candidate to a job and reply with ONLY JSON:
{"score": number 0-100 (how well the candidate fits the job), "reasoning": "2-3 sentences explaining the score", "missingSkills": ["important requirements the candidate lacks"]}
Score guide: 85+ excellent fit, 65-84 good, 40-64 partial, below 40 poor. Judge only on the information given.`;

/** Ask the local LLM how well the resume fits the job. Throws if unavailable. */
export async function aiFit(resume, job) {
  const a = resume.analysis || {};
  const prompt = `JOB
Title: ${job.title} at ${job.company}
Required skills: ${(job.requiredSkills || []).join(', ') || 'not specified'}
Minimum experience: ${job.minExperience || 0} years
Description: ${String(job.description).slice(0, 1500)}

CANDIDATE
Summary: ${a.summary || 'n/a'}
Skills: ${(a.skills || []).join(', ') || 'n/a'}
Experience: ${a.experienceYears ?? 0} years
Education: ${(a.education || []).join('; ') || 'n/a'}
Resume excerpt: ${String(resume.rawText || '').slice(0, 2500)}`;

  const out = await chatJSON({ system: FIT_SYSTEM, prompt, maxTokens: 400, timeoutMs: 60000 });
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

/** Full match: fast score, upgraded with the LLM's opinion when Ollama is ready. */
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
      score: Math.round(0.6 * base.skillScore + 0.4 * fit.score),
      aiScore: fit.score,
      aiReasoning: fit.reasoning,
      missingSkills: missing,
      scoredBy: 'ollama',
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
