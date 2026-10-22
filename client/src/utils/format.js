export const scoreColor = (score) => (score >= 75 ? 'var(--good)' : score >= 50 ? 'var(--warn)' : 'var(--bad)');
export const scoreLabel = (score) => (score >= 85 ? 'Excellent' : score >= 70 ? 'Strong' : score >= 50 ? 'Moderate' : 'Weak');

export const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '';

export function timeAgo(d) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return 'just now';
  const units = [
    [86400 * 30, 'month'],
    [86400 * 7, 'week'],
    [86400, 'day'],
    [3600, 'hour'],
    [60, 'minute'],
  ];
  for (const [secs, name] of units) {
    const n = Math.floor(s / secs);
    if (n >= 1) return `${n} ${name}${n > 1 ? 's' : ''} ago`;
  }
  return 'just now';
}

export const initials = (name = '') =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');

export const STATUS_BADGE = {
  applied: 'badge-info',
  shortlisted: 'badge-primary',
  rejected: 'badge-bad',
  hired: 'badge-good',
  open: 'badge-good',
  closed: '',
};
