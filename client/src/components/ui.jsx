// Small presentational building blocks shared across pages.
import { scoreColor, STATUS_BADGE } from '../utils/format';
import { DocIcon } from './Art';

export function ScoreRing({ score = 0, size = 96, stroke = 9, caption = 'score' }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const value = Math.max(0, Math.min(100, Math.round(score || 0)));
  const ticks = size >= 72 ? 40 : 0;
  return (
    <div className="score-ring" style={{ width: size, height: size }} role="img" aria-label={`${caption} ${value} out of 100`}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line-soft)" strokeWidth={stroke} />
        {Array.from({ length: ticks }, (_, i) => {
          const a = (i / ticks) * 2 * Math.PI;
          const r1 = r + stroke / 2 + 2;
          const r2 = r1 + (i % 5 === 0 ? 4 : 2);
          return (
            <line key={i} x1={size / 2 + r1 * Math.cos(a)} y1={size / 2 + r1 * Math.sin(a)} x2={size / 2 + r2 * Math.cos(a)}
              y2={size / 2 + r2 * Math.sin(a)} stroke="var(--line)" strokeWidth="1" />
          );
        })}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={scoreColor(value)}
          strokeWidth={stroke}
          strokeLinecap="butt"
          strokeDasharray={c}
          strokeDashoffset={c - (value / 100) * c}
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
      </svg>
      <div className="score-value">
        <span className="score-num" style={{ fontSize: size * 0.28 }}>{value}</span>
        {size >= 72 && <span className="score-cap">{caption}</span>}
      </div>
    </div>
  );
}

export function ScoreBar({ label, value, hint }) {
  const v = value ?? 0;
  const none = value === null || value === undefined;
  return (
    <div className="stack" style={{ gap: 6 }}>
      <div className="row-between">
        <span className="label">{label}</span>
        <span className="mono small" style={{ color: none ? 'var(--muted)' : 'var(--ink)' }}>{none ? (hint || 'n/a') : `${v}%`}</span>
      </div>
      <div className="bar">
        <span style={{ width: `${v}%`, background: scoreColor(v) }} />
      </div>
    </div>
  );
}

export function SkillChips({ skills = [], variant = '', empty = 'None', onRemove }) {
  if (!skills.length) return <span className="muted small">{empty}</span>;
  return (
    <div className="chips">
      {skills.map((s) => (
        <span key={s} className={`chip ${variant ? `chip-${variant}` : ''}`}>
          {s}
          {onRemove && (
            <button type="button" className="chip-x" aria-label={`Remove ${s}`} onClick={() => onRemove(s)}>
              ×
            </button>
          )}
        </span>
      ))}
    </div>
  );
}

export function StatusBadge({ status }) {
  return <span className={`badge badge-dot ${STATUS_BADGE[status] || ''}`}>{status}</span>;
}

export function StatTile({ label, value, sub, color = 'var(--ink)', index }) {
  return (
    <div className="card stat">
      <span className="stat-label">
        <span>{index && <span className="idx">[{index}] </span>}{label}</span>
        <span className="sq" style={{ color }} aria-hidden="true" />
      </span>
      <span className="stat-value">{value}</span>
      {sub && <span className="stat-sub">{sub}</span>}
    </div>
  );
}

export function Loader({ text = 'Loading' }) {
  return (
    <div className="loader">
      <span className="spinner" /> {text}…
    </div>
  );
}

export function Empty({ title, children }) {
  return (
    <div className="empty">
      <DocIcon />
      <h3>{title}</h3>
      {children}
    </div>
  );
}

export function List({ items = [], kind = 'good' }) {
  const tag = { good: 'OK', bad: 'ISS', tip: 'FIX' }[kind];
  if (!items.length) return <p className="muted small">Nothing noted.</p>;
  return (
    <ul className="list">
      {items.map((it, i) => (
        <li key={i}>
          <span className={`li-icon li-${kind}`} aria-hidden="true">{tag}·{String(i + 1).padStart(2, '0')}</span>
          <span>{it}</span>
        </li>
      ))}
    </ul>
  );
}

export function AnalyzedByBadge({ by, model }) {
  return by === 'ollama' ? (
    <span className="badge badge-primary" title={`Analysed by local LLM ${model || ''}`}>AI · {model || 'Ollama'}</span>
  ) : (
    <span className="badge" title="Analysed with the rule-based engine (Ollama was offline)">Rule-based</span>
  );
}

/** Section card with a mono index + title header bar. */
export function Panel({ index, title, action, children, style }) {
  return (
    <div className="card" style={style}>
      <div className="card-title">
        <h3>
          {index && <span className="idx" style={{ marginRight: 8 }}>[{index}]</span>}
          {title}
        </h3>
        {action}
      </div>
      {children}
    </div>
  );
}

/** Button with the dashed arrow cell. */
export function ArrowLabel({ children }) {
  return (
    <>
      <span className="btn-label">{children}</span>
      <span className="btn-arrow">→</span>
    </>
  );
}
