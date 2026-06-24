"""
NexTwin AI — health.py
======================
REST API endpoints for platform status diagnostics and predictive machine health forecasting.

Author: Principal AI Architect & Senior FastAPI Engineer
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.services.health_service import health_service
from app.utils.logger import logger

router = APIRouter()

# --- Request / Response Schemas ---

class SystemStatusResponse(BaseModel):
    status: str = Field("online", description="Status of the API gateway")
    database_connected: bool = Field(True, description="Database connection health check")
    timestamp: str = Field(..., description="Server current ISO timestamp")

class MachineHealthInput(BaseModel):
    machine_id: Optional[str] = Field(None, description="Optional target machine ID if stored in DB")
    type: str = Field("M", description="Machine type grade: L, M, H")
    air_temperature: float = Field(300.0, description="Air temperature (Kelvin)")
    process_temperature: float = Field(310.0, description="Process temperature (Kelvin)")
    rotational_speed: float = Field(1500.0, description="Rotational speed (RPM)")
    torque: float = Field(40.0, description="Torque (Nm)")
    tool_wear: float = Field(0.0, description="Tool wear (minutes)")
    machine_health_score: float = Field(100.0, description="Baseline health score (0-100)")
    failure_risk_index: float = Field(0.0, description="Calculated failure risk index")

class MachineHealthResponse(BaseModel):
    machine_id: Optional[str] = None
    failure_predicted: bool = Field(..., description="Binary failure flag")
    failure_probability: float = Field(..., description="Probability of failure (0-1)")
    health_score: float = Field(..., description="Calculated machine health score")
    maintenance_priority: str = Field(..., description="Calculated maintenance urgency level: Low, Medium, High, Critical")
    top_factors: List[str] = Field(default_factory=list, description="Top factors contributing to failure probability")
    timestamp: str = Field(..., description="Timestamp of inference execution")

# --- Routes ---

@router.get("/health", response_model=SystemStatusResponse, status_code=status.HTTP_200_OK)
def check_system_health(db: Session = Depends(get_db)):
    """
    Diagnostic endpoint verifying API and DB connectivity.
    """
    db_ok = False
    try:
        # Simple query to verify connection
        db.execute(text("SELECT 1"))
        db_ok = True
    except Exception as e:
        logger.error(f"System health check database error: {str(e)}")
        
    return SystemStatusResponse(
        status="online" if db_ok else "degraded",
        database_connected=db_ok,
        timestamp=datetime.utcnow().isoformat()
    )

@router.post("/predict/health", response_model=MachineHealthResponse, status_code=status.HTTP_200_OK)
def predict_machine_health(payload: MachineHealthInput, db: Session = Depends(get_db)):
    """
    Predict machine failure probability, overall health index, and maintenance priority
    using raw sensor feeds and retrained ML classifiers.
    """
    logger.info(f"Machine Health Inference request received for Machine ID: {payload.machine_id}")
    try:
        prediction = health_service.predict_health(db, payload.dict())
        return MachineHealthResponse(**prediction)
    except Exception as e:
        logger.error(f"Failed to execute machine health prediction: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Inference execution failure: {str(e)}"
        )
