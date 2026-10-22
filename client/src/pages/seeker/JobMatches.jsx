import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errMsg } from '../../api/client';
import JobCard from '../../components/JobCard';
import ApplyModal from '../../components/ApplyModal';
import { Empty, Loader } from '../../components/ui';

const TYPES = ['', 'Full-time', 'Part-time', 'Internship', 'Contract', 'Remote'];

export default function JobMatches() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ q: '', location: '', type: '' });
  const [minScore, setMinScore] = useState(0);
  const [applyJob, setApplyJob] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => {
      const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
      api
        .get('/jobs/matches', { params })
        .then(({ data: d }) => setData(d))
        .catch((e) => setError(errMsg(e)));
    }, 250);
    return () => clearTimeout(t);
  }, [filters]);

  const shown = useMemo(() => (data?.matches || []).filter((m) => m.match.score >= minScore), [data, minScore]);
  const set = (k) => (e) => setFilters({ ...filters, [k]: e.target.value });

  if (error) return <div className="container page"><div className="form-error">{error}</div></div>;
  if (!data) return <Loader text="Ranking jobs for you..." />;

  if (!data.resume) {
    return (
      <div className="container page">
        <div className="card">
          <Empty title="Upload a resume to see your matches">
            <Link to="/seeker/resume" className="btn">Upload resume</Link>
          </Empty>
        </div>
      </div>
    );
  }

  return (
    <div className="container page">
      <div className="page-header">
        <div>
          <h1>Job matches</h1>
          <p>
            Open jobs ranked against <strong>{data.resume.fileName}</strong>. Scores combine skill overlap (75%) and
            text similarity (25%). Open a job to get a deeper AI fit check.
          </p>
        </div>
      </div>

      <div className="filters">
        <input className="input" placeholder="Search title, company or skill" value={filters.q} onChange={set('q')} aria-label="Search" />
        <input className="input" placeholder="Location" value={filters.location} onChange={set('location')} aria-label="Location" />
        <select className="input" value={filters.type} onChange={set('type')} aria-label="Job type">
          {TYPES.map((t) => <option key={t} value={t}>{t || 'All types'}</option>)}
        </select>
        <select className="input" value={minScore} onChange={(e) => setMinScore(Number(e.target.value))} aria-label="Minimum match">
          {[0, 50, 70, 85].map((s) => <option key={s} value={s}>{s ? `Match ≥ ${s}%` : 'Any match'}</option>)}
        </select>
      </div>

      <p className="small muted">{shown.length} job{shown.length === 1 ? '' : 's'}</p>
      <div className="stack" style={{ gap: 14 }}>
        {shown.map(({ job, match, applied }) => (
          <JobCard
            key={job._id}
            job={job}
            match={match}
            applied={applied}
            actions={
              <>
                <Link to={`/jobs/${job._id}`} className="btn btn-sm btn-outline">Details & AI fit</Link>
                {!applied && <button className="btn btn-sm" onClick={() => setApplyJob(job)}>Apply</button>}
              </>
            }
          />
        ))}
        {!shown.length && <div className="card"><Empty title="No jobs match these filters" /></div>}
      </div>

      {applyJob && (
        <ApplyModal
          job={applyJob}
          onClose={() => setApplyJob(null)}
          onApplied={() =>
            setData((d) => ({ ...d, matches: d.matches.map((m) => (m.job._id === applyJob._id ? { ...m, applied: true } : m)) }))
          }
        />
      )}
    </div>
  );
}
