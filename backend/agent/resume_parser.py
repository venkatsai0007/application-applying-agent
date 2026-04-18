import PyPDF2
from langchain.prompts import PromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from pydantic import BaseModel, Field
from typing import List
from .llm_manager import LLMManager

class ResumeData(BaseModel):
    name: str = Field(description="Full name of the candidate")
    email: str = Field(description="Email address")
    phone: str = Field(description="Phone number")
    skills: List[str] = Field(description="List of technical and soft skills")
    experience_years: int = Field(description="Total years of professional experience")
    education_level: str = Field(description="Highest degree obtained (e.g., Bachelors, Masters)")
    summary: str = Field(description="A brief summary of the candidate's profile")

class ResumeParser:
    def __init__(self, llm_manager: LLMManager):
        self.llm = llm_manager.get_llm()
        self.parser = JsonOutputParser(pydantic_object=ResumeData)

    def extract_text_from_pdf(self, pdf_path: str) -> str:
        text = ""
        try:
            with open(pdf_path, 'rb') as file:
                reader = PyPDF2.PdfReader(file)
                for page in reader.pages:
                    text += page.extract_text() + "\n"
        except Exception as e:
            print(f"Error reading PDF: {e}")
        return text

    def parse_resume(self, pdf_path: str) -> dict:
        text = self.extract_text_from_pdf(pdf_path)
        if not text.strip():
            raise ValueError("Could not extract text from the resume.")

        prompt = PromptTemplate(
            template="Extract the candidate's information from the following resume text.\n{format_instructions}\n\nResume Text:\n{resume_text}\n",
            input_variables=["resume_text"],
            partial_variables={"format_instructions": self.parser.get_format_instructions()},
        )

        chain = prompt | self.llm | self.parser
        
        try:
            result = chain.invoke({"resume_text": text})
            return result
        except Exception as e:
            print(f"Error parsing resume with LLM: {e}")
            return {}
