import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, HOME_BY_ROLE } from '../context/AuthContext';
import { errMsg } from '../api/client';
import AuthArt from '../components/AuthArt';
import { ArrowLabel } from '../components/ui';

const DEMO = [
  ['Seeker', 'seeker@demo.com'],
  ['Fresher', 'fresher@demo.com'],
  ['Recruiter', 'recruiter@demo.com'],
  ['Admin', 'admin@demo.com'],
];

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={HOME_BY_ROLE[user.role]} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const u = await login(form.email, form.password);
      navigate(location.state?.from || HOME_BY_ROLE[u.role], { replace: true });
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap">
      <AuthArt eyebrow="[ Welcome back ]" title="Your resume, read like a recruiter would" />
      <div className="auth-form">
        <div className="auth-card">
          <span className="eyebrow">[01] Log in</span>
          <h2 style={{ fontSize: '2rem' }}>Log in to HireSense</h2>
          <p className="muted mb">Continue to your dashboard.</p>
          {error && <div className="form-error">{error}</div>}
          <form onSubmit={submit}>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" type="email" required autoComplete="email" value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <input id="password" type="password" required autoComplete="current-password" value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </div>
            <button className="btn btn-brand btn-block btn-lg" disabled={busy}>
              {busy ? <span className="btn-label"><span className="spinner spinner-sm" /> Logging in</span> : <ArrowLabel>Log in</ArrowLabel>}
            </button>
          </form>
          <p className="small mt">
            New here? <Link to="/register">Create an account</Link>
          </p>
          <div className="divider" />
          <div className="demo-accounts">
            <span className="label">Demo accounts · password <code>password123</code></span>
            <div className="row">
              {DEMO.map(([label, email]) => (
                <button key={email} type="button" className="btn btn-outline btn-sm"
                  onClick={() => setForm({ email, password: 'password123' })}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
