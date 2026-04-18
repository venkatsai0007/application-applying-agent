import sqlite3
import os
from .llm_manager import LLMManager
from langchain.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser

class MemoryBank:
    def __init__(self, db_path='agent_memory.db', llm_manager: LLMManager = None):
        self.db_path = db_path
        self.llm_manager = llm_manager
        self.init_db()

    def init_db(self):
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        c.execute('''
            CREATE TABLE IF NOT EXISTS knowledge_base (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                question TEXT UNIQUE,
                answer TEXT
            )
        ''')
        conn.commit()
        conn.close()

    def add_qa(self, question: str, answer: str):
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        try:
            c.execute('INSERT OR REPLACE INTO knowledge_base (question, answer) VALUES (?, ?)', (question, answer))
            conn.commit()
        except sqlite3.Error as e:
            print(f"Database error: {e}")
        finally:
            conn.close()

    def get_all_qa(self):
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        c.execute('SELECT id, question, answer FROM knowledge_base')
        rows = c.fetchall()
        conn.close()
        return [{"id": row[0], "question": row[1], "answer": row[2]} for row in rows]

    def delete_qa(self, qa_id: int):
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        c.execute('DELETE FROM knowledge_base WHERE id = ?', (qa_id,))
        conn.commit()
        conn.close()

    def find_answer(self, new_question: str) -> str:
        """
        Uses the LLM to determine if the new question matches any existing question in the DB.
        If it does, returns the answer. Otherwise, returns None.
        """
        if not self.llm_manager:
            return None

        saved_qas = self.get_all_qa()
        if not saved_qas:
            return None

        context = "\n".join([f"Q: {qa['question']} | A: {qa['answer']}" for qa in saved_qas])
        
        prompt = PromptTemplate(
            template="""You are an AI assistant helping a job application bot.
Below is a database of saved answers to previous application questions.
Database:
{context}

A new application asks this question: "{new_question}"

If the new question is semantically identical or extremely similar to a saved question (asking for the same piece of information), return ONLY the exact 'A' value for that question. Do not include any other text.
If the new question does not match any saved question, or you are unsure, return exactly "NOT_FOUND".
""",
            input_variables=["context", "new_question"]
        )

        chain = prompt | self.llm_manager.get_llm() | StrOutputParser()
        
        try:
            result = chain.invoke({"context": context, "new_question": new_question}).strip()
            if result == "NOT_FOUND":
                return None
            return result
        except Exception as e:
            print(f"Error finding answer via LLM: {e}")
            return None
