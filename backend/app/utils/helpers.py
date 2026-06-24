"""
NexTwin AI — helpers.py
=======================
Common helper utilities for response formatting, custom error models, and calculations.

Author: Principal AI Architect & Senior FastAPI Engineer
"""

from typing import Any, Dict, Optional
from fastapi.responses import JSONResponse
from datetime import datetime

class NexTwinException(Exception):
    """Base application exception for NexTwin AI"""
    def __init__(self, message: str, status_code: int = 500, details: Optional[Dict[str, Any]] = None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.details = details or {}

def api_success_response(data: Any, message: str = "Operation completed successfully", status_code: int = 200) -> JSONResponse:
    """Format and return a standard successful JSONResponse"""
    return JSONResponse(
        status_code=status_code,
        content={
            "success": True,
            "message": message,
            "timestamp": datetime.utcnow().isoformat(),
            "data": data
        }
    )

def api_error_response(message: str, status_code: int = 400, details: Optional[Dict[str, Any]] = None) -> JSONResponse:
    """Format and return a standard error JSONResponse"""
    return JSONResponse(
        status_code=status_code,
        content={
            "success": False,
            "message": message,
            "timestamp": datetime.utcnow().isoformat(),
            "details": details or {}
        }
    )

def format_percentage(value: float) -> float:
    """Format float values to 2 decimal places"""
    return round(float(value), 2)

def get_current_timestamp() -> str:
    """Get UTC standard formatted timestamp"""
    return datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
