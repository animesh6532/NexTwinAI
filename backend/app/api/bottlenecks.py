"""
NexTwin AI — bottlenecks.py
============================
REST API endpoints for predicting and diagnosing manufacturing line bottlenecks.

Author: Principal AI Architect & Senior FastAPI Engineer
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.services.bottleneck_service import bottleneck_service
from app.utils.logger import logger

router = APIRouter()

# --- Request / Response Schemas ---

class BottleneckInput(BaseModel):
    machine_id: str = Field("M_001", description="Identifier of the target machine")
    vibration_mm_s: float = Field(1.8, description="Machine vibration amplitude in mm/s")
    temperature_c: float = Field(60.0, description="Ambient operating temperature in C")
    pressure_bar: float = Field(4.2, description="Sensor pneumatic or hydraulic pressure in bar")
    noise_level_db: float = Field(72.0, description="Sound pressure level in dB")
    sound_frequency_hz: float = Field(520.0, description="Acoustic sensor base frequency in Hz")
    sound_amplitude: float = Field(0.06, description="Acoustic sensor sound amplitude")
    defect_count: float = Field(0.0, description="Observed hour defect count")
    energy_draw_kw: float = Field(65.0, description="Current power draw of the machine in kW")
    queue_length: Optional[int] = Field(None, description="Current production queue length")
    utilization_rate: Optional[float] = Field(75.0, description="Machine utilization rate (0-100)")
    downtime_minutes: Optional[float] = Field(None, description="Machine downtime in minutes")
    throughput_rate: Optional[float] = Field(None, description="Actual machine throughput rate")
    cycle_time: Optional[float] = Field(None, description="Average cycle time in seconds")
    defect_rate: Optional[float] = Field(None, description="Defect rate ratio")

class BottleneckResponse(BaseModel):
    machine_id: str
    timestamp: str = Field(..., description="Timestamp of model execution")
    bottleneck_risk_score: float = Field(..., description="Continuous Bottleneck Severity Score (0-10)")
    predicted_production_delay: float = Field(..., description="Estimated production quantity delays")
    congestion_probability: float = Field(..., description="Likelihood of high machine congestion (0-1)")
    congestion_risk_detected: bool = Field(..., description="Binary congestion alarm threshold (utility > 90%)")

# --- Routes ---

@router.post("/predict/bottleneck", response_model=BottleneckResponse, status_code=status.HTTP_200_OK)
def predict_bottleneck(payload: BottleneckInput, db: Session = Depends(get_db)):
    """
    Evaluate bottleneck indices, anticipated defect-related delay rates, and high 
    utilization congestion alarms on a manufacturing asset using retrained XGBoost regressors.
    """
    logger.info(f"Bottleneck Detection requested for Machine ID: {payload.machine_id}")
    try:
        prediction = bottleneck_service.predict_bottleneck(db, payload.dict())
        return BottleneckResponse(**prediction)
    except Exception as e:
        logger.error(f"Failed to execute bottleneck prediction: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Bottleneck engine execution error: {str(e)}"
        )

@router.get("/bottlenecks/history", response_model=List[BottleneckResponse], status_code=status.HTTP_200_OK)
def get_bottleneck_history(machine_id: Optional[str] = None, limit: int = 50, db: Session = Depends(get_db)):
    """
    Retrieve historical bottleneck evaluations. Optional filter by machine_id.
    """
    try:
        records = bottleneck_service.get_prediction_history(db, machine_id, limit)
        return [
            BottleneckResponse(
                machine_id=rec.machine_id,
                timestamp=rec.timestamp.strftime("%Y-%m-%d %H:%M:%S"),
                bottleneck_risk_score=rec.bottleneck_risk_score,
                predicted_production_delay=rec.predicted_production_delay,
                congestion_probability=rec.congestion_probability,
                congestion_risk_detected=rec.congestion_risk_detected
            )
            for rec in records
        ]
    except Exception as e:
        logger.error(f"Error fetching bottleneck prediction records: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
