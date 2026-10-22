import { useEffect, useState } from 'react';
import api, { errMsg } from '../../api/client';
import { BarChart, DoughnutChart } from '../../components/Charts';
import { Loader, StatTile } from '../../components/ui';

const sum = (obj = {}) => Object.values(obj).reduce((s, n) => s + n, 0);
const STATUS_ORDER = ['applied', 'shortlisted', 'hired', 'rejected'];

export default function AdminDashboard() {
  const [s, setS] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/admin/stats').then(({ data }) => setS(data)).catch((e) => setError(errMsg(e)));
  }, []);

  if (error) return <div className="container page"><div className="form-error">{error}</div></div>;
  if (!s) return <Loader />;

  const aiReady = s.ai.online && s.ai.modelAvailable;
  const statusLabels = STATUS_ORDER.filter((k) => s.applications[k]);

  return (
    <div className="container page">
      <div className="page-header">
        <div>
          <h1>Platform overview</h1>
          <p>Live statistics across job seekers, recruiters, jobs and AI analysis.</p>
        </div>
      </div>

      <div className="grid grid-4 mb">
        <StatTile index="01" color="var(--chart-1)" label="Users" value={sum(s.users)} sub={`${s.users.seeker || 0} seekers · ${s.users.recruiter || 0} recruiters · ${s.users.admin || 0} admins`} />
        <StatTile index="02" color="var(--chart-3)" label="Jobs" value={sum(s.jobs)} sub={`${s.jobs.open || 0} open · ${s.jobs.closed || 0} closed`} />
        <StatTile index="03" color="var(--brand)" label="Applications" value={sum(s.applications)} sub={`avg match ${s.avgMatchScore}%`} />
        <StatTile index="04" color="var(--ink)" label="Resumes analysed" value={sum(s.resumes)} sub={`${s.resumes.ollama || 0} by AI · ${s.resumes.fallback || 0} by rules · avg ATS ${s.avgAtsScore}`} />
      </div>

      <div className={`callout mb ${aiReady ? '' : 'callout-warn'}`}>
        <strong>{aiReady ? 'Local LLM online' : 'Running on rule-based fallback'}: </strong>
        {s.ai.message}
        {s.ai.models?.length > 0 && <span className="muted"> · installed models: {s.ai.models.join(', ')}</span>}
      </div>

      <div className="grid grid-2 mb">
        <div className="card">
          <h3>New sign-ups · last 14 days</h3>
          <BarChart
            label="Sign-ups"
            labels={s.signups.map((d) => new Date(d.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }))}
            values={s.signups.map((d) => d.count)}
          />
        </div>
        <div className="card">
          <h3>Applications by status</h3>
          {statusLabels.length ? (
            <DoughnutChart labels={statusLabels} values={statusLabels.map((k) => s.applications[k])} />
          ) : (
            <p className="muted">No applications yet.</p>
          )}
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h3>Top candidate skills</h3>
          <p className="small muted">Most common skills across seekers' primary resumes</p>
          <BarChart horizontal label="Resumes" labels={s.topSkills.map((x) => x.skill)} values={s.topSkills.map((x) => x.count)} />
        </div>
        <div className="card">
          <h3>Most demanded skills</h3>
          <p className="small muted">Most requested skills across open job posts</p>
          <BarChart horizontal color="brand" label="Jobs" labels={s.demandSkills.map((x) => x.skill)} values={s.demandSkills.map((x) => x.count)} />
        </div>
      </div>
    </div>
  );
}
