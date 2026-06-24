"""
NexTwin AI — anomalies.py
=========================
REST API endpoints for unsupervised anomaly and defect detection on physical machine telemetry.

Author: Principal AI Architect & Senior FastAPI Engineer
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.services.anomaly_service import anomaly_service
from app.utils.logger import logger

router = APIRouter()

# --- Request / Response Schemas ---

class AnomalyInput(BaseModel):
    machine_id: str = Field("M_001", description="Identifier of the target machine")
    vibration_mm_s: float = Field(1.8, description="Machine vibration amplitude in mm/s")
    temperature_c: float = Field(60.0, description="Ambient operating temperature in C")
    pressure_bar: float = Field(4.2, description="Sensor pneumatic or hydraulic pressure in bar")
    noise_level_db: float = Field(72.0, description="Sound pressure level in dB")
    sound_frequency_hz: float = Field(520.0, description="Acoustic sensor base frequency in Hz")
    sound_amplitude: float = Field(0.06, description="Acoustic sensor sound amplitude")
    method: Optional[str] = Field("Isolation Forest", description="Method to use: Isolation Forest, AutoEncoder, OCSVM")

class AnomalyResponse(BaseModel):
    machine_id: str
    timestamp: str = Field(..., description="Timestamp of evaluation execution")
    anomaly_detected: bool = Field(..., description="Binary anomaly alert flag")
    anomaly_score: float = Field(..., description="Outlier score index indicating deviation severity")
    method: str = Field(..., description="Unsupervised detection algorithm used")
    details: Optional[Dict[str, Any]] = Field(None, description="Supplemental prediction results")

# --- Routes ---

@router.post("/predict/anomaly", response_model=AnomalyResponse, status_code=status.HTTP_200_OK)
def predict_anomaly(payload: AnomalyInput, db: Session = Depends(get_db)):
    """
    Evaluate structural/acoustic telemetry frames using unsupervised models (Isolation Forest, 
    OCSVM, or Deep AutoEncoder) to identify physical operational faults or failures.
    """
    logger.info(f"Anomaly Detection request received for Machine ID: {payload.machine_id} using {payload.method}")
    try:
        prediction = anomaly_service.predict_anomaly(db, payload.dict())
        return AnomalyResponse(**prediction)
    except Exception as e:
        logger.error(f"Failed to execute anomaly detection: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Anomaly detection engine execution failure: {str(e)}"
        )

@router.get("/anomalies/history", response_model=List[AnomalyResponse], status_code=status.HTTP_200_OK)
def get_anomaly_history(machine_id: Optional[str] = None, limit: int = 50, db: Session = Depends(get_db)):
    """
    Retrieve historical anomaly detection logs.
    """
    try:
        records = anomaly_service.get_prediction_history(db, machine_id, limit)
        return [
            AnomalyResponse(
                machine_id=rec.machine_id,
                timestamp=rec.timestamp.strftime("%Y-%m-%d %H:%M:%S"),
                anomaly_detected=rec.anomaly_detected,
                anomaly_score=rec.anomaly_score,
                method=rec.method,
                details=rec.details
            )
            for rec in records
        ]
    except Exception as e:
        logger.error(f"Error fetching anomaly prediction records: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
