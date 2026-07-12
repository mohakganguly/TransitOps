"""
Validate SQL.
"""


class SQLValidator:

    FORBIDDEN = [
        "INSERT",
        "UPDATE",
        "DELETE",
        "DROP",
        "ALTER",
        "TRUNCATE",
        "CREATE",
        "GRANT",
        "REVOKE",
    ]

    @classmethod
    def validate(
        cls,
        sql: str,
    ) -> str:

        sql = sql.strip()

        if not sql.upper().startswith("SELECT"):
            raise ValueError(
                "Only SELECT statements are allowed."
            )

        upper = sql.upper()

        for keyword in cls.FORBIDDEN:

            if keyword in upper:

                raise ValueError(
                    f"Forbidden keyword: {keyword}"
                )

        return sql