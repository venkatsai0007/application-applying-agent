import sqlite3
import os
import json
from datetime import datetime

DB_PATH = os.environ.get("DB_PATH", "agentic_apply.db")

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL DEFAULT '',
            password_hash TEXT,
            avatar_url TEXT DEFAULT '',
            google_id TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
    """)
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS configurations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL DEFAULT 'Default',
            config_json TEXT NOT NULL DEFAULT '{}',
            is_active INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """)
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS resumes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            filename TEXT NOT NULL,
            filepath TEXT NOT NULL,
            is_active INTEGER NOT NULL DEFAULT 0,
            uploaded_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """)
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS chat_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS google_workspace_creds (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL UNIQUE,
            project_id TEXT,
            client_id TEXT,
            client_secret TEXT,
            token_json TEXT,
            is_connected INTEGER NOT NULL DEFAULT 0,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS applications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            company TEXT NOT NULL,
            role TEXT NOT NULL,
            job_url TEXT DEFAULT '',
            status TEXT NOT NULL DEFAULT 'Applied',
            applied_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS agent_progress (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            agent_type TEXT NOT NULL,
            milestone TEXT NOT NULL,
            detail TEXT DEFAULT '',
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """)

    conn.commit()
    conn.close()

# --- User CRUD ---

def create_user(email, name, password_hash=None, google_id=None):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO users (email, name, password_hash, google_id) VALUES (?, ?, ?, ?)",
        (email, name, password_hash, google_id)
    )
    user_id = cursor.lastrowid
    # Create a default configuration for the user
    default_config = json.dumps({
        "job_titles": ["Software Engineer"],
        "locations": ["Remote"],
        "work_modes": ["Remote"],
        "min_salary": 0,
        "strict_salary": False,
        "google_sheet_url": ""
    })
    cursor.execute(
        "INSERT INTO configurations (user_id, name, config_json, is_active) VALUES (?, 'Default', ?, 1)",
        (user_id, default_config)
    )
    conn.commit()
    conn.close()
    return user_id

def get_user_by_email(email):
    conn = get_db()
    user = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
    conn.close()
    return dict(user) if user else None

def get_user_by_id(user_id):
    conn = get_db()
    user = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    conn.close()
    return dict(user) if user else None

def update_user(user_id, name=None, avatar_url=None):
    conn = get_db()
    if name is not None:
        conn.execute("UPDATE users SET name = ? WHERE id = ?", (name, user_id))
    if avatar_url is not None:
        conn.execute("UPDATE users SET avatar_url = ? WHERE id = ?", (avatar_url, user_id))
    conn.commit()
    conn.close()

# --- Configuration CRUD ---

def get_configs(user_id):
    conn = get_db()
    rows = conn.execute("SELECT * FROM configurations WHERE user_id = ? ORDER BY created_at", (user_id,)).fetchall()
    conn.close()
    return [dict(r) for r in rows]

def get_active_config(user_id):
    conn = get_db()
    row = conn.execute("SELECT * FROM configurations WHERE user_id = ? AND is_active = 1", (user_id,)).fetchone()
    conn.close()
    return dict(row) if row else None

def create_config(user_id, name, config_json):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO configurations (user_id, name, config_json) VALUES (?, ?, ?)",
        (user_id, name, json.dumps(config_json))
    )
    conn.commit()
    config_id = cursor.lastrowid
    conn.close()
    return config_id

def update_config(config_id, user_id, name=None, config_json=None):
    conn = get_db()
    if name is not None:
        conn.execute("UPDATE configurations SET name = ? WHERE id = ? AND user_id = ?", (name, config_id, user_id))
    if config_json is not None:
        conn.execute("UPDATE configurations SET config_json = ? WHERE id = ? AND user_id = ?", (json.dumps(config_json), config_id, user_id))
    conn.commit()
    conn.close()

def set_active_config(config_id, user_id):
    conn = get_db()
    conn.execute("UPDATE configurations SET is_active = 0 WHERE user_id = ?", (user_id,))
    conn.execute("UPDATE configurations SET is_active = 1 WHERE id = ? AND user_id = ?", (config_id, user_id))
    conn.commit()
    conn.close()

def delete_config(config_id, user_id):
    conn = get_db()
    conn.execute("DELETE FROM configurations WHERE id = ? AND user_id = ?", (config_id, user_id))
    conn.commit()
    conn.close()

# --- Resume CRUD ---

def save_resume(user_id, filename, filepath):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO resumes (user_id, filename, filepath) VALUES (?, ?, ?)",
        (user_id, filename, filepath)
    )
    resume_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return resume_id

def get_resumes(user_id):
    conn = get_db()
    rows = conn.execute("SELECT * FROM resumes WHERE user_id = ? ORDER BY uploaded_at DESC", (user_id,)).fetchall()
    conn.close()
    return [dict(r) for r in rows]

def set_active_resume(resume_id, user_id):
    conn = get_db()
    conn.execute("UPDATE resumes SET is_active = 0 WHERE user_id = ?", (user_id,))
    conn.execute("UPDATE resumes SET is_active = 1 WHERE id = ? AND user_id = ?", (resume_id, user_id))
    conn.commit()
    conn.close()

def delete_resume(resume_id, user_id):
    conn = get_db()
    row = conn.execute("SELECT filepath FROM resumes WHERE id = ? AND user_id = ?", (resume_id, user_id)).fetchone()
    if row and os.path.exists(row["filepath"]):
        os.remove(row["filepath"])
    conn.execute("DELETE FROM resumes WHERE id = ? AND user_id = ?", (resume_id, user_id))
    conn.commit()
    conn.close()

# --- Chat CRUD ---

def save_chat_message(user_id, role, content):
    conn = get_db()
    conn.execute(
        "INSERT INTO chat_messages (user_id, role, content) VALUES (?, ?, ?)",
        (user_id, role, content)
    )
    conn.commit()
    conn.close()

def get_chat_history(user_id, limit=50):
    conn = get_db()
    rows = conn.execute(
        "SELECT * FROM chat_messages WHERE user_id = ? ORDER BY created_at DESC LIMIT ?",
        (user_id, limit)
    ).fetchall()
    conn.close()
    return [dict(r) for r in reversed(rows)]

def clear_chat(user_id):
    conn = get_db()
    conn.execute("DELETE FROM chat_messages WHERE user_id = ?", (user_id,))
    conn.commit()
    conn.close()

# --- Google Workspace Creds ---

def save_workspace_creds(user_id, project_id, client_id, client_secret):
    conn = get_db()
    conn.execute("""
        INSERT INTO google_workspace_creds (user_id, project_id, client_id, client_secret)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
            project_id = excluded.project_id,
            client_id = excluded.client_id,
            client_secret = excluded.client_secret
    """, (user_id, project_id, client_id, client_secret))
    conn.commit()
    conn.close()

def get_workspace_creds(user_id):
    conn = get_db()
    row = conn.execute("SELECT * FROM google_workspace_creds WHERE user_id = ?", (user_id,)).fetchone()
    conn.close()
    return dict(row) if row else None

def set_workspace_connected(user_id, token_json):
    conn = get_db()
    conn.execute(
        "UPDATE google_workspace_creds SET is_connected = 1, token_json = ? WHERE user_id = ?",
        (token_json, user_id)
    )
    conn.commit()
    conn.close()

# --- Applications CRUD ---

def save_application(user_id, company, role, job_url, status="Applied"):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO applications (user_id, company, role, job_url, status) VALUES (?, ?, ?, ?, ?)",
        (user_id, company, role, job_url, status)
    )
    app_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return app_id

def get_applications(user_id):
    conn = get_db()
    rows = conn.execute(
        "SELECT * FROM applications WHERE user_id = ? ORDER BY applied_at DESC", (user_id,)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]

def update_application_status(app_id, user_id, status):
    conn = get_db()
    conn.execute(
        "UPDATE applications SET status = ? WHERE id = ? AND user_id = ?",
        (status, app_id, user_id)
    )
    conn.commit()
    conn.close()

# --- Agent Progress ---

def save_agent_milestone(user_id, agent_type, milestone, detail=""):
    conn = get_db()
    conn.execute(
        "INSERT INTO agent_progress (user_id, agent_type, milestone, detail) VALUES (?, ?, ?, ?)",
        (user_id, agent_type, milestone, detail)
    )
    conn.commit()
    conn.close()

def get_agent_progress(user_id, agent_type):
    conn = get_db()
    rows = conn.execute(
        "SELECT * FROM agent_progress WHERE user_id = ? AND agent_type = ? ORDER BY created_at ASC",
        (user_id, agent_type)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]

def clear_agent_progress(user_id, agent_type):
    conn = get_db()
    conn.execute(
        "DELETE FROM agent_progress WHERE user_id = ? AND agent_type = ?",
        (user_id, agent_type)
    )
    conn.commit()
    conn.close()

