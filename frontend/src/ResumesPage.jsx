import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import Sidebar from './Sidebar';

function ResumesPage() {
  const { authFetch, API_URL, logout } = useAuth();
  const navigate = useNavigate();
  const [resumes, setResumes] = useState([]);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    fetchResumes();
    fetchChat();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchResumes = async () => {
    try {
      const res = await authFetch(`${API_URL}/api/resumes`);
      if (res.ok) setResumes((await res.json()).resumes);
    } catch (e) {}
  };

  const fetchChat = async () => {
    try {
      const res = await authFetch(`${API_URL}/api/chat`);
      if (res.ok) setMessages((await res.json()).messages);
    } catch (e) {}
  };

  const handleUpload = async (e) => {
    if (!e.target.files[0]) return;
    const formData = new FormData();
    formData.append('file', e.target.files[0]);
    try {
      const res = await authFetch(`${API_URL}/api/resumes/upload`, {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        fetchResumes();
        // Auto-add a message about the upload
        if (data.suggestions) {
          setMessages(prev => [...prev, 
            { role: 'assistant', content: `Resume "${data.filename}" uploaded! Based on my analysis, here are suggested job titles: **${data.suggestions.join(', ')}**. Would you like me to refine these or discuss your career goals?` }
          ]);
        }
      }
    } catch (e) {}
  };

  const handleActivate = async (id) => {
    await authFetch(`${API_URL}/api/resumes/${id}/activate`, { method: 'POST' });
    fetchResumes();
  };

  const handleDelete = async (id) => {
    await authFetch(`${API_URL}/api/resumes/${id}`, { method: 'DELETE' });
    fetchResumes();
  };

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    const msg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: msg }]);
    setSending(true);
    
    try {
      const res = await authFetch(`${API_URL}/api/chat`, {
        method: 'POST',
        body: JSON.stringify({ message: msg })
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
      }
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong.' }]);
    }
    setSending(false);
  };

  const handleClearChat = async () => {
    await authFetch(`${API_URL}/api/chat`, { method: 'DELETE' });
    setMessages([]);
  };

  return (
    <div className="app-container">
      <Sidebar />
      
      <main className="content" style={{display: 'flex', gap: '2rem', padding: '2rem'}}>
        {/* Left Panel: Resume Management */}
        <div style={{width: '350px', flexShrink: 0}}>
          <header style={{marginBottom: '1.5rem'}}>
            <h1>My Resumes</h1>
          </header>
          
          <div className="config-form" style={{marginBottom: '1.5rem'}}>
            <label style={{color: 'var(--text-muted)', fontSize: '0.875rem', display: 'block', marginBottom: '0.5rem'}}>Upload New Resume</label>
            <input type="file" accept=".pdf,.doc,.docx" onChange={handleUpload} />
          </div>

          <div style={{display: 'flex', flexDirection: 'column', gap: '0.75rem'}}>
            {resumes.length === 0 && (
              <p style={{color: 'var(--text-muted)', textAlign: 'center', padding: '2rem'}}>No resumes uploaded yet.</p>
            )}
            {resumes.map(r => (
              <div key={r.id} className="config-form" style={{padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: r.is_active ? '1px solid var(--primary-color)' : undefined}}>
                <div>
                  <div style={{fontWeight: 500, marginBottom: '0.25rem'}}>
                    {r.filename}
                    {r.is_active ? <span className="badge" style={{marginLeft: '0.5rem', background: 'rgba(99,102,241,0.15)', color: 'var(--primary-color)', fontSize: '0.7rem'}}>Active</span> : null}
                  </div>
                  <div style={{fontSize: '0.75rem', color: 'var(--text-muted)'}}>
                    {new Date(r.uploaded_at).toLocaleDateString()}
                  </div>
                </div>
                <div style={{display: 'flex', gap: '0.5rem'}}>
                  {!r.is_active && (
                    <button className="btn-secondary" style={{padding: '0.25rem 0.5rem', fontSize: '0.75rem'}} onClick={() => handleActivate(r.id)}>
                      Set Active
                    </button>
                  )}
                  <button className="btn-secondary" style={{padding: '0.25rem 0.5rem', fontSize: '0.75rem', color: 'var(--danger)', borderColor: 'var(--danger)'}} onClick={() => handleDelete(r.id)}>
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Panel: AI Chat */}
        <div style={{flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem'}}>
            <h1>AI Career Advisor</h1>
            <button className="btn-secondary" style={{padding: '0.25rem 0.75rem', fontSize: '0.8rem'}} onClick={handleClearChat}>Clear Chat</button>
          </div>
          
          <div className="chat-container" style={{flex: 1, overflowY: 'auto', background: 'var(--bg-secondary)', borderRadius: '1rem', border: '1px solid var(--border-color)', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', minHeight: '400px', maxHeight: 'calc(100vh - 220px)'}}>
            {messages.length === 0 && (
              <div style={{textAlign: 'center', color: 'var(--text-muted)', padding: '3rem 1rem'}}>
                <div style={{fontSize: '3rem', marginBottom: '1rem'}}>💬</div>
                <h3>Start a conversation</h3>
                <p style={{maxWidth: '400px', margin: '0 auto'}}>Upload a resume and ask me anything! I can suggest job titles, review your skills, help with cover letters, and provide career advice.</p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} style={{display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start'}}>
                <div style={{
                  maxWidth: '75%',
                  padding: '1rem',
                  borderRadius: msg.role === 'user' ? '1rem 1rem 0 1rem' : '1rem 1rem 1rem 0',
                  background: msg.role === 'user' ? 'var(--primary-color)' : 'rgba(255,255,255,0.05)',
                  border: msg.role === 'user' ? 'none' : '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  lineHeight: 1.5,
                  fontSize: '0.9375rem',
                  whiteSpace: 'pre-wrap'
                }}>
                  {msg.content}
                </div>
              </div>
            ))}
            {sending && (
              <div style={{display: 'flex', justifyContent: 'flex-start'}}>
                <div style={{padding: '1rem', borderRadius: '1rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', color: 'var(--text-muted)'}}>
                  Thinking...
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div style={{display: 'flex', gap: '0.75rem', marginTop: '1rem'}}>
            <input
              type="text"
              placeholder="Ask about your resume, job suggestions, career advice..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
              style={{flex: 1, padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.9375rem'}}
            />
            <button className="btn-primary" onClick={handleSend} disabled={sending} style={{padding: '1rem 2rem'}}>
              Send
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default ResumesPage;
