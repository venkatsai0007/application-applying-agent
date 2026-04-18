import os
from langchain_openai import ChatOpenAI
from langchain.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser

class LLMManager:
    def __init__(self):
        # Default to a strong reasoning model. The user can configure the API key in the .env file.
        # We use ChatOpenAI as the interface, which can also be pointed to other providers 
        # (like Anthropic/Gemini) if using a proxy like LiteLLM, or we can swap it later.
        api_key = os.getenv("OPENAI_API_KEY", "dummy-key-for-now")
        self.llm = ChatOpenAI(
            model="gpt-4-turbo-preview",  # excellent for reasoning and JSON extraction
            temperature=0,
            api_key=api_key
        )

    def get_llm(self):
        return self.llm

    def generate_cover_letter(self, job_description: str, resume_data: dict, company_name: str, role: str) -> str:
        """Generates a tailored cover letter based on the job description and candidate's resume."""
        prompt = PromptTemplate(
            template="""You are an expert career coach writing a cover letter for a candidate.
Candidate Information (extracted from resume):
{resume_data}

Target Company: {company_name}
Target Role: {role}
Job Description:
{job_description}

Write a professional, concise, and compelling cover letter (max 300 words).
Do not include placeholders like [Your Address] – just jump straight into the greeting and the body.
Ensure the tone is enthusiastic and highlights the candidate's skills that match the job description.
""",
            input_variables=["resume_data", "company_name", "role", "job_description"]
        )

        chain = prompt | self.llm | StrOutputParser()
        try:
            return chain.invoke({
                "resume_data": str(resume_data),
                "company_name": company_name,
                "role": role,
                "job_description": job_description
            }).strip()
        except Exception as e:
            print(f"Error generating cover letter: {e}")
            return "Unable to generate cover letter."
