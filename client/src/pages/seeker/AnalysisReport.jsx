import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api, { errMsg } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { AnalyzedByBadge, ArrowLabel, List, Loader, Panel, ScoreRing, SkillChips, StatTile } from '../../components/ui';
import { ResumeBlueprint } from '../../components/Art';
import { formatDate, scoreLabel } from '../../utils/format';

export default function AnalysisReport() {
  const { id } = useParams();
  const toast = useToast();
  const [resume, setResume] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get(`/resumes/${id}`).then(({ data }) => setResume(data.resume)).catch((e) => setError(errMsg(e)));
  }, [id]);

  const reanalyze = async () => {
    setBusy(true);
    try {
      const { data } = await api.post(`/resumes/${id}/reanalyze`);
      setResume(data.resume);
      toast(data.aiError ? 'AI unavailable - refreshed with rule-based analysis' : 'Re-analysed with AI', data.aiError ? 'info' : 'success');
    } catch (err) {
      toast(errMsg(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  if (error) return <div className="container page"><div className="form-error">{error}</div></div>;
  if (!resume) return <Loader text="Loading analysis" />;
  const a = resume.analysis;
  // Pair each weakness with a suggestion so issues read as "problem -> suggested fix".
  const issues = a.weaknesses.map((w, i) => ({ issue: w, fix: a.suggestions[i] }));
  const extraFixes = a.suggestions.slice(issues.length);

  return (
    <div className="container page">
      <div className="page-header">
        <div>
          <Link to="/seeker/resume" className="link-arrow">← My resumes</Link>
          <h1 className="mt">Resume analysis</h1>
          <div className="row" style={{ gap: 8 }}>
            <span className="label">{resume.fileName}</span>
            <span className="label muted">/ analysed {formatDate(resume.updatedAt)}</span>
            <AnalyzedByBadge by={resume.analyzedBy} model={resume.model} />
          </div>
        </div>
        <div className="row">
          <button className="btn btn-outline" onClick={reanalyze} disabled={busy}>
            {busy ? <><span className="spinner" /> Analysing</> : 'Re-analyse'}
          </button>
          <Link to="/seeker/jobs" className="btn btn-brand"><ArrowLabel>Find matching jobs</ArrowLabel></Link>
        </div>
      </div>

      <div className="grid grid-4 mb">
        <StatTile index="01" label="ATS score" value={a.atsScore} sub={`${scoreLabel(a.atsScore)} resume`} color="var(--brand)" />
        <StatTile index="02" label="Skills" value={a.skills.length} sub="recognised" color="var(--chart-3)" />
        <StatTile index="03" label="Experience" value={a.experienceYears ? `${a.experienceYears}y` : '0'} sub={a.experienceYears ? 'years' : 'fresher'} color="var(--chart-1)" />
        <StatTile index="04" label="Issues" value={a.weaknesses.length} sub={`${a.suggestions.length} suggested fixes`} color="var(--ink)" />
      </div>

      <div className="grid grid-side mb">
        <Panel index="05" title="Summary">
          <div className="row" style={{ gap: 24, alignItems: 'center' }}>
            <ScoreRing score={a.atsScore} size={128} stroke={10} caption="ATS score" />
            <div className="grow" style={{ minWidth: 220 }}>
              <p style={{ color: 'var(--ink)', fontSize: '1.05rem' }}>{a.summary}</p>
              {a.suggestedRoles.length > 0 && (
                <div className="row" style={{ gap: 6 }}>
                  <span className="label">Best fit:</span>
                  {a.suggestedRoles.map((r) => <span key={r} className="badge badge-solid">{r}</span>)}
                </div>
              )}
            </div>
          </div>
        </Panel>
        <Panel index="06" title="Profile">
          <dl className="kv">
            <dt>Experience</dt>
            <dd>{a.experienceYears ? `${a.experienceYears} years` : 'Fresher / not stated'}</dd>
            <dt>Education</dt>
            <dd>
              {a.education.length ? a.education.map((e) => <div key={e}>{e}</div>) : <span className="muted">Not detected</span>}
            </dd>
          </dl>
        </Panel>
      </div>

      <Panel index="07" title="Skills detected" style={{ marginBottom: 18 }}>
        <SkillChips skills={a.skills} />
      </Panel>

      <div className="grid grid-side">
        <div className="stack" style={{ gap: 22 }}>
          <div className="row-between">
            <h2 style={{ margin: 0 }}>Issues & AI-suggested fixes</h2>
            <span className="label">{issues.length} flagged</span>
          </div>
          {issues.length ? (
            issues.map(({ issue, fix }, i) => (
              <div key={i} className="ai-panel">
                <div className="ai-panel-head">HireSense AI<span className="mono">{resume.analyzedBy === 'ollama' ? resume.model : 'rules'}</span></div>
                <div className="ai-panel-body">
                  <span className="issue-tag">Issue #{String(i + 1).padStart(2, '0')}</span>
                  <h3 style={{ margin: '4px 0 0', fontSize: '1.1rem' }}>{issue}</h3>
                  {fix && (
                    <div className="fix-box">
                      <span className="label">AI-suggested fix</span>
                      <ul><li>{fix}</li></ul>
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <>
              <div className="callout">No issues flagged. This resume covers the essentials well.</div>
              <Panel title="Strengths">
                <List items={a.strengths} kind="good" />
              </Panel>
            </>
          )}
          {extraFixes.length > 0 && (
            <Panel title="More suggestions">
              <List items={extraFixes} kind="tip" />
            </Panel>
          )}
        </div>
        <div className="stack" style={{ gap: 18 }}>
          <div className="card blueprint" style={{ display: 'grid', placeItems: 'center' }}>
            <ResumeBlueprint issues={issues.slice(0, 3).map((_, i) => `0${i + 1}`)} />
          </div>
          {issues.length > 0 && (
            <Panel title="Strengths">
              <List items={a.strengths} kind="good" />
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}
