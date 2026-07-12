"""
sql_executor.py

Executes validated SQL queries on the TransitOps SQLite database.
"""

from chat_assistant.backend.app.database.connection import get_connection


class SQLExecutor:

    def execute(self, sql: str):
        """
        Execute a validated SQL query and return results.
        """

        conn = get_connection()

        try:
            cursor = conn.cursor()

            cursor.execute(sql)

            rows = cursor.fetchall()

            return [dict(row) for row in rows]

        finally:
            conn.close()