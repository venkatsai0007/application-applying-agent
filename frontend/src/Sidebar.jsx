import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

function Sidebar({ activeTab, setActiveTab }) {
  const { user, logout, stats } = useAuth();
  const navigate = useNavigate();

  const handleNav = (tab, path) => {
    if (path) {
      navigate(path);
    } else {
      setActiveTab(tab);
      if (window.location.pathname !== '/dashboard') {
        navigate('/dashboard');
      }
    }
  };

  return (
    <nav className="sidebar">
      <div className="logo"><h2>Agentic Apply</h2></div>
      <ul className="nav-links">
        <li className={activeTab === 'dashboard' ? 'active' : ''} onClick={() => handleNav('dashboard')}>Dashboard</li>
        <li className={activeTab === 'config' ? 'active' : ''} onClick={() => handleNav('config')}>Configuration</li>
        <li className={activeTab === 'knowledge' ? 'active' : ''} onClick={() => handleNav('knowledge')}>Knowledge Base</li>
        <li className={activeTab === 'applications' ? 'active' : ''} onClick={() => handleNav('applications')}>Applications</li>
        <li className={activeTab === 'activity' ? 'active' : ''} onClick={() => handleNav('activity')}>
          Agent Activity
        </li>
        <li className={activeTab === 'actions' ? 'active' : ''} onClick={() => handleNav('actions')}>
          Action Needed
          {stats?.pending_actions > 0 && <span className="badge">{stats.pending_actions}</span>}
        </li>
        <li className={window.location.pathname === '/resumes' ? 'active' : ''} onClick={() => navigate('/resumes')}>Resumes & AI Chat</li>
        <li className={window.location.pathname === '/profile' ? 'active' : ''} onClick={() => navigate('/profile')}>Profile</li>
      </ul>
      <div style={{marginTop: 'auto', padding: '1.5rem', borderTop: '1px solid var(--border-color)'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem'}}>
          <div style={{width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #818cf8, #c084fc)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem', fontWeight: 700, color: 'white'}}>
            {(user?.name || 'U')[0].toUpperCase()}
          </div>
          <div>
            <div style={{fontWeight: 500, fontSize: '0.875rem'}}>{user?.name}</div>
            <div style={{fontSize: '0.7rem', color: 'var(--text-muted)'}}>{user?.email}</div>
          </div>
        </div>
        <button className="btn-secondary" style={{width: '100%', padding: '0.5rem'}} onClick={() => { logout(); navigate('/'); }}>Log Out</button>
      </div>
    </nav>
  );
}

export default Sidebar;
