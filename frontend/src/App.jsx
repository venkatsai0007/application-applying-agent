import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const API_URL = 'http://localhost:8000';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [googleStatus, setGoogleStatus] = useState({ has_credentials: false, is_authenticated: false })
  const [authUrl, setAuthUrl] = useState('')
  const [authCode, setAuthCode] = useState('')
  const [stats, setStats] = useState({ jobs_applied: 0, interviews: 0, pending_actions: 0, funnel_data: [] })
  const [actions, setActions] = useState([])
  const [memory, setMemory] = useState([])
  const [newQA, setNewQA] = useState({ question: '', answer: '' })
  const [suggestions, setSuggestions] = useState([])
  const [configForm, setConfigForm] = useState({
    job_titles: ['Software Engineer', 'Frontend Developer'],
    locations: ['India', 'Remote'],
    work_mode: 'Remote',
    min_salary: 2000000,
    strict_salary: true,
    google_sheet_url: ''
  })
  const [credsForm, setCredsForm] = useState({ client_id: '', client_secret: '', project_id: '' })
  const [runStatus, setRunStatus] = useState('')
  const [newTitle, setNewTitle] = useState('')
  
  const IND_CITIES = ['Bangalore', 'Hyderabad', 'Pune', 'Mumbai', 'Delhi NCR', 'Chennai', 'Remote']

  useEffect(() => {
    fetchGoogleStatus()
    fetchStats()
    fetchActions()
    fetchMemory()
    const intervalId = setInterval(() => {
      fetchStats()
      fetchActions()
    }, 5000) // Poll every 5s
    return () => clearInterval(intervalId)
  }, [])

  const fetchMemory = async () => {
    try {
      const res = await fetch(`${API_URL}/api/memory`)
      const data = await res.json()
      setMemory(data.memory || [])
    } catch (e) { }
  }

  const handleAddMemory = async () => {
    if (!newQA.question || !newQA.answer) return;
    try {
      await fetch(`${API_URL}/api/memory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newQA)
      })
      setNewQA({ question: '', answer: '' })
      fetchMemory()
    } catch (e) { }
  }

  const handleDeleteMemory = async (id) => {
    try {
      await fetch(`${API_URL}/api/memory/${id}`, { method: 'DELETE' })
      fetchMemory()
    } catch (e) { }
  }

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_URL}/api/stats`)
      const data = await res.json()
      setStats(data)
    } catch (e) { }
  }

  const fetchActions = async () => {
    try {
      const res = await fetch(`${API_URL}/api/actions`)
      const data = await res.json()
      setActions(data.actions || [])
    } catch (e) { }
  }

  const handleRunAgent = async () => {
    try {
      setRunStatus('Starting...')
      const res = await fetch(`${API_URL}/api/run-agent`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setRunStatus('Running')
      } else {
        setRunStatus('Failed: ' + data.detail)
      }
    } catch (e) {
      setRunStatus('Error')
    }
  }

  const handleSaveConfig = async () => {
    try {
      await fetch(`${API_URL}/api/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configForm)
      })
      alert("Config saved!")
    } catch (e) { }
  }

  const handleAnswerSubmit = async (questionId, answerText) => {
    try {
      await fetch(`${API_URL}/api/actions/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question_id: questionId, answer: answerText })
      })
      fetchActions()
    } catch (e) { }
  }

  const handleSaveCreds = async () => {
    try {
      await fetch(`${API_URL}/api/config/credentials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credsForm)
      })
      alert("Credentials saved! Now click Login with Google.")
      fetchGoogleStatus()
    } catch (e) { }
  }

  const handleUploadResume = async (e) => {
    if (!e.target.files[0]) return;
    const formData = new FormData();
    formData.append("file", e.target.files[0]);
    try {
      const res = await fetch(`${API_URL}/api/resume/upload`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.suggestions) {
        setSuggestions(data.suggestions);
      }
    } catch (e) { }
  }

  const addJobTitle = (title) => {
    if (title && !configForm.job_titles.includes(title)) {
      setConfigForm({...configForm, job_titles: [...configForm.job_titles, title]});
    }
    setNewTitle('');
  }

  const removeJobTitle = (title) => {
    setConfigForm({...configForm, job_titles: configForm.job_titles.filter(t => t !== title)});
  }

  const toggleLocation = (loc) => {
    if (configForm.locations.includes(loc)) {
      setConfigForm({...configForm, locations: configForm.locations.filter(l => l !== loc)});
    } else {
      setConfigForm({...configForm, locations: [...configForm.locations, loc]});
    }
  }

  const fetchGoogleStatus = async () => {
    try {
      const res = await fetch(`${API_URL}/api/auth/google/status`)
      const data = await res.json()
      setGoogleStatus(data)
    } catch (e) {
      console.error('Error fetching google status', e)
    }
  }

  const handleCredentialsUpload = async (e) => {
    if (!e.target.files[0]) return;
    const formData = new FormData()
    formData.append('file', e.target.files[0])
    
    try {
      await fetch(`${API_URL}/api/auth/google/upload-credentials`, {
        method: 'POST',
        body: formData
      })
      fetchGoogleStatus()
    } catch (e) {
      console.error('Upload failed', e)
    }
  }

  const handleGetAuthUrl = async () => {
    try {
      const res = await fetch(`${API_URL}/api/auth/google/url`)
      const data = await res.json()
      setAuthUrl(data.url)
      window.open(data.url, '_blank')
    } catch (e) {
      console.error('Failed to get URL', e)
    }
  }

  const handleSubmitCode = async () => {
    try {
      const res = await fetch(`${API_URL}/api/auth/google/callback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: authCode })
      })
      const data = await res.json()
      if(data.status === 'success') {
        fetchGoogleStatus()
        setAuthUrl('')
        setAuthCode('')
      }
    } catch (e) {
      console.error('Failed to submit code', e)
    }
  }

  return (
    <div className="app-container">
      <nav className="sidebar">
        <div className="logo">
          <h2>Agentic Apply</h2>
        </div>
        <ul className="nav-links">
          <li className={activeTab === 'dashboard' ? 'active' : ''} onClick={() => setActiveTab('dashboard')}>
            Dashboard
          </li>
          <li className={activeTab === 'config' ? 'active' : ''} onClick={() => setActiveTab('config')}>
            Configuration
          </li>
          <li className={activeTab === 'knowledge' ? 'active' : ''} onClick={() => setActiveTab('knowledge')}>
            Knowledge Base
          </li>
          <li className={activeTab === 'applications' ? 'active' : ''} onClick={() => setActiveTab('applications')}>
            Applications
          </li>
          <li className={activeTab === 'actions' ? 'active' : ''} onClick={() => setActiveTab('actions')}>
            Action Needed
            {stats.pending_actions > 0 && <span className="badge">{stats.pending_actions}</span>}
          </li>
        </ul>
      </nav>
      
      <main className="content">
        <header>
          <h1>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</h1>
          <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
            {runStatus && <span style={{color: 'var(--text-muted)'}}>{runStatus}</span>}
            <button className="btn-primary" onClick={handleRunAgent}>Run Agent</button>
          </div>
        </header>

        {activeTab === 'dashboard' && (
          <div className="dashboard-view">
            <div className="stats-row">
              <div className="stat-card">
                <h3>Jobs Applied</h3>
                <p className="stat-number">{stats.jobs_applied}</p>
              </div>
              <div className="stat-card">
                <h3>Interviews</h3>
                <p className="stat-number">{stats.interviews}</p>
              </div>
              <div className="stat-card">
                <h3>Pending Actions</h3>
                <p className="stat-number">{stats.pending_actions}</p>
              </div>
            </div>

            <div className="table-container" style={{marginBottom: '3rem'}}>
              <h2>Application Funnel</h2>
              <div style={{height: 300, width: '100%', marginTop: '1.5rem'}}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.funnel_data} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis type="number" stroke="#94a3b8" />
                    <YAxis dataKey="name" type="category" stroke="#94a3b8" width={100} />
                    <Tooltip contentStyle={{backgroundColor: '#1e293b', border: '1px solid #334155'}} />
                    <Bar dataKey="value" fill="#4f46e5" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'applications' && (
          <div className="applications-view">
            <header style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem'}}>
              <h2>All Applications</h2>
              {configForm.google_sheet_url && (
                <a href={configForm.google_sheet_url} target="_blank" rel="noreferrer" className="btn-secondary" style={{textDecoration: 'none'}}>
                  View on Google Sheets
                </a>
              )}
            </header>
            <div className="table-container">
              <table className="jobs-table">
                <thead>
                  <tr>
                    <th>Company</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Mocked data for UI */}
                  <tr><td>Google</td><td>Frontend Engineer</td><td><span className="status-badge success">Interview</span></td><td>Today</td></tr>
                  <tr><td>Amazon</td><td>SDE II</td><td><span className="status-badge warning">Pending</span></td><td>Yesterday</td></tr>
                  <tr><td>StartupX</td><td>React Developer</td><td><span className="status-badge danger">Rejected</span></td><td>2 days ago</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'config' && (
        {activeTab === 'config' && (
          <div className="config-view">
            <div style={{display: 'flex', gap: '2rem'}}>
              
              <div style={{flex: 1}}>
                <h2>Agent Preferences</h2>
                <form className="config-form">
                  <div className="form-group">
                    <label>Upload Resume (Triggers AI Suggestions)</label>
                    <input type="file" accept=".pdf,.doc,.docx" onChange={handleUploadResume} />
                  </div>

                  <div className="form-group">
                    <label>Target Job Titles</label>
                    <div style={{display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap'}}>
                      {configForm.job_titles.map(t => (
                        <span key={t} className="badge" style={{cursor: 'pointer'}} onClick={() => removeJobTitle(t)}>{t} ✕</span>
                      ))}
                    </div>
                    <div style={{display: 'flex', gap: '0.5rem'}}>
                      <input type="text" placeholder="Add custom title..." value={newTitle} onChange={e => setNewTitle(e.target.value)} onKeyDown={(e) => { if(e.key === 'Enter') { e.preventDefault(); addJobTitle(newTitle); } }} />
                      <button type="button" className="btn-secondary" onClick={() => addJobTitle(newTitle)}>Add</button>
                    </div>
                    {suggestions.length > 0 && (
                      <div style={{marginTop: '0.5rem'}}>
                        <small style={{color: 'var(--primary-color)'}}>AI Suggestions (click to add):</small>
                        <div style={{display: 'flex', gap: '0.5rem', marginTop: '0.25rem', flexWrap: 'wrap'}}>
                          {suggestions.map(s => (
                            <span key={s} className="badge" style={{background: '#1e293b', cursor: 'pointer'}} onClick={() => addJobTitle(s)}>+ {s}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="form-group">
                    <label>Work Mode Preference</label>
                    <select style={{width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)'}} value={configForm.work_mode} onChange={e => setConfigForm({...configForm, work_mode: e.target.value})}>
                      <option value="Remote">Remote</option>
                      <option value="Hybrid">Hybrid</option>
                      <option value="Office">Office</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Target Locations</label>
                    <div style={{display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem'}}>
                      {IND_CITIES.map(loc => (
                        <span key={loc} onClick={() => toggleLocation(loc)} className="badge" style={{cursor: 'pointer', background: configForm.locations.includes(loc) ? 'var(--primary-color)' : '#1e293b'}}>
                          {loc}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Minimum Salary Expectation (₹)</label>
                    <input type="number" value={configForm.min_salary} onChange={e => setConfigForm({...configForm, min_salary: parseInt(e.target.value) || 0})} />
                  </div>
                  <div className="form-group checkbox-group">
                    <input type="checkbox" id="strictSalary" checked={configForm.strict_salary} onChange={e => setConfigForm({...configForm, strict_salary: e.target.checked})} />
                    <label htmlFor="strictSalary">Only apply if salary matches expectation</label>
                  </div>
                  
                  <div className="form-group">
                    <label>Google Sheet URL</label>
                    <input type="url" placeholder="https://docs.google.com/spreadsheets/d/..." value={configForm.google_sheet_url} onChange={e => setConfigForm({...configForm, google_sheet_url: e.target.value})} />
                  </div>
                  <button type="button" className="btn-secondary" onClick={handleSaveConfig} style={{width: '100%'}}>Save Configuration</button>
                </form>
              </div>

              <div style={{flex: 1}}>
                <h2>Google Workspace Integration</h2>
                <div className="config-form">
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem'}}>
                    <p style={{color: 'var(--text-muted)'}}>Required for auto-logging to Sheets and scanning Gmail.</p>
                    <button className="btn-secondary" style={{padding: '0.25rem 0.5rem', fontSize: '0.8rem'}} onClick={() => alert("To get credentials:\\n1. Go to Google Cloud Console\\n2. Create a Project\\n3. Enable Sheets & Gmail API\\n4. Create OAuth Client ID (Desktop App)\\n5. Copy the Client ID, Secret, and Project ID here.")}>
                      How to get these?
                    </button>
                  </div>
                  
                  <div className="form-group">
                    <label>Project ID</label>
                    <input type="text" placeholder="e.g. my-agent-12345" value={credsForm.project_id} onChange={e => setCredsForm({...credsForm, project_id: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Client ID</label>
                    <input type="text" placeholder="e.g. 12345-abcde.apps.googleusercontent.com" value={credsForm.client_id} onChange={e => setCredsForm({...credsForm, client_id: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Client Secret</label>
                    <input type="password" placeholder="e.g. GOCSPX-1234567890" value={credsForm.client_secret} onChange={e => setCredsForm({...credsForm, client_secret: e.target.value})} />
                  </div>
                  
                  <button type="button" className="btn-secondary" onClick={handleSaveCreds} style={{width: '100%', marginBottom: '1rem'}}>Save Credentials</button>

                  <div style={{borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '1rem'}}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                      <span>Status: {googleStatus.is_authenticated ? <span style={{color: 'var(--success)'}}>Connected</span> : 'Not Connected'}</span>
                      {!googleStatus.is_authenticated && (
                        <button type="button" className="btn-primary" onClick={handleGetAuthUrl}>Login with Google</button>
                      )}
                    </div>
                    
                    {authUrl && !googleStatus.is_authenticated && (
                      <div style={{marginTop: '1rem', padding: '1rem', background: 'var(--bg-primary)', borderRadius: '0.5rem'}}>
                        <p style={{marginBottom: '0.5rem', fontSize: '0.9rem'}}>1. Click below to authorize, then copy the code.</p>
                        <a href={authUrl} target="_blank" rel="noreferrer" style={{color: 'var(--primary-color)', wordBreak: 'break-all', fontSize: '0.8rem'}}>{authUrl}</a>
                        <div style={{display: 'flex', gap: '0.5rem', marginTop: '1rem'}}>
                          <input type="text" placeholder="Paste auth code here..." value={authCode} onChange={e => setAuthCode(e.target.value)} />
                          <button type="button" className="btn-secondary" onClick={handleSubmitCode}>Verify</button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {activeTab === 'knowledge' && (
          <div className="knowledge-view">
            <h2>Auto-Learn Memory Bank</h2>
            <p style={{color: 'var(--text-muted)', marginBottom: '2rem'}}>
              When you answer a question in the "Action Needed" tab, it's saved here. The LLM will automatically use these answers for similar questions in the future!
            </p>
            
            <div className="config-form" style={{marginBottom: '2rem'}}>
              <h3>Add Pre-emptive Answer</h3>
              <div className="form-group">
                <label>Question</label>
                <input type="text" placeholder="e.g. Do you require visa sponsorship?" value={newQA.question} onChange={e => setNewQA({...newQA, question: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Answer</label>
                <input type="text" placeholder="e.g. No" value={newQA.answer} onChange={e => setNewQA({...newQA, answer: e.target.value})} />
              </div>
              <button className="btn-primary" onClick={handleAddMemory}>Save Answer</button>
            </div>

            <div className="table-container">
              <h3>Saved Knowledge</h3>
              <table className="jobs-table">
                <thead>
                  <tr>
                    <th>Question</th>
                    <th>Answer</th>
                    <th style={{width: '100px'}}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {memory.length === 0 && (
                    <tr><td colSpan="3" style={{textAlign: 'center'}}>No saved answers yet.</td></tr>
                  )}
                  {memory.map(qa => (
                    <tr key={qa.id}>
                      <td>{qa.question}</td>
                      <td>{qa.answer}</td>
                      <td>
                        <button className="btn-secondary" style={{padding: '0.25rem 0.5rem', color: 'var(--danger)', borderColor: 'var(--danger)'}} onClick={() => handleDeleteMemory(qa.id)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'actions' && (
          <div className="actions-view">
            <h2>Requires Your Input</h2>
            {actions.length === 0 ? (
              <p style={{color: 'var(--text-muted)'}}>No pending actions. The agent is working perfectly!</p>
            ) : (
              actions.map((action) => (
                <div className="action-card" key={action.id}>
                  <div className="action-header">
                    <h3>{action.company} - {action.role}</h3>
                    <span className="action-type">{action.type}</span>
                  </div>
                  <p><strong>Question:</strong> "{action.text}"</p>
                  <input type="text" placeholder="Your answer..." className="action-input" id={`answer-${action.id}`} />
                  <button className="btn-primary" onClick={() => handleAnswerSubmit(action.id, document.getElementById(`answer-${action.id}`).value)}>
                    Submit Answer
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  )
}

export default App
