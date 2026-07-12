"""
Configuration for the AI Assistant.
"""

from dotenv import load_dotenv
import os

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
MODEL_NAME = os.getenv("MODEL_NAME")

if not GROQ_API_KEY:
    raise ValueError("GROQ_API_KEY missing.")

if not MODEL_NAME:
    raise ValueError("MODEL_NAME missing.")