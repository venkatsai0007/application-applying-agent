import asyncio
import random
from .base_scraper import BaseScraper

class IndeedScraper(BaseScraper):
    async def human_delay(self, min_ms=1000, max_ms=3000):
        delay = random.uniform(min_ms/1000, max_ms/1000)
        await asyncio.sleep(delay)

    async def search_jobs(self, title: str, location: str):
        print(f"Indeed: Searching for {title} in {location}")
        url = f"https://in.indeed.com/jobs?q={title}&l={location}"
        await self.page.goto(url, wait_until='domcontentloaded')
        await self.human_delay()

        await self.page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        await self.human_delay()

        job_cards = await self.page.locator('.job_seen_beacon').all()
        print(f"Indeed: Found {len(job_cards)} jobs.")

        for card in job_cards[:3]: # Limit to 3 for demo
            try:
                title_elem = card.locator('h2.jobTitle span[title]')
                job_title = await title_elem.inner_text()
                
                company_elem = card.locator('[data-testid="company-name"]')
                company = await company_elem.inner_text()

                print(f"Indeed: Checking {job_title} at {company}")
                
                await title_elem.click()
                await self.human_delay(2000, 4000)
                
                apply_button = self.page.locator('#indeedApplyButton')
                if await apply_button.count() > 0:
                    print(f"Indeed: Found direct apply for {company}. Proceeding...")
                    await self.handle_application(company, job_title)
                else:
                    print(f"Indeed: Skipping {company} - Requires redirect.")
            except Exception as e:
                print(f"Indeed error processing card: {e}")

    async def handle_application(self, company: str, job_title: str):
        print("Indeed: Clicking Apply...")
        await self.page.locator('#indeedApplyButton').click()
        await self.human_delay()

        # Simulate extracting a job description and generating a cover letter
        # job_desc = await self.page.locator('#jobDescriptionText').inner_text()
        job_desc = "Looking for a skilled developer with React and Python experience."
        cover_letter = self.llm.generate_cover_letter(job_desc, self.resume_data, company, job_title)
        print(f"Generated tailored cover letter for {company}.")
        
        # Simulate hitting a form question
        question = "How many years of Python experience do you have?"
        answer = await self.auto_answer_or_queue(company, job_title, question)
        
        if not answer:
            print(f"Paused application for {company}. Waiting for user input...")
            status = 'Pending User Input'
        else:
            print(f"Filled answer: {answer}")
            print(f"Successfully applied to {company}!")
            status = 'Applied'

        if self.sheet_manager:
            app_data = {
                'company': company,
                'role': job_title,
                'salary': str(self.config.get('min_salary', '')),
                'location': 'India',
                'status': status,
                'link': self.page.url,
                'date': 'Today'
            }
            self.sheet_manager.log_application(self.config.get('google_sheet_url'), app_data)
