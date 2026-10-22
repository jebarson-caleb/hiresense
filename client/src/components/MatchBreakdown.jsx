import { ScoreBar, ScoreRing, SkillChips } from './ui';
import { scoreLabel } from '../utils/format';

/** Shows how a match score was built: skill overlap, text similarity and the LLM's opinion. */
export default function MatchBreakdown({ score, breakdown }) {
  const b = breakdown || {};
  const ai = b.scoredBy === 'ollama';
  return (
    <div className="stack" style={{ gap: 18 }}>
      <div className="row" style={{ gap: 18, flexWrap: 'nowrap', alignItems: 'center' }}>
        <ScoreRing score={score} size={100} caption="match" />
        <div className="stack grow" style={{ gap: 10 }}>
          <span className={`badge ${ai ? 'badge-primary' : ''}`} style={{ alignSelf: 'flex-start' }}>
            {scoreLabel(score)} fit · {ai ? 'AI-scored' : 'rule-based'}
          </span>
          <ScoreBar label="Skill match" value={b.skillScore} />
          <ScoreBar label="Text similarity" value={b.textScore} />
          <ScoreBar label="AI fit" value={b.aiScore} hint="Ollama offline" />
        </div>
      </div>
      {b.aiReasoning && (
        <div className="ai-panel">
          <div className="ai-panel-head">HireSense AI<span className="mono">Reasoning</span></div>
          <div className="ai-panel-body small" style={{ color: 'var(--ink-2)' }}>{b.aiReasoning}</div>
        </div>
      )}
      <div>
        <div className="label" style={{ marginBottom: 8 }}>Matched skills</div>
        <SkillChips skills={b.matchedSkills || []} variant="match" empty="None of the required skills matched" />
      </div>
      <div>
        <div className="label" style={{ marginBottom: 8 }}>Missing skills</div>
        <SkillChips skills={b.missingSkills || []} variant="miss" empty="No gaps found" />
      </div>
    </div>
  );
}
