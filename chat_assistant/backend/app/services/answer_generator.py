"""
Generate final answer.
"""

from chat_assistant.backend.app.services.llm import LLM
from chat_assistant.backend.app.services.prompts import ANSWER_SYSTEM_PROMPT


class AnswerGenerator:

    def __init__(self):

        self.llm = LLM()

    def generate(
        self,
        question: str,
        results: str,
    ) -> str:

        prompt = f"""
Question

{question}

SQL Results

{results}
"""

        return self.llm.generate(
            system_prompt=ANSWER_SYSTEM_PROMPT,
            user_prompt=prompt,
        )