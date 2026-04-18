import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import Sidebar from './Sidebar';

function ProfilePage() {
  const { user, authFetch, logout, API_URL } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState(user?.name || '');
  const [saved, setSaved] = useState(false);
  const [wsCreds, setWsCreds] = useState({ project_id: '', client_id: '', client_secret: '' });
  const [wsStatus, setWsStatus] = useState({ has_credentials: false, is_connected: false });

  React.useEffect(() => {
    fetchWsStatus();
  }, []);

  const fetchWsStatus = async () => {
    try {
      const res = await authFetch(`${API_URL}/api/workspace/status`);
      if (res.ok) setWsStatus(await res.json());
    } catch (e) {}
  };

  const handleSaveProfile = async () => {
    try {
      await authFetch(`${API_URL}/api/profile`, {
        method: 'PUT',
        body: JSON.stringify({ name })
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {}
  };

  const handleSaveWsCreds = async () => {
    try {
      await authFetch(`${API_URL}/api/workspace/credentials`, {
        method: 'POST',
        body: JSON.stringify(wsCreds)
      });
      alert("Credentials saved!");
      fetchWsStatus();
    } catch (e) {}
  };

  return (
    <div className="app-container">
      <Sidebar />
      
      <main className="content">
        <header>
          <h1>Profile</h1>
        </header>

        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem'}}>
          <div className="config-form">
            <h2>Account Details</h2>
            <div style={{display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '2rem'}}>
              <div style={{width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg, #818cf8, #c084fc)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.75rem', fontWeight: 700, color: 'white'}}>
                {(user?.name || 'U')[0].toUpperCase()}
              </div>
              <div>
                <h3 style={{margin: 0}}>{user?.name}</h3>
                <p style={{margin: 0, color: 'var(--text-muted)'}}>{user?.email}</p>
              </div>
            </div>

            <div className="form-group">
              <label>Display Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <button className="btn-primary" onClick={handleSaveProfile}>
              {saved ? '✓ Saved!' : 'Update Profile'}
            </button>
          </div>

          <div className="config-form">
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <h2>Google Workspace</h2>
              <button className="btn-secondary" style={{padding: '0.25rem 0.75rem', fontSize: '0.8rem'}} onClick={() => alert("Step-by-step:\n1. Go to console.cloud.google.com\n2. Create a new Project\n3. Enable Google Sheets API & Gmail API\n4. Go to Credentials → Create OAuth Client ID (Desktop App)\n5. Copy the Project ID, Client ID, and Client Secret below")}>
                How to get these?
              </button>
            </div>
            <p style={{color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.875rem'}}>
              Optional. Connect to enable auto-logging to Google Sheets and email scanning.
            </p>

            <div style={{display: 'flex', gap: '0.5rem', marginBottom: '1.5rem'}}>
              <span className="badge" style={{background: wsStatus.has_credentials ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', color: wsStatus.has_credentials ? 'var(--success)' : 'var(--danger)', border: 'none'}}>
                Credentials: {wsStatus.has_credentials ? 'Saved ✓' : 'Not Set'}
              </span>
              <span className="badge" style={{background: wsStatus.is_connected ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', color: wsStatus.is_connected ? 'var(--success)' : 'var(--danger)', border: 'none'}}>
                Connection: {wsStatus.is_connected ? 'Connected ✓' : 'Disconnected'}
              </span>
            </div>

            <div className="form-group">
              <label>Project ID</label>
              <input type="text" placeholder="e.g. my-agent-12345" value={wsCreds.project_id} onChange={e => setWsCreds({...wsCreds, project_id: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Client ID</label>
              <input type="text" placeholder="e.g. 12345-abcde.apps.googleusercontent.com" value={wsCreds.client_id} onChange={e => setWsCreds({...wsCreds, client_id: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Client Secret</label>
              <input type="password" placeholder="e.g. GOCSPX-1234567890" value={wsCreds.client_secret} onChange={e => setWsCreds({...wsCreds, client_secret: e.target.value})} />
            </div>
            <button className="btn-primary" style={{width: '100%'}} onClick={handleSaveWsCreds}>Save Credentials</button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default ProfilePage;
