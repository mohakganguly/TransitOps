"""
assistant.py

Main orchestration service for the TransitOps AI Assistant.
"""

from chat_assistant.backend.app.services.sql_generator import SQLGenerator
from chat_assistant.backend.app.services.sql_validator import SQLValidator
from chat_assistant.backend.app.services.sql_executor import SQLExecutor
from chat_assistant.backend.app.services.answer_generator import AnswerGenerator


class FleetAssistant:
    """
    Main AI Assistant Service.

    Pipeline:

    User Question
            ↓
    SQL Generation
            ↓
    SQL Validation
            ↓
    SQL Execution
            ↓
    Natural Language Answer
    """

    def __init__(self):

        self.sql_generator = SQLGenerator()
        self.sql_executor = SQLExecutor()
        self.answer_generator = AnswerGenerator()

    def chat(self, question: str) -> str:
        """
        Main entry point for the assistant.
        """

        # Step 1 : Generate SQL
        sql = self.sql_generator.generate(question)

        # Step 2 : Validate SQL
        SQLValidator.validate(sql)

        # Step 3 : Execute SQL
        results = self.sql_executor.execute(sql)

        # Step 4 : Generate Final Answer
        answer = self.answer_generator.generate(
            question=question,
            results=results,
        )

        return answer