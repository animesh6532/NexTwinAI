"""
NexTwin AI — alerts.py
======================
REST API endpoints for monitoring and resolving factory alerts and threshold breaches.

Author: Principal AI Architect & Senior FastAPI Engineer
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.services.machine_service import machine_service
from app.utils.logger import logger

router = APIRouter()

# --- Request / Response Schemas ---

class AlertBase(BaseModel):
    machine_id: str = Field(..., description="Target machine ID")
    title: str = Field(..., description="Alert headline message")
    message: str = Field(..., description="Detailed description of fault or anomaly")
    severity: str = Field("Warning", description="Severity level: Info, Warning, Critical")

class AlertCreate(AlertBase):
    pass

class AlertResolve(BaseModel):
    resolved_by: int = Field(1, description="ID of the user resolving the alert")

class AlertResponse(AlertBase):
    id: int
    is_resolved: bool
    created_at: datetime
    resolved_at: Optional[datetime] = None
    resolved_by: Optional[int] = None
    class Config:
        from_attributes = True

# --- Routes ---

@router.get("/alerts", response_model=List[AlertResponse], status_code=status.HTTP_200_OK)
def list_alerts(
    machine_id: Optional[str] = Query(None, description="Filter by machine ID"),
    is_resolved: Optional[bool] = Query(None, description="Filter by resolution status"),
    severity: Optional[str] = Query(None, description="Filter by severity level"),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    """
    List industrial alerts with optional filtering on resolved status, severity levels, and machine IDs.
    """
    return machine_service.get_alerts(db, machine_id=machine_id, is_resolved=is_resolved, severity=severity, limit=limit)

@router.post("/alerts", response_model=AlertResponse, status_code=status.HTTP_201_CREATED)
def raise_alert(payload: AlertCreate, db: Session = Depends(get_db)):
    """
    Manually raise a system alert or alarm for a physical machine.
    """
    machine = machine_service.get_machine_by_id(db, payload.machine_id)
    if not machine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Machine asset '{payload.machine_id}' does not exist."
        )
    return machine_service.create_alert(db, payload.dict())

@router.put("/alerts/{alert_id}/resolve", response_model=AlertResponse, status_code=status.HTTP_200_OK)
def resolve_alert(alert_id: int, payload: AlertResolve, db: Session = Depends(get_db)):
    """
    Acknowledge and mark an active machine alert as resolved.
    """
    alert = machine_service.resolve_alert(db, alert_id, resolved_by=payload.resolved_by)
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Alert ID {alert_id} not found."
        )
    return alert
