import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api, { errMsg } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import MatchBreakdown from '../../components/MatchBreakdown';
import { AnalyzedByBadge, List, Loader, ScoreRing, SkillChips, StatusBadge } from '../../components/ui';
import { formatDate, initials } from '../../utils/format';

/** One application in detail. Recruiters can change status, re-score and download; seekers see a read-only view. */
export default function CandidateView() {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [app, setApp] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  useEffect(() => {
    api.get(`/applications/${id}`).then(({ data }) => setApp(data.application)).catch((e) => setError(errMsg(e)));
  }, [id]);

  const run = async (key, fn) => {
    setBusy(key);
    try {
      await fn();
    } catch (err) {
      toast(errMsg(err), 'error');
    } finally {
      setBusy('');
    }
  };

  const setStatus = (status) =>
    run('status', async () => {
      const { data } = await api.patch(`/applications/${id}/status`, { status });
      setApp((a) => ({ ...a, status: data.application.status }));
      toast(`Marked as ${status}`, 'success');
    });

  const rescore = () =>
    run('rescore', async () => {
      const { data } = await api.post(`/applications/${id}/rescore`);
      setApp((a) => ({ ...a, matchScore: data.application.matchScore, matchBreakdown: data.application.matchBreakdown }));
      toast(data.application.matchBreakdown.scoredBy === 'ollama' ? 'Re-scored with AI' : 'AI offline - re-scored with rules', 'success');
    });

  const download = () =>
    run('download', async () => {
      const res = await api.get(`/applications/${id}/resume-file`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = app.resume.fileName;
      a.click();
      URL.revokeObjectURL(url);
    });

  if (error) return <div className="container page"><div className="form-error">{error}</div></div>;
  if (!app) return <Loader />;

  const isRecruiter = user.role !== 'seeker';
  const r = app.resume?.analysis || {};

  return (
    <div className="container page">
      <button className="btn btn-ghost btn-sm mb" onClick={() => navigate(-1)}>← Back</button>
      <div className="page-header">
        <div className="row" style={{ gap: 14 }}>
          <span className="avatar" style={{ width: 52, height: 52, fontSize: '1.1rem' }}>{initials(app.seeker?.name)}</span>
          <div>
            <h1 style={{ marginBottom: 2 }}>{isRecruiter ? app.seeker?.name : app.job?.title}</h1>
            <p>
              {isRecruiter ? <>{app.seeker?.email} · applied for <Link to={`/jobs/${app.job?._id}`}>{app.job?.title}</Link></> : app.job?.company}
              {' · '}{formatDate(app.createdAt)} <StatusBadge status={app.status} />
            </p>
          </div>
        </div>
        {isRecruiter && (
          <div className="row">
            {['shortlisted', 'rejected', 'hired'].map((s) => (
              <button key={s} className={`btn btn-sm ${s === 'rejected' ? 'btn-outline' : ''}`} disabled={busy === 'status' || app.status === s}
                onClick={() => setStatus(s)}>
                {s === 'shortlisted' ? 'Shortlist' : s === 'hired' ? 'Hire' : 'Reject'}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-side">
        <div className="stack" style={{ gap: 18 }}>
          <div className="card">
            <div className="card-title">
              <h2>Resume analysis</h2>
              <AnalyzedByBadge by={app.resume?.analyzedBy} model={app.resume?.model} />
            </div>
            <div className="row" style={{ gap: 18, alignItems: 'center' }}>
              <ScoreRing score={r.atsScore} size={92} caption="ATS" />
              <p className="grow" style={{ margin: 0, minWidth: 200 }}>{r.summary}</p>
            </div>
            <div className="divider" />
            <dl className="kv">
              <dt>Experience</dt>
              <dd>{r.experienceYears ? `${r.experienceYears} years` : 'Fresher'}</dd>
              <dt>Education</dt>
              <dd>{r.education?.join('; ') || '-'}</dd>
              <dt>Fits roles</dt>
              <dd>{r.suggestedRoles?.join(', ') || '-'}</dd>
              <dt>Resume file</dt>
              <dd>
                {app.resume?.fileName}{' '}
                {isRecruiter && app.resume?.filePath && (
                  <button className="btn btn-sm btn-outline" onClick={download} disabled={busy === 'download'}>Download</button>
                )}
              </dd>
            </dl>
            <div className="divider" />
            <h3>Skills</h3>
            <SkillChips skills={r.skills || []} />
          </div>
          <div className="grid grid-2">
            <div className="card">
              <h3>Strengths</h3>
              <List items={r.strengths} kind="good" />
            </div>
            <div className="card">
              <h3>Weaknesses</h3>
              <List items={r.weaknesses} kind="bad" />
            </div>
          </div>
        </div>

        <div className="stack" style={{ gap: 18 }}>
          <div className="card">
            <div className="card-title">
              <h3>Match for this job</h3>
              {isRecruiter && (
                <button className="btn btn-sm btn-outline" onClick={rescore} disabled={busy === 'rescore'} title="Re-run scoring with the local LLM">
                  {busy === 'rescore' ? 'Scoring...' : '↻ Re-score'}
                </button>
              )}
            </div>
            <MatchBreakdown score={app.matchScore} breakdown={app.matchBreakdown} />
          </div>
          <div className="card">
            <h3>Cover note</h3>
            <p className="small" style={{ whiteSpace: 'pre-line', margin: 0 }}>{app.coverNote || <span className="muted">No cover note provided.</span>}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
