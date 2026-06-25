"""
NexTwin AI — copilot.py
=======================
REST API endpoints for the AI Manufacturing Copilot conversational assistant.

Author: Principal AI Architect & Senior FastAPI Engineer
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.services.copilot_service import copilot_service
from app.utils.logger import logger

router = APIRouter()

# --- Request / Response Schemas ---

class ChatRequest(BaseModel):
    user_id: Optional[int] = Field(1, description="ID of the user interacting with the copilot")
    conversation_id: Optional[int] = Field(None, description="Optional active conversation session ID")
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
    conversation_id: Optional[int] = Field(None, description="Conversation session ID associated with this log")
    timestamp: str = Field(..., description="Timestamp of conversation logger")

class CopilotHistoryResponse(BaseModel):
    id: int
    user_id: Optional[int]
    conversation_id: Optional[int] = None
    prompt: str
    response: str
    sources: Optional[List[Dict[str, Any]]] = None
    created_at: str

class ConversationSessionResponse(BaseModel):
    id: int
    user_id: Optional[int]
    title: str
    created_at: datetime
    class Config:
        from_attributes = True

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
        reply = copilot_service.ask_copilot(db, payload.user_id, payload.prompt, payload.history, payload.conversation_id)
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
                conversation_id=log.conversation_id,
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

@router.get("/copilot/conversations", response_model=List[ConversationSessionResponse], status_code=status.HTTP_200_OK)
def get_conversations(user_id: Optional[int] = None, db: Session = Depends(get_db)):
    """
    Retrieve list of all active conversation sessions.
    """
    try:
        return copilot_service.get_conversations(db, user_id)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/copilot/conversations/{conversation_id}/logs", response_model=List[CopilotHistoryResponse], status_code=status.HTTP_200_OK)
def get_conversation_logs(conversation_id: int, db: Session = Depends(get_db)):
    """
    Retrieve conversational message history for a specific conversation session ID.
    """
    try:
        logs = copilot_service.get_conversation_logs(db, conversation_id)
        return [
            CopilotHistoryResponse(
                id=log.id,
                user_id=log.user_id,
                conversation_id=log.conversation_id,
                prompt=log.prompt,
                response=log.response,
                sources=log.sources,
                created_at=log.created_at.strftime("%Y-%m-%d %H:%M:%S")
            )
            for log in logs
        ]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
