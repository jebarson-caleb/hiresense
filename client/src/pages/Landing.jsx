import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExplodedResume, IconBlind, IconFilter, IconMismatch, IconStack, ResumeBlueprint } from '../components/Art';
import SiteFooter from '../components/SiteFooter';

const TICKER = ['Sharper resumes', 'Better matches', 'Less guesswork', 'Faster shortlists', 'Runs on your machine'];

const PROBLEMS = [
  ['Blind', IconBlind, 'Your resume gets no feedback', 'You send it out and hear nothing back. No one tells you what is missing, weak or unreadable.'],
  ['Filtered', IconFilter, 'ATS filters reject in silence', 'Keyword-based screening drops good candidates before a human ever reads a line.'],
  ['Manual', IconStack, 'Recruiters read every PDF by hand', 'Hundreds of applications per role, each one opened, skimmed and compared manually.'],
  ['Mismatched', IconMismatch, 'Good people miss good jobs', 'Job boards rank by recency, not fit, so the right role and the right person rarely meet.'],
];

const STEPS = [
  ['Read', 'The local LLM reads your resume and extracts skills, experience and education'],
  ['Score', 'It rates ATS readiness 0-100 and flags issues in plain language'],
  ['Match', 'Every open job is scored on skills, text similarity and an AI fit judgement'],
  ['Improve', 'You get concrete fixes; re-upload and watch the score move'],
];

const USE_CASES = [
  ['Students & freshers', 'Find out what your first resume is missing before campus placements begin.'],
  ['Job seekers', 'See which open roles you actually fit, and which skills stand between you and the rest.'],
  ['Recruiters', 'Open a job and see every applicant already ranked, with matched and missing skills.'],
  ['Hiring managers', 'Read a two-line AI explanation of each candidate before the interview.'],
  ['Placement cells', 'Track skills across a whole batch and the skills employers are asking for.'],
  ['Administrators', 'Moderate users and job posts and watch platform health from one dashboard.'],
];

const STATEMENT =
  'The repetitive parts of hiring shouldn’t eat your day. HireSense reads every resume and scores every fit, so you can focus on the people, not the paperwork.';

/** Words turn from grey to ink as the paragraph scrolls into view. */
function RevealText({ text }) {
  const ref = useRef(null);
  const [lit, setLit] = useState(0);
  const words = text.split(' ');

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const onScroll = () => {
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const progress = Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (r.height + vh * 0.35)));
      setLit(Math.round(progress * words.length));
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [words.length]);

  return (
    <h2 ref={ref} className="reveal-text" aria-label={text}>
      {words.map((w, i) => (
        <span key={i} className={`w ${i < lit ? 'on' : ''}`} aria-hidden="true">
          {w}{' '}
        </span>
      ))}
    </h2>
  );
}

function DashboardMock() {
  const tiles = [
    ['Open jobs', '19', 'var(--chart-3)'],
    ['Pending', '8', 'var(--brand)'],
    ['Avg match', '74%', 'var(--chart-1)'],
    ['Time saved', '16.8h', 'var(--ink)'],
  ];
  const activity = [
    ['Resume analysed · ATS 82', 'Arun Kumar · Full Stack', 'Completed', 'var(--chart-3)'],
    ['Missing skill detected', 'Rahul Verma · needs SQL', 'Review', 'var(--brand)'],
    ['New strong match · 96%', 'MERN Stack Developer', 'Pending', 'var(--chart-4)'],
  ];
  return (
    <div style={{ width: '100%', maxWidth: 560, position: 'relative', fontSize: 12 }}>
      <div className="cells" style={{ gridTemplateColumns: 'repeat(4, 1fr)', background: 'var(--paper-2)' }}>
        {tiles.map(([l, v, c]) => (
          <div key={l} style={{ padding: '8px 10px' }}>
            <div className="stat-label" style={{ fontSize: 9 }}>{l}<span className="sq" style={{ color: c }} /></div>
            <div style={{ fontWeight: 700, fontSize: 20, color: 'var(--ink)', letterSpacing: '-0.03em' }}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{ border: '1px solid var(--line)', borderTop: 0, background: 'var(--paper-2)', boxShadow: '0 5px 0 var(--ink)' }}>
        <div className="row-between" style={{ padding: '10px 12px', borderBottom: '1px solid var(--line)' }}>
          <strong style={{ textTransform: 'uppercase' }}>AI activity</strong>
          <span className="link-arrow" style={{ fontSize: 10 }}>View all</span>
        </div>
        {activity.map(([t, s, st, c]) => (
          <div key={t} className="row" style={{ padding: '8px 12px', borderBottom: '1px dashed var(--line)', flexWrap: 'nowrap' }}>
            <span style={{ width: 26, height: 26, border: '1px solid var(--line)', display: 'grid', placeItems: 'center', color: 'var(--brand)' }}>◇</span>
            <div className="grow" style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 600, color: 'var(--ink)', textTransform: 'uppercase', fontSize: 11 }}>{t}</div>
              <div className="muted" style={{ fontSize: 10 }}>{s}</div>
            </div>
            <span className="mono" style={{ fontSize: 9, color: c, display: 'inline-flex', gap: 5, alignItems: 'center' }}>
              <span className="sq" /> {st}
            </span>
          </div>
        ))}
      </div>
      <div className="ai-panel" style={{ position: 'absolute', right: -14, bottom: -40, width: 230, fontSize: 11 }}>
        <div className="ai-panel-head" style={{ fontSize: 11 }}>Pending review (2)<span className="mono">View all</span></div>
        {[['Shortlist 3 candidates', '64%'], ['Re-score 12 applicants', '88%']].map(([t, p]) => (
          <div key={t} style={{ padding: '8px 10px', borderBottom: '1px dashed var(--line)' }}>
            <div style={{ fontWeight: 600, color: 'var(--ink)', textTransform: 'uppercase', fontSize: 10 }}>{t}</div>
            <div className="row" style={{ gap: 6, marginTop: 5, flexWrap: 'nowrap' }}>
              <div className="bar grow" style={{ height: 5 }}><span style={{ width: p, background: 'var(--ink)' }} /></div>
              <span className="btn btn-brand btn-sm" style={{ fontSize: 9 }}><span className="btn-label" style={{ padding: '4px 6px' }}>Review</span></span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Landing() {
  const [open, setOpen] = useState(0);

  return (
    <div className="landing">
      {/* ---------- Hero ---------- */}
      <section className="l-hero-art blueprint">
        <span className="plus" style={{ left: 14, bottom: 22 }}>+</span>
        <span className="plus" style={{ right: 14, bottom: 22 }}>+</span>
        <span className="coords" style={{ left: 18, top: 16 }}>ISO 24 · A4 · 210×297</span>
        <span className="coords" style={{ right: 18, top: 16 }}>LOCAL LLM · OLLAMA</span>
        <ExplodedResume />
        <div className="ruler-h" />
      </section>

      <section className="l-hero-row">
        <div>
          <h1 className="display" style={{ margin: 0 }}>
            An AI agent that reads resumes like a recruiter
          </h1>
        </div>
        <div className="stack" style={{ justifyContent: 'space-between' }}>
          <p style={{ margin: 0, color: 'var(--ink-2)' }}>
            HireSense reviews your resume, identifies issues, scores it like an applicant tracking system and matches it
            to open jobs. Every analysis runs on a local language model through Ollama, so resumes never leave the server.
          </p>
          <div className="row">
            <Link to="/register" className="btn btn-brand">
              <span className="btn-label">Get started</span><span className="btn-arrow">→</span>
            </Link>
            <Link to="/login" className="btn btn-outline">
              <span className="btn-label">Log in</span><span className="btn-arrow">→</span>
            </Link>
          </div>
        </div>
        <a href="#problems" className="cta-cell">
          <span>Discover more</span>
          <span>↓</span>
        </a>
      </section>

      <div className="ticker" aria-hidden="true">
        <div className="ticker-track">
          {[...TICKER, ...TICKER, ...TICKER, ...TICKER].map((t, i) => <span key={i}>{t}</span>)}
        </div>
      </div>

      {/* ---------- Statement ---------- */}
      <section className="l-split" style={{ borderTop: '1px solid var(--line)' }}>
        <div className="blueprint" style={{ display: 'grid', placeItems: 'center', position: 'relative', minHeight: 420, overflow: 'hidden' }}>
          <svg viewBox="0 0 300 300" width="300" aria-hidden="true" style={{ position: 'absolute', right: '6%', top: '8%', width: '42%' }}>
            <circle cx="150" cy="150" r="150" fill="var(--brand)" />
          </svg>
          <div style={{ position: 'relative', width: '100%', maxWidth: 380 }}>
            <ResumeBlueprint />
          </div>
        </div>
        <div className="stack" style={{ justifyContent: 'center', gap: 28 }}>
          <RevealText text={STATEMENT} />
          <div>
            <Link to="/register" className="btn btn-outline">
              <span className="btn-label">Learn more</span><span className="btn-arrow">→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ---------- Problems ---------- */}
      <section id="problems">
        <div className="l-section-head">
          <div>
            <span className="eyebrow">Problems</span>
            <h2 className="display" style={{ fontSize: 'clamp(2rem, 4.4vw, 3.6rem)', margin: 0 }}>
              Hiring tools do what you tell them, nothing more
            </h2>
          </div>
          <div>
            <p style={{ margin: 0 }}>
              Job portals are powerful but passive. They store resumes and list jobs, but give no advice, spot no gaps and
              make no matches, so all the repetitive reading stays on people.
            </p>
          </div>
        </div>
        <div className="problem-grid">
          {PROBLEMS.map(([tag, Icon, title, text], i) => (
            <div key={tag}>
              <div className="p-head">
                <span className="label">{tag}</span>
                <span className="idx">[0{i + 1}]</span>
              </div>
              <div className="p-art"><Icon /></div>
              <div className="p-body">
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="statement blueprint">
        <div>
          <span className="eyebrow">[ Introduction ]</span>
          <h2 className="display" style={{ margin: 0 }}>For the whole hiring loop</h2>
        </div>
      </section>

      {/* ---------- Product: analyzer ---------- */}
      <section className="l-split">
        <div className="blueprint" style={{ display: 'grid', placeItems: 'center', position: 'relative', minHeight: 460 }}>
          <span className="coords" style={{ left: 16, top: 14 }}>[CLICK-FREE · ISSUES FLAGGED AUTOMATICALLY]</span>
          <div style={{ position: 'relative', width: '100%', maxWidth: 560, display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{ width: '58%' }}><ResumeBlueprint /></div>
            <div className="ai-panel" style={{ position: 'absolute', right: 0, bottom: -10, width: 'min(270px, 52%)' }}>
              <div className="ai-panel-head">HireSense AI<span className="mono">llama3.2</span></div>
              <div className="ai-panel-body">
                <span className="issue-tag">Issue #01</span>
                <h3 style={{ margin: '4px 0 6px' }}>Achievements not quantified</h3>
                <p className="small" style={{ margin: 0 }}>Bullet points describe duties but not impact.</p>
                <div className="fix-box">
                  <span className="label">AI-suggested fix</span>
                  <ul>
                    <li>Add numbers: “cut load time by 40%”.</li>
                    <li>Lead each bullet with an action verb.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="stack" style={{ justifyContent: 'center', gap: 22 }}>
          <span className="eyebrow" style={{ margin: 0 }}>Integration</span>
          <h2 className="display" style={{ fontSize: 'clamp(2rem, 4vw, 3.4rem)', margin: 0 }}>Works natively on your resume</h2>
          <p style={{ margin: 0 }}>
            Upload a PDF, DOCX or TXT. HireSense reads it, understands your experience and skills, and shows every
            finding to you first, so nothing changes without your say-so.
          </p>
          <ul className="feature-list">
            <li>Reads PDF, DOCX and TXT resumes.<span className="ico">PDF</span></li>
            <li>Understands skills, experience and education.<span className="ico">NLP</span></li>
            <li>Flags issues with an ATS score out of 100.<span className="ico">ATS</span></li>
            <li>Suggests fixes you can apply right away.<span className="ico">FIX</span></li>
          </ul>
        </div>
      </section>

      <section className="product-row">
        <div className="pr-title">
          <span className="idx">[01]</span>
          <h2 style={{ fontSize: '1.9rem', margin: 0 }}>Resume analyzer</h2>
        </div>
        <div className="pr-visual blueprint">
          <div className="cells" style={{ gridTemplateColumns: 'repeat(3, 1fr)', width: '100%', maxWidth: 520, background: 'var(--paper-2)' }}>
            {[['ATS score', '82'], ['Skills found', '29'], ['Experience', '2 yrs']].map(([l, v]) => (
              <div key={l} style={{ padding: 14 }}>
                <div className="stat-label">{l}</div>
                <div className="stat-value" style={{ fontSize: '1.8rem', marginTop: 8 }}>{v}</div>
              </div>
            ))}
            <div style={{ gridColumn: '1 / -1', padding: 14 }}>
              <div className="chips">
                {['React', 'Node.js', 'MongoDB', 'Express.js', 'Docker', 'Redis', 'Jest'].map((s) => <span key={s} className="chip">{s}</span>)}
                <span className="chip chip-miss">Kubernetes</span>
              </div>
            </div>
          </div>
        </div>
        <div className="pr-copy">
          <p>
            Upload once and get a full report: summary, skills, strengths, weaknesses and a prioritised list of fixes, from a
            model running on your own hardware.
          </p>
          <Link to="/register" className="pr-link">Learn more <span>→</span></Link>
        </div>
      </section>

      <section className="product-row">
        <div className="pr-title">
          <span className="idx">[02]</span>
          <h2 style={{ fontSize: '1.9rem', margin: 0 }}>Recruiter dashboard</h2>
        </div>
        <div className="pr-visual blueprint" style={{ paddingBottom: 60 }}>
          <DashboardMock />
        </div>
        <div className="pr-copy">
          <p>
            Post a job and see every applicant ranked by match score, with matched and missing skills and the model’s own
            reasoning. Discover strong candidates who have not applied yet.
          </p>
          <Link to="/register" className="pr-link">Learn more <span>→</span></Link>
        </div>
      </section>

      {/* ---------- Why us: read / score / match / improve ---------- */}
      <section>
        <div className="l-section-head">
          <div>
            <span className="eyebrow">Why us</span>
            <h2 className="display" style={{ fontSize: 'clamp(2rem, 4.4vw, 3.6rem)', margin: 0 }}>Built to work the way you hire</h2>
          </div>
          <div>
            <p style={{ margin: 0 }}>
              HireSense fits into your process instead of replacing it. It reads quietly, speaks up when something needs
              attention, and only acts when you apply or shortlist, so people stay in control the whole way through.
            </p>
          </div>
        </div>
        <div className="oaal">
          {STEPS.map(([t, d], i) => (
            <div key={t}>
              <span className="idx">[0{i + 1}]</span>
              <h3>{t}</h3>
              <p style={{ margin: 0 }}>{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- Use cases ---------- */}
      <section className="l-split">
        <div style={{ padding: 0, position: 'relative', minHeight: 520, overflow: 'hidden' }} className="blueprint">
          <svg viewBox="0 0 600 600" width="100%" height="100%" preserveAspectRatio="xMidYMax meet" aria-hidden="true" style={{ position: "absolute", inset: 0 }}>
            <circle cx="170" cy="150" r="130" fill="var(--brand)" />
            <rect x="380" y="0" width="150" height="330" fill="var(--brand)" opacity="0.85" />
            <circle cx="190" cy="390" r="90" fill="var(--paper-3)" />
            <g transform="translate(300 330)" fill="var(--paper-2)" stroke="var(--ink)" strokeWidth="1.4">
              {[0, 1, 2].map((i) => (
                <g key={i} transform={`translate(${i * 26 - 150} ${-i * 34})`}>
                  <rect x="0" y="0" width="190" height="250" />
                  <rect x="18" y="20" width="90" height="10" fill="var(--ink)" stroke="none" />
                  {[50, 66, 82, 110, 126, 142, 170, 186].map((y) => <rect key={y} x="18" y={y} width={y % 3 ? 140 : 110} height="4" fill="var(--muted)" stroke="none" />)}
                </g>
              ))}
            </g>
            <line x1="0" y1="560" x2="600" y2="560" stroke="var(--ink)" />
          </svg>
        </div>
        <div>
          <span className="eyebrow">Use cases</span>
          <h2 className="display" style={{ fontSize: 'clamp(2rem, 4.4vw, 3.6rem)' }}>Made for everyone in the hiring loop</h2>
          <div className="accordion mt">
            {USE_CASES.map(([t, d], i) => (
              <div key={t} className={`acc-item ${open === i ? 'open' : ''}`}>
                <button className="acc-btn" aria-expanded={open === i} onClick={() => setOpen(open === i ? -1 : i)}>
                  {t}
                  <span className="plus-ico" aria-hidden="true">+</span>
                </button>
                {open === i && <div className="acc-panel">{d}</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- CTA ---------- */}
      <section className="cta-band blueprint">
        <span className="dash-v" style={{ left: '25%' }} />
        <span className="dash-v" style={{ left: '75%' }} />
        <span className="dash-h" style={{ top: 40 }} />
        <span className="coords" style={{ left: 'calc(25% + 6px)', top: 46 }}>[831,0]</span>
        <span className="coords" style={{ left: 'calc(75% + 6px)', top: 46 }}>[2303,0]</span>
        <div style={{ position: 'relative' }}>
          <h2 className="display" style={{ fontSize: 'clamp(2rem, 4.6vw, 3.8rem)' }}>See what HireSense can do with your resume</h2>
          <p className="lead" style={{ margin: '0 auto 26px' }}>Create a free account and get your first AI analysis in under a minute.</p>
          <Link to="/register" className="btn btn-brand btn-lg">
            <span className="btn-label">Get started</span><span className="btn-arrow">→</span>
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
