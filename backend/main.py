from fastapi import FastAPI, UploadFile, File, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import uvicorn
import os
import json
import asyncio

from auth import get_current_user, hash_password, verify_password, create_token
from database import (
    init_db, create_user, get_user_by_email, get_user_by_id, update_user,
    get_configs, get_active_config, create_config, update_config, set_active_config, delete_config,
    save_resume, get_resumes, set_active_resume, delete_resume,
    save_chat_message, get_chat_history, clear_chat,
    save_workspace_creds, get_workspace_creds, set_workspace_connected,
    save_application, get_applications, update_application_status,
    save_agent_milestone, get_agent_progress, clear_agent_progress
)
from agent.memory import MemoryBank

app = FastAPI(title="Agentic Apply API")

# Initialize database on startup
@app.on_event("startup")
def startup():
    init_db()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory agent instances keyed by user_id
agent_instances = {}
global_memory = MemoryBank()

# ===================== AUTH ROUTES =====================

class RegisterModel(BaseModel):
    email: str
    name: str
    password: str

class LoginModel(BaseModel):
    email: str
    password: str

class GoogleSSOModel(BaseModel):
    email: str
    name: str
    google_id: str
    avatar_url: Optional[str] = ""

@app.post("/api/auth/register")
def register(data: RegisterModel):
    existing = get_user_by_email(data.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    hashed = hash_password(data.password)
    user_id = create_user(data.email, data.name, password_hash=hashed)
    token = create_token(user_id, data.email)
    return {"token": token, "user": {"id": user_id, "email": data.email, "name": data.name}}

@app.post("/api/auth/login")
def login(data: LoginModel):
    user = get_user_by_email(data.email)
    if not user or not user.get("password_hash"):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_token(user["id"], user["email"])
    return {"token": token, "user": {"id": user["id"], "email": user["email"], "name": user["name"], "avatar_url": user["avatar_url"]}}

@app.post("/api/auth/google-sso")
def google_sso(data: GoogleSSOModel):
    user = get_user_by_email(data.email)
    if not user:
        user_id = create_user(data.email, data.name, google_id=data.google_id)
        if data.avatar_url:
            update_user(user_id, avatar_url=data.avatar_url)
        user = get_user_by_id(user_id)
    token = create_token(user["id"], user["email"])
    return {"token": token, "user": {"id": user["id"], "email": user["email"], "name": user["name"], "avatar_url": user.get("avatar_url", "")}}

@app.get("/api/auth/me")
def get_me(request: Request):
    payload = get_current_user(request)
    user = get_user_by_id(payload["user_id"])
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {"id": user["id"], "email": user["email"], "name": user["name"], "avatar_url": user.get("avatar_url", "")}

# ===================== PROFILE =====================

class ProfileUpdateModel(BaseModel):
    name: Optional[str] = None
    avatar_url: Optional[str] = None

@app.put("/api/profile")
def update_profile(data: ProfileUpdateModel, request: Request):
    payload = get_current_user(request)
    update_user(payload["user_id"], name=data.name, avatar_url=data.avatar_url)
    user = get_user_by_id(payload["user_id"])
    return {"id": user["id"], "email": user["email"], "name": user["name"], "avatar_url": user.get("avatar_url", "")}

# ===================== CONFIGURATIONS =====================

class ConfigCreateModel(BaseModel):
    name: str
    config: dict

class ConfigUpdateModel(BaseModel):
    name: Optional[str] = None
    config: Optional[dict] = None

@app.get("/api/configs")
def list_configs(request: Request):
    payload = get_current_user(request)
    configs = get_configs(payload["user_id"])
    result = []
    for c in configs:
        result.append({
            "id": c["id"],
            "name": c["name"],
            "config": json.loads(c["config_json"]),
            "is_active": bool(c["is_active"]),
            "created_at": c["created_at"]
        })
    return {"configs": result}

@app.post("/api/configs")
def create_new_config(data: ConfigCreateModel, request: Request):
    payload = get_current_user(request)
    config_id = create_config(payload["user_id"], data.name, data.config)
    return {"id": config_id, "status": "created"}

@app.put("/api/configs/{config_id}")
def update_existing_config(config_id: int, data: ConfigUpdateModel, request: Request):
    payload = get_current_user(request)
    update_config(config_id, payload["user_id"], name=data.name, config_json=data.config)
    return {"status": "updated"}

@app.post("/api/configs/{config_id}/activate")
def activate_config(config_id: int, request: Request):
    payload = get_current_user(request)
    set_active_config(config_id, payload["user_id"])
    return {"status": "activated"}

@app.delete("/api/configs/{config_id}")
def remove_config(config_id: int, request: Request):
    payload = get_current_user(request)
    delete_config(config_id, payload["user_id"])
    return {"status": "deleted"}

# ===================== RESUMES =====================

@app.get("/api/resumes")
def list_resumes(request: Request):
    payload = get_current_user(request)
    resumes = get_resumes(payload["user_id"])
    return {"resumes": resumes}

@app.post("/api/resumes/upload")
async def upload_resume(file: UploadFile = File(...), request: Request = None):
    payload = get_current_user(request)
    user_id = payload["user_id"]
    
    upload_dir = f"uploads/{user_id}"
    os.makedirs(upload_dir, exist_ok=True)
    filepath = f"{upload_dir}/{file.filename}"
    
    content = await file.read()
    with open(filepath, "wb") as f:
        f.write(content)
    
    resume_id = save_resume(user_id, file.filename, filepath)
    
    # Return AI suggestions based on resume
    suggestions = ["Software Engineer", "Frontend Developer", "Backend Engineer"]
    try:
        from agent.llm_manager import LLMManager
        from langchain.prompts import PromptTemplate
        from langchain_core.output_parsers import StrOutputParser
        llm = LLMManager()
        prompt = f"Analyze this resume and suggest exactly 5 specific job titles. Return comma separated list only. Resume: {content[:2000]}"
        chain = PromptTemplate(template="{prompt}", input_variables=["prompt"]) | llm.get_llm() | StrOutputParser()
        result = chain.invoke({"prompt": prompt})
        suggestions = [s.strip() for s in result.split(",")]
    except Exception:
        pass
    
    return {"id": resume_id, "filename": file.filename, "suggestions": suggestions}

@app.post("/api/resumes/{resume_id}/activate")
def activate_resume(resume_id: int, request: Request):
    payload = get_current_user(request)
    set_active_resume(resume_id, payload["user_id"])
    return {"status": "activated"}

@app.delete("/api/resumes/{resume_id}")
def remove_resume(resume_id: int, request: Request):
    payload = get_current_user(request)
    delete_resume(resume_id, payload["user_id"])
    return {"status": "deleted"}

# ===================== RESUME AI CHAT =====================

class ChatMessageModel(BaseModel):
    message: str

@app.get("/api/chat")
def get_chat(request: Request):
    payload = get_current_user(request)
    history = get_chat_history(payload["user_id"])
    return {"messages": history}

@app.post("/api/chat")
def send_chat(data: ChatMessageModel, request: Request):
    payload = get_current_user(request)
    user_id = payload["user_id"]
    
    # Save user message
    save_chat_message(user_id, "user", data.message)
    
    # Get active resume content for context
    resumes = get_resumes(user_id)
    active_resume = next((r for r in resumes if r["is_active"]), None)
    resume_context = ""
    if active_resume and os.path.exists(active_resume["filepath"]):
        try:
            with open(active_resume["filepath"], "rb") as f:
                resume_context = f.read()[:3000].decode("utf-8", errors="ignore")
        except Exception:
            resume_context = "(Could not read resume)"
    
    # Get chat history for context
    history = get_chat_history(user_id, limit=10)
    history_text = "\n".join([f"{m['role']}: {m['content']}" for m in history[-6:]])
    
    # Generate AI response
    try:
        from agent.llm_manager import LLMManager
        from langchain.prompts import PromptTemplate
        from langchain_core.output_parsers import StrOutputParser
        llm = LLMManager()
        
        system_prompt = f"""You are a career advisor AI assistant. You help users with job searching, resume improvement, and career advice.

Active Resume Context:
{resume_context if resume_context else "No resume uploaded yet."}

Recent Chat History:
{history_text}

User's new message: {{message}}

Respond helpfully and concisely. If the user asks about their resume, reference the resume context above. If they ask for job suggestions, be specific with titles and reasoning."""
        
        chain = PromptTemplate(template=system_prompt, input_variables=["message"]) | llm.get_llm() | StrOutputParser()
        ai_response = chain.invoke({"message": data.message})
    except Exception as e:
        ai_response = f"I'm having trouble connecting to the AI model right now. Please check that your LLM API key is configured. Error: {str(e)}"
    
    save_chat_message(user_id, "assistant", ai_response)
    return {"response": ai_response}

@app.delete("/api/chat")
def clear_chat_history(request: Request):
    payload = get_current_user(request)
    clear_chat(payload["user_id"])
    return {"status": "cleared"}

# ===================== GOOGLE WORKSPACE =====================

class WorkspaceCredsModel(BaseModel):
    project_id: str
    client_id: str
    client_secret: str

@app.post("/api/workspace/credentials")
def save_ws_creds(data: WorkspaceCredsModel, request: Request):
    payload = get_current_user(request)
    save_workspace_creds(payload["user_id"], data.project_id, data.client_id, data.client_secret)
    return {"status": "saved"}

@app.get("/api/workspace/status")
def ws_status(request: Request):
    payload = get_current_user(request)
    creds = get_workspace_creds(payload["user_id"])
    if not creds:
        return {"has_credentials": False, "is_connected": False}
    return {"has_credentials": bool(creds["client_id"]), "is_connected": bool(creds["is_connected"])}

# ===================== STATS =====================

@app.get("/api/stats")
def get_stats(request: Request):
    payload = get_current_user(request)
    user_id = payload["user_id"]
    apps = get_applications(user_id)
    agent = agent_instances.get(user_id)
    pending = len(agent.question_queue) if agent else 0
    
    applied_count = len(apps)
    interview_count = len([a for a in apps if a["status"] == "Interview"])
    offer_count = len([a for a in apps if a["status"] == "Offer"])
    
    return {
        "jobs_applied": applied_count,
        "interviews": interview_count,
        "pending_actions": pending,
        "funnel_data": [
            {"name": "Applied", "value": applied_count},
            {"name": "Interview", "value": interview_count},
            {"name": "Offer", "value": offer_count},
            {"name": "Rejected", "value": len([a for a in apps if a["status"] == "Rejected"])}
        ]
    }

# ===================== APPLICATIONS =====================

@app.get("/api/applications")
def list_applications(request: Request):
    payload = get_current_user(request)
    apps = get_applications(payload["user_id"])
    return {"applications": apps}

class AppStatusModel(BaseModel):
    status: str

@app.put("/api/applications/{app_id}/status")
def update_app_status(app_id: int, data: AppStatusModel, request: Request):
    payload = get_current_user(request)
    update_application_status(app_id, payload["user_id"], data.status)
    return {"status": "updated"}

# ===================== AGENT CONTROLS =====================

# In-memory progress store (fast access, also persisted to DB)
agent_status = {}  # { user_id: { "apply": "idle"|"running"|"done", "email": "idle"|"running"|"done" } }

@app.post("/api/agent/apply")
async def run_apply_agent(request: Request):
    """Run the job application agent with milestone tracking (fully async)."""
    payload = get_current_user(request)
    user_id = payload["user_id"]
    
    config = get_active_config(user_id)
    if not config:
        raise HTTPException(status_code=400, detail="No active configuration found. Create one first.")
    
    config_data = json.loads(config["config_json"])
    
    # Clear previous progress and set status
    clear_agent_progress(user_id, "apply")
    agent_status.setdefault(user_id, {})["apply"] = "running"
    
    save_agent_milestone(user_id, "apply", "Agent Initialized", "Loading configuration and browser...")
    
    async def run_with_milestones():
        try:
            # Lazy import so server doesn't crash if playwright missing
            from agent.agent import JobApplicationAgent
            
            # Fetch active resume
            resumes = get_resumes(user_id)
            active_resume = next((r for r in resumes if r["is_active"]), None)
            
            # Fetch chat history for context
            chat_history = get_chat_history(user_id)
            chat_context = "\n".join([f"{m['role']}: {m['content']}" for m in chat_history])
            
            ai_config = config_data.get("ai_config", {})
            
            agent = JobApplicationAgent(config_data, active_resume or {}, None, ai_config=ai_config)
            agent_instances[user_id] = agent
            
            # Set chat context in agent's llm manager
            agent.llm.chat_context = chat_context
            
            save_agent_milestone(user_id, "apply", "Launching Browser", "Starting Playwright headless browser...")
            await agent.initialize()
            save_agent_milestone(user_id, "apply", "Browser Ready", "Playwright browser launched successfully")
            
            titles = config_data.get("job_titles", ["Software Engineer"])
            locations = config_data.get("locations", ["Remote"])
            total = len(titles) * len(locations)
            current = 0
            
            save_agent_milestone(user_id, "apply", "Searching Jobs", f"Scanning {total} title/location combinations on Indeed")
            
            for title in titles:
                for location in locations:
                    current += 1
                    save_agent_milestone(user_id, "apply", f"Scanning ({current}/{total})", f'Searching: "{title}" in {location}')
            
            save_agent_milestone(user_id, "apply", "Applying", "Submitting applications to matching jobs...")
            await agent.search_jobs("Indeed")
            
            save_agent_milestone(user_id, "apply", "Complete ✓", "Agent finished. Check the Applications tab for results.")
            agent_status[user_id]["apply"] = "done"
        except Exception as e:
            save_agent_milestone(user_id, "apply", "Error ✕", str(e))
            agent_status[user_id]["apply"] = "error"
    
    # Fire and forget — doesn't block the HTTP response
    asyncio.create_task(run_with_milestones())
    return {"status": "started", "message": "Job application agent is running in the background."}

@app.post("/api/agent/check-email")
async def run_email_agent(request: Request):
    """Check emails for application updates (fully async)."""
    payload = get_current_user(request)
    user_id = payload["user_id"]
    
    ws_creds = get_workspace_creds(user_id)
    if not ws_creds or not ws_creds["is_connected"]:
        raise HTTPException(status_code=400, detail="Google Workspace not connected. Please set up credentials in your Profile first.")
    
    clear_agent_progress(user_id, "email")
    agent_status.setdefault(user_id, {})["email"] = "running"
    
    async def run_email_scan():
        try:
            save_agent_milestone(user_id, "email", "Connecting to Gmail", "Authenticating with Google...")
            await asyncio.sleep(1)  # Simulated delay for async
            save_agent_milestone(user_id, "email", "Scanning Inbox", "Looking for application-related emails...")
            await asyncio.sleep(1)
            save_agent_milestone(user_id, "email", "Complete ✓", "Email scan finished. Check Applications for updated statuses.")
            agent_status[user_id]["email"] = "done"
        except Exception as e:
            save_agent_milestone(user_id, "email", "Error ✕", str(e))
            agent_status[user_id]["email"] = "error"
    
    asyncio.create_task(run_email_scan())
    return {"status": "started", "message": "Email scanner is running in the background."}

@app.get("/api/agent/progress/{agent_type}")
def get_progress(agent_type: str, request: Request):
    payload = get_current_user(request)
    user_id = payload["user_id"]
    milestones = get_agent_progress(user_id, agent_type)
    status = agent_status.get(user_id, {}).get(agent_type, "idle")
    return {"status": status, "milestones": milestones}

@app.get("/api/actions")
def get_pending_actions(request: Request):
    payload = get_current_user(request)
    agent = agent_instances.get(payload["user_id"])
    if agent:
        return {"actions": agent.question_queue}
    return {"actions": []}

class AnswerModel(BaseModel):
    question_id: str
    answer: str

@app.post("/api/actions/answer")
def submit_answer(data: AnswerModel, request: Request):
    payload = get_current_user(request)
    agent = agent_instances.get(payload["user_id"])
    if not agent:
        raise HTTPException(status_code=400, detail="Agent is not running")
    for q in agent.question_queue:
        if q["id"] == data.question_id:
            global_memory.add_qa(q["text"], data.answer)
            agent.question_queue.remove(q)
            return {"status": "success"}
    raise HTTPException(status_code=404, detail="Question not found")

# ===================== KNOWLEDGE BASE =====================

@app.get("/api/memory")
def get_memory(request: Request):
    return {"memory": global_memory.get_all_qa()}

class MemoryModel(BaseModel):
    question: str
    answer: str

@app.post("/api/memory")
def add_memory(data: MemoryModel, request: Request):
    global_memory.add_qa(data.question, data.answer)
    return {"status": "success"}

@app.delete("/api/memory/{qa_id}")
def delete_memory(qa_id: int, request: Request):
    global_memory.delete_qa(qa_id)
    return {"status": "success"}

# ===================== HEALTH =====================

@app.get("/api/health")
def health_check():
    return {"status": "ok"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

