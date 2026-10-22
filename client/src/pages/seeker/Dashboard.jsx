import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errMsg } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Empty, Loader, ScoreRing, SkillChips, StatTile, AnalyzedByBadge, StatusBadge } from '../../components/ui';
import JobCard from '../../components/JobCard';
import { timeAgo } from '../../utils/format';

export default function SeekerDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.get('/jobs/matches'), api.get('/applications/mine')])
      .then(([m, a]) => setData({ resume: m.data.resume, matches: m.data.matches, applications: a.data.applications }))
      .catch((err) => setError(errMsg(err)));
  }, []);

  if (error) return <div className="container page"><div className="form-error">{error}</div></div>;
  if (!data) return <Loader />;

  const { resume, matches, applications } = data;
  const a = resume?.analysis;
  const strong = matches.filter((m) => m.match.score >= 70).length;
  const shortlisted = applications.filter((x) => x.status === 'shortlisted' || x.status === 'hired').length;

  return (
    <div className="container page">
      <div className="page-header">
        <div>
          <h1>Hi, {user.name.split(' ')[0]}</h1>
          <p>Here is how your profile is performing.</p>
        </div>
        <Link to="/seeker/resume" className="btn">{resume ? 'Upload new resume' : 'Upload resume'}</Link>
      </div>

      {!resume ? (
        <div className="card">
          <Empty title="Upload your resume to get started">
            <p>The AI will analyse it, give you an ATS score and match you with open jobs.</p>
            <Link to="/seeker/resume" className="btn">Upload resume</Link>
          </Empty>
        </div>
      ) : (
        <>
          <div className="grid grid-4 mb">
            <StatTile index="01" color="var(--brand)" label="ATS score" value={`${a.atsScore}/100`} sub="Resume quality" />
            <StatTile index="02" color="var(--chart-3)" label="Skills found" value={a.skills.length} sub={`${a.experienceYears} yrs experience`} />
            <StatTile index="03" color="var(--chart-1)" label="Strong matches" value={strong} sub={`of ${matches.length} open jobs ≥ 70%`} />
            <StatTile index="04" color="var(--ink)" label="Applications" value={applications.length} sub={`${shortlisted} shortlisted / hired`} />
          </div>

          <div className="grid grid-side">
            <div className="stack" style={{ gap: 18 }}>
              <div className="card-head" style={{ marginBottom: 0 }}>
                <h2>Top job matches</h2>
                <Link to="/seeker/jobs">See all →</Link>
              </div>
              {matches.slice(0, 4).map(({ job, match, applied }) => (
                <JobCard key={job._id} job={job} match={match} applied={applied}
                  actions={<Link className="btn btn-sm btn-outline" to={`/jobs/${job._id}`}>View & check AI fit</Link>} />
              ))}
              {!matches.length && <div className="card"><Empty title="No open jobs right now" /></div>}
            </div>

            <div className="stack" style={{ gap: 18 }}>
              <div className="card">
                <div className="card-title">
                  <h3>Resume snapshot</h3>
                  <AnalyzedByBadge by={resume.analyzedBy} model={resume.model} />
                </div>
                <div className="row" style={{ gap: 16, alignItems: 'center', flexWrap: 'nowrap' }}>
                  <ScoreRing score={a.atsScore} size={88} caption="ATS" />
                  <div className="small" style={{ minWidth: 0 }}>
                    <strong style={{ wordBreak: 'break-word' }}>{resume.fileName}</strong>
                    <div className="muted">Uploaded {timeAgo(resume.createdAt)}</div>
                    {a.suggestedRoles?.length > 0 && <div className="mt">Best fit: {a.suggestedRoles.join(', ')}</div>}
                  </div>
                </div>
                <div className="divider" />
                <SkillChips skills={a.skills.slice(0, 12)} />
                <Link to={`/seeker/resume/${resume._id}`} className="btn btn-outline btn-block mt">View full analysis</Link>
              </div>

              <div className="card">
                <div className="card-title">
                  <h3>Recent applications</h3>
                  <Link to="/seeker/applications" className="small">All</Link>
                </div>
                {applications.length ? (
                  <ul className="list">
                    {applications.slice(0, 5).map((ap) => (
                      <li key={ap._id} style={{ justifyContent: 'space-between' }}>
                        <span className="small">
                          <strong>{ap.job?.title || 'Deleted job'}</strong>
                          <br />
                          <span className="muted">{ap.job?.company} · {ap.matchScore}% match</span>
                        </span>
                        <StatusBadge status={ap.status} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted small">You have not applied to any jobs yet.</p>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
