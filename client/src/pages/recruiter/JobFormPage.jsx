import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api, { errMsg } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import SkillInput from '../../components/SkillInput';
import { Loader } from '../../components/ui';

const TYPES = ['Full-time', 'Part-time', 'Internship', 'Contract', 'Remote'];

export default function JobFormPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState(
    id
      ? null
      : { title: '', company: user.company || '', location: '', type: 'Full-time', minExperience: 0, salaryRange: '', description: '', requiredSkills: [] }
  );
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.get(`/jobs/${id}`).then(({ data }) => setForm(data.job)).catch((e) => setError(errMsg(e)));
  }, [id]);

  if (!form) return error ? <div className="container page"><div className="form-error">{error}</div></div> : <Loader />;
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.requiredSkills.length) return setError('Add at least one required skill - it is the main signal for AI matching.');
    setBusy(true);
    try {
      const payload = { ...form, minExperience: Number(form.minExperience) || 0 };
      const { data } = id ? await api.put(`/jobs/${id}`, payload) : await api.post('/jobs', payload);
      toast(id ? 'Job updated' : 'Job posted', 'success');
      navigate(`/recruiter/jobs/${data.job._id}/applicants`);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container page" style={{ maxWidth: 820 }}>
      <div className="page-header">
        <div>
          <h1>{id ? 'Edit job' : 'Post a new job'}</h1>
          <p>Required skills drive the AI match score, so list the ones that really matter.</p>
        </div>
      </div>
      <form className="card" onSubmit={submit}>
        {error && <div className="form-error">{error}</div>}
        <div className="grid grid-2" style={{ gap: '0 18px' }}>
          <div className="field">
            <label htmlFor="title">Job title</label>
            <input id="title" required value={form.title} onChange={set('title')} placeholder="e.g. MERN Stack Developer" />
          </div>
          <div className="field">
            <label htmlFor="company">Company</label>
            <input id="company" required value={form.company} onChange={set('company')} />
          </div>
          <div className="field">
            <label htmlFor="location">Location</label>
            <input id="location" value={form.location} onChange={set('location')} placeholder="City or Remote" />
          </div>
          <div className="field">
            <label htmlFor="type">Job type</label>
            <select id="type" value={form.type} onChange={set('type')}>
              {TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="exp">Minimum experience (years)</label>
            <input id="exp" type="number" min="0" max="40" step="0.5" value={form.minExperience} onChange={set('minExperience')} />
          </div>
          <div className="field">
            <label htmlFor="salary">Salary range</label>
            <input id="salary" value={form.salaryRange} onChange={set('salaryRange')} placeholder="e.g. ₹6-10 LPA" />
          </div>
        </div>
        <div className="field">
          <label>Required skills</label>
          <SkillInput value={form.requiredSkills} onChange={(requiredSkills) => setForm({ ...form, requiredSkills })} />
          <span className="hint">Common spellings are normalised automatically (e.g. "reactjs" → React).</span>
        </div>
        <div className="field">
          <label htmlFor="desc">Job description</label>
          <textarea id="desc" required minLength={30} rows={8} value={form.description} onChange={set('description')}
            placeholder="Responsibilities, requirements, nice-to-haves..." />
        </div>
        {id && (
          <div className="field">
            <label htmlFor="status">Status</label>
            <select id="status" value={form.status} onChange={set('status')}>
              <option value="open">Open</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        )}
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-outline" onClick={() => navigate(-1)}>Cancel</button>
          <button className="btn" disabled={busy}>{busy && <span className="spinner spinner-sm" />} {id ? 'Save changes' : 'Publish job'}</button>
        </div>
      </form>
    </div>
  );
}
