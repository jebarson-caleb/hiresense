// Skill dictionary helpers: alias normalisation and whole-word extraction from free text.
import { readFileSync } from 'node:fs';

const raw = JSON.parse(readFileSync(new URL('../data/skills.json', import.meta.url), 'utf8'));

// Aliases that are ordinary English words (or single letters) are only matched with this exact casing
// when scanning free text, e.g. "Go" but not "go", "REST" but not "rest".
const CASE_SENSITIVE_FORMS = {
  c: ['C'], r: ['R'], go: ['Go'], ai: ['AI'], ml: ['ML'], dl: ['DL'], ui: ['UI'], ux: ['UX'],
  rest: ['REST'], ts: ['TS'], js: ['JS'], shell: ['Shell'], spring: ['Spring'], express: ['Express'],
  node: ['Node'], lambda: ['Lambda'], spark: ['Spark'], rails: ['Rails'], mongo: ['Mongo'],
  swift: ['Swift'], rust: ['Rust'], dart: ['Dart'], julia: ['Julia'], apache: ['Apache'],
  oracle: ['Oracle'], excel: ['Excel'], ios: ['iOS', 'IOS'],
};

export const CATEGORY_OF = new Map(); // canonical lower -> category
const ALIAS_TO_CANONICAL = new Map(); // alias lower -> canonical display name
const PATTERNS = []; // { canonical, regex }

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
const boundary = (body, flags) => new RegExp(`(?<![A-Za-z0-9+#])${body}(?![A-Za-z0-9+#])`, flags);

for (const [category, entries] of Object.entries(raw)) {
  if (category.startsWith('_')) continue;
  for (const entry of entries) {
    const [canonical, ...aliases] = entry.split('|').map((s) => s.trim());
    CATEGORY_OF.set(canonical.toLowerCase(), category);
    for (const alias of [canonical, ...aliases]) {
      const key = alias.toLowerCase();
      ALIAS_TO_CANONICAL.set(key, canonical);
      if (CASE_SENSITIVE_FORMS[key]) {
        for (const form of CASE_SENSITIVE_FORMS[key]) {
          PATTERNS.push({ canonical, length: form.length, regex: boundary(escape(form), 'g') });
        }
      } else {
        PATTERNS.push({ canonical, length: alias.length, regex: boundary(escape(alias).replace(/\s+/g, '\\s+'), 'gi') });
      }
    }
  }
}
// Longest aliases first, so "Apache Spark" claims its text before "Apache" can.
PATTERNS.sort((a, b) => b.length - a.length);

const titleCase = (s) => s.replace(/\b([a-z])/g, (m) => m.toUpperCase());

/** Map any skill spelling to its canonical display name (unknown skills are tidied, not dropped). */
export function normalizeSkill(name) {
  if (typeof name !== 'string') return '';
  const cleaned = name.replace(/\s+/g, ' ').replace(/^[\s•\-*,.]+|[\s,.;:]+$/g, '').trim();
  if (!cleaned || cleaned.length > 40) return '';
  return ALIAS_TO_CANONICAL.get(cleaned.toLowerCase()) || (cleaned === cleaned.toLowerCase() ? titleCase(cleaned) : cleaned);
}

export function normalizeSkillList(list, limit = 40) {
  const seen = new Set();
  const out = [];
  for (const item of Array.isArray(list) ? list : []) {
    const skill = normalizeSkill(item);
    const key = skill.toLowerCase();
    if (skill && !seen.has(key)) {
      seen.add(key);
      out.push(skill);
    }
    if (out.length >= limit) break;
  }
  return out;
}

export const skillKey = (s) => normalizeSkill(s).toLowerCase();

/** Find dictionary skills mentioned anywhere in free text, ordered by number of mentions. */
export function extractSkills(text = '') {
  const counts = new Map();
  let remaining = text;
  for (const { canonical, regex } of PATTERNS) {
    regex.lastIndex = 0;
    const hits = remaining.match(regex);
    if (!hits) continue;
    counts.set(canonical, (counts.get(canonical) || 0) + hits.length);
    // Blank out matched text (same length) so shorter aliases inside it are not counted again.
    remaining = remaining.replace(regex, (m) => ' '.repeat(m.length));
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([skill]) => skill);
}

export function categoryOf(skill) {
  return CATEGORY_OF.get(normalizeSkill(skill).toLowerCase()) || 'Other';
}
