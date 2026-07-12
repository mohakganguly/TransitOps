"""
answer_generator.py

Generates a natural language answer from SQL results.
"""

from chat_assistant.backend.app.services.llm import LLM
from chat_assistant.backend.app.services.prompts import ANSWER_SYSTEM_PROMPT


class AnswerGenerator:

    def __init__(self):

        self.llm = LLM()

    def generate(
        self,
        question: str,
        results,
    ) -> str:

        if not results:
            return "No matching records were found."

        prompt = f"""
User Question:
{question}

SQL Results:
{results}

Generate a concise natural language answer.

Do not mention SQL.
"""

        return self.llm.generate(
            system_prompt=ANSWER_SYSTEM_PROMPT,
            user_prompt=prompt,
        )