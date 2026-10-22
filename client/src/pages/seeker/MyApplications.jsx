import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errMsg } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { Empty, Loader, StatusBadge } from '../../components/ui';
import { formatDate, scoreColor } from '../../utils/format';

export default function MyApplications() {
  const toast = useToast();
  const [apps, setApps] = useState(null);

  const load = () => api.get('/applications/mine').then(({ data }) => setApps(data.applications)).catch((e) => toast(errMsg(e), 'error'));
  useEffect(() => {
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const withdraw = async (id) => {
    try {
      await api.delete(`/applications/${id}`);
      toast('Application withdrawn', 'success');
      load();
    } catch (err) {
      toast(errMsg(err), 'error');
    }
  };

  if (!apps) return <Loader />;

  return (
    <div className="container page">
      <div className="page-header">
        <div>
          <h1>My applications</h1>
          <p>Track the status of every job you have applied to.</p>
        </div>
      </div>
      <div className="card">
        {!apps.length ? (
          <Empty title="No applications yet">
            <Link to="/seeker/jobs" className="btn">Browse matched jobs</Link>
          </Empty>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Job</th>
                  <th>Applied</th>
                  <th className="num">Match</th>
                  <th>Scored by</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {apps.map((a) => (
                  <tr key={a._id}>
                    <td>
                      {a.job ? <Link to={`/jobs/${a.job._id}`}><strong>{a.job.title}</strong></Link> : <em>Job removed</em>}
                      <div className="small muted">{a.job?.company} · {a.job?.location}</div>
                    </td>
                    <td className="small">{formatDate(a.createdAt)}</td>
                    <td className="num" style={{ fontWeight: 700, color: scoreColor(a.matchScore) }}>{a.matchScore}%</td>
                    <td className="small"><span className="mono" style={{ fontSize: '0.72rem' }}>{a.matchBreakdown?.scoredBy === 'ollama' ? 'AI' : 'Rules'}</span></td>
                    <td><StatusBadge status={a.status} /></td>
                    <td>
                      <div className="row" style={{ gap: 6, flexWrap: 'nowrap' }}>
                        <Link to={`/applications/${a._id}`} className="btn btn-sm btn-outline">Details</Link>
                        {a.status === 'applied' && (
                          <button className="btn btn-sm btn-ghost" onClick={() => withdraw(a._id)}>Withdraw</button>
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
