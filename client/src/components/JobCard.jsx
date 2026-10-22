import { Link } from 'react-router-dom';
import { ScoreRing, SkillChips } from './ui';
import { timeAgo, scoreLabel } from '../utils/format';

export function JobMeta({ job, long = false }) {
  const exp = job.minExperience > 0 ? `${job.minExperience}+ yrs` : long ? 'Freshers welcome' : null;
  return (
    <div className="job-meta">
      <span>{job.company}</span>
      <span>/ {job.location}</span>
      <span>/ {job.type}</span>
      {exp && <span>/ {exp}</span>}
      {job.salaryRange && <span>/ {job.salaryRange}</span>}
      <span>/ {timeAgo(job.createdAt)}</span>
    </div>
  );
}

export default function JobCard({ job, match, applied, actions, index }) {
  return (
    <article className="card job-card">
      {match && (
        <div className="stack center" style={{ gap: 6, alignItems: 'center' }}>
          <ScoreRing score={match.score} size={80} stroke={7} caption="match" />
          <span className="label">{scoreLabel(match.score)}</span>
        </div>
      )}
      <div className="job-main">
        <div className="row-between" style={{ alignItems: 'flex-start' }}>
          <h3>
            {index !== undefined && <span className="idx" style={{ marginRight: 8 }}>[{String(index + 1).padStart(2, '0')}]</span>}
            <Link to={`/jobs/${job._id}`}>{job.title}</Link>
          </h3>
          {applied && <span className="badge badge-good badge-dot">Applied</span>}
        </div>
        <JobMeta job={job} />
        {match ? (
          <div className="stack" style={{ gap: 8 }}>
            <SkillChips skills={match.matchedSkills} variant="match" empty="No required skills matched yet" />
            {match.missingSkills.length > 0 && <SkillChips skills={match.missingSkills} variant="miss" />}
          </div>
        ) : (
          <SkillChips skills={job.requiredSkills} />
        )}
        {actions && <div className="job-actions">{actions}</div>}
      </div>
    </article>
  );
}
