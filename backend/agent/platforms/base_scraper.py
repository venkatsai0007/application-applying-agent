from abc import ABC, abstractmethod
from playwright.async_api import Page
from ..llm_manager import LLMManager
from ..memory import MemoryBank

class BaseScraper(ABC):
    def __init__(self, page: Page, config: dict, resume_data: dict, memory: MemoryBank, llm: LLMManager, sheet_manager, question_queue: list):
        self.page = page
        self.config = config
        self.resume_data = resume_data
        self.memory = memory
        self.llm = llm
        self.sheet_manager = sheet_manager
        self.question_queue = question_queue

    @abstractmethod
    async def search_jobs(self, title: str, location: str):
        """Navigate to the platform and search for jobs."""
        pass

    @abstractmethod
    async def handle_application(self, company: str, job_title: str):
        """Handle the application flow for a specific job."""
        pass

    async def auto_answer_or_queue(self, company: str, role: str, question_text: str):
        """
        Check memory for the answer. If found, return it.
        If not, queue it for the user and return None.
        """
        answer = self.memory.find_answer(question_text)
        if answer:
            print(f"Auto-answering from memory: '{answer}' for question: '{question_text}'")
            return answer
            
        print(f"Question unknown. Queuing for user: '{question_text}'")
        import random
        question_id = str(random.randint(10000, 99999))
        self.question_queue.append({
            'id': question_id,
            'company': company,
            'role': role,
            'type': 'Question',
            'text': question_text
        })
        return None
