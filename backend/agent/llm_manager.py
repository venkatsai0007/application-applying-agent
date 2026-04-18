import os
from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser

class LLMManager:
    def __init__(self, ai_config: dict = None):
        """
        Initializes the LLM based on user configuration or environment variables.
        ai_config: { use_custom: bool, platform: str, api_key: str, model: str }
        """
        self.chat_context = "" # Will be populated before generation
        if ai_config and ai_config.get("use_custom") and ai_config.get("api_key"):
            platform = ai_config.get("platform", "OpenAI")
            api_key = ai_config.get("api_key")
            model_name = ai_config.get("model", "gpt-4")

            if platform == "OpenAI":
                self.llm = ChatOpenAI(model=model_name, api_key=api_key, temperature=0)
            elif platform == "Claude":
                self.llm = ChatAnthropic(model=model_name, api_key=api_key, temperature=0)
            elif platform == "Gemini":
                self.llm = ChatGoogleGenerativeAI(model=model_name, google_api_key=api_key, temperature=0)
            else:
                # Default to OpenAI if platform unknown
                self.llm = ChatOpenAI(model="gpt-4-turbo-preview", api_key=api_key, temperature=0)
        else:
            # Fallback to server defaults
            api_key = os.getenv("OPENAI_API_KEY", "dummy-key-for-now")
            self.llm = ChatOpenAI(
                model="gpt-4-turbo-preview",
                temperature=0,
                api_key=api_key
            )

    def get_llm(self):
        return self.llm

    def generate_cover_letter(self, job_description: str, resume_data: dict, company_name: str, role: str, chat_history: str = "") -> str:
        """Generates a tailored cover letter with optional chat history for context."""
        actual_chat_history = chat_history or self.chat_context
        prompt = PromptTemplate(
            template="""You are an expert career coach writing a cover letter for a candidate.
            
Candidate Information (extracted from resume):
{resume_data}

Recent Career Chats (for context):
{chat_history}

Target Company: {company_name}
Target Role: {role}
Job Description:
{job_description}

Write a professional, concise, and compelling cover letter (max 300 words).
Do not include placeholders like [Your Address] – just jump straight into the greeting and the body.
Ensure the tone is enthusiastic and highlights the candidate's skills that match the job description.
""",
            input_variables=["resume_data", "company_name", "role", "job_description", "chat_history"]
        )

        chain = prompt | self.llm | StrOutputParser()
        try:
            return chain.invoke({
                "resume_data": str(resume_data),
                "company_name": company_name,
                "role": role,
                "job_description": job_description,
                "chat_history": actual_chat_history
            }).strip()
        except Exception as e:
            print(f"Error generating cover letter: {e}")
            return "Unable to generate cover letter."

