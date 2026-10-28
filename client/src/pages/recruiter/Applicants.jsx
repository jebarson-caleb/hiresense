import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api, { errMsg } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { Empty, Loader, ScoreRing, SkillChips } from '../../components/ui';
import { formatDate, initials } from '../../utils/format';

const STATUSES = ['applied', 'shortlisted', 'rejected', 'hired'];

function StatusSelect({ value, onChange }) {
  return (
    <select className="input" style={{ width: 'auto', padding: '6px 8px' }} value={value} onChange={(e) => onChange(e.target.value)}
      aria-label="Application status">
      {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
    </select>
  );
}

export default function Applicants() {
  const { id } = useParams();
  const toast = useToast();
  const [tab, setTab] = useState('applicants');
  const [data, setData] = useState(null);
  const [filter, setFilter] = useState('');
  const [candidates, setCandidates] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get(`/applications/job/${id}`, { params: filter ? { status: filter } : {} })
      .then(({ data: d }) => setData(d))
      .catch((e) => setError(errMsg(e)));
  }, [id, filter]);

  useEffect(() => {
    if (tab !== 'discover' || candidates) return;
    api.get(`/jobs/${id}/candidates`).then(({ data: d }) => setCandidates(d.candidates)).catch((e) => toast(errMsg(e), 'error'));
  }, [tab, id, candidates, toast]);

  const updateStatus = async (appId, status) => {
    try {
      await api.patch(`/applications/${appId}/status`, { status });
      setData((d) => ({ ...d, applications: d.applications.map((a) => (a._id === appId ? { ...a, status } : a)) }));
      toast(`Marked as ${status}`, 'success');
    } catch (err) {
      toast(errMsg(err), 'error');
    }
  };

  if (error) return <div className="container page"><div className="form-error">{error}</div></div>;
  if (!data) return <Loader />;
  const { job, applications } = data;

  return (
    <div className="container page">
      <div className="page-header">
        <div>
          <Link to="/recruiter" className="link-arrow">← Dashboard</Link>
          <h1>{job.title}</h1>
          <p>{job.company} · {job.location} · {job.type}</p>
        </div>
        <div className="row">
          <Link to={`/jobs/${job._id}`} className="btn btn-outline">View post</Link>
          <Link to={`/recruiter/jobs/${job._id}/edit`} className="btn btn-outline">Edit</Link>
        </div>
      </div>

      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'applicants'} className={`tab ${tab === 'applicants' ? 'active' : ''}`} onClick={() => setTab('applicants')}>
          Applicants ({applications.length})
        </button>
        <button role="tab" aria-selected={tab === 'discover'} className={`tab ${tab === 'discover' ? 'active' : ''}`} onClick={() => setTab('discover')}>
          Discover candidates
        </button>
      </div>

      {tab === 'applicants' ? (
        <>
          <div className="filters">
            <select className="input" style={{ flex: '0 1 220px' }} value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter by status">
              <option value="">All statuses</option>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <span className="small muted" style={{ alignSelf: 'center' }}>Ranked by AI match score, best first.</span>
          </div>
          {!applications.length ? (
            <div className="card"><Empty title="No applicants yet">Try the Discover tab to find matching candidates.</Empty></div>
          ) : (
            <div className="stack" style={{ gap: 12 }}>
              {applications.map((a, i) => (
                <div key={a._id} className="card row" style={{ gap: 16, alignItems: 'flex-start' }}>
                  <div className="stack center" style={{ alignItems: 'center', gap: 2 }}>
                    <span className="idx">[{String(i + 1).padStart(2, "0")}]</span>
                    <ScoreRing score={a.matchScore} size={70} stroke={7} caption="match" />
                  </div>
                  <div className="grow" style={{ minWidth: 220 }}>
                    <div className="row" style={{ gap: 10 }}>
                      <span className="avatar">{initials(a.seeker?.name)}</span>
                      <div>
                        <strong>{a.seeker?.name}</strong>
                        <div className="small muted">{a.seeker?.headline || a.seeker?.email}</div>
                      </div>
                    </div>
                    <div className="small muted mt" style={{ marginTop: 8 }}>
                      {a.resume?.analysis?.experienceYears ?? 0} yrs exp · ATS {a.resume?.analysis?.atsScore ?? '-'} · applied {formatDate(a.createdAt)} ·{' '}
                      {(a.matchBreakdown?.scoredBy || 'fallback') !== 'fallback' ? 'AI-scored' : 'rule-scored'}
                    </div>
                    <div className="stack mt" style={{ gap: 6, marginTop: 10 }}>
                      <SkillChips skills={a.matchBreakdown?.matchedSkills || []} variant="match" empty="No required skills matched" />
                      {a.matchBreakdown?.missingSkills?.length > 0 && <SkillChips skills={a.matchBreakdown.missingSkills} variant="miss" />}
                    </div>
                  </div>
                  <div className="stack" style={{ gap: 8, alignItems: 'flex-end' }}>
                    <StatusSelect value={a.status} onChange={(s) => updateStatus(a._id, s)} />
                    <Link to={`/applications/${a._id}`} className="btn btn-sm btn-outline">Full profile</Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : !candidates ? (
        <Loader text="Scoring all candidates..." />
      ) : (
        <div className="card">
          <p className="small muted">
            Every job seeker's primary resume scored against this job (fast score). Use this to spot strong candidates who have not applied yet.
          </p>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th className="num">Match</th>
                  <th>Matched skills</th>
                  <th>Missing</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((c) => (
                  <tr key={c.resume._id}>
                    <td>
                      <strong>{c.candidate.name}</strong>
                      <div className="small muted">{c.candidate.headline || c.candidate.email}</div>
                    </td>
                    <td className="num"><ScoreRing score={c.match.score} size={46} stroke={5} /></td>
                    <td><SkillChips skills={c.match.matchedSkills} variant="match" empty="-" /></td>
                    <td><SkillChips skills={c.match.missingSkills} variant="miss" empty="-" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!candidates.length && <Empty title="No candidates with resumes yet" />}
        </div>
      )}
    </div>
  );
}
