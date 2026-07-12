"""
Generate SQL from user question.
"""

from chat_assistant.backend.app.services.llm import LLM
from chat_assistant.backend.app.services.prompts import SQL_SYSTEM_PROMPT


class SQLGenerator:

    def __init__(self):

        self.llm = LLM()

    def generate(
        self,
        question: str,
    ) -> str:

        return self.llm.generate(
            system_prompt=SQL_SYSTEM_PROMPT,
            user_prompt=question,
        )