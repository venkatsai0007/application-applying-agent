import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useAuth } from './AuthContext'
import Sidebar from './Sidebar'

function Dashboard() {
  const { authFetch, API_URL, user, logout, stats, setStats, fetchStats } = useAuth()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState('dashboard')
  const [actions, setActions] = useState([])
  const [memory, setMemory] = useState([])
  const [newQA, setNewQA] = useState({ question: '', answer: '' })
  const [applications, setApplications] = useState([])

  // Config state
  const [configs, setConfigs] = useState([])
  const [activeConfigId, setActiveConfigId] = useState(null)
  const [configForm, setConfigForm] = useState({
    job_titles: ['Software Engineer'],
    locations: ['Remote'],
    work_modes: ['Remote'],
    min_salary: 0,
    strict_salary: false,
    google_sheet_url: '',
    ai_config: {
      use_custom: false,
      platform: 'OpenAI',
      api_key: '',
      model: 'gpt-4'
    }
  })
  const [configName, setConfigName] = useState('Default')
  const [newTitle, setNewTitle] = useState('')
  const [suggestions, setSuggestions] = useState([])
  
  // Agent status & progress
  const [applyStatus, setApplyStatus] = useState('')
  const [emailStatus, setEmailStatus] = useState('')
  const [applyMilestones, setApplyMilestones] = useState([])
  const [emailMilestones, setEmailMilestones] = useState([])
  const [showEmailPrompt, setShowEmailPrompt] = useState(false)

  const IND_CITIES = ['Bangalore', 'Hyderabad', 'Pune', 'Mumbai', 'Delhi NCR', 'Chennai', 'Remote']
  const WORK_MODES = ['Remote', 'Hybrid', 'Office']

  useEffect(() => {
    fetchStats()
    fetchActions()
    fetchMemory()
    fetchConfigs()
    fetchApplications()
    const id = setInterval(() => { fetchStats(); fetchActions(); fetchApplications(); fetchProgress(); }, 3000)
    return () => clearInterval(id)
  }, [])

  // --- Data fetching ---
  const fetchActions = async () => {
    try { const r = await authFetch(`${API_URL}/api/actions`); if (r.ok) setActions((await r.json()).actions || []); } catch(e) {}
  }
  const fetchApplications = async () => {
    try { const r = await authFetch(`${API_URL}/api/applications`); if (r.ok) setApplications((await r.json()).applications || []); } catch(e) {}
  }
  const fetchProgress = async () => {
    try {
      const r1 = await authFetch(`${API_URL}/api/agent/progress/apply`)
      if (r1.ok) {
        const d = await r1.json()
        setApplyMilestones(d.milestones || [])
        if (d.status === 'done' || d.status === 'error') {
          if (d.status === 'done' && applyStatus === 'Running') {
             // Only show prompt if it just finished
             setShowEmailPrompt(true);
          }
          setApplyStatus(d.status === 'done' ? 'Complete' : 'Error')
        }
        else if (d.status === 'running') setApplyStatus('Running')
      }
      const r2 = await authFetch(`${API_URL}/api/agent/progress/email`)
      if (r2.ok) {
        const d = await r2.json()
        setEmailMilestones(d.milestones || [])
        if (d.status === 'done' || d.status === 'error') setEmailStatus(d.status === 'done' ? 'Complete' : 'Error')
        else if (d.status === 'running') setEmailStatus('Running')
      }
    } catch(e) {}
  }
  const fetchMemory = async () => {
    try { const r = await authFetch(`${API_URL}/api/memory`); if (r.ok) setMemory((await r.json()).memory || []); } catch(e) {}
  }
  const fetchConfigs = async () => {
    try {
      const r = await authFetch(`${API_URL}/api/configs`)
      if (r.ok) {
        const data = await r.json()
        setConfigs(data.configs)
        const active = data.configs.find(c => c.is_active)
        if (active) {
          setActiveConfigId(active.id)
          setConfigForm(active.config)
          setConfigName(active.name)
        }
      }
    } catch(e) {}
  }

  // --- Agent controls ---
  const handleApplyAgent = async () => {
    setApplyStatus('Starting...')
    try {
      const r = await authFetch(`${API_URL}/api/agent/apply`, { method: 'POST' })
      const d = await r.json()
      setApplyStatus(r.ok ? 'Running' : 'Failed: ' + d.detail)
    } catch(e) { setApplyStatus('Error') }
  }

  const handleEmailAgent = async () => {
    setEmailStatus('Starting...')
    try {
      const r = await authFetch(`${API_URL}/api/agent/check-email`, { method: 'POST' })
      const d = await r.json()
      setEmailStatus(r.ok ? 'Running' : 'Failed: ' + d.detail)
    } catch(e) { setEmailStatus('Error') }
  }

  // --- Config management ---
  const handleSaveConfig = async () => {
    if (activeConfigId) {
      await authFetch(`${API_URL}/api/configs/${activeConfigId}`, {
        method: 'PUT', body: JSON.stringify({ name: configName, config: configForm })
      })
    } else {
      await authFetch(`${API_URL}/api/configs`, {
        method: 'POST', body: JSON.stringify({ name: configName, config: configForm })
      })
    }
    fetchConfigs()
    alert('Configuration saved!')
  }

  const handleNewConfig = async () => {
    const name = prompt('Name for new configuration:')
    if (!name) return
    await authFetch(`${API_URL}/api/configs`, {
      method: 'POST', body: JSON.stringify({ name, config: configForm })
    })
    fetchConfigs()
  }

  const handleSwitchConfig = async (id) => {
    await authFetch(`${API_URL}/api/configs/${id}/activate`, { method: 'POST' })
    fetchConfigs()
  }

  const handleDeleteConfig = async (id) => {
    if (!confirm('Delete this configuration?')) return
    await authFetch(`${API_URL}/api/configs/${id}`, { method: 'DELETE' })
    fetchConfigs()
  }

  // --- Job title & location helpers ---
  const addJobTitle = (t) => {
    if (t && !configForm.job_titles.includes(t)) setConfigForm({...configForm, job_titles: [...configForm.job_titles, t]})
    setNewTitle('')
  }
  const removeJobTitle = (t) => setConfigForm({...configForm, job_titles: configForm.job_titles.filter(x => x !== t)})
  const toggleLocation = (l) => {
    const locs = configForm.locations.includes(l) ? configForm.locations.filter(x => x !== l) : [...configForm.locations, l]
    setConfigForm({...configForm, locations: locs})
  }
  const toggleWorkMode = (m) => {
    const modes = configForm.work_modes.includes(m) ? configForm.work_modes.filter(x => x !== m) : [...configForm.work_modes, m]
    setConfigForm({...configForm, work_modes: modes})
  }

  // --- Actions ---
  const handleAnswerSubmit = async (qid, ans) => {
    await authFetch(`${API_URL}/api/actions/answer`, { method: 'POST', body: JSON.stringify({ question_id: qid, answer: ans }) })
    fetchActions()
  }
  const handleAddMemory = async () => {
    if (!newQA.question || !newQA.answer) return
    await authFetch(`${API_URL}/api/memory`, { method: 'POST', body: JSON.stringify(newQA) })
    setNewQA({ question: '', answer: '' })
    fetchMemory()
  }
  const handleDeleteMemory = async (id) => {
    await authFetch(`${API_URL}/api/memory/${id}`, { method: 'DELETE' })
    fetchMemory()
  }

  return (
    <div className="app-container">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="content">
        <header>
          <h1>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</h1>
          <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
            {applyStatus && <span style={{color: 'var(--text-muted)', fontSize: '0.8rem'}}>{applyStatus}</span>}
            <button className="btn-primary" onClick={handleApplyAgent}>🚀 Apply to Jobs</button>
            {emailStatus && <span style={{color: 'var(--text-muted)', fontSize: '0.8rem'}}>{emailStatus}</span>}
            <button className="btn-secondary" onClick={handleEmailAgent}>📧 Check Emails</button>
          </div>
        </header>

        {activeTab === 'activity' && (
          <div>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem'}}>
              <h2>Real-time Agent Activity</h2>
              <button className="btn-secondary" onClick={() => { setApplyMilestones([]); setEmailMilestones([]); }}>Clear View</button>
            </div>

            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem'}}>
              <div className="config-form">
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem'}}>
                  <h3 style={{margin: 0}}>🚀 Job Applier Agent</h3>
                  <span className={`status-badge ${applyStatus === 'Running' ? 'warning' : applyStatus === 'Complete' ? 'success' : 'danger'}`}>
                    {applyStatus || 'Idle'}
                  </span>
                </div>
                {applyMilestones.length === 0 ? (
                  <p style={{color: 'var(--text-muted)', textAlign: 'center', padding: '2rem'}}>No activity yet. Run the agent to see progress.</p>
                ) : (
                  <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
                    {applyMilestones.map((m, i) => (
                      <div key={i} style={{display: 'flex', alignItems: 'flex-start', gap: '1rem', opacity: i === applyMilestones.length - 1 ? 1 : 0.6}}>
                        <div style={{
                          width: '12px', height: '12px', borderRadius: '50%', marginTop: '5px', flexShrink: 0,
                          background: i === applyMilestones.length - 1 ? (m.milestone.includes('✕') ? 'var(--danger)' : 'var(--primary-color)') : 'var(--success)',
                          boxShadow: i === applyMilestones.length - 1 ? '0 0 10px var(--primary-color)' : 'none'
                        }} />
                        <div>
                          <div style={{fontWeight: 600, fontSize: '0.9375rem'}}>{m.milestone}</div>
                          <div style={{fontSize: '0.8125rem', color: 'var(--text-muted)'}}>{m.detail}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="config-form">
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem'}}>
                  <h3 style={{margin: 0}}>📧 Email Scanner Agent</h3>
                  <span className={`status-badge ${emailStatus === 'Running' ? 'warning' : emailStatus === 'Complete' ? 'success' : 'danger'}`}>
                    {emailStatus || 'Idle'}
                  </span>
                </div>
                {emailMilestones.length === 0 ? (
                  <p style={{color: 'var(--text-muted)', textAlign: 'center', padding: '2rem'}}>No activity yet. Run the scanner to see progress.</p>
                ) : (
                  <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
                    {emailMilestones.map((m, i) => (
                      <div key={i} style={{display: 'flex', alignItems: 'flex-start', gap: '1rem', opacity: i === emailMilestones.length - 1 ? 1 : 0.6}}>
                        <div style={{
                          width: '12px', height: '12px', borderRadius: '50%', marginTop: '5px', flexShrink: 0,
                          background: i === emailMilestones.length - 1 ? (m.milestone.includes('✕') ? 'var(--danger)' : 'var(--primary-color)') : 'var(--success)',
                          boxShadow: i === emailMilestones.length - 1 ? '0 0 10px var(--primary-color)' : 'none'
                        }} />
                        <div>
                          <div style={{fontWeight: 600, fontSize: '0.9375rem'}}>{m.milestone}</div>
                          <div style={{fontSize: '0.8125rem', color: 'var(--text-muted)'}}>{m.detail}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'dashboard' && (
          <div>
            <div className="stats-row">
              <div className="stat-card"><h3>Jobs Applied</h3><p className="stat-number">{stats.jobs_applied}</p></div>
              <div className="stat-card"><h3>Interviews</h3><p className="stat-number">{stats.interviews}</p></div>
              <div className="stat-card"><h3>Pending Actions</h3><p className="stat-number">{stats.pending_actions}</p></div>
            </div>

            {/* Agent Progress Tracker */}
            {(applyMilestones.length > 0 || emailMilestones.length > 0) && (
              <div style={{display: 'grid', gridTemplateColumns: applyMilestones.length > 0 && emailMilestones.length > 0 ? '1fr 1fr' : '1fr', gap: '1.5rem', marginBottom: '2rem'}}>
                {applyMilestones.length > 0 && (
                  <div className="config-form">
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem'}}>
                      <h3 style={{margin: 0}}>🚀 Apply Agent</h3>
                      <span className="badge" style={{background: applyStatus === 'Running' ? 'rgba(99,102,241,0.15)' : applyStatus === 'Complete' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', color: applyStatus === 'Running' ? 'var(--primary-color)' : applyStatus === 'Complete' ? 'var(--success)' : 'var(--danger)', border: 'none'}}>
                        {applyStatus || 'Idle'}
                      </span>
                    </div>
                    <div style={{display: 'flex', flexDirection: 'column', gap: '0.5rem'}}>
                      {applyMilestones.map((m, i) => (
                        <div key={i} style={{display: 'flex', alignItems: 'flex-start', gap: '0.75rem'}}>
                          <div style={{width: 8, height: 8, borderRadius: '50%', marginTop: 6, flexShrink: 0, background: i === applyMilestones.length - 1 ? (m.milestone.includes('✓') ? 'var(--success)' : m.milestone.includes('✕') ? 'var(--danger)' : 'var(--primary-color)') : 'var(--success)'}} />
                          <div>
                            <div style={{fontWeight: 500, fontSize: '0.875rem'}}>{m.milestone}</div>
                            <div style={{fontSize: '0.75rem', color: 'var(--text-muted)'}}>{m.detail}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {emailMilestones.length > 0 && (
                  <div className="config-form">
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem'}}>
                      <h3 style={{margin: 0}}>📧 Email Scanner</h3>
                      <span className="badge" style={{background: emailStatus === 'Running' ? 'rgba(99,102,241,0.15)' : emailStatus === 'Complete' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', color: emailStatus === 'Running' ? 'var(--primary-color)' : emailStatus === 'Complete' ? 'var(--success)' : 'var(--danger)', border: 'none'}}>
                        {emailStatus || 'Idle'}
                      </span>
                    </div>
                    <div style={{display: 'flex', flexDirection: 'column', gap: '0.5rem'}}>
                      {emailMilestones.map((m, i) => (
                        <div key={i} style={{display: 'flex', alignItems: 'flex-start', gap: '0.75rem'}}>
                          <div style={{width: 8, height: 8, borderRadius: '50%', marginTop: 6, flexShrink: 0, background: i === emailMilestones.length - 1 ? (m.milestone.includes('✓') ? 'var(--success)' : 'var(--primary-color)') : 'var(--success)'}} />
                          <div>
                            <div style={{fontWeight: 500, fontSize: '0.875rem'}}>{m.milestone}</div>
                            <div style={{fontSize: '0.75rem', color: 'var(--text-muted)'}}>{m.detail}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="table-container">
              <h2>Application Funnel</h2>
              <div style={{height: 300, width: '100%', marginTop: '1.5rem'}}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.funnel_data} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis type="number" stroke="#94a3b8" />
                    <YAxis dataKey="name" type="category" stroke="#94a3b8" width={100} />
                    <Tooltip contentStyle={{backgroundColor: '#1e293b', border: '1px solid #334155'}} />
                    <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'applications' && (
          <div>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem'}}>
              <h2>All Applications ({applications.length})</h2>
              {configForm.google_sheet_url && (
                <a href={configForm.google_sheet_url} target="_blank" rel="noreferrer" className="btn-secondary" style={{textDecoration: 'none'}}>View on Google Sheets</a>
              )}
            </div>
            <div className="table-container">
              <table className="jobs-table">
                <thead><tr><th>Company</th><th>Role</th><th>Link</th><th>Status</th><th>Applied</th></tr></thead>
                <tbody>
                  {applications.length === 0 && (
                    <tr><td colSpan="5" style={{textAlign: 'center', color: 'var(--text-muted)', padding: '3rem'}}>No applications yet. Click "🚀 Apply to Jobs" to start!</td></tr>
                  )}
                  {applications.map(app => (
                    <tr key={app.id}>
                      <td style={{fontWeight: 500}}>{app.company}</td>
                      <td>{app.role}</td>
                      <td>
                        {app.job_url ? (
                          <a href={app.job_url} target="_blank" rel="noreferrer" style={{color: 'var(--primary-color)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem'}}>
                            View Job ↗
                          </a>
                        ) : <span style={{color: 'var(--text-muted)'}}>—</span>}
                      </td>
                      <td>
                        <span className={`status-badge ${app.status === 'Interview' ? 'success' : app.status === 'Rejected' ? 'danger' : app.status === 'Offer' ? 'success' : 'warning'}`}>
                          {app.status}
                        </span>
                      </td>
                      <td style={{color: 'var(--text-muted)', fontSize: '0.875rem'}}>{new Date(app.applied_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'config' && (
          <div>
            {/* Config Switcher */}
            <div style={{display: 'flex', gap: '0.75rem', marginBottom: '2rem', flexWrap: 'wrap', alignItems: 'center'}}>
              {configs.map(c => (
                <div key={c.id} style={{display: 'flex', alignItems: 'center', gap: '0.25rem'}}>
                  <button className={c.is_active ? 'btn-primary' : 'btn-secondary'} style={{padding: '0.5rem 1rem'}} onClick={() => handleSwitchConfig(c.id)}>
                    {c.name}
                  </button>
                  {!c.is_active && configs.length > 1 && (
                    <button className="btn-secondary" style={{padding: '0.25rem 0.5rem', color: 'var(--danger)', borderColor: 'var(--danger)', fontSize: '0.7rem'}} onClick={() => handleDeleteConfig(c.id)}>✕</button>
                  )}
                </div>
              ))}
              <button className="btn-secondary" style={{padding: '0.5rem 1rem'}} onClick={handleNewConfig}>+ New Config</button>
            </div>

            <div style={{display: 'flex', gap: '2rem'}}>
              <div style={{flex: 1}}>
                <form className="config-form">
                  <div className="form-group">
                    <label>Configuration Name</label>
                    <input type="text" value={configName} onChange={e => setConfigName(e.target.value)} />
                  </div>

                  <div className="form-group">
                    <label>Target Job Titles</label>
                    <div style={{display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap'}}>
                      {configForm.job_titles.map(t => (
                        <span key={t} className="badge" style={{cursor: 'pointer'}} onClick={() => removeJobTitle(t)}>{t} ✕</span>
                      ))}
                    </div>
                    <div style={{display: 'flex', gap: '0.5rem'}}>
                      <input type="text" placeholder="Add title..." value={newTitle} onChange={e => setNewTitle(e.target.value)} onKeyDown={e => { if(e.key==='Enter'){e.preventDefault();addJobTitle(newTitle)} }} />
                      <button type="button" className="btn-secondary" onClick={() => addJobTitle(newTitle)}>Add</button>
                    </div>
                    {suggestions.length > 0 && (
                      <div style={{marginTop: '0.5rem'}}>
                        <small style={{color: 'var(--primary-color)'}}>AI Suggestions:</small>
                        <div style={{display: 'flex', gap: '0.5rem', marginTop: '0.25rem', flexWrap: 'wrap'}}>
                          {suggestions.map(s => (
                            <span key={s} className="badge" style={{background: '#1e293b', cursor: 'pointer'}} onClick={() => addJobTitle(s)}>+ {s}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="form-group">
                    <label>Work Mode Preference (select multiple)</label>
                    <div style={{display: 'flex', gap: '0.5rem', marginTop: '0.5rem'}}>
                      {WORK_MODES.map(m => (
                        <span key={m} onClick={() => toggleWorkMode(m)} className="badge" style={{cursor: 'pointer', background: configForm.work_modes.includes(m) ? 'var(--primary-color)' : '#1e293b'}}>
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Target Locations</label>
                    <div style={{display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem'}}>
                      {IND_CITIES.map(l => (
                        <span key={l} onClick={() => toggleLocation(l)} className="badge" style={{cursor: 'pointer', background: configForm.locations.includes(l) ? 'var(--primary-color)' : '#1e293b'}}>
                          {l}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Minimum Salary (₹)</label>
                    <input type="number" value={configForm.min_salary} onChange={e => setConfigForm({...configForm, min_salary: parseInt(e.target.value) || 0})} />
                  </div>
                  <div className="form-group checkbox-group">
                    <input type="checkbox" id="strict" checked={configForm.strict_salary} onChange={e => setConfigForm({...configForm, strict_salary: e.target.checked})} />
                    <label htmlFor="strict">Only apply if salary matches</label>
                  </div>
                  <div className="form-group">
                    <label>Google Sheet URL (optional)</label>
                    <input type="url" placeholder="https://docs.google.com/spreadsheets/d/..." value={configForm.google_sheet_url} onChange={e => setConfigForm({...configForm, google_sheet_url: e.target.value})} />
                  </div>
                  <button type="button" className="btn-primary" onClick={handleSaveConfig} style={{width: '100%'}}>Save Configuration</button>
                </form>
              </div>

              {/* AI Brain Configuration */}
              <div style={{flex: 1}}>
                <div className="config-form">
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem'}}>
                    <h2 style={{margin: 0}}>🧠 AI Brain Configuration</h2>
                    <div className="checkbox-group" style={{marginBottom: 0}}>
                      <input 
                        type="checkbox" 
                        id="use_custom_ai" 
                        checked={configForm.ai_config?.use_custom} 
                        onChange={e => setConfigForm({
                          ...configForm, 
                          ai_config: { ...configForm.ai_config, use_custom: e.target.checked }
                        })} 
                      />
                      <label htmlFor="use_custom_ai" style={{fontSize: '0.875rem'}}>Use Custom Platform</label>
                    </div>
                  </div>

                  <p style={{color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.875rem'}}>
                    By default, we use our internal agent. Enable this to use your own LLM provider. This allows the AI to keep context of your specific career history.
                  </p>

                  <div style={{opacity: configForm.ai_config?.use_custom ? 1 : 0.5, pointerEvents: configForm.ai_config?.use_custom ? 'all' : 'none', transition: 'opacity 0.2s'}}>
                    <div className="form-group">
                      <label>AI Platform</label>
                      <select 
                        value={configForm.ai_config?.platform || 'OpenAI'} 
                        onChange={e => setConfigForm({
                          ...configForm, 
                          ai_config: { ...configForm.ai_config, platform: e.target.value }
                        })}
                        style={{width: '100%', padding: '0.75rem', borderRadius: '0.5rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'white'}}
                      >
                        <option value="OpenAI">OpenAI (ChatGPT)</option>
                        <option value="Claude">Anthropic (Claude)</option>
                        <option value="Gemini">Google (Gemini)</option>
                        <option value="Groq">Groq (Llama 3)</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Model Name</label>
                      <input 
                        type="text" 
                        placeholder="e.g. gpt-4-turbo, claude-3-opus" 
                        value={configForm.ai_config?.model || ''} 
                        onChange={e => setConfigForm({
                          ...configForm, 
                          ai_config: { ...configForm.ai_config, model: e.target.value }
                        })} 
                      />
                    </div>

                    <div className="form-group">
                      <label>API Key</label>
                      <input 
                        type="password" 
                        placeholder="sk-..." 
                        value={configForm.ai_config?.api_key || ''} 
                        onChange={e => setConfigForm({
                          ...configForm, 
                          ai_config: { ...configForm.ai_config, api_key: e.target.value }
                        })} 
                      />
                    </div>

                    <div className="glass-panel" style={{padding: '1rem', background: 'rgba(99,102,241,0.05)', marginTop: '2rem'}}>
                      <h4 style={{margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                        <span>💡</span> Pro Tip
                      </h4>
                      <p style={{fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0}}>
                        Your chat history from "Resumes & AI Chat" is automatically fed to these platforms to provide hyper-personalized application answers.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'knowledge' && (
          <div>
            <h2>Auto-Learn Memory Bank</h2>
            <p style={{color: 'var(--text-muted)', marginBottom: '2rem'}}>
              When you answer a question in "Action Needed", it's saved here. The AI auto-answers similar questions in the future.
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
              <table className="jobs-table">
                <thead><tr><th>Question</th><th>Answer</th><th style={{width: 100}}>Action</th></tr></thead>
                <tbody>
                  {memory.length === 0 && <tr><td colSpan="3" style={{textAlign: 'center', color: 'var(--text-muted)'}}>No saved answers yet.</td></tr>}
                  {memory.map(qa => (
                    <tr key={qa.id}>
                      <td>{qa.question}</td><td>{qa.answer}</td>
                      <td><button className="btn-secondary" style={{padding: '0.25rem 0.5rem', color: 'var(--danger)', borderColor: 'var(--danger)'}} onClick={() => handleDeleteMemory(qa.id)}>Delete</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'actions' && (
          <div>
            <h2>Requires Your Input</h2>
            {actions.length === 0 ? (
              <p style={{color: 'var(--text-muted)'}}>No pending actions. The agent is working perfectly!</p>
            ) : (
              actions.map(a => (
                <div className="action-card" key={a.id}>
                  <div className="action-header">
                    <h3>{a.company} - {a.role}</h3>
                    <span className="action-type">{a.type}</span>
                  </div>
                  <p><strong>Question:</strong> "{a.text}"</p>
                  <input type="text" placeholder="Your answer..." className="action-input" id={`ans-${a.id}`} />
                  <button className="btn-primary" onClick={() => handleAnswerSubmit(a.id, document.getElementById(`ans-${a.id}`).value)}>Submit</button>
                </div>
              ))
            )}
          </div>
        )}

        {showEmailPrompt && (
          <div className="modal-overlay">
            <div className="glass-panel modal-content" style={{maxWidth: '400px', textAlign: 'center'}}>
              <div style={{fontSize: '3rem', marginBottom: '1rem'}}>📧</div>
              <h3>Apply Agent Finished!</h3>
              <p style={{color: 'var(--text-muted)', marginBottom: '1.5rem'}}>
                The job applier has completed its run. Would you like to start the Email Scanner now to check for status updates?
              </p>
              <div style={{display: 'flex', gap: '1rem', justifyContent: 'center'}}>
                <button className="btn-primary" onClick={() => { setShowEmailPrompt(false); handleEmailAgent(); }}>
                  Yes, Start Scan
                </button>
                <button className="btn-secondary" onClick={() => setShowEmailPrompt(false)}>
                  Maybe Later
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default Dashboard
