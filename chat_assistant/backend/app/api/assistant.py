"""
Fleet AI Assistant.
"""

from chat_assistant.backend.app.services.sql_generator import SQLGenerator
from chat_assistant.backend.app.services.sql_validator import SQLValidator


class FleetAssistant:

    def __init__(self):

        self.generator = SQLGenerator()

    def generate_sql(
        self,
        question: str,
    ) -> str:

        sql = self.generator.generate(question)

        sql = SQLValidator.validate(sql)

        return sql