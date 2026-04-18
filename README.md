# Agentic Apply 🚀

**Agentic Apply** is an intelligent, fully automated job application and tracking agent. Built with a React frontend and a FastAPI/Playwright Python backend, it acts as your personal job hunting assistant.

It searches for jobs based on your preferences, parses your resume to auto-fill applications, learns from your answers, and tracks every application in your own Google Sheet!

---

## ✨ Key Features

| Feature | Description |
|---------|-------------|
| 🤖 **Auto-Apply Agent** | Uses Playwright to navigate job boards and apply on your behalf |
| 📧 **Email Scanner Agent** | A second agent scans Gmail for application status updates |
| 🧠 **Self-Learning Memory** | Answer a question once — the AI auto-answers similar questions forever |
| 💬 **AI Career Chat** | Full conversational AI that reads your resume and gives career advice |
| 📝 **Dynamic Cover Letters** | Generates tailored cover letters per job using LangChain |
| 📊 **Analytics Dashboard** | Funnel chart tracking Jobs Found → Applied → Interview → Offer |
| 📈 **Google Sheets Sync** | Optional auto-logging of every application to your Google Sheet |
| 👤 **Multi-User Auth** | Email/password registration or Google SSO — each user gets their own data |
| ⚙️ **Multi-Config** | Save multiple job search configurations and switch between them |
| 📄 **Resume Manager** | Upload multiple resumes, set one as active, chat with AI about them |
| 🔒 **Privacy First** | Self-host with Docker — your data never leaves your machine |

---

## 🛠️ Installation & Setup

### Prerequisites
- Install [Docker Desktop](https://www.docker.com/products/docker-desktop/)

### 1. Start the Agent
```bash
./jarvis up
```
*If images already exist, Jarvis will ask if you want to rebuild or start instantly.*

### 2. Access the App
Open your browser: [http://localhost:5173](http://localhost:5173)

### 3. Create an Account
- Click **Get Started for Free** on the landing page
- Register with email/password or use Google SSO
- You'll land on the Dashboard

---

## 🚀 Usage Guide

### Step 1: Upload Resume
Go to **Resumes & AI Chat** tab → Upload your PDF. The AI will suggest job titles.

### Step 2: Chat with AI
Ask the AI questions like:
- "What jobs should I apply for?"
- "Summarize my skills"
- "Help me write a cover letter for Google"

### Step 3: Configure
Go to **Configuration** → Select locations, work modes, salary expectations.
Create multiple configs (e.g. "Frontend Remote" and "Backend Bangalore").

### Step 4: Google Workspace (Optional)
Go to **Profile** → Enter your Google Cloud credentials to enable Sheets logging and email scanning.

### Step 5: Run the Agents
- 🚀 **Apply to Jobs** — Starts the auto-apply agent
- 📧 **Check Emails** — Scans Gmail for application updates

---

## 🛑 CLI Commands

| Command | Description |
|---------|-------------|
| `./jarvis up` | Start the app (asks to rebuild if images exist) |
| `./jarvis down` | Gracefully stop the app |
| `./jarvis kill` | Force stop and remove all containers |
| `./jarvis logs` | View live logs |
| `./jarvis help` | Show available commands |

---

## 🏗️ Architecture

```
frontend/          React + Vite
  ├── LandingPage   Auth forms, feature showcase
  ├── Dashboard     Stats, config, knowledge base, applications
  ├── ResumesPage   Multi-resume upload + full AI chat
  └── ProfilePage   Account settings, Google Workspace setup

backend/           FastAPI + Playwright
  ├── main.py       All API endpoints (auth, configs, resumes, chat, agents)
  ├── auth.py       JWT + bcrypt authentication
  ├── database.py   SQLite schema (users, configs, resumes, chat, workspace)
  └── agent/        Scraper adapters, LLM manager, memory bank
```

---

*Built with ❤️ to make job hunting painless.*
