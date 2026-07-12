"""
Configuration for the AI Assistant.
"""

from dotenv import load_dotenv
import os

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY") or "mock-groq-key"
MODEL_NAME = os.getenv("MODEL_NAME") or "llama3-8b-8192"