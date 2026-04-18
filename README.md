# Agentic Apply 🚀

**Agentic Apply** is an intelligent, fully automated job application and tracking agent. Built with a React frontend and a FastAPI/Playwright Python backend, it acts as your personal job hunting assistant. 

It searches for jobs based on your preferences, parses your resume to auto-fill applications, learns from your answers, and tracks every application in your own Google Sheet!

## ✨ Key Features

- **🤖 Automated Job Applier:** Uses Playwright to navigate job boards (e.g., Indeed) and apply on your behalf.
- **🧠 Auto-Learning Memory Bank:** When the agent hits a question it doesn't know, it pauses and queues it in the UI. Once you answer it, it saves the answer in a local SQLite database and uses the LLM to auto-answer similar questions in the future!
- **📝 Dynamic Cover Letters:** Analyzes the specific job description and your resume to generate a highly tailored cover letter on the fly using LangChain.
- **📊 Analytics Funnel:** A sleek React dashboard featuring charts to track your conversion rates (Jobs Found → Applied → Interviews).
- **📈 Google Workspace Integration:** Automatically syncs and logs applications into a Google Sheet, and (optionally) scans your Gmail for application status updates.
- **🧩 Modular Architecture:** Easily extendable to support multiple job boards via the `BaseScraper` adapter pattern.

---

## 🛠️ Installation & Setup

We have packaged the entire application using Docker so you can run it seamlessly without installing Python, Node.js, or browser dependencies manually.

### Prerequisites
- Install [Docker Desktop](https://www.docker.com/products/docker-desktop/) on your machine.
- Obtain an OpenAI API Key (or configure the LLM Manager for Gemini/Claude) in the backend.

### 1. Start the Agent
Open your terminal in the project directory and run the custom CLI script:
```bash
./jarvis up
```
*(This will build the Docker images and start the backend and frontend in the background. It may take a few minutes the first time).*

If you want to view the live logs to see what the agent is doing, run:
```bash
./jarvis logs
```

### 2. Access the Dashboard
Once the containers are running, open your web browser and go to:
[http://localhost:5173](http://localhost:5173)

---

## 🚀 Usage Guide

### Step 1: Configuration
Navigate to the **Configuration** tab in the UI:
1. **Upload Resume:** Upload your PDF resume. The AI will instantly read it and suggest highly relevant Job Titles.
2. **Set Preferences:** Select your target locations, work mode (Remote/Hybrid), and salary expectations.

### Step 2: Google Workspace (Required for Tracking)
To allow the agent to log applications to your Google Sheet:
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a Project and enable the **Google Sheets API** and **Gmail API**.
3. Create OAuth 2.0 Credentials (for a Desktop App).
4. Copy the **Project ID**, **Client ID**, and **Client Secret** into the UI fields.
5. Click **Login with Google** to authenticate.

### Step 3: Run the Agent
Click the **Run Agent** button at the top of the UI. The backend will spin up a hidden browser and begin scraping job boards.

### Step 4: Action Needed & Knowledge Base
If the agent encounters a CAPTCHA or a question it doesn't know the answer to, it will pause the application and alert you in the **Action Needed** tab. 
- Type your answer and click submit. 
- The agent will immediately resume the application.
- Your answer is permanently saved in the **Knowledge Base** tab so the agent never has to ask you that question again!

---

## 🛑 Stopping the Agent
To shut down the application and free up resources, simply run:
```bash
./jarvis down
```

---
*Built with ❤️ to make job hunting painless.*
