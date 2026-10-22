import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth, HOME_BY_ROLE } from '../context/AuthContext';
import { initials } from '../utils/format';
import AiStatus from './AiStatus';
import ThemeToggle from './ThemeToggle';
import { Logo } from './Art';

const LINKS = {
  seeker: [
    ['/seeker', 'Dashboard', true],
    ['/seeker/resume', 'My resume'],
    ['/seeker/jobs', 'Job matches'],
    ['/seeker/applications', 'Applications'],
  ],
  recruiter: [
    ['/recruiter', 'Dashboard', true],
    ['/recruiter/jobs/new', 'Post a job'],
  ],
  admin: [
    ['/admin', 'Overview', true],
    ['/admin/users', 'Users'],
    ['/admin/jobs', 'Jobs'],
  ],
};

export default function Navbar() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <Link to={user ? HOME_BY_ROLE[user.role] : '/'} className="brand">
          <Logo />
          HireSense
        </Link>

        <nav className={`nav-links ${open ? 'open' : ''}`} onClick={() => setOpen(false)} aria-label="Main">
          {user &&
            LINKS[user.role].map(([to, label, end]) => (
              <NavLink key={to} to={to} end={end}>
                {label}
              </NavLink>
            ))}
        </nav>
        {!user && <div className="grow" />}

        <div className="nav-right">
          <span className="hide-sm"><AiStatus compact /></span>
          <ThemeToggle />
          {user && (
            <>
              <span className="nav-user" title={`${user.email} (${user.role})`}>
                <span className="avatar">{initials(user.name)}</span>
                <span className="nav-name">{user.name.split(' ')[0]}</span>
              </span>
              <button className="btn btn-outline btn-sm nav-toggle" aria-label="Menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
                Menu
              </button>
            </>
          )}
        </div>
        {user ? (
          <button
            className="nav-cta"
            style={{ background: 'none', border: 0, borderLeft: '1px solid var(--line)', cursor: 'pointer', textAlign: 'left' }}
            onClick={() => {
              logout();
              navigate('/');
            }}
          >
            <span>Log out</span>
            <span>→</span>
          </button>
        ) : (
          <>
            <Link to="/login" className="nav-cta hide-sm" style={{ color: 'var(--ink-2)' }}>
              <span>Log in</span>
              <span>→</span>
            </Link>
            <Link to="/register" className="nav-cta">
              <span>Get started</span>
              <span>→</span>
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
