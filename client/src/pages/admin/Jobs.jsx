import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errMsg } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { Loader, StatusBadge } from '../../components/ui';
import { formatDate } from '../../utils/format';

export default function AdminJobs() {
  const toast = useToast();
  const [jobs, setJobs] = useState(null);
  const [q, setQ] = useState('');
  const [confirmId, setConfirmId] = useState(null);

  const load = () => api.get('/admin/jobs').then(({ data }) => setJobs(data.jobs)).catch((e) => toast(errMsg(e), 'error'));
  useEffect(() => {
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = async (job) => {
    try {
      const status = job.status === 'open' ? 'closed' : 'open';
      await api.patch(`/admin/jobs/${job._id}`, { status });
      setJobs((list) => list.map((j) => (j._id === job._id ? { ...j, status } : j)));
      toast(`Job ${status}`, 'success');
    } catch (err) {
      toast(errMsg(err), 'error');
    }
  };

  const remove = async (id) => {
    try {
      await api.delete(`/admin/jobs/${id}`);
      setJobs((list) => list.filter((j) => j._id !== id));
      toast('Job deleted', 'success');
    } catch (err) {
      toast(errMsg(err), 'error');
    } finally {
      setConfirmId(null);
    }
  };

  if (!jobs) return <Loader />;
  const needle = q.toLowerCase();
  const shown = jobs.filter((j) => !needle || `${j.title} ${j.company} ${j.location}`.toLowerCase().includes(needle));

  return (
    <div className="container page">
      <div className="page-header">
        <div>
          <h1>Job posts</h1>
          <p>Moderate all job posts on the platform.</p>
        </div>
      </div>
      <div className="filters">
        <input className="input" placeholder="Search title, company or location" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search jobs" />
      </div>
      <div className="card">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Job</th>
                <th>Recruiter</th>
                <th>Posted</th>
                <th className="num">Applicants</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {shown.map((j) => (
                <tr key={j._id}>
                  <td>
                    <Link to={`/jobs/${j._id}`}><strong>{j.title}</strong></Link>
                    <div className="small muted">{j.company} · {j.location}</div>
                  </td>
                  <td className="small">{j.recruiter?.name}<div className="muted">{j.recruiter?.email}</div></td>
                  <td className="small">{formatDate(j.createdAt)}</td>
                  <td className="num">{j.applicants}</td>
                  <td><StatusBadge status={j.status} /></td>
                  <td>
                    <div className="row" style={{ gap: 6, flexWrap: 'nowrap' }}>
                      <button className="btn btn-sm btn-outline" onClick={() => toggle(j)}>{j.status === 'open' ? 'Close' : 'Reopen'}</button>
                      {confirmId === j._id ? (
                        <>
                          <button className="btn btn-sm btn-danger" onClick={() => remove(j._id)}>Confirm</button>
                          <button className="btn btn-sm btn-ghost" onClick={() => setConfirmId(null)}>Cancel</button>
                        </>
                      ) : (
                        <button className="btn btn-sm btn-ghost" onClick={() => setConfirmId(j._id)}>Delete</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!shown.length && <p className="muted center">No jobs found.</p>}
        </div>
      </div>
    </div>
  );
}
