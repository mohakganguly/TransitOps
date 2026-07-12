"""
assistant.py

Main orchestration service for the TransitOps AI Assistant.
"""

from chat_assistant.backend.app.services.sql_generator import SQLGenerator
from chat_assistant.backend.app.services.sql_validator import SQLValidator
from chat_assistant.backend.app.services.sql_executor import SQLExecutor
from chat_assistant.backend.app.services.answer_generator import AnswerGenerator


class FleetAssistant:

    def __init__(self):

        self.sql_generator = SQLGenerator()
        self.sql_executor = SQLExecutor()
        self.answer_generator = AnswerGenerator()

    def chat(self, question: str):

        # Generate SQL
        sql = self.sql_generator.generate(question)

        # Validate SQL
        SQLValidator.validate(sql)

        # Execute SQL
        results = self.sql_executor.execute(sql)

        # Convert to English
        answer = self.answer_generator.generate(
            question,
            results,
        )

        return answer