import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth, HOME_BY_ROLE } from '../context/AuthContext';
import { errMsg } from '../api/client';
import AuthArt from '../components/AuthArt';
import { ArrowLabel } from '../components/ui';

export default function Register() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'seeker', company: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={HOME_BY_ROLE[user.role]} replace />;
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const u = await register(form);
      navigate(u.role === 'seeker' ? '/seeker/resume' : HOME_BY_ROLE[u.role], { replace: true });
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap">
      <AuthArt eyebrow="[ Get started ]" title="Built for everyone in the hiring loop" />
      <div className="auth-form">
        <div className="auth-card">
          <span className="eyebrow">[01] Create account</span>
          <h2 style={{ fontSize: '2rem' }}>Join HireSense</h2>
          <p className="muted mb">Choose how you will use the portal.</p>
          {error && <div className="form-error">{error}</div>}
          <form onSubmit={submit}>
            <div className="role-pick" role="radiogroup" aria-label="Account type">
              {[
                ['seeker', 'Job seeker', 'Analyse resume, find jobs'],
                ['recruiter', 'Recruiter', 'Post jobs, rank applicants'],
              ].map(([role, title, sub], i) => (
                <button key={role} type="button" role="radio" aria-checked={form.role === role}
                  className={`role-option ${form.role === role ? 'selected' : ''}`}
                  onClick={() => setForm({ ...form, role })}>
                  <span className="idx" style={{ color: 'inherit', opacity: 0.7 }}>[0{i + 1}]</span>
                  <strong>{title}</strong>
                  <span className="small muted">{sub}</span>
                </button>
              ))}
            </div>
            <div className="field">
              <label htmlFor="name">Full name</label>
              <input id="name" required value={form.name} onChange={set('name')} autoComplete="name" />
            </div>
            {form.role === 'recruiter' && (
              <div className="field">
                <label htmlFor="company">Company</label>
                <input id="company" required value={form.company} onChange={set('company')} autoComplete="organization" />
              </div>
            )}
            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" type="email" required value={form.email} onChange={set('email')} autoComplete="email" />
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <input id="password" type="password" required minLength={6} value={form.password} onChange={set('password')}
                autoComplete="new-password" />
              <span className="hint">At least 6 characters.</span>
            </div>
            <button className="btn btn-brand btn-block btn-lg" disabled={busy}>
              {busy ? <span className="btn-label"><span className="spinner spinner-sm" /> Creating</span> : <ArrowLabel>Create account</ArrowLabel>}
            </button>
          </form>
          <p className="small mt">
            Already registered? <Link to="/login">Log in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
