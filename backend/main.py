from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import os
from agent.google_auth import GoogleAuthManager

app = FastAPI(title="Agentic Apply API")
auth_manager = GoogleAuthManager()

# In-memory store for demo. In production, use DB.
global_agent_config = {}
global_resume_data = {}
agent_instance = None

from agent.memory import MemoryBank
global_memory = MemoryBank()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ConfigModel(BaseModel):
    job_titles: str
    locations: str
    min_salary: int
    strict_salary: bool
    google_sheet_url: str

@app.get("/api/health")
def health_check():
    return {"status": "ok"}

@app.get("/api/stats")
def get_stats():
    pending = len(agent_instance.question_queue) if agent_instance else 0
    return {
        "jobs_applied": 42,
        "interviews": 2,
        "pending_actions": pending,
        "funnel_data": [
            {"name": "Jobs Found", "value": 120},
            {"name": "Applied", "value": 42},
            {"name": "Interview", "value": 2},
            {"name": "Offer", "value": 0}
        ]
    }

@app.post("/api/config")
def save_config(config: dict):
    global_agent_config.update(config)
    return {"status": "success"}

class CredentialsModel(BaseModel):
    client_id: str
    client_secret: str
    project_id: str

@app.post("/api/config/credentials")
def save_credentials(creds: CredentialsModel):
    cred_dict = {
        "installed": {
            "client_id": creds.client_id,
            "project_id": creds.project_id,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
            "client_secret": creds.client_secret,
            "redirect_uris": ["http://localhost"]
        }
    }
    with open("credentials.json", "w") as f:
        json.dump(cred_dict, f, indent=4)
    return {"status": "success"}

import json
from agent.llm_manager import LLMManager

@app.post("/api/resume/upload")
async def upload_resume(file: UploadFile = File(...)):
    file_location = f"uploads/{file.filename}"
    os.makedirs("uploads", exist_ok=True)
    content = await file.read()
    with open(file_location, "wb+") as file_object:
        file_object.write(content)
        
    global_resume_data["filename"] = file.filename
    global_resume_data["size"] = len(content)
    
    llm = LLMManager()
    prompt = f"Analyze this resume content and suggest exactly 5 specific job titles the candidate should apply for. Return them as a comma separated list. Resume preview: {content[:500]}..."
    
    try:
        from langchain.prompts import PromptTemplate
        from langchain_core.output_parsers import StrOutputParser
        chain = PromptTemplate(template="{prompt}", input_variables=["prompt"]) | llm.get_llm() | StrOutputParser()
        suggestions_str = chain.invoke({"prompt": prompt})
        suggestions = [s.strip() for s in suggestions_str.split(',')]
    except Exception as e:
        suggestions = ["Software Engineer", "Frontend Developer", "Backend Engineer"]
        
    return {"status": "success", "info": f"file '{file.filename}' saved at '{file_location}'", "suggestions": suggestions}

@app.get("/api/auth/google/status")
def get_google_auth_status():
    has_creds = os.path.exists(auth_manager.credentials_path)
    is_auth = auth_manager.is_authenticated()
    return {"has_credentials": has_creds, "is_authenticated": is_auth}

@app.post("/api/auth/google/upload-credentials")
async def upload_credentials(file: UploadFile = File(...)):
    if not file.filename.endswith('.json'):
        raise HTTPException(status_code=400, detail="Must be a JSON file")
    
    with open(auth_manager.credentials_path, "wb+") as file_object:
        file_object.write(file.file.read())
    return {"status": "success", "message": "Credentials uploaded successfully"}

@app.get("/api/auth/google/url")
def get_google_auth_url():
    try:
        url = auth_manager.get_authorization_url()
        return {"url": url}
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class AuthCodeModel(BaseModel):
    code: str

@app.post("/api/auth/google/callback")
def google_auth_callback(data: AuthCodeModel):
    try:
        auth_manager.exchange_code(data.code)
        return {"status": "success", "message": "Successfully authenticated with Google"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

from agent.agent import JobApplicationAgent
from agent.sheets_manager import GoogleSheetsManager
import asyncio

@app.post("/api/run-agent")
async def run_agent():
    global agent_instance
    if not global_agent_config:
        raise HTTPException(status_code=400, detail="Config not set. Please save config first.")
        
    sheet_manager = GoogleSheetsManager(auth_manager)
    try:
        sheet_manager.initialize_sheet(global_agent_config.get('google_sheet_url', ''))
    except Exception as e:
        print("Could not initialize sheet, continuing anyway:", e)

    agent_instance = JobApplicationAgent(global_agent_config, global_resume_data, sheet_manager)
    await agent_instance.initialize()
    
    # Run the search job in the background
    asyncio.create_task(agent_instance.search_jobs("Indeed"))
    
    return {"status": "started", "message": "Agent workflow initiated in the background"}

@app.get("/api/actions")
def get_pending_actions():
    if agent_instance:
        return {"actions": agent_instance.question_queue}
    return {"actions": []}

class AnswerModel(BaseModel):
    question_id: str
    answer: str

@app.post("/api/actions/answer")
def submit_action_answer(data: AnswerModel):
    if not agent_instance:
        raise HTTPException(status_code=400, detail="Agent is not running")
        
    for q in agent_instance.question_queue:
        if q['id'] == data.question_id:
            # Save to memory bank so it learns
            global_memory.add_qa(q['text'], data.answer)
            agent_instance.question_queue.remove(q)
            return {"status": "success"}
            
    raise HTTPException(status_code=404, detail="Question not found")

@app.get("/api/memory")
def get_memory():
    return {"memory": global_memory.get_all_qa()}

class MemoryModel(BaseModel):
    question: str
    answer: str

@app.post("/api/memory")
def add_memory(data: MemoryModel):
    global_memory.add_qa(data.question, data.answer)
    return {"status": "success"}

@app.delete("/api/memory/{qa_id}")
def delete_memory(qa_id: int):
    global_memory.delete_qa(qa_id)
    return {"status": "success"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
