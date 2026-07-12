"""
Groq Client.
"""

from openai import OpenAI

from chat_assistant.backend.app.config import (
    GROQ_API_KEY,
    MODEL_NAME,
)


class LLM:

    def __init__(self):

        self.client = OpenAI(
            api_key=GROQ_API_KEY,
            base_url="https://api.groq.com/openai/v1",
        )

        self.model = MODEL_NAME

    def generate(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0,
    ) -> str:

        response = self.client.chat.completions.create(
            model=self.model,
            temperature=temperature,
            messages=[
                {
                    "role": "system",
                    "content": system_prompt,
                },
                {
                    "role": "user",
                    "content": user_prompt,
                },
            ],
        )

        return response.choices[0].message.content.strip()