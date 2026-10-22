import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errMsg } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Empty, Loader, StatTile, StatusBadge } from '../../components/ui';
import { formatDate, scoreColor } from '../../utils/format';

export default function RecruiterDashboard() {
  const { user } = useAuth();
  const toast = useToast();
  const [jobs, setJobs] = useState(null);
  const [confirmId, setConfirmId] = useState(null);

  const load = () => api.get('/jobs/mine').then(({ data }) => setJobs(data.jobs)).catch((e) => toast(errMsg(e), 'error'));
  useEffect(() => {
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = async (job) => {
    try {
      await api.put(`/jobs/${job._id}`, { status: job.status === 'open' ? 'closed' : 'open' });
      toast(`Job ${job.status === 'open' ? 'closed' : 'reopened'}`, 'success');
      load();
    } catch (err) {
      toast(errMsg(err), 'error');
    }
  };

  const remove = async (job) => {
    try {
      await api.delete(`/jobs/${job._id}`);
      toast('Job and its applications deleted', 'success');
      load();
    } catch (err) {
      toast(errMsg(err), 'error');
    } finally {
      setConfirmId(null);
    }
  };

  if (!jobs) return <Loader />;
  const open = jobs.filter((j) => j.status === 'open').length;
  const applicants = jobs.reduce((s, j) => s + j.applicants, 0);
  const shortlisted = jobs.reduce((s, j) => s + j.shortlisted, 0);
  const scored = jobs.filter((j) => j.avgScore !== null);
  const avg = scored.length ? Math.round(scored.reduce((s, j) => s + j.avgScore, 0) / scored.length) : 0;

  return (
    <div className="container page">
      <div className="page-header">
        <div>
          <h1>Recruiter dashboard</h1>
          <p>{user.company || 'Your company'} · manage job posts and review AI-ranked applicants.</p>
        </div>
        <Link to="/recruiter/jobs/new" className="btn">+ Post a job</Link>
      </div>

      <div className="grid grid-4 mb">
        <StatTile index="01" color="var(--chart-3)" label="Open jobs" value={open} sub={`${jobs.length} total posts`} />
        <StatTile index="02" color="var(--chart-1)" label="Applicants" value={applicants} sub="across all jobs" />
        <StatTile index="03" color="var(--brand)" label="Shortlisted" value={shortlisted} />
        <StatTile index="04" color="var(--ink)" label="Avg match" value={applicants ? `${avg}%` : '-'} sub="applicant fit" />
      </div>

      <div className="card">
        <div className="card-title">
          <h2>My job posts</h2>
        </div>
        {!jobs.length ? (
          <Empty title="You have not posted any jobs yet">
            <Link to="/recruiter/jobs/new" className="btn">Post your first job</Link>
          </Empty>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Job</th>
                  <th>Posted</th>
                  <th className="num">Applicants</th>
                  <th className="num">Avg match</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {jobs.map((j) => (
                  <tr key={j._id}>
                    <td>
                      <Link to={`/recruiter/jobs/${j._id}/applicants`}><strong>{j.title}</strong></Link>
                      <div className="small muted">{j.location} · {j.type}</div>
                    </td>
                    <td className="small">{formatDate(j.createdAt)}</td>
                    <td className="num">{j.applicants}</td>
                    <td className="num" style={{ fontWeight: 700, color: j.avgScore !== null ? scoreColor(j.avgScore) : undefined }}>
                      {j.avgScore !== null ? `${j.avgScore}%` : '-'}
                    </td>
                    <td><StatusBadge status={j.status} /></td>
                    <td>
                      <div className="row" style={{ gap: 6, flexWrap: 'nowrap' }}>
                        <Link to={`/recruiter/jobs/${j._id}/applicants`} className="btn btn-sm">Applicants</Link>
                        <Link to={`/recruiter/jobs/${j._id}/edit`} className="btn btn-sm btn-outline">Edit</Link>
                        <button className="btn btn-sm btn-ghost" onClick={() => toggle(j)}>{j.status === 'open' ? 'Close' : 'Reopen'}</button>
                        {confirmId === j._id ? (
                          <>
                            <button className="btn btn-sm btn-danger" onClick={() => remove(j)}>Confirm delete</button>
                            <button className="btn btn-sm btn-ghost" onClick={() => setConfirmId(null)}>Cancel</button>
                          </>
                        ) : (
                          <button className="btn btn-sm btn-ghost" onClick={() => setConfirmId(j._id)} aria-label={`Delete ${j.title}`}>Delete</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
