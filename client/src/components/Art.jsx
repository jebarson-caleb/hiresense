// Line-art illustrations in the "blueprint paper" style. All strokes use currentColor
// or theme tokens so they follow light/dark mode.

/** Isometric projection: (x, y, z) in model units -> [sx, sy] in SVG units. */
const iso = (ox, oy, s) => (x, y, z = 0) => [ox + (x - y) * 0.866 * s, oy + (x + y) * 0.5 * s - z * s];
const pts = (list) => list.map((p) => p.join(',')).join(' ');

export function Logo({ size = 32, className = 'brand-logo' }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-hidden="true">
      <polygon points="20,4 34,12 20,20 6,12" />
      <polygon points="6,12 20,20 20,36 6,28" />
      <polygon points="20,20 34,12 34,28 20,36" />
      <path d="M10 16.8v11M16 20.2v11M10 22.3l6 3.4" strokeWidth="2.2" />
      <path d="M24 22.5l6-3.4M24 26.5l6-3.4M24 30.5l4-2.3" strokeWidth="1.2" />
    </svg>
  );
}

/** Hero: exploded isometric resume, one layer per section, with leader labels and orange markers. */
export function ExplodedResume() {
  const P = iso(330, 250, 1);
  const W = 150;
  const H = 210;
  const layers = [
    { z: 0, label: 'EDUCATION', lines: [30, 50, 70] },
    { z: 70, label: 'EXPERIENCE', lines: [30, 46, 62, 78, 94] },
    { z: 140, label: 'SKILLS', lines: [30, 50, 70, 90] },
    { z: 210, label: 'PROFILE', lines: [24, 40] },
  ];
  return (
    <svg viewBox="0 0 760 560" width="100%" style={{ maxWidth: 760, color: 'var(--ink)' }} role="img"
      aria-label="Exploded view of a resume, separated into profile, skills, experience and education layers">
      <circle cx="215" cy="150" r="96" fill="var(--brand)" />
      {/* construction grid on the floor */}
      {[0, 50, 100, 150].map((x) => (
        <polyline key={`gx${x}`} points={pts([P(x, -40, -60), P(x, H + 40, -60)])} stroke="var(--line)" strokeDasharray="3 5" />
      ))}
      {[0, 70, 140, 210].map((y) => (
        <polyline key={`gy${y}`} points={pts([P(-40, y, -60), P(W + 40, y, -60)])} stroke="var(--line)" strokeDasharray="3 5" />
      ))}
      {/* vertical guides through the stack */}
      {[[0, 0], [W, 0], [W, H], [0, H]].map(([x, y]) => (
        <polyline key={`v${x}${y}`} points={pts([P(x, y, -60), P(x, y, 230)])} stroke="var(--line)" strokeDasharray="2 4" />
      ))}
      {layers.map((l, i) => {
        const top = i === layers.length - 1;
        return (
          <g key={l.label}>
            <polygon points={pts([P(0, 0, l.z), P(W, 0, l.z), P(W, H, l.z), P(0, H, l.z)])} fill="var(--paper-2)" stroke="currentColor" strokeWidth="1.3" />
            {/* sheet thickness */}
            <polyline points={pts([P(0, H, l.z), P(0, H, l.z - 4), P(W, H, l.z - 4), P(W, 0, l.z - 4), P(W, 0, l.z)])} fill="none" stroke="currentColor" strokeWidth="1" />
            {/* section heading bar */}
            <polygon points={pts([P(14, 10, l.z), P(top ? 90 : 70, 10, l.z), P(top ? 90 : 70, 18, l.z), P(14, 18, l.z)])} fill="currentColor" />
            {l.lines.map((y, j) => (
              <polyline key={y} points={pts([P(14, y, l.z), P(14 + (j % 2 ? 96 : 120), y, l.z)])} stroke="var(--muted)" strokeWidth="2" />
            ))}
            {/* leader line + label */}
            {(() => {
              const [ax, ay] = P(W, H * 0.25, l.z);
              const lx = 640;
              return (
                <g>
                  <polyline points={`${ax},${ay} ${ax + 40},${ay - 22} ${lx},${ay - 22}`} fill="none" stroke="var(--ink-2)" strokeWidth="0.8" />
                  <rect x={ax - 3} y={ay - 3} width="6" height="6" fill="var(--brand)" />
                  <text x={lx + 6} y={ay - 18} fontFamily="var(--mono)" fontSize="11" fill="var(--ink-2)">
                    [{String(i + 1).padStart(2, '0')}] {l.label}
                  </text>
                </g>
              );
            })()}
          </g>
        );
      })}
      {/* issue markers on the experience layer */}
      {[[120, 46, 70], [60, 78, 70]].map(([x, y, z], i) => {
        const [mx, my] = P(x, y, z);
        return (
          <g key={i}>
            <rect x={mx - 9} y={my - 9} width="18" height="18" fill="var(--brand)" />
            <text x={mx} y={my + 3.5} textAnchor="middle" fontFamily="var(--mono)" fontSize="9" fill="#fff">0{i + 1}</text>
          </g>
        );
      })}
      <text x="24" y="540" fontFamily="var(--mono)" fontSize="11" fill="var(--muted)">FIG. 01 — RESUME, EXPLODED AXONOMETRIC</text>
      <text x="736" y="540" textAnchor="end" fontFamily="var(--mono)" fontSize="11" fill="var(--muted)">[0,246]</text>
    </svg>
  );
}

/** A resume drawn as a technical sheet, with dimension lines and numbered issue markers. */
export function ResumeBlueprint({ issues = ['01', '02', '03'] }) {
  const bars = [
    [70, 150, 3], [70, 166, 2], [70, 180, 2], [70, 194, 2],
    [70, 236, 3], [70, 252, 2], [70, 266, 2], [70, 280, 2], [70, 294, 2],
    [70, 336, 3], [70, 352, 2], [70, 366, 2],
  ];
  const widths = [90, 210, 180, 230, 100, 230, 200, 170, 215, 110, 190, 150];
  const markers = [[300, 266], [268, 194], [178, 366]];
  return (
    <svg viewBox="0 0 400 470" width="100%" style={{ maxWidth: 420, color: 'var(--ink)' }} role="img"
      aria-label="Resume drawn as a blueprint with three flagged issues">
      {/* dimension lines */}
      <g stroke="var(--muted)" strokeWidth="0.8" fill="none">
        <path d="M50 28h300M50 22v12M350 22v12M200 22v12" />
        <path d="M24 50v390M18 50h12M18 440h12M18 210h12" />
      </g>
      <g fontFamily="var(--mono)" fontSize="9" fill="var(--muted)">
        <text x="120" y="20">105</text><text x="270" y="20">105</text>
        <text x="8" y="134" transform="rotate(-90 8 134)">160</text>
        <text x="8" y="330" transform="rotate(-90 8 330)">230</text>
      </g>
      {/* sheet */}
      <rect x="50" y="50" width="300" height="390" fill="var(--paper-2)" stroke="currentColor" strokeWidth="1.4" />
      <rect x="50" y="50" width="300" height="72" fill="currentColor" opacity="0.92" />
      <rect x="70" y="72" width="140" height="12" fill="var(--paper)" />
      <rect x="70" y="92" width="200" height="5" fill="var(--paper)" opacity="0.6" />
      <circle cx="315" cy="86" r="18" fill="none" stroke="var(--paper)" strokeDasharray="3 3" />
      {bars.map(([x, y, h], i) => (
        <rect key={i} x={x} y={y} width={widths[i]} height={h === 3 ? 7 : 4} fill={h === 3 ? 'currentColor' : 'var(--muted)'} opacity={h === 3 ? 1 : 0.55} />
      ))}
      {/* title block */}
      <g fontFamily="var(--mono)" fontSize="8" fill="var(--ink-2)">
        <rect x="230" y="400" width="120" height="40" fill="none" stroke="currentColor" />
        <path d="M230 414h120M290 414v26" stroke="currentColor" />
        <text x="236" y="410">RESUME · A4</text>
        <text x="236" y="430">REV 03</text>
        <text x="296" y="430">ATS 72</text>
      </g>
      {/* issue markers */}
      {issues.map((n, i) => {
        const [x, y] = markers[i % markers.length];
        return (
          <g key={n}>
            <rect x={x - 12} y={y - 12} width="24" height="24" fill="var(--brand)" />
            <text x={x} y={y + 4} textAnchor="middle" fontFamily="var(--mono)" fontSize="10" fill="#fff">{n}</text>
          </g>
        );
      })}
      <path d="M300 236v14" stroke="var(--brand)" strokeWidth="1.5" />
      <path d="M296 246l4 5 4-5" stroke="var(--brand)" strokeWidth="1.5" fill="none" />
    </svg>
  );
}

/* --- Isometric problem icons (light construction lines) --- */
const iconProps = { width: 170, height: 170, viewBox: '0 0 170 170', fill: 'none', stroke: 'currentColor', strokeWidth: 1 };

export function IconBlind() {
  const P = iso(85, 70, 1);
  return (
    <svg {...iconProps} aria-hidden="true">
      <circle cx="85" cy="88" r="62" />
      <polygon points={pts([P(-30, -30), P(30, -30), P(30, 30), P(-30, 30)])} />
      <polygon points={pts([P(-30, -30, -40), P(30, -30, -40), P(30, 30, -40), P(-30, 30, -40)])} strokeDasharray="4 4" />
      {[[-30, 30], [30, 30], [30, -30]].map(([x, y]) => <polyline key={`${x}${y}`} points={pts([P(x, y), P(x, y, -40)])} strokeDasharray="4 4" />)}
      <path d="M23 88h124M85 26v124" strokeDasharray="6 4" opacity="0.6" />
    </svg>
  );
}

export function IconFilter() {
  const P = iso(85, 40, 1);
  return (
    <svg {...iconProps} aria-hidden="true">
      <polygon points={pts([P(-40, -40), P(40, -40), P(40, 40), P(-40, 40)])} />
      <polygon points={pts([P(-12, -12, -70), P(12, -12, -70), P(12, 12, -70), P(-12, 12, -70)])} />
      {[[-40, -40, -12, -12], [40, -40, 12, -12], [40, 40, 12, 12], [-40, 40, -12, 12]].map(([a, b, c, d]) => (
        <polyline key={`${a}${b}`} points={pts([P(a, b), P(c, d, -70)])} strokeDasharray={a > 0 && b < 0 ? '4 4' : undefined} />
      ))}
      <polyline points={pts([P(0, 0, -70), P(0, 0, -100)])} strokeDasharray="3 3" />
      <rect x="81" y="148" width="8" height="8" />
    </svg>
  );
}

export function IconStack() {
  const P = iso(85, 50, 1);
  return (
    <svg {...iconProps} aria-hidden="true">
      {[0, -22, -44, -66].map((z, i) => (
        <g key={z} strokeDasharray={i === 3 ? '4 4' : undefined}>
          <polygon points={pts([P(-35, -45, z), P(35, -45, z), P(35, 45, z), P(-35, 45, z)])} />
          <polyline points={pts([P(-35, 45, z), P(-35, 45, z - 4), P(35, 45, z - 4), P(35, -45, z - 4), P(35, -45, z)])} />
        </g>
      ))}
    </svg>
  );
}

export function IconMismatch() {
  const P = iso(70, 70, 1);
  const Q = iso(100, 95, 1);
  const cube = (F, dash) => (
    <g strokeDasharray={dash}>
      <polygon points={pts([F(0, 0, 30), F(36, 0, 30), F(36, 36, 30), F(0, 36, 30)])} />
      <polyline points={pts([F(0, 36, 30), F(0, 36, -6), F(36, 36, -6), F(36, 0, -6), F(36, 0, 30)])} />
      <polyline points={pts([F(36, 36, 30), F(36, 36, -6)])} />
    </g>
  );
  return (
    <svg {...iconProps} aria-hidden="true">
      {cube(P)}
      {cube(Q, '4 4')}
      <path d="M30 150h110" strokeDasharray="6 4" opacity="0.6" />
    </svg>
  );
}

/** Large outlined wordmark with construction guides, used in the footer. */
export function Wordmark({ text = 'HIRESENSE' }) {
  return (
    <svg viewBox="0 0 1200 210" role="img" aria-label={text} preserveAspectRatio="xMidYMid meet">
      <g stroke="var(--line)" strokeWidth="1">
        <line x1="0" y1="30" x2="1200" y2="30" strokeDasharray="4 6" />
        <line x1="0" y1="180" x2="1200" y2="180" strokeDasharray="4 6" />
        <line x1="0" y1="105" x2="1200" y2="105" strokeDasharray="2 8" />
      </g>
      <text x="600" y="180" textAnchor="middle" textLength="1160" lengthAdjust="spacing"
        fontFamily="Inter Tight, sans-serif" fontWeight="800" fontSize="190"
        fill="none" stroke="currentColor" strokeWidth="1.4">
        {text}
      </text>
      <g stroke="currentColor" strokeWidth="1">
        {[20, 600, 1180].map((x) => (
          <g key={x}>
            <line x1={x - 6} y1="105" x2={x + 6} y2="105" />
            <line x1={x} y1="99" x2={x} y2="111" />
          </g>
        ))}
      </g>
    </svg>
  );
}

/** Small icons used in empty states and the dropzone. */
export function DocIcon({ className = 'icon' }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
      <path d="M16 6h22l12 12v40H16z" />
      <path d="M38 6v12h12" />
      <path d="M22 28h20M22 35h22M22 42h16" strokeDasharray="3 3" />
      <rect x="40" y="44" width="12" height="12" fill="var(--brand)" stroke="none" />
    </svg>
  );
}
