from pathlib import Path
import sqlite3

PROJECT_ROOT = Path(__file__).resolve().parents[4]

DB_PATH = PROJECT_ROOT / "backend" / "transitops.db"

print("Database Path:", DB_PATH)
print("Database Exists:", DB_PATH.exists())


def get_connection():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn