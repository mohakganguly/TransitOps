"""
sql_executor.py

Executes validated SQL queries on the TransitOps SQLite database.
"""

import json
from chat_assistant.backend.app.database.connection import get_connection


class SQLExecutor:

    def execute(self, sql: str):
        """
        Execute a validated SQL query and return results.
        """
        try:
            conn = get_connection()
            cursor = conn.cursor()
            cursor.execute(sql)
            rows = cursor.fetchall()
            conn.close()

            if not rows:
                return "No records found matching the query."

            results = [dict(row) for row in rows]
            return json.dumps(results, indent=2)
        except Exception as e:
            return f"Database query failed: {str(e)}"
