"""
NexTwin AI — config.py
======================
Pydantic Settings for the application. Automatically reads environment variables
from a .env file if available.

Author: Principal AI Architect & Senior FastAPI Engineer
"""

import os
from pathlib import Path
from typing import List, Union
from pydantic import AnyHttpUrl, field_validator

try:
    from pydantic_settings import BaseSettings, SettingsConfigDict
except ImportError:
    from pydantic import BaseSettings
    # Pydantic v1 compatibility helper
    class SettingsConfigDict:
        def __init__(self, **kwargs):
            pass

class Settings(BaseSettings):
    _PROJECT_ROOT = Path(__file__).resolve().parents[3]

    PROJECT_NAME: str = "NexTwin AI - Industrial Digital Twin Platform"
    API_V1_STR: str = "/api/v1"
    
    # CORS Configuration: List of URLs allowed (e.g. ["http://localhost:3000"])
    # Parsed from environment variable BACKEND_CORS_ORIGINS (comma-separated string)
    BACKEND_CORS_ORIGINS: List[Union[str, AnyHttpUrl]] = []

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> Union[List[str], str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v
        return []

    # Database Settings
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"
    POSTGRES_DB: str = "nextwin_db"
    POSTGRES_PORT: int = 5432
    
    DATABASE_URL: str = f"sqlite:///{(_PROJECT_ROOT / 'backend' / 'app' / 'database' / 'dev.db').as_posix()}"
    AUTO_CREATE_TABLES: bool = True

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def assemble_db_url(cls, v: str, info) -> str:
        if v:
            return v
        data = info.data
        user = data.get("POSTGRES_USER", "postgres")
        password = data.get("POSTGRES_PASSWORD", "postgres")
        server = data.get("POSTGRES_SERVER", "localhost")
        port = data.get("POSTGRES_PORT", 5432)
        db = data.get("POSTGRES_DB", "nextwin_db")
        return f"postgresql://{user}:{password}@{server}:{port}/{db}"

    # AI Engine and Models Path
    MODEL_DIR: str = str(_PROJECT_ROOT / "ai_engine" / "models")
    
    # AI Copilot settings
    OLLAMA_HOST: str = "http://localhost:11434"
    COPILOT_LLM_MODEL: str = "llama3"
    
    # RAG settings
    DOCUMENTS_DIR: str = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "docs"))

    # Config options
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )

settings = Settings()
