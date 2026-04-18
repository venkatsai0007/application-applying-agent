import asyncio
import os
from playwright.async_api import async_playwright
from .llm_manager import LLMManager
from .memory import MemoryBank
from .platforms.indeed import IndeedScraper

class JobApplicationAgent:
    def __init__(self, config: dict, resume_data: dict, sheet_manager=None, ai_config: dict = None):
        self.config = config
        self.resume_data = resume_data
        self.sheet_manager = sheet_manager
        self.browser = None
        self.context = None
        self.page = None
        self.question_queue = [] # Shared with FastAPI
        
        self.llm = LLMManager(ai_config=ai_config)
        self.memory = MemoryBank(llm_manager=self.llm)

    async def initialize(self):
        playwright = await async_playwright().start()
        is_headless = os.getenv('PLAYWRIGHT_HEADLESS', 'false').lower() == 'true'
        self.browser = await playwright.chromium.launch(headless=is_headless, args=['--disable-blink-features=AutomationControlled'])
        self.context = await self.browser.new_context(
            user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
        )
        self.page = await self.context.new_page()

    async def search_jobs(self, platform: str = "Indeed"):
        print(f"Searching jobs on {platform}...")
        
        job_titles = self.config.get('job_titles', ['Software Engineer'])
        if isinstance(job_titles, str):
            job_titles = [t.strip() for t in job_titles.split(',')]
            
        locations = self.config.get('locations', ['India'])
        if isinstance(locations, str):
            locations = [l.strip() for l in locations.split(',')]
            
        title = job_titles[0] if job_titles else "Software Engineer"
        location = locations[0] if locations else "India"

        if platform == "Indeed":
            scraper = IndeedScraper(self.page, self.config, self.resume_data, self.memory, self.llm, self.sheet_manager, self.question_queue)
            await scraper.search_jobs(title, location)

    async def close(self):
        if self.browser:
            await self.browser.close()

# Example usage
async def run_example():
    agent = JobApplicationAgent(config={})
    await agent.initialize()
    await agent.search_jobs("LinkedIn")
    await agent.close()

if __name__ == "__main__":
    asyncio.run(run_example())
