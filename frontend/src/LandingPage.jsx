import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import './LandingPage.css';

function LandingPage() {
  const navigate = useNavigate();
  const { user, login, register } = useAuth();
  const [authMode, setAuthMode] = useState(null); // null | 'login' | 'register'
  const [form, setForm] = useState({ email: '', password: '', name: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // If already logged in, redirect
  if (user) {
    navigate('/dashboard');
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (authMode === 'login') {
        await login(form.email, form.password);
      } else {
        if (!form.name.trim()) { setError('Name is required'); setLoading(false); return; }
        await register(form.email, form.name, form.password);
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const featuresRef = React.useRef(null);
  const scrollToFeatures = () => {
    featuresRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="landing-container">
      <nav className="landing-nav">
        <div className="logo">Agentic Apply</div>
        <button className="btn-secondary" onClick={() => setAuthMode('login')}>Log In</button>
      </nav>

      <main className="hero">
        <div className="hero-content">
          <div className="badge-new">✨ AI-Powered Agent</div>
          <h1 className="hero-title">
            Your Personal <br />
            <span className="gradient-text">Job Hunting Assistant</span>
          </h1>
          <p className="hero-subtitle">
            Automate your job search. Our AI-powered agent parses your resume, writes dynamic cover letters, and applies to jobs on your behalf—all while tracking everything in Google Sheets.
          </p>
          <div className="hero-cta">
            <button className="btn-primary btn-large" onClick={() => setAuthMode('register')}>
              Get Started for Free
            </button>
            <button className="btn-secondary btn-large" onClick={scrollToFeatures}>View Features</button>
          </div>
          
          <div className="hero-stats">
            <div className="stat">
              <span className="stat-num">Auto-Apply</span>
              <span className="stat-label">Hands-free applications</span>
            </div>
            <div className="stat">
              <span className="stat-num">AI Chat</span>
              <span className="stat-label">Resume advisor built-in</span>
            </div>
            <div className="stat">
              <span className="stat-num">Open Source</span>
              <span className="stat-label">Self-host or use cloud</span>
            </div>
          </div>
        </div>

        <div className="hero-visual">
          {authMode ? (
            <div className="glass-panel auth-panel">
              <h2>{authMode === 'login' ? 'Welcome Back' : 'Create Account'}</h2>
              <p style={{color: 'var(--text-muted)', marginBottom: '1.5rem'}}>
                {authMode === 'login' ? 'Log in to your dashboard' : 'Start automating your job search'}
              </p>
              
              {error && <div className="auth-error">{error}</div>}
              
              <form onSubmit={handleSubmit}>
                {authMode === 'register' && (
                  <div className="form-group">
                    <label>Full Name</label>
                    <input type="text" placeholder="John Doe" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                  </div>
                )}
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" placeholder="you@example.com" required value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Password</label>
                  <input type="password" placeholder="••••••••" required minLength={6} value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
                </div>
                <button type="submit" className="btn-primary" style={{width: '100%', marginTop: '0.5rem'}} disabled={loading}>
                  {loading ? 'Please wait...' : (authMode === 'login' ? 'Log In' : 'Create Account')}
                </button>
              </form>
              
              <div className="auth-divider">
                <span>or</span>
              </div>
              
              <button className="btn-google" onClick={() => alert('Google SSO requires a Google Cloud Client ID configured for your domain. For local use, register with email.')}>
                <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                Continue with Google
              </button>
              
              <p style={{textAlign: 'center', marginTop: '1rem', color: 'var(--text-muted)', fontSize: '0.875rem'}}>
                {authMode === 'login' ? (
                  <>Don't have an account? <span className="auth-link" onClick={() => { setAuthMode('register'); setError(''); }}>Sign up</span></>
                ) : (
                  <>Already have an account? <span className="auth-link" onClick={() => { setAuthMode('login'); setError(''); }}>Log in</span></>
                )}
              </p>
            </div>
          ) : (
            <>
              <div className="glass-panel main-panel">
                <div className="mockup-header">
                  <div className="dots"><span></span><span></span><span></span></div>
                  <div className="mockup-title">Agentic Dashboard</div>
                </div>
                <div className="mockup-body">
                  <div className="mockup-card">Scanning Indeed for "Software Engineer"...</div>
                  <div className="mockup-card highlight">Generating Cover Letter...</div>
                  <div className="mockup-card">Submitting Application (1/5)</div>
                </div>
              </div>
              
              <div className="glass-panel floating-panel panel-1">
                <span className="icon">✓</span> Added to Google Sheets
              </div>
              <div className="glass-panel floating-panel panel-2">
                <span className="icon">🧠</span> Auto-Answered Question
              </div>
            </>
          )}
        </div>
      </main>

      <section className="features-grid" ref={featuresRef}>
        <div className="feature-card">
          <div className="feature-icon">🤖</div>
          <h3>Fully Automated</h3>
          <p>You set the preferences, the agent does the scrolling, typing, and clicking.</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">🧠</div>
          <h3>Self-Learning</h3>
          <p>Answer a custom question once, and the agent remembers it forever.</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">💬</div>
          <h3>AI Career Chat</h3>
          <p>Chat with the AI about your resume, get tailored job suggestions and career advice.</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">📊</div>
          <h3>Google Tracking</h3>
          <p>Every application is logged to your private Google Sheet automatically.</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">📧</div>
          <h3>Email Scanner</h3>
          <p>A second agent scans your Gmail for application updates and syncs status.</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">🔒</div>
          <h3>Privacy First</h3>
          <p>Self-host locally with Docker. Your data never leaves your machine.</p>
        </div>
      </section>
    </div>
  );
}

export default LandingPage;
