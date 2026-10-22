import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api, { errMsg } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import ApplyModal from '../components/ApplyModal';
import MatchBreakdown from '../components/MatchBreakdown';
import { Loader, SkillChips, StatusBadge } from '../components/ui';
import { JobMeta } from '../components/JobCard';
import { formatDate } from '../utils/format';

export default function JobDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [application, setApplication] = useState(null);
  const [error, setError] = useState('');
  const [fit, setFit] = useState(null);
  const [fitBusy, setFitBusy] = useState(false);
  const [applyOpen, setApplyOpen] = useState(false);

  useEffect(() => {
    api
      .get(`/jobs/${id}`)
      .then(({ data }) => {
        setJob(data.job);
        setApplication(data.application);
      })
      .catch((e) => setError(errMsg(e)));
  }, [id]);

  const checkFit = async () => {
    setFitBusy(true);
    try {
      const { data } = await api.get(`/jobs/${id}/fit`);
      setFit(data.match);
    } catch (err) {
      toast(errMsg(err), 'error');
    } finally {
      setFitBusy(false);
    }
  };

  if (error) return <div className="container page"><div className="form-error">{error}</div></div>;
  if (!job) return <Loader />;

  const isSeeker = user.role === 'seeker';
  const isOwner = user.role === 'admin' || job.recruiter?._id === user._id;

  return (
    <div className="container page">
      <button className="btn btn-ghost btn-sm mb" onClick={() => navigate(-1)}>← Back</button>
      <div className="grid grid-side">
        <div className="card">
          <div className="row-between">
            <h1 style={{ marginBottom: 4 }}>{job.title}</h1>
            <StatusBadge status={job.status} />
          </div>
          <JobMeta job={job} long />
          <div className="divider" />
          <span className="label">Required skills</span>
          <div className="mt" style={{ marginTop: 10 }} />
          <SkillChips skills={job.requiredSkills} />
          <div className="divider" />
          <span className="label">About the role</span>
          <p style={{ whiteSpace: 'pre-line', color: 'var(--ink-2)', marginTop: 10 }}>{job.description}</p>
          {job.recruiter && <p className="label muted">Posted by {job.recruiter.name} · {formatDate(job.createdAt)}</p>}
          {isOwner && (
            <div className="row mt">
              <Link to={`/recruiter/jobs/${job._id}/applicants`} className="btn">View applicants</Link>
              <Link to={`/recruiter/jobs/${job._id}/edit`} className="btn btn-outline">Edit job</Link>
            </div>
          )}
        </div>

        {isSeeker && (
          <div className="stack" style={{ gap: 18 }}>
            <div className="card">
              <h3>Your application</h3>
              {application ? (
                <>
                  <p className="small">
                    Applied {formatDate(application.createdAt)} · <StatusBadge status={application.status} />
                  </p>
                  <MatchBreakdown score={application.matchScore} breakdown={application.matchBreakdown} />
                </>
              ) : job.status === 'open' ? (
                <>
                  <p className="small muted">Your primary resume will be scored against this job when you apply.</p>
                  <button className="btn btn-block" onClick={() => setApplyOpen(true)}>Apply now</button>
                </>
              ) : (
                <p className="muted small">This job is closed.</p>
              )}
            </div>

            {!application && (
              <div className="card">
                <h3>AI fit check</h3>
                {fit ? (
                  <MatchBreakdown score={fit.score} breakdown={fit} />
                ) : (
                  <>
                    <p className="small muted">
                      Ask the local LLM to compare your resume with this job and explain the result. This can take a few
                      seconds.
                    </p>
                    <button className="btn btn-outline btn-block" onClick={checkFit} disabled={fitBusy}>
                      {fitBusy ? <><span className="spinner" style={{ width: 15, height: 15, borderWidth: 2 }} /> Thinking...</> : 'Check my fit'}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {applyOpen && <ApplyModal job={job} onClose={() => setApplyOpen(false)} onApplied={setApplication} />}
    </div>
  );
}
