import { ResumeBlueprint } from './Art';

/** Left-hand illustration column for the login and register pages. */
export default function AuthArt({ title, eyebrow }) {
  return (
    <aside className="auth-art blueprint">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1 className="display" style={{ margin: 0, maxWidth: 560 }}>{title}</h1>
      </div>
      <div style={{ position: 'relative', display: 'grid', placeItems: 'center', margin: '24px 0' }}>
        <svg viewBox="0 0 200 200" aria-hidden="true" style={{ position: 'absolute', width: '48%', right: '8%', top: 0 }}>
          <circle cx="100" cy="100" r="100" fill="var(--brand)" />
        </svg>
        <div style={{ position: 'relative', width: '62%', maxWidth: 340 }}>
          <ResumeBlueprint />
        </div>
      </div>
      <div className="row-between">
        <span className="label">LLM · Groq / Ollama</span>
        <span className="label">React · Express · MongoDB</span>
      </div>
    </aside>
  );
}
