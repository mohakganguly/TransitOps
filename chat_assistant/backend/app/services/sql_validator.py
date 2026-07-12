"""
sql_validator.py

Ensures that only safe SELECT queries are executed.
"""

import re


class SQLValidator:

    FORBIDDEN = [
        "INSERT",
        "UPDATE",
        "DELETE",
        "DROP",
        "ALTER",
        "TRUNCATE",
        "CREATE",
        "REPLACE",
        "PRAGMA",
        "ATTACH",
        "DETACH",
        "GRANT",
        "REVOKE",
    ]

    @staticmethod
    def validate(sql: str):

        query = sql.strip().upper()

        if not query.startswith("SELECT"):
            raise ValueError("Only SELECT queries are allowed.")

        for keyword in SQLValidator.FORBIDDEN:

            if re.search(r'\b' + re.escape(keyword) + r'\b', query):
                raise ValueError(f"Forbidden SQL keyword: {keyword}")

        # Prevent multiple SQL statements
        if ";" in query[:-1]:
            raise ValueError("Multiple SQL statements are not allowed.")

        return True
