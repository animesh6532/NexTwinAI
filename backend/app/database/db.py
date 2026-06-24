"""
NexTwin AI — db.py
==================
SQLAlchemy configuration, connection establishment, and session management.

Author: Principal AI Architect & Senior FastAPI Engineer
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config.config import settings
from app.utils.logger import logger

engine_kwargs = {"pool_pre_ping": True}
if settings.DATABASE_URL.startswith("sqlite"):
    engine_kwargs["connect_args"] = {"check_same_thread": False}
else:
    engine_kwargs.update({"pool_size": 10, "max_overflow": 20})

engine = create_engine(settings.DATABASE_URL, **engine_kwargs)

# Thread-local session maker
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for Declarative Models
Base = declarative_base()

def get_db():
    """
    Context manager database dependency injection.
    Automatically closes session after completion of request scope.
    """
    db = SessionLocal()
    try:
        yield db
    except Exception as e:
        logger.error(f"Database session error encountered: {str(e)}")
        db.rollback()
        raise
    finally:
        db.close()
