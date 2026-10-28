import { Link } from 'react-router-dom';
import { Logo, Wordmark } from './Art';

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-grid">
        <div>
          <h2 style={{ fontSize: '1.6rem' }}>An AI agent that reads resumes like a recruiter</h2>
        </div>
        <div>
          <span className="label">Portal</span>
          <ul className="mt">
            <li><Link to="/">Home</Link></li>
            <li><Link to="/register">Create account</Link></li>
            <li><Link to="/login">Log in</Link></li>
          </ul>
        </div>
        <div>
          <span className="label">Product</span>
          <ul className="mt">
            <li><Link to="/register">Resume analyzer</Link></li>
            <li><Link to="/register">Job matching</Link></li>
            <li><Link to="/register">Recruiter dashboard</Link></li>
          </ul>
        </div>
        <div>
          <span className="label">Stack</span>
          <ul className="mt">
            <li>React · Vite</li>
            <li>Node.js · Express</li>
            <li>MongoDB · Groq / Ollama</li>
          </ul>
        </div>
        <div style={{ display: 'grid', placeItems: 'center' }}>
          <Logo size={110} className="" />
        </div>
      </div>
      <div className="wordmark">
        <Wordmark />
      </div>
      <div className="footer-bar">
        <span className="label">©{new Date().getFullYear()} HireSense. Web Technology project.</span>
        <span className="label">Resumes analysed locally · no data leaves the server</span>
      </div>
    </footer>
  );
}
