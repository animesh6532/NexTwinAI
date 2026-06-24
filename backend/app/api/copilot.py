"""
NexTwin AI — copilot.py
=======================
REST API endpoints for the AI Manufacturing Copilot conversational assistant.

Author: Principal AI Architect & Senior FastAPI Engineer
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.services.copilot_service import copilot_service
from app.utils.logger import logger

router = APIRouter()

# --- Request / Response Schemas ---

class ChatRequest(BaseModel):
    user_id: Optional[int] = Field(1, description="ID of the user interacting with the copilot")
    prompt: str = Field(..., description="Conversational natural language query for the plant copilot")
    history: Optional[List[Dict[str, str]]] = Field(
        None, 
        description="Optional list of preceding conversation logs, e.g. [{'role': 'user', 'content': 'hi'}]"
    )

class ChatResponse(BaseModel):
    response: str = Field(..., description="Generated natural language response from LLM Agent")
    sources: Optional[List[Dict[str, Any]]] = Field(
        None, 
        description="Retrieved manual documents or database states referenced during RAG"
    )
    timestamp: str = Field(..., description="Timestamp of conversation logger")

class CopilotHistoryResponse(BaseModel):
    id: int
    user_id: Optional[int]
    prompt: str
    response: str
    sources: Optional[List[Dict[str, Any]]] = None
    created_at: str

# --- Routes ---

@router.post("/copilot/chat", response_model=ChatResponse, status_code=status.HTTP_200_OK)
def chat_with_copilot(payload: ChatRequest, db: Session = Depends(get_db)):
    """
    Query the AI Manufacturing Copilot. Supports:
    1. Explaining OEE bottlenecks and high energy waste indexes.
    2. Querying active alerts and machine statuses from DB.
    3. Retrieval Augmented Generation (RAG) referencing plant manuals.
    """
    logger.info(f"AI Copilot Chat query received from User ID {payload.user_id}: '{payload.prompt[:50]}...'")
    try:
        reply = copilot_service.ask_copilot(db, payload.user_id, payload.prompt, payload.history)
        return ChatResponse(**reply)
    except Exception as e:
        logger.error(f"AI Copilot chat execution failure: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Copilot service failed to process request: {str(e)}"
        )

@router.get("/copilot/history", response_model=List[CopilotHistoryResponse], status_code=status.HTTP_200_OK)
def get_copilot_logs(user_id: Optional[int] = None, limit: int = 50, db: Session = Depends(get_db)):
    """
    Retrieve historical conversational copilot interactions.
    """
    try:
        logs = copilot_service.get_logs(db, user_id, limit)
        return [
            CopilotHistoryResponse(
                id=log.id,
                user_id=log.user_id,
                prompt=log.prompt,
                response=log.response,
                sources=log.sources,
                created_at=log.created_at.strftime("%Y-%m-%d %H:%M:%S")
            )
            for log in logs
        ]
    except Exception as e:
        logger.error(f"Error fetching copilot log history: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
