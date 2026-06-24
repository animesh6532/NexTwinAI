"""
NexTwin AI — logger.py
======================
Centralized Logging Utility. Provides structured console and file outputs.

Author: Principal AI Architect & Senior FastAPI Engineer
"""

import logging
import os
from logging.handlers import RotatingFileHandler

def setup_logging(log_level: int = logging.INFO):
    """
    Configure global logger settings. Creates a logs/ directory if not present,
    and writes to both standard output and a rolling file.
    """
    log_format = "%(asctime)s - %(name)s - %(levelname)s - [%(filename)s:%(lineno)d] - %(message)s"
    
    # Ensure logs folder exists
    log_dir = "logs"
    os.makedirs(log_dir, exist_ok=True)
    
    # Configure handlers
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(logging.Formatter(log_format))
    
    file_handler = RotatingFileHandler(
        os.path.join(log_dir, "nextwin_api.log"),
        maxBytes=10 * 1024 * 1024,  # 10MB
        backupCount=5,
        encoding="utf-8"
    )
    file_handler.setFormatter(logging.Formatter(log_format))
    
    # Root logger setup
    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)
    
    # Clean up existing handlers to prevent duplicates
    if root_logger.hasHandlers():
        root_logger.handlers.clear()
        
    root_logger.addHandler(console_handler)
    root_logger.addHandler(file_handler)
    
    # Suppress verbose library logs
    logging.getLogger("urllib3").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.access").setLevel(logging.INFO)
    
    logging.info("NexTwin AI logging initialized.")

logger = logging.getLogger("NexTwinAI")
