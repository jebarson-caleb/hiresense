// Rule-based resume analysis + TF-IDF similarity. Used when Ollama is offline or returns bad output,
// and as a stable signal blended with the LLM results.
import { extractSkills, categoryOf } from './skills.js';

const STOPWORDS = new Set(
  `a an and are as at be by for from has have in is it its of on or that the to was were will with you your we our
  this they their them he she his her i me my not but if so do does did can could should would than then there
  about into over under also using use used etc per via within across who what which when where while how all any
  each more most other some such only own same very just year years month months experience work worked working
  role roles team responsible responsibilities job candidate looking strong good knowledge ability skills skill`.split(/\s+/)
);

const ACTION_VERBS = /\b(developed|built|designed|implemented|led|managed|created|improved|optimized|optimised|launched|deployed|automated|reduced|increased|delivered|architected|engineered|mentored|migrated|analy[sz]ed|collaborated|integrated)\b/gi;

export function tokenize(text = '') {
  return (text.toLowerCase().match(/[a-z][a-z0-9+#.]*[a-z0-9+#]|[a-z]/g) || []).filter(
    (t) => t.length > 1 && !STOPWORDS.has(t)
  );
}

// ---------- TF-IDF ----------

/** Build smoothed IDF weights over a corpus of token arrays. */
export function buildIdf(docsTokens) {
  const df = new Map();
  for (const tokens of docsTokens) for (const t of new Set(tokens)) df.set(t, (df.get(t) || 0) + 1);
  const n = docsTokens.length;
  const idf = new Map();
  for (const [t, d] of df) idf.set(t, Math.log((1 + n) / (1 + d)) + 1);
  return idf;
}

function vectorize(tokens, idf) {
  const tf = new Map();
  for (const t of tokens) tf.set(t, (tf.get(t) || 0) + 1);
  const vec = new Map();
  for (const [t, c] of tf) vec.set(t, (1 + Math.log(c)) * (idf.get(t) || 1));
  return vec;
}

export function cosine(tokensA, tokensB, idf) {
  const a = vectorize(tokensA, idf);
  const b = vectorize(tokensB, idf);
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (const [t, w] of a) {
    na += w * w;
    if (b.has(t)) dot += w * b.get(t);
  }
  for (const w of b.values()) nb += w * w;
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

/** Text similarity 0-100 between a resume and a job. Raw cosines for resumes vs. job posts rarely exceed ~0.4. */
export function textSimilarity(resumeText, jobText, idf) {
  const ra = tokenize(resumeText);
  const jb = tokenize(jobText);
  const weights = idf || buildIdf([ra, jb]);
  return Math.round(Math.min(1, cosine(ra, jb, weights) / 0.4) * 100);
}

// ---------- Heuristic resume analysis ----------

const SECTION_PATTERNS = {
  summary: /\b(summary|objective|profile|about me)\b/i,
  experience: /\b(experience|employment|work history|internships?)\b/i,
  education: /\b(education|academic|qualifications?)\b/i,
  skills: /\b(skills|technical skills|technologies|tech stack|competencies)\b/i,
  projects: /\b(projects?)\b/i,
  certifications: /\b(certifications?|certificates?|courses)\b/i,
};

const DEGREE = /\b(b\.?\s?tech|b\.\s?e\.|bachelor|master'?s?\b|m\.?\s?tech|m\.\s?e\.|mba|b\.?\s?sc|m\.?\s?sc|ph\.?\s?d|diploma|bca|mca|b\.?\s?com\b|m\.?\s?com\b|b\.a\.|high school|higher secondary|hsc|ssc|cbse)/i;

export function estimateExperienceYears(text = '') {
  let explicit = 0;
  for (const m of text.matchAll(/(\d{1,2}(?:\.\d)?)\s*\+?\s*(?:years?|yrs?)(?:\s+of)?\s+(?:\w+\s+){0,3}?experience/gi)) {
    explicit = Math.max(explicit, parseFloat(m[1]));
  }
  if (explicit) return Math.min(explicit, 40);

  // Otherwise sum date ranges inside the experience section only (education dates would inflate it).
  const lower = text.toLowerCase();
  const start = lower.search(/\n\s*(work\s+)?(experience|employment|work history|internships?)\b/);
  if (start === -1) return 0;
  const rest = text.slice(start + 1);
  const end = rest.slice(15).search(/\n\s*(education|projects?|skills|certifications?|achievements)\b/i);
  const section = end === -1 ? rest : rest.slice(0, end + 15);

  const now = new Date();
  let months = 0;
  const range = /(?:(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+)?((?:19|20)\d{2})\s*(?:-|–|—|to)\s*(?:(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+)?((?:19|20)\d{2}|present|current|now|till date|date)/gi;
  const monthIdx = (m) => (m ? 'janfebmaraprmayjunjulaugsepoctnovdec'.indexOf(m.slice(0, 3).toLowerCase()) / 3 : null);
  for (const m of section.matchAll(range)) {
    const y1 = Number(m[2]);
    const mo1 = monthIdx(m[1]) ?? 0;
    const open = !/^\d/.test(m[4]);
    const y2 = open ? now.getFullYear() : Number(m[4]);
    const mo2 = open ? now.getMonth() : monthIdx(m[3]) ?? 11;
    const span = (y2 - y1) * 12 + (mo2 - mo1) + 1;
    if (span > 0 && span < 480) months += span;
  }
  return Math.min(Math.round((months / 12) * 10) / 10, 40);
}

export function extractEducation(text = '') {
  const lines = text.split(/\r?\n/).map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const out = [];
  for (const line of lines) {
    const isBulletOrContact = /^[-*]/.test(line) || line.includes('@') || /:\s/.test(line.slice(0, 40)) && !/^(education|degree)/i.test(line);
    if (DEGREE.test(line) && line.length <= 160 && !isBulletOrContact && !out.includes(line)) out.push(line);
    if (out.length >= 4) break;
  }
  return out;
}

const ROLE_RULES = [
  { role: 'Full Stack Developer', any: ['React', 'Angular', 'Vue.js'], also: ['Node.js', 'Express.js', 'Django', 'Spring Boot', 'Flask'] },
  { role: 'Frontend Developer', any: ['React', 'Angular', 'Vue.js', 'Next.js'], also: ['HTML', 'CSS', 'JavaScript', 'TypeScript'] },
  { role: 'Backend Developer', any: ['Node.js', 'Django', 'Spring Boot', 'Flask', 'FastAPI', 'ASP.NET', 'Express.js'], also: ['SQL', 'MongoDB', 'PostgreSQL', 'MySQL', 'REST API'] },
  { role: 'Data Scientist', any: ['Machine Learning', 'Deep Learning', 'TensorFlow', 'PyTorch', 'scikit-learn'], also: ['Python', 'Statistics', 'Pandas'] },
  { role: 'Data Analyst', any: ['Data Analysis', 'Power BI', 'Tableau', 'Excel', 'Pandas'], also: ['SQL', 'Statistics', 'Data Visualization'] },
  { role: 'AI/ML Engineer', any: ['LLM', 'Generative AI', 'LangChain', 'Natural Language Processing', 'Computer Vision', 'Hugging Face'], also: ['Python', 'PyTorch', 'TensorFlow'] },
  { role: 'DevOps Engineer', any: ['Docker', 'Kubernetes', 'Terraform', 'Jenkins', 'CI/CD', 'Ansible'], also: ['AWS', 'Azure', 'Linux', 'Google Cloud'] },
  { role: 'Cloud Engineer', any: ['AWS', 'Azure', 'Google Cloud'], also: ['Docker', 'Kubernetes', 'Terraform', 'Serverless'] },
  { role: 'Mobile App Developer', any: ['Android', 'iOS', 'Flutter', 'React Native', 'Kotlin', 'Swift'], also: ['Firebase', 'Dart', 'Java'] },
  { role: 'QA / Test Engineer', any: ['Selenium', 'Cypress', 'Test Automation', 'Manual Testing', 'Playwright'], also: ['Jest', 'JUnit', 'PyTest', 'Postman'] },
  { role: 'Cyber Security Analyst', any: ['Cyber Security', 'Penetration Testing', 'Network Security', 'Ethical Hacking'], also: ['Linux', 'Networking', 'OWASP', 'Wireshark'] },
  { role: 'UI/UX Designer', any: ['Figma', 'UI/UX', 'UX Design', 'UI Design', 'Adobe XD'], also: ['Wireframing', 'Prototyping', 'HTML', 'CSS'] },
  { role: 'Software Engineer', any: ['Java', 'C++', 'Python', 'C#', 'Go'], also: ['Data Structures', 'Algorithms', 'OOP', 'Git'] },
];

export function suggestRoles(skills) {
  const have = new Set(skills.map((s) => s.toLowerCase()));
  return ROLE_RULES.map(({ role, any, also }) => {
    const primary = any.filter((s) => have.has(s.toLowerCase())).length;
    const secondary = also.filter((s) => have.has(s.toLowerCase())).length;
    return { role, score: primary ? primary * 2 + secondary : 0 };
  })
    .filter((r) => r.score >= 2)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((r) => r.role);
}

/** Heuristic ATS-style score with human-readable reasons. */
export function atsCheck(text = '', skills = []) {
  const words = (text.match(/\S+/g) || []).length;
  const hasEmail = /[\w.+-]+@[\w-]+\.[\w.]+/.test(text);
  const hasPhone = /(\+?\d[\d\s-]{8,}\d)/.test(text);
  const hasLinks = /(linkedin\.com|github\.com|portfolio|https?:\/\/)/i.test(text);
  const sections = Object.fromEntries(Object.entries(SECTION_PATTERNS).map(([k, re]) => [k, re.test(text)]));
  const verbs = new Set((text.match(ACTION_VERBS) || []).map((v) => v.toLowerCase())).size;
  const metrics = (text.match(/\b\d+(\.\d+)?\s*(%|percent|x\b|k\b|users|customers|clients|ms\b|hours|projects)/gi) || []).length;

  const strengths = [];
  const weaknesses = [];
  const suggestions = [];
  let score = 0;

  // Contact info (15)
  score += (hasEmail ? 6 : 0) + (hasPhone ? 5 : 0) + (hasLinks ? 4 : 0);
  if (hasEmail && hasPhone) strengths.push('Contact details are easy to find');
  else {
    weaknesses.push('Missing email or phone number');
    suggestions.push('Add a professional email and phone number at the top of the resume');
  }
  if (!hasLinks) suggestions.push('Add LinkedIn / GitHub / portfolio links so recruiters can verify your work');

  // Sections (30)
  const core = ['experience', 'education', 'skills'];
  const missingCore = core.filter((s) => !sections[s]);
  score += (3 - missingCore.length) * 7 + (sections.projects ? 5 : 0) + (sections.summary ? 4 : 0);
  if (!missingCore.length) strengths.push('Has the standard Experience, Education and Skills sections');
  else {
    weaknesses.push(`Missing section(s): ${missingCore.join(', ')}`);
    suggestions.push(`Add clearly titled ${missingCore.join(' / ')} section(s) - ATS parsers look for these headings`);
  }
  if (!sections.summary) suggestions.push('Start with a 2-3 line professional summary tailored to your target role');
  if (sections.projects) strengths.push('Includes a projects section showing hands-on work');
  else suggestions.push('Add 2-3 projects with the tech stack used and the outcome');

  // Skills (25)
  const skillPts = Math.min(25, skills.length * 2);
  score += skillPts;
  if (skills.length >= 8) strengths.push(`Broad skill set (${skills.length} recognised skills)`);
  else {
    weaknesses.push('Few recognisable skills/keywords');
    suggestions.push('List concrete tools, languages and frameworks - keyword matching drives ATS ranking');
  }

  // Impact (20)
  score += Math.min(10, verbs * 2) + Math.min(10, metrics * 3);
  if (verbs >= 4) strengths.push('Uses strong action verbs');
  else suggestions.push('Begin bullet points with action verbs such as "Built", "Led", "Optimized"');
  if (metrics >= 2) strengths.push('Quantifies achievements with numbers');
  else {
    weaknesses.push('Achievements are not quantified');
    suggestions.push('Quantify impact, e.g. "reduced load time by 40%" or "served 5k users"');
  }

  // Length (10)
  if (words >= 250 && words <= 1100) score += 10;
  else if (words < 250) {
    score += Math.round((words / 250) * 6);
    weaknesses.push('Resume is quite short');
    suggestions.push('Expand on responsibilities and results - aim for roughly 400-800 words');
  } else {
    score += 5;
    weaknesses.push('Resume is long');
    suggestions.push('Trim to the most relevant 1-2 pages');
  }

  return { score: Math.max(0, Math.min(100, Math.round(score))), strengths, weaknesses, suggestions, words };
}

export function analyzeWithRules(text = '') {
  const skills = extractSkills(text).slice(0, 40);
  const experienceYears = estimateExperienceYears(text);
  const education = extractEducation(text);
  const ats = atsCheck(text, skills);
  const suggestedRoles = suggestRoles(skills);

  const topCats = {};
  for (const s of skills) {
    const c = categoryOf(s);
    if (c !== 'Soft Skills') topCats[c] = (topCats[c] || 0) + 1;
  }
  const focus = Object.entries(topCats).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([c]) => c.toLowerCase());

  const summary = skills.length
    ? `Candidate with ${experienceYears ? `about ${experienceYears} year(s) of` : 'early-career'} experience, ` +
      `strongest in ${focus.join(' and ') || 'general skills'} (${skills.slice(0, 5).join(', ')}).` +
      (suggestedRoles.length ? ` Best suited for ${suggestedRoles.join(', ')} roles.` : '')
    : 'Could not identify many technical skills in this resume. Make sure the file contains selectable text, not a scanned image.';

  return {
    summary,
    skills,
    experienceYears,
    education,
    strengths: ats.strengths.slice(0, 5),
    weaknesses: ats.weaknesses.slice(0, 5),
    suggestions: ats.suggestions.slice(0, 6),
    suggestedRoles,
    atsScore: ats.score,
  };
}
